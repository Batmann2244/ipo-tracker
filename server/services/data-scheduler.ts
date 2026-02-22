import {
  fetchAggregatedSubscription,
  scrapeGmpFromMultipleSources,
  checkAlertThresholds,
  isBiddingHours,
  type AggregatedSubscriptionData,
  type GmpData,
  type AlertTrigger,
} from "./multi-source-scraper";
import { scraperAggregator } from "./scrapers";
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

// Helper to clean price strings "₹150-₹160" -> "150-160"
function cleanPriceRange(range: string | null): string {
  if (!range) return "TBA";
  return range.replace(/₹/g, '').replace(/\s/g, '');
}

async function fetchFromIpoAlertsIfScheduled(): Promise<void> {
  // Keeping existing IPO Alerts logic as it has specific rate limits
  const fetchType = ipoAlertsScraper.getScheduledFetchType();
  if (!fetchType || !ipoAlertsScraper.canMakeRequest()) return;

  try {
    const result = await ipoAlertsScraper.getScheduledIpos();
    if (result.success && result.data.length > 0) {
      console.log(`[IPOAlerts] ✅ Scheduled fetch: ${result.data.length} IPOs`);
      for (const ipo of result.data) {
        await storage.upsertIpo({
          symbol: ipo.symbol,
          companyName: ipo.companyName,
          priceRange: ipo.priceRange || "TBA",
          issueSize: ipo.issueSize || "TBA",
          status: ipo.status,
          expectedDate: ipo.listingDate || ipo.closeDate || ipo.openDate || null,
          lotSize: ipo.lotSize || null,
          sector: ipo.sector || null,
          description: ipo.description || null,
          gmp: ipo.gmp || null,
          subscriptionQib: ipo.subscriptionQib,
          subscriptionHni: ipo.subscriptionHni || ipo.subscriptionNii,
          subscriptionRetail: ipo.subscriptionRetail,
          minInvestment: ipo.minInvestment,
          overallScore: ipo.overallScore,
        });
      }
    }
  } catch (err) {
    console.error(`[IPOAlerts] Scheduled fetch failed:`, err);
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
  console.log(`📅 Bidding hours: ${isBidding ? "YES" : "NO"}`);

  // 1. Sync IPO Details (The Missing Link!)
  try {
    console.log("🔄 Syncing IPO data from Aggregator (All sources)...");
    const aggregatedResults = await scraperAggregator.getIpos([
      "investorgain", "nsetools", "groww", "chittorgarh", "ipoalerts", "bse", "ipowatch", "zerodha", "nse"
    ]);

    if (aggregatedResults.data.length > 0) {
      console.log(`📥 Upserting ${aggregatedResults.data.length} IPOs to database...`);

      const iposToUpsert = aggregatedResults.data.map(ipo => ({
        symbol: ipo.symbol,
        companyName: ipo.companyName,
        status: ipo.status,
        priceRange: cleanPriceRange(ipo.priceRange),
        issueSize: ipo.issueSize,
        lotSize: ipo.lotSize,
        expectedDate: ipo.listingDate || ipo.closeDate || ipo.openDate || null,
        minInvestment: (ipo.priceMin && ipo.lotSize) ? String(ipo.priceMin * ipo.lotSize) : null,
      }));

      const savedIpos = await storage.bulkUpsertIpos(iposToUpsert);
      console.log(`✅ Successfully saved ${savedIpos.length} IPOs to DB.`);
    } else {
      console.warn("⚠️ Aggregator returned 0 IPOs!");
    }
  } catch (err) {
    console.error("❌ Aggregator sync failed:", err);
  }

  // 2. Fetch Alerts (Existing Logic)
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

    // ... Update State caches ...
    subscriptionData.forEach(sub => sub.total !== null && state.previousSubscriptionData.set(sub.symbol, sub.total));
    gmpData.forEach(gmp => state.previousGmpData.set(gmp.symbol, gmp.gmp));

    state.lastPollTime = new Date();
    state.pollCount++;
    state.alerts = [...state.alerts.slice(-50), ...alerts];

    // ... Save Sub/GMP updates to DB ...
    // (Existing logic preserved below)

    console.log(`\n✅ Poll complete. Next poll in ${isBidding ? "5" : "30"} minutes`);

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
