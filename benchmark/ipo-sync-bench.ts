import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../shared/schema";
import { DatabaseStorage } from "../server/storage";
import { type InsertIpo } from "../shared/schema";

// Setup Test DB
const sqlite = new Database(":memory:");
const db = drizzle(sqlite, { schema });

// Initialize Schema (Simplified for benchmark needs)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS ipos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL UNIQUE,
    company_name TEXT NOT NULL,
    price_range TEXT NOT NULL,
    total_shares TEXT,
    expected_date TEXT,
    status TEXT NOT NULL,
    description TEXT,
    sector TEXT,
    revenue_growth REAL,
    ebitda_margin REAL,
    pat_margin REAL,
    roe REAL,
    roce REAL,
    debt_to_equity REAL,
    pe_ratio REAL,
    pb_ratio REAL,
    sector_pe_median REAL,
    issue_size TEXT,
    fresh_issue REAL,
    ofs_ratio REAL,
    lot_size INTEGER,
    min_investment TEXT,
    gmp INTEGER,
    subscription_qib REAL,
    subscription_hni REAL,
    subscription_retail REAL,
    subscription_nii REAL,
    investor_gain_id INTEGER,
    basis_of_allotment_date TEXT,
    refunds_initiation_date TEXT,
    credit_to_demat_date TEXT,
    promoter_holding REAL,
    post_ipo_promoter_holding REAL,
    fundamentals_score REAL,
    valuation_score REAL,
    governance_score REAL,
    overall_score REAL,
    risk_level TEXT,
    red_flags TEXT,
    pros TEXT,
    ai_summary TEXT,
    ai_recommendation TEXT,
    created_at INTEGER,
    updated_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS peer_companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ipo_id INTEGER NOT NULL REFERENCES ipos(id),
    company_name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    market_cap REAL,
    pe_ratio REAL,
    pb_ratio REAL,
    roe REAL,
    roce REAL,
    revenue_growth REAL,
    ebitda_margin REAL,
    debt_to_equity REAL,
    created_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS gmp_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ipo_id INTEGER NOT NULL REFERENCES ipos(id),
    gmp INTEGER NOT NULL,
    gmp_percentage REAL,
    recorded_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS fund_utilization (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ipo_id INTEGER NOT NULL REFERENCES ipos(id),
    category TEXT NOT NULL,
    planned_amount REAL,
    planned_percentage REAL,
    actual_amount REAL,
    actual_percentage REAL,
    status TEXT,
    notes TEXT,
    created_at INTEGER,
    updated_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS ipo_timeline (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ipo_id INTEGER NOT NULL REFERENCES ipos(id),
    event_type TEXT NOT NULL,
    event_date TEXT,
    event_time TEXT,
    description TEXT,
    is_confirmed INTEGER,
    created_at INTEGER
  );
`);

const storage = new DatabaseStorage(db);

// Mock data generators
function generateMockScrapedIpos(count: number): InsertIpo[] {
  return Array.from({ length: count }, (_, i) => ({
    symbol: `BENCH-${i}`,
    companyName: `Bench Company ${i}`,
    priceRange: "100-200",
    status: "upcoming" as const,
    expectedDate: new Date().toISOString(),
    issueSize: "100 Cr",
    lotSize: 10,
    gmp: 50,
    sector: "Technology",
  }));
}

function generateMockIgData(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    companyName: `Bench Company ${i}`,
    symbol: `BENCH-${i}`,
    investorGainId: 1000 + i,
    gmp: 60,
    basisOfAllotmentDate: "2023-01-01",
  }));
}

// Legacy Logic
async function legacySync(scrapedIpos: InsertIpo[], igData: any[]) {
  const start = performance.now();

  const igMap = new Map<string, any>();
  for (const igIpo of igData) {
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

    // Analytics generation logic
    const ipoId = savedIpo.id;

    const existingPeers = await storage.getPeerCompanies(ipoId);
    if (existingPeers.length === 0) {
      await storage.addPeerCompany({
        ipoId,
        companyName: "Peer A",
        symbol: "PEERA",
        peRatio: 10,
      });
      analyticsAdded++;
    }

    if (savedIpo.gmp !== null) {
      await storage.addGmpHistory({
        ipoId,
        gmp: savedIpo.gmp,
        gmpPercentage: 10,
      });
    }

    const existingFunds = await storage.getFundUtilization(ipoId);
    if (existingFunds.length === 0) {
      await storage.addFundUtilization({
        ipoId,
        category: "Working Capital",
        plannedPercentage: 50
      });
    }

    const existingTimeline = await storage.getIpoTimeline(ipoId);
    if (existingTimeline.length === 0) {
       await storage.addTimelineEvent({
         ipoId,
         eventType: "open_date",
         description: "Opens",
       });
    }
  }

  const end = performance.now();
  return end - start;
}

// Optimized Logic
async function optimizedSync(scrapedIpos: InsertIpo[], igData: any[]) {
  const start = performance.now();

  // 1. Prepare IG Map
  const igMap = new Map<string, any>();
  for (const igIpo of igData) {
    const normalizedName = igIpo.companyName.toLowerCase().replace(/[^a-z0-9]/g, "");
    igMap.set(normalizedName, igIpo);
    igMap.set(igIpo.symbol.toLowerCase(), igIpo);
  }

  // 2. Merge IG Data
  for (const ipo of scrapedIpos) {
    const normalizedName = ipo.companyName.toLowerCase().replace(/[^a-z0-9]/g, "");
    const igMatch = igMap.get(normalizedName) || igMap.get(ipo.symbol.toLowerCase());

    if (igMatch) {
      ipo.investorGainId = igMatch.investorGainId ?? null;
      ipo.gmp = igMatch.gmp ?? ipo.gmp;
      ipo.basisOfAllotmentDate = igMatch.basisOfAllotmentDate ?? ipo.basisOfAllotmentDate;
    }
  }

  // 3. Fetch Existing State
  const existingIpos = await storage.getIpos();
  const existingSymbolMap = new Map(existingIpos.map(i => [i.symbol, i]));

  // 4. Bulk Upsert
  const savedIpos = await storage.bulkUpsertIpos(scrapedIpos);

  // 5. Process Analytics
  let created = 0;
  let updated = 0;

  const peersToAdd: any[] = [];
  const fundsToAdd: any[] = [];
  const timelineToAdd: any[] = [];
  const gmpHistoryToAdd: any[] = [];

  const [existingPeerIds, existingFundIds, existingTimelineIds] = await Promise.all([
    storage.getAllPeerCompanyIpoIds(),
    storage.getAllFundUtilizationIpoIds(),
    storage.getAllTimelineIpoIds()
  ]);

  for (const savedIpo of savedIpos) {
    const wasExisting = existingSymbolMap.has(savedIpo.symbol);
    if (wasExisting) updated++; else created++;

    const ipoId = savedIpo.id;

    if (!existingPeerIds.has(ipoId)) {
        peersToAdd.push({
          ipoId,
          companyName: "Peer A",
          symbol: "PEERA",
          peRatio: 10,
        });
    }

    if (savedIpo.gmp !== null) {
      gmpHistoryToAdd.push({
        ipoId,
        gmp: savedIpo.gmp,
        gmpPercentage: 10,
      });
    }

    if (!existingFundIds.has(ipoId)) {
        fundsToAdd.push({
            ipoId,
            category: "Working Capital",
            plannedPercentage: 50
        });
    }

    if (!existingTimelineIds.has(ipoId)) {
        timelineToAdd.push({
            ipoId,
            eventType: "open_date",
            description: "Opens",
        });
    }
  }

  // 6. Bulk Insert Analytics
  await Promise.all([
    storage.bulkAddPeerCompanies(peersToAdd),
    storage.bulkAddFundUtilization(fundsToAdd),
    storage.bulkAddTimelineEvents(timelineToAdd),
    storage.bulkAddGmpHistory(gmpHistoryToAdd)
  ]);

  const end = performance.now();
  return end - start;
}

async function runBenchmark() {
  const count = 50;
  console.log(`Generating ${count} mock records...`);

  const scrapedIpos1 = generateMockScrapedIpos(count);
  const igData1 = generateMockIgData(count);

  const scrapedIpos2 = generateMockScrapedIpos(count);
  const igData2 = generateMockIgData(count);

  console.log("\n--- BENCHMARK 1: FRESH SYNC ---");

  // 1. Run Legacy
  sqlite.exec("DELETE FROM peer_companies; DELETE FROM gmp_history; DELETE FROM fund_utilization; DELETE FROM ipo_timeline; DELETE FROM ipos;");
  console.log("Running Legacy Sync...");
  const legacyTime = await legacySync(JSON.parse(JSON.stringify(scrapedIpos1)), igData1);
  console.log(`Legacy Sync took: ${legacyTime.toFixed(2)}ms`);

  // 2. Run Optimized
  sqlite.exec("DELETE FROM peer_companies; DELETE FROM gmp_history; DELETE FROM fund_utilization; DELETE FROM ipo_timeline; DELETE FROM ipos;");
  console.log("Running Optimized Sync...");
  const optimizedTime = await optimizedSync(JSON.parse(JSON.stringify(scrapedIpos2)), igData2);
  console.log(`Optimized Sync took: ${optimizedTime.toFixed(2)}ms`);

  console.log(`Speedup: ${(legacyTime / optimizedTime).toFixed(2)}x`);

  console.log("\n--- BENCHMARK 2: UPDATE SYNC (Idempotency) ---");

  // Setup existing data
  sqlite.exec("DELETE FROM peer_companies; DELETE FROM gmp_history; DELETE FROM fund_utilization; DELETE FROM ipo_timeline; DELETE FROM ipos;");
  await optimizedSync(JSON.parse(JSON.stringify(scrapedIpos1)), igData1);
  console.log("Initial data loaded.");

  // 1. Run Legacy Update
  console.log("Running Legacy Update...");
  const legacyUpdateTime = await legacySync(JSON.parse(JSON.stringify(scrapedIpos1)), igData1);
  console.log(`Legacy Update took: ${legacyUpdateTime.toFixed(2)}ms`);

  // Reset
  sqlite.exec("DELETE FROM peer_companies; DELETE FROM gmp_history; DELETE FROM fund_utilization; DELETE FROM ipo_timeline; DELETE FROM ipos;");
  await optimizedSync(JSON.parse(JSON.stringify(scrapedIpos1)), igData1);

  // 2. Run Optimized Update
  console.log("Running Optimized Update...");
  const optimizedUpdateTime = await optimizedSync(JSON.parse(JSON.stringify(scrapedIpos1)), igData1);
  console.log(`Optimized Update took: ${optimizedUpdateTime.toFixed(2)}ms`);

  console.log(`Update Speedup: ${(legacyUpdateTime / optimizedUpdateTime).toFixed(2)}x`);
}

runBenchmark().catch(console.error);
