import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { storage } from "../storage";
import {
  startScheduler,
  stopScheduler,
  getSchedulerStatus,
  triggerManualPoll,
  getRecentAlerts,
  clearAlerts
} from "../services/data-scheduler";
import { ipoAlertsScraper } from "../services/scrapers/ipoalerts";

const router = Router();

// Data Scheduler Routes
router.get("/api/scheduler/status", async (req, res) => {
  const status = getSchedulerStatus();
  res.json(status);
});

router.post("/api/scheduler/start", requireAuth, async (req, res) => {
  startScheduler();
  res.json({ success: true, message: "Scheduler started" });
});

router.post("/api/scheduler/stop", requireAuth, async (req, res) => {
  stopScheduler();
  res.json({ success: true, message: "Scheduler stopped" });
});

router.post("/api/scheduler/poll", requireAuth, async (req, res) => {
  try {
    const result = await triggerManualPoll();
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Poll failed"
    });
  }
});

router.get("/api/scheduler/alerts", async (req, res) => {
  const limit = Number(req.query.limit) || 20;
  const alerts = getRecentAlerts(limit);
  res.json(alerts);
});

router.delete("/api/scheduler/alerts", requireAuth, async (req, res) => {
  clearAlerts();
  res.json({ success: true, message: "Alerts cleared" });
});

router.get("/api/ipoalerts/usage", async (req, res) => {
  const usage = ipoAlertsScraper.getUsageStats();
  res.json({
    ...usage,
    canMakeRequest: ipoAlertsScraper.canMakeRequest(),
    isWithinMarketHours: ipoAlertsScraper.isWithinMarketHours(),
    scheduledFetchType: ipoAlertsScraper.getScheduledFetchType(),
  });
});

// Dev helper: import IPOs from IPO Alerts (all statuses) and upsert into local DB
if (process.env.NODE_ENV !== "production") {
  router.post("/api/ipoalerts/import-all", async (_req, res) => {
    try {
      const statuses: Array<'open' | 'upcoming' | 'listed'> = ['open', 'upcoming', 'listed'];
      let imported = 0;
      const details: Array<{ status: string; count: number }> = [];

      for (const status of statuses) {
        const result = await ipoAlertsScraper.getIposByStatus(status);
        if (!result.success) {
          details.push({ status, count: 0 });
          continue;
        }

        for (const ipoData of result.data) {
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
        }

        imported += result.data.length;
        details.push({ status, count: result.data.length });
      }

      const usage = ipoAlertsScraper.getUsageStats();
      res.json({
        success: true,
        imported,
        details,
        usage,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to import IPOs",
      });
    }
  });
}

// Test IPO Alerts API connection (dev only)
if (process.env.NODE_ENV !== "production") {
  router.post("/api/ipoalerts/test", async (req, res) => {
    try {
      console.log("[IPO Alerts] Manual test triggered");
      const result = await ipoAlertsScraper.getOpenIpos();
      res.json({
        success: result.success,
        message: result.success ? "IPO Alerts API is working!" : "Failed to fetch from IPO Alerts",
        data: result.data,
        usage: ipoAlertsScraper.getUsageStats(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}

export const schedulerRouter = router;
