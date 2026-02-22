import { storage } from "../storage";
import { scrapeAndTransformIPOs, generatePeerCompanies, generateGmpHistory, generateFundUtilization } from "./scraper";
import { investorGainScraper } from "./scrapers/investorgain";
import { type InsertIpo, type InsertGmpHistory, type InsertPeerCompany, type InsertFundUtilization, type InsertIpoTimeline } from "@shared/schema";

export interface SyncResult {
  success: boolean;
  message: string;
  created: number;
  updated: number;
  analyticsAdded: number;
  total: number;
  error?: string;
}

export async function syncIpos(): Promise<SyncResult> {
  console.log("🔄 Starting IPO data sync (optimized)...");

  try {
    // 1. Scrape Data
    const scrapedIpos = await scrapeAndTransformIPOs();

    // 2. Fetch IG Data
    console.log("🔄 Fetching InvestorGain data...");
    const igResult = await investorGainScraper.getIpos();
    const igIpos = igResult.success ? igResult.data : [];
    console.log(`📊 InvestorGain returned ${igIpos.length} IPOs`);

    // 3. Prepare IG Map
    const igMap = new Map<string, typeof igIpos[0]>();
    for (const igIpo of igIpos) {
      const normalizedName = igIpo.companyName.toLowerCase().replace(/[^a-z0-9]/g, "");
      igMap.set(normalizedName, igIpo);
      igMap.set(igIpo.symbol.toLowerCase(), igIpo);
    }

    // 4. Merge IG Data
    for (const ipo of scrapedIpos) {
      const normalizedName = ipo.companyName.toLowerCase().replace(/[^a-z0-9]/g, "");
      const igMatch = igMap.get(normalizedName) || igMap.get(ipo.symbol.toLowerCase());

      if (igMatch) {
        ipo.investorGainId = igMatch.investorGainId ?? null;
        ipo.gmp = igMatch.gmp ?? ipo.gmp;
        ipo.basisOfAllotmentDate = igMatch.basisOfAllotmentDate ?? ipo.basisOfAllotmentDate;
      }
    }

    // 5. Fetch Existing State (IDs) to calculate created/updated
    // Note: This is an optimization to avoid per-row queries.
    // We could rely on bulkUpsert return values but it doesn't distinguish insert vs update easily
    // without comparing to previous state.
    const existingIpos = await storage.getIpos();
    const existingSymbolMap = new Map(existingIpos.map(i => [i.symbol, i]));

    // 6. Bulk Upsert IPOs
    const savedIpos = await storage.bulkUpsertIpos(scrapedIpos);

    // 7. Process Analytics
    let created = 0;
    let updated = 0;
    let analyticsAdded = 0;

    // Bulk data containers
    const peersToAdd: InsertPeerCompany[] = [];
    const fundsToAdd: InsertFundUtilization[] = [];
    const timelineToAdd: InsertIpoTimeline[] = [];
    const gmpHistoryToAdd: InsertGmpHistory[] = [];

    // Fetch existing analytics sets
    const [existingPeerIds, existingFundIds, existingTimelineIds] = await Promise.all([
      storage.getAllPeerCompanyIpoIds(),
      storage.getAllFundUtilizationIpoIds(),
      storage.getAllTimelineIpoIds()
    ]);

    for (const savedIpo of savedIpos) {
      const wasExisting = existingSymbolMap.has(savedIpo.symbol);
      if (wasExisting) {
        updated++;
      } else {
        created++;
      }

      const ipoId = savedIpo.id;
      const sector = savedIpo.sector || "Industrial";

      // Peers
      if (!existingPeerIds.has(ipoId)) {
          const peers = generatePeerCompanies(ipoId, sector);
          // Cast strictly to avoid type issues, relying on Drizzle to filter keys
          peersToAdd.push(...(peers as InsertPeerCompany[]));
          // Assuming generatePeerCompanies always returns something if called,
          // we count "analytics added" once per IPO that needed it.
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

      // Funds
      if (!existingFundIds.has(ipoId)) {
          const funds = generateFundUtilization(ipoId);
          fundsToAdd.push(...(funds as InsertFundUtilization[]));
      }

      // Timeline
      if (!existingTimelineIds.has(ipoId)) {
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

              timelineToAdd.push({
                ipoId,
                eventType: event.type,
                eventDate: eventDate.toISOString().split('T')[0],
                description: event.description,
                isConfirmed: savedIpo.expectedDate ? event.offsetDays <= 0 : false,
              });
            }
      }
    }

    // 8. Bulk Insert Analytics
    await Promise.all([
      storage.bulkAddPeerCompanies(peersToAdd),
      storage.bulkAddFundUtilization(fundsToAdd),
      storage.bulkAddTimelineEvents(timelineToAdd),
      storage.bulkAddGmpHistory(gmpHistoryToAdd)
    ]);

    console.log(`✅ Sync complete: ${created} created, ${updated} updated, ${analyticsAdded} analytics generated`);

    return {
      success: true,
      message: `Synced ${scrapedIpos.length} IPOs with analytics data`,
      created,
      updated,
      analyticsAdded,
      total: scrapedIpos.length,
    };
  } catch (error) {
    console.error("Sync failed:", error);
    throw error;
  }
}
