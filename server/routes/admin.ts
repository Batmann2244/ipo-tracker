import { Router } from "express";
import { requireAdmin } from "../middleware/auth";
import { adminRateLimiter } from "../middleware/login-rate-limiter";
import { storage } from "../storage";
import { testScraper, scrapeAndTransformIPOs, generatePeerCompanies, generateFundUtilization } from "../services/scraper";
import { investorGainScraper } from "../services/scrapers/investorgain";
import { scraperLogger } from "../services/scraper-logger";
import { sendIpoEmailAlert } from "../services/email";

const router = Router();

router.get("/sync/test", adminRateLimiter, requireAdmin, async (req, res) => {
  try {
    const result = await testScraper();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

router.post("/sync", adminRateLimiter, requireAdmin, async (req, res) => {
  try {
    console.log("🔄 Starting IPO data sync from multiple sources...");

    const scrapedIpos = await scrapeAndTransformIPOs();

    console.log("🔄 Fetching InvestorGain data for GMP and IDs...");
    const igResult = await investorGainScraper.getIpos();
    const igIpos = igResult.success ? igResult.data : [];
    console.log(`📊 InvestorGain returned ${igIpos.length} IPOs`);

    const igMap = new Map<string, typeof igIpos[0]>();
    for (const igIpo of igIpos) {
      const normalizedName = igIpo.companyName.toLowerCase().replace(/[^a-z0-9]/g, "");
      igMap.set(normalizedName, igIpo);
      igMap.set(igIpo.symbol.toLowerCase(), igIpo);
    }

    let created = 0;
    let updated = 0;
    let analyticsAdded = 0;

    for (const ipo of scrapedIpos) {
      const normalizedName = ipo.companyName.toLowerCase().replace(/[^a-z0-9]/g, "");
      const igMatch = igMap.get(normalizedName) || igMap.get(ipo.symbol.toLowerCase());

      if (igMatch) {
        ipo.investorGainId = igMatch.investorGainId ?? null;
        ipo.gmp = igMatch.gmp ?? ipo.gmp;
        ipo.basisOfAllotmentDate = igMatch.basisOfAllotmentDate ?? ipo.basisOfAllotmentDate;
      }
      const existing = await storage.getIpoBySymbol(ipo.symbol);
      const savedIpo = await storage.upsertIpo(ipo);

      if (existing) {
        updated++;
      } else {
        created++;
      }

      // Generate analytics data for each IPO
      const ipoId = savedIpo.id;
      const sector = savedIpo.sector || "Industrial";

      // Check if analytics data exists, if not generate it
      const existingPeers = await storage.getPeerCompanies(ipoId);
      if (existingPeers.length === 0) {
        const peers = generatePeerCompanies(ipoId, sector);
        for (const peer of peers) {
          await storage.addPeerCompany(peer);
        }
        analyticsAdded++;
      }

      // Add GMP history entry
      if (savedIpo.gmp !== null) {
        await storage.addGmpHistory({
          ipoId,
          gmp: savedIpo.gmp,
          gmpPercentage: savedIpo.gmp * 0.8, // Approximate percentage
        });
      }

      // Generate fund utilization if not exists
      const existingFunds = await storage.getFundUtilization(ipoId);
      if (existingFunds.length === 0) {
        const funds = generateFundUtilization(ipoId);
        for (const fund of funds) {
          await storage.addFundUtilization(fund);
        }
      }

      // Generate timeline events for all IPOs
      const existingTimeline = await storage.getIpoTimeline(ipoId);
      if (existingTimeline.length === 0) {
        // Use expected date if available, otherwise use a future date (30 days from now)
        const baseDate = savedIpo.expectedDate
          ? new Date(savedIpo.expectedDate)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        const events = [
          { type: "drhp_filing", offsetDays: -30, description: "DRHP filed with SEBI" },
          { type: "price_band", offsetDays: -2, description: "Price band announced" },
          { type: "open_date", offsetDays: 0, description: "IPO opens for subscription" },
          { type: "close_date", offsetDays: 3, description: "IPO closes for subscription" },
          { type: "allotment", offsetDays: 7, description: "Share allotment finalized" },
          { type: "refund", offsetDays: 9, description: "Refund initiated for unallotted" },
          { type: "listing", offsetDays: 10, description: "Shares listed on exchange" },
        ];

        for (const event of events) {
          const eventDate = new Date(baseDate);
          eventDate.setDate(eventDate.getDate() + event.offsetDays);
          await storage.addTimelineEvent({
            ipoId,
            eventType: event.type,
            eventDate: eventDate.toISOString().split('T')[0],
            description: event.description,
            isConfirmed: savedIpo.expectedDate ? event.offsetDays <= 0 : false,
          });
        }
      }
    }

    console.log(`✅ Sync complete: ${created} created, ${updated} updated, ${analyticsAdded} analytics generated`);

    res.json({
      success: true,
      message: `Synced ${scrapedIpos.length} IPOs with analytics data`,
      created,
      updated,
      analyticsAdded,
      total: scrapedIpos.length,
    });
  } catch (error) {
    console.error("Sync failed:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Sync failed"
    });
  }
});

router.get("/stats", adminRateLimiter, requireAdmin, async (req, res) => {
  const count = await storage.getIpoCount();
  const ipos = await storage.getIpos();

  const stats = {
    total: count,
    upcoming: ipos.filter(i => i.status === "upcoming").length,
    open: ipos.filter(i => i.status === "open").length,
    closed: ipos.filter(i => i.status === "closed").length,
    listed: ipos.filter(i => i.status === "listed").length,
    withScores: ipos.filter(i => i.overallScore !== null).length,
    avgScore: ipos.filter(i => i.overallScore !== null)
      .reduce((sum, i) => sum + (i.overallScore || 0), 0) /
      (ipos.filter(i => i.overallScore !== null).length || 1),
  };

  res.json(stats);
});

router.post("/sync/clean", adminRateLimiter, requireAdmin, async (req, res) => {
  try {
    console.log("🧹 Starting clean sync - marking old IPOs as listed...");

    const markedCount = await storage.markAllAsListed();
    console.log(`Marked ${markedCount} IPOs as listed`);

    console.log("🔄 Fetching fresh IPO data...");
    const scrapedIpos = await scrapeAndTransformIPOs();

    let created = 0;
    let updated = 0;

    for (const ipo of scrapedIpos) {
      const existing = await storage.getIpoBySymbol(ipo.symbol);
      await storage.upsertIpo(ipo);

      if (existing) {
        updated++;
      } else {
        created++;
      }
    }

    console.log(`✅ Clean sync complete: ${created} created, ${updated} updated`);

    res.json({
      success: true,
      message: `Clean sync complete`,
      markedAsListed: markedCount,
      created,
      updated,
      total: scrapedIpos.length,
    });
  } catch (error) {
    console.error("Clean sync failed:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Clean sync failed"
    });
  }
});

// Scraper Logger Routes
router.get("/scraper-logs", adminRateLimiter, requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const logs = await scraperLogger.getRecentLogs(limit);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch scraper logs" });
  }
});

router.get("/scraper-logs/source/:source", adminRateLimiter, requireAdmin, async (req, res) => {
  try {
    const source = req.params.source as any;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const logs = await scraperLogger.getLogsBySource(source, limit);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch source logs" });
  }
});

router.get("/scraper-stats", adminRateLimiter, requireAdmin, async (req, res) => {
  try {
    const hoursBack = Number(req.query.hours) || 24;
    const stats = await scraperLogger.getSourceStats(hoursBack);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch scraper stats" });
  }
});

router.get("/scraper-health", adminRateLimiter, requireAdmin, async (req, res) => {
  try {
    const health = await scraperLogger.getHealthStatus();
    res.json(health);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch health status" });
  }
});

router.post("/sync-investorgain-ids", adminRateLimiter, requireAdmin, async (req, res) => {
  try {
    const iposResult = await investorGainScraper.getIpos();
    if (!iposResult.success || iposResult.data.length === 0) {
      return res.json({ success: false, message: "No InvestorGain IPOs fetched" });
    }

    const dbIpos = await storage.getIpos();
    let updatedCount = 0;

    for (const dbIpo of dbIpos) {
      if (dbIpo.investorGainId) continue;

      const normalizedDbName = dbIpo.companyName.toLowerCase().replace(/[^a-z0-9]/g, "");
      const match = iposResult.data.find(igIpo => {
        const normalizedIgName = igIpo.companyName.toLowerCase().replace(/[^a-z0-9]/g, "");
        return normalizedDbName.includes(normalizedIgName) ||
          normalizedIgName.includes(normalizedDbName) ||
          normalizedDbName === normalizedIgName;
      });

      if (match && match.investorGainId) {
        await storage.updateIpo(dbIpo.id, {
          investorGainId: match.investorGainId,
          gmp: match.gmp ?? dbIpo.gmp,
          basisOfAllotmentDate: match.basisOfAllotmentDate ?? dbIpo.basisOfAllotmentDate,
        });
        updatedCount++;
      }
    }

    res.json({ success: true, updated: updatedCount, totalInvestorGain: iposResult.data.length });
  } catch (error) {
    res.status(500).json({ error: "Failed to sync InvestorGain IDs" });
  }
});

// Test alert sending (admin only)
router.post("/test-alert/:id", adminRateLimiter, requireAdmin, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const ipo = await storage.getIpo(Number(req.params.id));
    if (!ipo) {
      return res.status(404).json({ message: "IPO not found" });
    }

    const prefs = await storage.getAlertPreferences(userId);
    const results = { email: false };

    if (prefs?.emailEnabled && prefs.email) {
      results.email = await sendIpoEmailAlert(prefs.email, ipo, "new_ipo");
      await storage.createAlertLog({
        userId,
        ipoId: ipo.id,
        alertType: "new_ipo",
        channel: "email",
        status: results.email ? "sent" : "failed",
        message: `Test alert for ${ipo.companyName}`,
      });
    }

    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Alert failed"
    });
  }
});

export default router;
