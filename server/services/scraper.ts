import type { InsertIpo } from "@shared/schema";
import { calculateIpoScore } from "./scoring";
import { scraperAggregator } from "./scrapers";
import {
  type IpoData,
  type GmpData,
  type SubscriptionData,
  normalizeSymbol,
  parseDate
} from "./scrapers/base";

/**
 * IPO SCRAPER - UNIFIED ARCHITECTURE
 * 
 * Uses the ScraperAggregator to fetch data from multiple sources including:
 * - Chittorgarh (Mainboard/SME, Subscription, GMP)
 * - InvestorGain (API based, Subscription, GMP)
 * - Groww (Calendar, Subscription)
 * - NSE/BSE (Official data)
 * - IPO Watch & Alerts
 */

export async function scrapeGmpData(): Promise<GmpData[]> {
  console.log("📊 Scraping GMP data via Aggregator...");
  const result = await scraperAggregator.getGmp();
  console.log(`✅ GMP: Found data for ${result.data.length} IPOs from ${result.successfulSources} sources`);
  return result.data;
}

export async function scrapeMainboardIPOs(): Promise<IpoData[]> {
  console.log("📊 Scraping current IPOs via Aggregator...");
  const result = await scraperAggregator.getIpos();
  console.log(`✅ Total unique current IPOs: ${result.data.length} from ${result.successfulSources} sources`);
  return result.data;
}

function generateSector(companyName: string): string {
  const name = companyName.toLowerCase();
  
  if (name.includes("pharma") || name.includes("drug") || name.includes("health") || name.includes("med") || name.includes("care")) {
    return "Healthcare";
  }
  if (name.includes("tech") || name.includes("software") || name.includes("digital") || name.includes("info") || name.includes("it ")) {
    return "Technology";
  }
  if (name.includes("bank") || name.includes("finance") || name.includes("capital") || name.includes("credit") || name.includes("fund") || name.includes("amc")) {
    return "Financial Services";
  }
  if (name.includes("energy") || name.includes("power") || name.includes("solar") || name.includes("electric") || name.includes("coal")) {
    return "Energy";
  }
  if (name.includes("infra") || name.includes("construct") || name.includes("build") || name.includes("real") || name.includes("property")) {
    return "Infrastructure";
  }
  if (name.includes("food") || name.includes("beverage") || name.includes("fmcg") || name.includes("consumer")) {
    return "Consumer Goods";
  }
  if (name.includes("auto") || name.includes("vehicle") || name.includes("motor")) {
    return "Automotive";
  }
  if (name.includes("chemical") || name.includes("material") || name.includes("metal") || name.includes("steel")) {
    return "Materials";
  }
  if (name.includes("retail") || name.includes("mart") || name.includes("store") || name.includes("shop")) {
    return "Retail";
  }
  if (name.includes("kidney") || name.includes("hospital") || name.includes("clinic") || name.includes("diagnostic")) {
    return "Healthcare";
  }
  
  return "Industrial";
}

export async function scrapeAndTransformIPOs(): Promise<InsertIpo[]> {
  console.log("🔄 Starting IPO data collection...");
  
  // 1. Fetch data from all sources in parallel
  const [iposResult, gmpResult, subsResult] = await Promise.all([
    scraperAggregator.getIpos(),
    scraperAggregator.getGmp(),
    scraperAggregator.getSubscriptions()
  ]);
  
  const ipos = iposResult.data;
  const gmpList = gmpResult.data;
  const subsList = subsResult.data;

  // 2. Create maps for faster lookup
  const gmpMap = new Map(gmpList.map(g => [g.symbol, g]));
  const subsMap = new Map(subsList.map(s => [s.symbol, s]));
  
  const transformedIpos: InsertIpo[] = [];
  
  for (const raw of ipos) {
    // Skip closed IPOs that are too old or irrelevant, but keep recently closed ones if needed
    // The aggregator already filters based on source logic, but we can double check status
    if (raw.status === "closed" && (!raw.closeDate || new Date(raw.closeDate) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))) {
      // Skip closed IPOs older than 30 days
      continue;
    }
    
    // Merge GMP data
    const gmpData = gmpMap.get(raw.symbol);
    const gmpValue = gmpData?.gmp ?? raw.gmp ?? 0;
    
    // Merge Subscription data
    const subsData = subsMap.get(raw.symbol);
    const qib = subsData?.qib ?? raw.subscriptionQib ?? 0;
    const nii = subsData?.nii ?? subsData?.hni ?? raw.subscriptionNii ?? raw.subscriptionHni ?? 0;
    const retail = subsData?.retail ?? raw.subscriptionRetail ?? 0;
    
    const sector = raw.sector || generateSector(raw.companyName);
    
    // Ensure dates are strings or null
    const expectedDate = raw.openDate || raw.closeDate || new Date().toISOString().split("T")[0];
    
    // Normalize issue size
    let issueSizeStr = "TBA";
    if (raw.issueSize && raw.issueSize !== "TBA") {
      issueSizeStr = raw.issueSize;
    } else if (raw.issueSizeCrores) {
      issueSizeStr = `${raw.issueSizeCrores} Cr`;
    }
    
    const ipo: InsertIpo = {
      symbol: raw.symbol,
      companyName: raw.companyName,
      priceRange: raw.priceRange || "TBA",
      sector,
      status: raw.status,
      expectedDate,
      lotSize: raw.lotSize || 1,
      issueSize: issueSizeStr,
      gmp: gmpValue,
      subscriptionQib: qib,
      subscriptionHni: nii,
      subscriptionNii: nii,
      subscriptionRetail: retail,

      // Additional fields from IpoData
      revenueGrowth: raw.revenueGrowth,
      ebitdaMargin: raw.ebitdaMargin,
      patMargin: raw.patMargin,
      roe: raw.roe,
      roce: raw.roce,
      debtToEquity: raw.debtToEquity,
      peRatio: raw.peRatio,
      pbRatio: raw.pbRatio,
      sectorPeMedian: raw.sectorPeMedian,
      promoterHolding: raw.promoterHolding,
      postIpoPromoterHolding: raw.postIpoPromoterHolding,
      investorGainId: raw.investorGainId,
      basisOfAllotmentDate: raw.basisOfAllotmentDate,
      refundsInitiationDate: raw.refundsInitiationDate,
      creditToDematDate: raw.creditToDematDate,
    };
    
    // Calculate scores
    const scores = calculateIpoScore(ipo);
    ipo.fundamentalsScore = scores.fundamentalsScore;
    ipo.valuationScore = scores.valuationScore;
    ipo.governanceScore = scores.governanceScore;
    ipo.overallScore = scores.overallScore;
    ipo.riskLevel = scores.riskLevel;
    // Convert arrays to JSON strings for SQLite
    ipo.redFlags = scores.redFlags.length > 0 ? JSON.stringify(scores.redFlags) : undefined;
    ipo.pros = scores.pros.length > 0 ? JSON.stringify(scores.pros) : undefined;
    
    transformedIpos.push(ipo);
  }
  
  console.log(`✅ Transformed ${transformedIpos.length} IPOs for database`);
  return transformedIpos;
}

export async function testConnection(): Promise<boolean> {
  try {
    console.log("🔍 Testing connections to data sources via Aggregator...");
    const results = await scraperAggregator.testAllConnections();
    const successCount = results.filter(r => r.success).length;
    console.log(`✅ Connection test: ${successCount}/${results.length} sources available`);
    return successCount > 0;
  } catch (error) {
    console.error("Connection test failed:", error);
    return false;
  }
}

export const testScraper = testConnection;

export function generatePeerCompanies(ipoId: number, sector?: string): any[] {
  const sectorName = sector || "Industrial";
  const peers = [
    { ipoId, companyName: `${sectorName} Peer A`, symbol: "PEERA", peRatio: 25, roe: 15, roce: 18, revenueGrowth: 12, ebitdaMargin: 20, isIpoCompany: false },
    { ipoId, companyName: `${sectorName} Peer B`, symbol: "PEERB", peRatio: 22, roe: 18, roce: 20, revenueGrowth: 15, ebitdaMargin: 22, isIpoCompany: false },
  ];
  return peers;
}

export function generateGmpHistory(ipoId: number): any[] {
  const today = new Date();
  const history = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    history.push({
      ipoId,
      recordDate: date.toISOString().split("T")[0],
      gmpValue: Math.floor(Math.random() * 50) + 10,
    });
  }
  return history;
}

export function generateFundUtilization(ipoId: number): any[] {
  return [
    { ipoId, category: "Working Capital", percentage: 35 },
    { ipoId, category: "Capital Expenditure", percentage: 30 },
    { ipoId, category: "Debt Repayment", percentage: 20 },
    { ipoId, category: "General Corporate", percentage: 15 },
  ];
}
