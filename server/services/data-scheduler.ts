import { 
  fetchAggregatedSubscription, 
  scrapeGmpFromMultipleSources, 
  checkAlertThresholds, 
  isBiddingHours,
  type AggregatedSubscriptionData,
  type GmpData,
  type AlertTrigger,
} from "./multi-source-scraper";
import { storage } from "../storage";
import { ipoAlertsScraper } from "./scrapers/ipoalerts";

interface SchedulerState {
  isRunning: boolean;
  lastPollTime: Date | null;
  pollCount: number;
  previousSubscriptionData: Map<string, number>;
  previousGmpData: Map<string, number>;
  alerts: AlertTrigger[];
}

const state: SchedulerState = {
  isRunning: false,
  lastPollTime: null,
  pollCount: 0,
  previousSubscriptionData: new Map(),
  previousGmpData: new Map(),
  alerts: [],
};

let pollInterval: NodeJS.Timeout | null = null;

async function fetchFromIpoAlertsIfScheduled(): Promise<void> {
  const fetchType = ipoAlertsScraper.getScheduledFetchType();
  
  if (!fetchType) {
    return;
  }

  if (!ipoAlertsScraper.canMakeRequest()) {
    console.log(`[IPOAlerts] ⚠️ Daily limit reached, skipping scheduled fetch`);
    return;
  }

  console.log(`[IPOAlerts] 📊 Scheduled fetch: ${fetchType} IPOs`);

  try {
    const result = await ipoAlertsScraper.getScheduledIpos();
    
    if (result.success && result.data.length > 0) {
      console.log(`[IPOAlerts] ✅ Fetched ${result.data.length} ${fetchType} IPO(s)`);
      
      for (const ipoData of result.data) {
        try {
          // Map scraper data to InsertIpo schema and upsert
          await storage.upsertIpo({
            symbol: ipoData.symbol,
            companyName: ipoData.companyName,
            priceRange: ipoData.priceRange || "TBA",
            totalShares: ipoData.totalShares ?? null,
            expectedDate: ipoData.listingDate || ipoData.closeDate || ipoData.openDate || null,
            status: ipoData.status,
            description: ipoData.description ?? null,
            sector: ipoData.sector ?? null,
            lotSize: ipoData.lotSize ?? null,
            minInvestment: ipoData.minInvestment ?? null,
            issueSize: ipoData.issueSize || "TBA",
            gmp: ipoData.gmp ?? null,
            subscriptionQib: ipoData.subscriptionQib ?? null,
            subscriptionHni: ipoData.subscriptionHni ?? null,
            subscriptionRetail: ipoData.subscriptionRetail ?? null,
            subscriptionNii: ipoData.subscriptionNii ?? null,
            basisOfAllotmentDate: ipoData.basisOfAllotmentDate ?? null,
            refundsInitiationDate: ipoData.refundsInitiationDate ?? null,
            creditToDematDate: ipoData.creditToDematDate ?? null,
            fundamentalsScore: ipoData.fundamentalsScore ?? null,
            valuationScore: ipoData.valuationScore ?? null,
            governanceScore: ipoData.governanceScore ?? null,
            overallScore: ipoData.overallScore ?? null,
            riskLevel: ipoData.riskLevel ?? null,
            redFlags: ipoData.redFlags ? JSON.stringify(ipoData.redFlags) : null,
            pros: ipoData.pros ? JSON.stringify(ipoData.pros) : null,
            aiSummary: ipoData.aiSummary ?? null,
            aiRecommendation: ipoData.aiRecommendation ?? null,
          });
          console.log(`[IPOAlerts] Upserted: ${ipoData.companyName}`);
        } catch (error) {
          console.error(`[IPOAlerts] Failed to upsert ${ipoData.companyName}:`, error);
        }
      }
    }
    
    const usage = ipoAlertsScraper.getUsageStats();
    console.log(`[IPOAlerts] Usage: ${usage.used}/${usage.limit} (${usage.remaining} remaining)`);
  } catch (error) {
    console.error(`[IPOAlerts] Scheduled fetch failed:`, error);
  }
}

async function pollDataSources(): Promise<{
  subscription: AggregatedSubscriptionData[];
  gmp: GmpData[];
  alerts: AlertTrigger[];
}> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`📡 DATA POLL #${state.pollCount + 1} - ${new Date().toISOString()}`);
  console.log(`${"=".repeat(60)}`);
  
  const isBidding = isBiddingHours();
  console.log(`📅 Bidding hours: ${isBidding ? "YES (9:15 AM - 5:30 PM IST)" : "NO"}`);
  
  fetchFromIpoAlertsIfScheduled().catch(err => console.error('[IPOAlerts] Error:', err));
  
  try {
    const [subscriptionData, gmpData] = await Promise.all([
      fetchAggregatedSubscription(state.previousSubscriptionData),
      scrapeGmpFromMultipleSources(),
    ]);
    
    const alerts = checkAlertThresholds(
      subscriptionData, 
      gmpData, 
      state.previousGmpData
    );
    
    subscriptionData.forEach(sub => {
      if (sub.total !== null) {
        state.previousSubscriptionData.set(sub.symbol, sub.total);
      }
    });
    
    gmpData.forEach(gmp => {
      state.previousGmpData.set(gmp.symbol, gmp.gmp);
    });
    
    state.lastPollTime = new Date();
    state.pollCount++;
    state.alerts = [...state.alerts.slice(-50), ...alerts];
    
    for (const sub of subscriptionData) {
      try {
        const ipos = await storage.getIpos();
        const matchingIpo = ipos.find(ipo => 
          ipo.symbol === sub.symbol || 
          ipo.companyName.toLowerCase().includes(sub.companyName.toLowerCase().slice(0, 10))
        );
        
        if (matchingIpo && matchingIpo.id) {
          await storage.addSubscriptionUpdate({
            ipoId: matchingIpo.id,
            qibSubscription: sub.qib ?? 0,
            niiSubscription: sub.hni ?? 0,
            retailSubscription: sub.retail ?? 0,
            totalSubscription: sub.total ?? 0,
          });
          
          await storage.updateIpo(matchingIpo.id, {
            subscriptionQib: sub.qib,
            subscriptionHni: sub.hni,
            subscriptionRetail: sub.retail,
          });
        }
      } catch (error) {
        console.error(`Failed to update subscription for ${sub.symbol}:`, error);
      }
    }
    
    for (const gmp of gmpData) {
      try {
        const ipos = await storage.getIpos();
        const matchingIpo = ipos.find(ipo => 
          ipo.symbol === gmp.symbol || 
          ipo.companyName.toLowerCase().includes(gmp.companyName.toLowerCase().slice(0, 10))
        );
        
        if (matchingIpo && matchingIpo.id && gmp.gmp !== null && gmp.gmp !== undefined) {
          await storage.addGmpHistory({
            ipoId: matchingIpo.id,
            gmp: gmp.gmp,
            gmpPercentage: gmp.expectedListing ? (gmp.gmp / gmp.expectedListing) * 100 : 0,
          });
          await storage.updateIpo(matchingIpo.id, { gmp: gmp.gmp });
        }
      } catch (error) {
        console.error(`Failed to update GMP for ${gmp.symbol}:`, error);
      }
    }
    
    if (alerts.length > 0) {
      console.log(`\n🚨 ALERTS (${alerts.length}):`);
      alerts.forEach(alert => {
        const icon = alert.severity === "critical" ? "🔴" : alert.severity === "warning" ? "🟡" : "🟢";
        console.log(`  ${icon} ${alert.message}`);
      });
    }
    
    console.log(`\n✅ Poll complete. Next poll in ${isBidding ? "5" : "30"} minutes`);
    console.log(`${"=".repeat(60)}\n`);
    
    return { subscription: subscriptionData, gmp: gmpData, alerts };
  } catch (error) {
    console.error("Poll failed:", error);
    throw error;
  }
}

export function startScheduler(): void {
  if (state.isRunning) {
    console.log("⚠️ Scheduler already running");
    return;
  }
  
  console.log("🚀 Starting data polling scheduler...");
  state.isRunning = true;
  
  pollDataSources().catch(console.error);
  
  const schedulePoll = () => {
    const pollIntervalMs = isBiddingHours() ? 5 * 60 * 1000 : 30 * 60 * 1000;
    
    pollInterval = setTimeout(async () => {
      try {
        await pollDataSources();
      } catch (error) {
        console.error("Scheduled poll failed:", error);
      }
      
      if (state.isRunning) {
        schedulePoll();
      }
    }, pollIntervalMs);
  };
  
  schedulePoll();
  
  console.log("✅ Scheduler started - polling every 5 minutes during bidding hours, 30 minutes otherwise");
}

export function stopScheduler(): void {
  if (!state.isRunning) {
    console.log("⚠️ Scheduler not running");
    return;
  }
  
  if (pollInterval) {
    clearTimeout(pollInterval);
    pollInterval = null;
  }
  
  state.isRunning = false;
  console.log("🛑 Scheduler stopped");
}

export function getSchedulerStatus(): {
  isRunning: boolean;
  lastPollTime: Date | null;
  pollCount: number;
  isBiddingHours: boolean;
  alertCount: number;
  recentAlerts: AlertTrigger[];
} {
  return {
    isRunning: state.isRunning,
    lastPollTime: state.lastPollTime,
    pollCount: state.pollCount,
    isBiddingHours: isBiddingHours(),
    alertCount: state.alerts.length,
    recentAlerts: state.alerts.slice(-10),
  };
}

export async function triggerManualPoll(): Promise<{
  subscription: AggregatedSubscriptionData[];
  gmp: GmpData[];
  alerts: AlertTrigger[];
}> {
  console.log("🔄 Manual poll triggered...");
  return pollDataSources();
}

export function getRecentAlerts(limit = 20): AlertTrigger[] {
  return state.alerts.slice(-limit);
}

export function clearAlerts(): void {
  state.alerts = [];
  console.log("🗑️ Alerts cleared");
}
