import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { scrapeAndTransformIPOs, testScraper, generatePeerCompanies, generateGmpHistory, generateFundUtilization } from "./services/scraper";
import { startScheduler } from "./services/data-scheduler";
import apiV1Router from "./routes/api-v1";
import { registerScraperDebugRoutes } from "./routes/scraper-debug";
import { investorGainScraper } from "./services/scrapers/investorgain";

// Import new route modules
import { iposRouter } from "./routes/ipos";
import { subscriptionRouter } from "./routes/subscription";
import { watchlistRouter } from "./routes/watchlist";
import { dataRouter } from "./routes/data";
import { adminRouter } from "./routes/admin";
import { schedulerRouter } from "./routes/scheduler";
import { alertsRouter } from "./routes/alerts";
import { aiAnalysisRouter } from "./routes/ai-analysis";

export async function registerRoutes(
  httpServer: Server, // Accept httpServer as parameter
  app: Express
): Promise<Server> { // Return Promise<Server>

  // Setup Auth
  await setupAuth(app);
  registerAuthRoutes(app);

  // Debug Routes - Scraper Testing (development only)
  if (process.env.NODE_ENV !== "production") {
    registerScraperDebugRoutes(app);
  }

  // Public API v1 Routes (for external developers)
  app.use('/api/v1', apiV1Router);

  // Register separated routes
  app.use(iposRouter);
  app.use(subscriptionRouter);
  app.use(watchlistRouter);
  app.use(dataRouter);
  app.use(adminRouter);
  app.use(schedulerRouter);
  app.use(alertsRouter);
  app.use(aiAnalysisRouter);

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
