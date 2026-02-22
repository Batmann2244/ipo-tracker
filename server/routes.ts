import type { Express } from "express";
import type { Server } from "http";
import { createServer } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import {
  insertIpoSchema,
  insertAlertPreferencesSchema,
  TIER_LIMITS,
  type InsertPeerCompany,
  type InsertGmpHistory,
  type InsertFundUtilization,
  type InsertIpoTimeline
} from "@shared/schema";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { z } from "zod";
import { calculateIpoScore } from "./services/scoring";
import { scrapeAndTransformIPOs, testScraper, generatePeerCompanies, generateGmpHistory, generateFundUtilization } from "./services/scraper";
import { analyzeIpo } from "./services/ai-analysis";
import { sendIpoEmailAlert } from "./services/email";
import {
  startScheduler,
  stopScheduler,
  getSchedulerStatus,
  triggerManualPoll,
  getRecentAlerts,
  clearAlerts
} from "./services/data-scheduler";
import {
  fetchAggregatedSubscription,
  scrapeGmpFromMultipleSources,
  scrapeGrowwCalendar,
  isBiddingHours
} from "./services/multi-source-scraper";
import { ipoAlertsScraper } from "./services/scrapers/ipoalerts";
import apiV1Router from "./routes/api-v1";
import { registerScraperDebugRoutes } from "./routes/scraper-debug";
import {
  createApiKey,
  getUserApiKeys,
  revokeApiKey,
  getUserSubscription,
  createOrUpdateSubscription,
  getUsageStats,
  getTodayUsageCount,
  getTierLimits
} from "./services/api-key-service";
import { scraperLogger } from "./services/scraper-logger";
import { investorGainScraper } from "./services/scrapers/investorgain";

export async function registerRoutes(
  httpServer: Server, // Accept httpServer as parameter
  app: Express
): Promise<Server> { // Return Promise<Server>

  // Setup Auth
  await setupAuth(app);
  registerAuthRoutes(app);

  // Auth middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized - Please sign in" });
    }
    next();
  };

  // Debug Routes - Scraper Testing (development only)
  if (process.env.NODE_ENV !== "production") {
    registerScraperDebugRoutes(app);
  }

  // Public API v1 Routes (for external developers)
  app.use('/api/v1', apiV1Router);

  // === Subscription & API Key Management Routes ===

  // Get current user's subscription
  app.get('/api/subscription', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const subscription = await getUserSubscription(userId);

      if (!subscription) {
        // Create free tier subscription if none exists
        const newSub = await createOrUpdateSubscription(userId, 'free');
        return res.json({
          ...newSub,
          tierLimits: TIER_LIMITS.free,
        });
      }

      const tierLimits = TIER_LIMITS[subscription.tier as keyof typeof TIER_LIMITS] || TIER_LIMITS.free;
      res.json({
        ...subscription,
        tierLimits,
      });
    } catch (error) {
      console.error('Error fetching subscription:', error);
      res.status(500).json({ error: 'Failed to fetch subscription' });
    }
  });

  // Update subscription tier (admin or Stripe webhook would use this)
  app.post('/api/subscription/upgrade', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tier } = req.body;

      if (!['free', 'basic', 'pro', 'enterprise'].includes(tier)) {
        return res.status(400).json({ error: 'Invalid tier' });
      }

      // In production, this would be triggered by Stripe webhook
      const subscription = await createOrUpdateSubscription(userId, tier);
      const tierLimits = TIER_LIMITS[tier as keyof typeof TIER_LIMITS];

      res.json({
        ...subscription,
        tierLimits,
        message: `Upgraded to ${tier} tier successfully`,
      });
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      res.status(500).json({ error: 'Failed to upgrade subscription' });
    }
  });

  // Get user's API keys
  app.get('/api/keys', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const keys = await getUserApiKeys(userId);

      // Add usage info for each key
      const keysWithUsage = await Promise.all(keys.map(async (key) => {
        const todayUsage = await getTodayUsageCount(key.id);
        const limits = getTierLimits(key.tier);
        return {
          id: key.id,
          name: key.name,
          keyPrefix: key.keyPrefix,
          tier: key.tier,
          isActive: key.isActive,
          lastUsedAt: key.lastUsedAt,
          createdAt: key.createdAt,
          todayUsage,
          dailyLimit: limits.apiCallsPerDay,
        };
      }));

      res.json(keysWithUsage);
    } catch (error) {
      console.error('Error fetching API keys:', error);
      res.status(500).json({ error: 'Failed to fetch API keys' });
    }
  });

  // Create new API key
  app.post('/api/keys', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { name } = req.body;

      if (!name || typeof name !== 'string' || name.length < 1) {
        return res.status(400).json({ error: 'Key name is required' });
      }

      // Check if user already has too many keys (max 5 for free, 10 for paid)
      const existingKeys = await getUserApiKeys(userId);
      const subscription = await getUserSubscription(userId);
      const maxKeys = subscription?.tier === 'free' ? 2 : 10;

      if (existingKeys.length >= maxKeys) {
        return res.status(400).json({
          error: `Maximum ${maxKeys} API keys allowed for your tier`,
          upgradeMessage: subscription?.tier === 'free' ? 'Upgrade to create more API keys' : undefined,
        });
      }

      const { apiKey, plainKey } = await createApiKey(userId, name);

      res.json({
        message: 'API key created successfully',
        key: {
          id: apiKey.id,
          name: apiKey.name,
          keyPrefix: apiKey.keyPrefix,
          tier: apiKey.tier,
          createdAt: apiKey.createdAt,
        },
        plainKey, // Only shown once!
        warning: 'Save this key now. You will not be able to see it again.',
      });
    } catch (error) {
      console.error('Error creating API key:', error);
      res.status(500).json({ error: 'Failed to create API key' });
    }
  });

  // Revoke API key
  app.delete('/api/keys/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const keyId = parseInt(req.params.id);

      if (isNaN(keyId)) {
        return res.status(400).json({ error: 'Invalid key ID' });
      }

      const success = await revokeApiKey(keyId, userId);

      if (!success) {
        return res.status(404).json({ error: 'API key not found or already revoked' });
      }

      res.json({ message: 'API key revoked successfully' });
    } catch (error) {
      console.error('Error revoking API key:', error);
      res.status(500).json({ error: 'Failed to revoke API key' });
    }
  });

  // Get API usage stats
  app.get('/api/usage', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const days = Math.min(parseInt(req.query.days as string) || 30, 90);

      const stats = await getUsageStats(userId, days);

      res.json({
        stats,
        summary: {
          totalCalls: stats.reduce((sum, s) => sum + (s.callCount || 0), 0),
          totalErrors: stats.reduce((sum, s) => sum + (s.errorCount || 0), 0),
          avgResponseTime: stats.length > 0
            ? stats.reduce((sum, s) => sum + (s.avgResponseTimeMs || 0), 0) / stats.length
            : 0,
        },
      });
    } catch (error) {
      console.error('Error fetching usage stats:', error);
      res.status(500).json({ error: 'Failed to fetch usage stats' });
    }
  });

  // Get available tiers info
  app.get('/api/tiers', (req, res) => {
    res.json({
      tiers: Object.entries(TIER_LIMITS).map(([name, limits]) => ({
        name,
        ...limits,
        features: getFeatureList(name),
      })),
    });
  });

  // Helper function for tier features
  function getFeatureList(tier: string) {
    const features: Record<string, string[]> = {
      free: [
        'Upcoming IPO list (daily refresh)',
        '10 API calls/day',
        'Email digests',
        'Community support',
      ],
      basic: [
        'Everything in Free +',
        'Live subscription data (30min delay)',
        'GMP data (hourly)',
        '100 API calls/day',
        'Email alerts',
      ],
      pro: [
        'Everything in Basic +',
        'Real-time alerts (Telegram/Email)',
        'Live subscription (15min updates)',
        'GMP tracking + trend analysis',
        '10,000 API calls/day',
        'Webhooks support',
        'Historical data (2 years)',
        'Priority support',
      ],
      enterprise: [
        'Everything in Pro +',
        'Unlimited API calls',
        'Custom webhooks',
        'White-label API',
        'SLA guarantee (99.9% uptime)',
        'Dedicated support',
        'Custom data feeds',
      ],
    };
    return features[tier] || [];
  }

  // IPO Routes
  app.get(api.ipos.list.path, async (req, res) => {
    const status = req.query.status as string | undefined;
    const sector = req.query.sector as string | undefined;
    const ipos = await storage.getIpos(status, sector);
    res.json(ipos);
  });

  app.get(api.ipos.get.path, async (req, res) => {
    const ipo = await storage.getIpo(Number(req.params.id));
    if (!ipo) {
      return res.status(404).json({ message: "IPO not found" });
    }
    res.json(ipo);
  });

  // Watchlist Routes
  app.get(api.watchlist.list.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims.sub;
    const watchlist = await storage.getWatchlist(userId);
    res.json(watchlist);
  });

  app.post(api.watchlist.add.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const { ipoId } = api.watchlist.add.input.parse(req.body);
      const userId = (req.user as any).claims.sub;

      const ipo = await storage.getIpo(ipoId);
      if (!ipo) {
        return res.status(404).json({ message: "IPO not found" });
      }

      const item = await storage.addToWatchlist(userId, ipoId);

      // Generate timeline events for the watchlisted IPO
      const existingTimeline = await storage.getIpoTimeline(ipoId);
      if (existingTimeline.length === 0 && ipo.expectedDate) {
        const baseDate = new Date(ipo.expectedDate);
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
            isConfirmed: event.offsetDays <= 0,
          });
        }
      }

      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.')
        });
      }
      throw err;
    }
  });

  app.delete(api.watchlist.remove.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims.sub;
    await storage.removeFromWatchlist(userId, Number(req.params.id));
    res.status(204).send();
  });

  // Admin/Sync Routes - Protected by authentication
  app.get("/api/admin/sync/test", requireAuth, async (req, res) => {
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

  app.post("/api/admin/sync", requireAuth, async (req, res) => {
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

      // Prepare IPOs with InvestorGain data
      for (const ipo of scrapedIpos) {
        const normalizedName = ipo.companyName.toLowerCase().replace(/[^a-z0-9]/g, "");
        const igMatch = igMap.get(normalizedName) || igMap.get(ipo.symbol.toLowerCase());

        if (igMatch) {
          ipo.investorGainId = igMatch.investorGainId ?? null;
          ipo.gmp = igMatch.gmp ?? ipo.gmp;
          ipo.basisOfAllotmentDate = igMatch.basisOfAllotmentDate ?? ipo.basisOfAllotmentDate;
        }
      }

      // Check existing symbols to calculate created/updated counts
      const allExistingIpos = await storage.getIpos();
      const existingSymbols = new Set(allExistingIpos.map(i => i.symbol));

      for (const ipo of scrapedIpos) {
        if (existingSymbols.has(ipo.symbol)) {
          updated++;
        } else {
          created++;
        }
      }

      // Batch Upsert IPOs
      const savedIpos = await storage.batchUpsertIpos(scrapedIpos);
      const savedIpoIds = savedIpos.map(i => i.id);

      // Batch fetch related data
      const [existingPeersMap, existingFundsMap, existingTimelineMap] = await Promise.all([
        storage.batchGetPeerCompanies(savedIpoIds),
        storage.batchGetFundUtilization(savedIpoIds),
        storage.batchGetIpoTimeline(savedIpoIds),
      ]);

      const peersToAdd: InsertPeerCompany[] = [];
      const gmpHistoryToAdd: InsertGmpHistory[] = [];
      const fundsToAdd: InsertFundUtilization[] = [];
      const timelineEventsToAdd: InsertIpoTimeline[] = [];

      for (const savedIpo of savedIpos) {
        const ipoId = savedIpo.id;
        const sector = savedIpo.sector || "Industrial";

        // Peers
        const existingPeers = existingPeersMap.get(ipoId) || [];
        if (existingPeers.length === 0) {
          const peers = generatePeerCompanies(ipoId, sector);
          peersToAdd.push(...peers);
          analyticsAdded++;
        }

        // GMP History
        if (savedIpo.gmp !== null) {
          gmpHistoryToAdd.push({
            ipoId,
            gmp: savedIpo.gmp,
            gmpPercentage: savedIpo.gmp * 0.8,
          });
        }

        // Fund Utilization
        const existingFunds = existingFundsMap.get(ipoId) || [];
        if (existingFunds.length === 0) {
          const funds = generateFundUtilization(ipoId);
          fundsToAdd.push(...funds);
        }

        // Timeline
        const existingTimeline = existingTimelineMap.get(ipoId) || [];
        if (existingTimeline.length === 0) {
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
            timelineEventsToAdd.push({
              ipoId,
              eventType: event.type,
              eventDate: eventDate.toISOString().split('T')[0],
              description: event.description,
              isConfirmed: savedIpo.expectedDate ? event.offsetDays <= 0 : false,
            });
          }
        }
      }

      // Batch Insert Related Data
      await Promise.all([
        peersToAdd.length > 0 ? storage.batchAddPeerCompanies(peersToAdd) : Promise.resolve(),
        gmpHistoryToAdd.length > 0 ? storage.batchAddGmpHistory(gmpHistoryToAdd) : Promise.resolve(),
        fundsToAdd.length > 0 ? storage.batchAddFundUtilization(fundsToAdd) : Promise.resolve(),
        timelineEventsToAdd.length > 0 ? storage.batchAddTimelineEvents(timelineEventsToAdd) : Promise.resolve(),
      ]);

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

  app.get("/api/admin/stats", requireAuth, async (req, res) => {
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

  app.post("/api/admin/sync/clean", requireAuth, async (req, res) => {
    try {
      console.log("🧹 Starting clean sync - marking old IPOs as listed...");

      const markedCount = await storage.markAllAsListed();
      console.log(`Marked ${markedCount} IPOs as listed`);

      console.log("🔄 Fetching fresh IPO data...");
      const scrapedIpos = await scrapeAndTransformIPOs();

      let created = 0;
      let updated = 0;

      // Check existing symbols to calculate created/updated counts
      const allExistingIpos = await storage.getIpos();
      const existingSymbols = new Set(allExistingIpos.map(i => i.symbol));

      for (const ipo of scrapedIpos) {
        if (existingSymbols.has(ipo.symbol)) {
          updated++;
        } else {
          created++;
        }
      }

      await storage.batchUpsertIpos(scrapedIpos);

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

  // === Data Scheduler Routes ===
  app.get("/api/scheduler/status", async (req, res) => {
    const status = getSchedulerStatus();
    res.json(status);
  });

  app.post("/api/scheduler/start", requireAuth, async (req, res) => {
    startScheduler();
    res.json({ success: true, message: "Scheduler started" });
  });

  app.post("/api/scheduler/stop", requireAuth, async (req, res) => {
    stopScheduler();
    res.json({ success: true, message: "Scheduler stopped" });
  });

  app.post("/api/scheduler/poll", requireAuth, async (req, res) => {
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

  app.get("/api/scheduler/alerts", async (req, res) => {
    const limit = Number(req.query.limit) || 20;
    const alerts = getRecentAlerts(limit);
    res.json(alerts);
  });

  app.delete("/api/scheduler/alerts", requireAuth, async (req, res) => {
    clearAlerts();
    res.json({ success: true, message: "Alerts cleared" });
  });

  app.get("/api/ipoalerts/usage", async (req, res) => {
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
    app.post("/api/ipoalerts/import-all", async (_req, res) => {
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
    app.post("/api/ipoalerts/test", async (req, res) => {
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

  // === Multi-Source Data Routes ===
  app.get("/api/data/subscription/live", async (req, res) => {
    try {
      const data = await fetchAggregatedSubscription();
      res.json({
        success: true,
        isBiddingHours: isBiddingHours(),
        timestamp: new Date(),
        data,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch subscription data"
      });
    }
  });

  app.get("/api/data/gmp/live", async (req, res) => {
    try {
      const data = await scrapeGmpFromMultipleSources();
      res.json({
        success: true,
        timestamp: new Date(),
        data,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch GMP data"
      });
    }
  });

  app.get("/api/data/calendar", async (req, res) => {
    try {
      const data = await scrapeGrowwCalendar();
      res.json({
        success: true,
        timestamp: new Date(),
        data,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch calendar data"
      });
    }
  });

  // AI Analysis Routes
  app.post("/api/ipos/:id/analyze", requireAuth, async (req, res) => {
    try {
      const ipo = await storage.getIpo(Number(req.params.id));
      if (!ipo) {
        return res.status(404).json({ message: "IPO not found" });
      }

      const analysis = await analyzeIpo(ipo);

      // Update IPO with AI analysis
      const updated = await storage.updateIpo(ipo.id, {
        aiSummary: analysis.summary,
        aiRecommendation: analysis.recommendation,
      });

      res.json({
        success: true,
        analysis,
        ipo: updated,
      });
    } catch (error) {
      console.error("AI analysis error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Analysis failed"
      });
    }
  });

  // Alert Preferences Routes
  app.get("/api/alerts/preferences", requireAuth, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const prefs = await storage.getAlertPreferences(userId);
    res.json(prefs || {
      emailEnabled: false,
      alertOnNewIpo: true,
      alertOnGmpChange: true,
      alertOnOpenDate: true,
      alertOnWatchlistOnly: false,
    });
  });

  app.post("/api/alerts/preferences", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const validatedData = insertAlertPreferencesSchema.partial().parse(req.body);
      const prefs = await storage.upsertAlertPreferences(userId, validatedData);
      res.json(prefs);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.get("/api/alerts/logs", requireAuth, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const logs = await storage.getAlertLogs(userId, 50);
    res.json(logs);
  });

  // Test alert sending (admin only)
  app.post("/api/admin/test-alert/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
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

  // Scraper Logger Routes
  app.get("/api/admin/scraper-logs", requireAuth, async (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 50, 200);
      const logs = await scraperLogger.getRecentLogs(limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch scraper logs" });
    }
  });

  app.get("/api/admin/scraper-logs/source/:source", requireAuth, async (req, res) => {
    try {
      const source = req.params.source as any;
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const logs = await scraperLogger.getLogsBySource(source, limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch source logs" });
    }
  });

  app.get("/api/admin/scraper-stats", requireAuth, async (req, res) => {
    try {
      const hoursBack = Number(req.query.hours) || 24;
      const stats = await scraperLogger.getSourceStats(hoursBack);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch scraper stats" });
    }
  });

  app.get("/api/admin/scraper-health", requireAuth, async (req, res) => {
    try {
      const health = await scraperLogger.getHealthStatus();
      res.json(health);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch health status" });
    }
  });

  app.post("/api/admin/sync-investorgain-ids", requireAuth, async (req, res) => {
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

  // GMP History Routes (from database)
  app.get("/api/ipos/:id/gmp-history", async (req, res) => {
    const ipoId = Number(req.params.id);
    const days = Number(req.query.days) || 7;
    const history = await storage.getGmpHistory(ipoId, days);
    res.json(history);
  });

  // Live GMP History from InvestorGain API
  app.get("/api/ipos/:id/gmp-history/live", async (req, res) => {
    try {
      const ipoId = Number(req.params.id);
      const ipo = await storage.getIpo(ipoId);

      if (!ipo || !ipo.investorGainId) {
        return res.json([]);
      }

      const history = await investorGainScraper.getGmpHistory(ipo.investorGainId);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch GMP history" });
    }
  });

  // Live Subscription Status from InvestorGain API
  app.get("/api/ipos/:id/subscription/live", async (req, res) => {
    try {
      const ipoId = Number(req.params.id);
      const ipo = await storage.getIpo(ipoId);

      if (!ipo || !ipo.investorGainId) {
        return res.json(null);
      }

      const subscription = await investorGainScraper.getSubscriptionDetails(ipo.investorGainId);
      res.json(subscription);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch subscription data" });
    }
  });

  // IPO Activity Dates
  app.get("/api/ipos/:id/activity-dates", async (req, res) => {
    try {
      const ipoId = Number(req.params.id);
      const ipo = await storage.getIpo(ipoId);

      if (!ipo) {
        return res.status(404).json({ error: "IPO not found" });
      }

      res.json({
        biddingStartDate: ipo.expectedDate,
        biddingEndDate: null,
        basisOfAllotmentDate: ipo.basisOfAllotmentDate,
        refundsInitiationDate: ipo.refundsInitiationDate,
        creditToDematDate: ipo.creditToDematDate,
        listingDate: null,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch activity dates" });
    }
  });

  // Peer Comparison Routes
  app.get("/api/ipos/:id/peers", async (req, res) => {
    const ipoId = Number(req.params.id);
    const peers = await storage.getPeerCompanies(ipoId);
    res.json(peers);
  });

  // Subscription Updates Routes
  app.get("/api/ipos/:id/subscriptions", async (req, res) => {
    const ipoId = Number(req.params.id);
    const updates = await storage.getSubscriptionUpdates(ipoId);
    res.json(updates);
  });

  app.get("/api/ipos/:id/subscription/latest", async (req, res) => {
    const ipoId = Number(req.params.id);
    const latest = await storage.getLatestSubscription(ipoId);
    res.json(latest || null);
  });

  // Fund Utilization Routes
  app.get("/api/ipos/:id/fund-utilization", async (req, res) => {
    const ipoId = Number(req.params.id);
    const utilization = await storage.getFundUtilization(ipoId);
    res.json(utilization);
  });

  // IPO Timeline/Calendar Routes
  app.get("/api/ipos/:id/timeline", async (req, res) => {
    const ipoId = Number(req.params.id);
    const timeline = await storage.getIpoTimeline(ipoId);
    res.json(timeline);
  });

  app.get("/api/calendar/events", async (req, res) => {
    const days = Number(req.query.days) || 30;
    const events = await storage.getAllUpcomingEvents(days);
    res.json(events);
  });

  // Auto-sync from scraper on startup if database is empty
  await autoSyncOnStartup();

  // Always try to update with InvestorGain data
  await syncInvestorGainData();

  // Start the scheduler automatically
  console.log("⏰ Auto-starting data scheduler...");
  startScheduler();

  return httpServer;
}

async function autoSyncOnStartup() {
  const existingIpos = await storage.getIpos();
  if (existingIpos.length === 0) {
    console.log("Database empty - attempting to fetch real IPO data from Chittorgarh...");

    try {
      const scrapedIpos = await scrapeAndTransformIPOs();

      if (scrapedIpos.length > 0) {
        for (const ipo of scrapedIpos) {
          const savedIpo = await storage.createIpo(ipo);

          // Generate analytics data
          const ipoId = savedIpo.id;
          const sector = savedIpo.sector || "Industrial";

          // Generate peer companies
          const peers = generatePeerCompanies(ipoId, sector);
          for (const peer of peers) {
            await storage.addPeerCompany(peer);
          }

          // Generate GMP history (7 days of sample data)
          if (savedIpo.gmp !== null) {
            const gmpHistoryData = generateGmpHistory(ipoId);
            for (const entry of gmpHistoryData) {
              await storage.addGmpHistory(entry);
            }
          }

          // Generate fund utilization
          const funds = generateFundUtilization(ipoId);
          for (const fund of funds) {
            await storage.addFundUtilization(fund);
          }

          // Generate timeline events
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
        console.log(`✅ Auto-synced ${scrapedIpos.length} IPOs with analytics data from Chittorgarh`);
      } else {
        console.log("⚠️ No IPOs found from scraper. Use Admin panel to manually sync.");
      }
    } catch (error) {
      console.error("❌ Auto-sync failed:", error);
      console.log("💡 Use the Admin panel (/admin) to manually sync IPO data.");
    }
  }
}

async function syncInvestorGainData() {
  try {
    console.log("🔄 Syncing InvestorGain data...");
    const igResult = await investorGainScraper.getIpos();

    if (!igResult.success || igResult.data.length === 0) {
      console.log("⚠️ No InvestorGain data available");
      return;
    }

    console.log(`📊 Found ${igResult.data.length} IPOs from InvestorGain`);

    const dbIpos = await storage.getIpos();
    let updatedCount = 0;

    for (const dbIpo of dbIpos) {
      const normalizedDbName = dbIpo.companyName.toLowerCase().replace(/[^a-z0-9]/g, "");

      const match = igResult.data.find(igIpo => {
        const normalizedIgName = igIpo.companyName.toLowerCase().replace(/[^a-z0-9]/g, "");
        return normalizedDbName.includes(normalizedIgName) ||
          normalizedIgName.includes(normalizedDbName) ||
          normalizedDbName === normalizedIgName;
      });

      if (match) {
        const updates: any = {};
        if (match.investorGainId && !dbIpo.investorGainId) {
          updates.investorGainId = match.investorGainId;
        }
        if (dbIpo.gmp === 8377 || (match.gmp !== undefined && match.gmp !== dbIpo.gmp)) {
          updates.gmp = match.gmp ?? 0;
        }
        if (match.basisOfAllotmentDate && !dbIpo.basisOfAllotmentDate) {
          updates.basisOfAllotmentDate = match.basisOfAllotmentDate;
        }

        if (Object.keys(updates).length > 0) {
          await storage.updateIpo(dbIpo.id, updates);
          updatedCount++;
        }
      }
    }

    console.log(`✅ Updated ${updatedCount} IPOs with InvestorGain data`);
  } catch (error) {
    console.error("❌ InvestorGain sync failed:", error);
  }
}
