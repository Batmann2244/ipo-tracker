import axios from "axios";
import * as cheerio from "cheerio";
import { chittorgarhScraper } from "./scrapers/chittorgarh";
import { ipoWatchScraper } from "./scrapers/ipowatch";

const headers = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
};

export interface SubscriptionData {
  symbol: string;
  companyName: string;
  qib: number | null;
  hni: number | null;
  retail: number | null;
  total: number | null;
  source: string;
  timestamp: Date;
}

export interface GmpData {
  symbol: string;
  companyName: string;
  gmp: number;
  expectedListing: number | null;
  trend: "rising" | "falling" | "stable";
  source: string;
  timestamp: Date;
}

export interface LivePriceData {
  symbol: string;
  companyName: string;
  cmp: number;
  listingPrice: number | null;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: Date;
}

export interface IpoCalendarData {
  companyName: string;
  symbol: string;
  openDate: string | null;
  closeDate: string | null;
  priceRange: string;
  issueSize: string;
  lotSize: number | null;
  status: "upcoming" | "open" | "closed" | "listed";
  source: string;
}

async function fetchPage(url: string, timeout = 30000): Promise<string> {
  try {
    const response = await axios.get(url, { headers, timeout });
    return response.data;
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    throw error;
  }
}

function normalizeSymbol(name: string): string {
  return name
    .replace(/\s+(Ltd|Limited|IPO|India|Private|Pvt|Technologies|Tech|Industries|Infra)\.?/gi, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 12);
}

function parseSubscriptionValue(text: string): number | null {
  const match = text.match(/[\d.]+/);
  if (match) {
    return parseFloat(match[0]);
  }
  return null;
}

export async function scrapeChittorgarhSubscription(): Promise<SubscriptionData[]> {
  console.log("📊 [Chittorgarh] Fetching subscription data...");

  try {
    const result = await chittorgarhScraper.getSubscriptions();

    if (!result.success) {
      console.error("[Chittorgarh] Subscription fetch failed:", result.error);
      return [];
    }

    const results: SubscriptionData[] = result.data.map((item) => ({
      symbol: item.symbol,
      companyName: item.companyName,
      qib: item.qib,
      hni: item.hni,
      retail: item.retail,
      total: item.total,
      source: "chittorgarh",
      timestamp: result.timestamp || new Date(),
    }));

    console.log(`✅ [Chittorgarh] Found subscription data for ${results.length} IPOs`);
    return results;
  } catch (error) {
    console.error("[Chittorgarh] Subscription fetch failed:", error);
    return [];
  }
}

export async function scrapeInvestorGainSubscription(): Promise<SubscriptionData[]> {
  console.log("📊 [InvestorGain] Fetching subscription data...");
  const url = "https://www.investorgain.com/report/ipo-subscription-live/333/all/";

  try {
    const html = await fetchPage(url);
    const $ = cheerio.load(html);
    const results: SubscriptionData[] = [];

    $("table").find("tr").each((_, row) => {
      const cells = $(row).find("td");
      if (cells.length < 5) return;

      const companyName = cells.eq(0).text().trim();
      if (!companyName || companyName.length < 3) return;
      if (companyName.toLowerCase().includes("company") || companyName.toLowerCase().includes("ipo")) return;

      const symbol = normalizeSymbol(companyName);
      const qib = parseSubscriptionValue(cells.eq(1).text());
      const hni = parseSubscriptionValue(cells.eq(2).text());
      const retail = parseSubscriptionValue(cells.eq(3).text());
      const total = parseSubscriptionValue(cells.eq(4).text());

      if (symbol && symbol.length >= 3) {
        results.push({
          symbol,
          companyName: companyName.replace(/\s+IPO$/i, "").trim(),
          qib,
          hni,
          retail,
          total,
          source: "investorgain",
          timestamp: new Date(),
        });
      }
    });

    console.log(`✅ [InvestorGain] Found subscription data for ${results.length} IPOs`);
    return results;
  } catch (error) {
    console.error("[InvestorGain] Subscription fetch failed:", error);
    return [];
  }
}

export async function scrapeNseBidDetails(): Promise<SubscriptionData[]> {
  console.log("📊 [NSE] Fetching bid details...");

  try {
    const response = await axios.get("https://www.nseindia.com/api/ipo-current-issue", {
      headers: {
        ...headers,
        "Accept": "application/json",
      },
      timeout: 30000,
    });

    const results: SubscriptionData[] = [];
    const data = response.data;

    if (Array.isArray(data)) {
      for (const ipo of data) {
        const companyName = ipo.companyName || ipo.symbol || "";
        const symbol = normalizeSymbol(companyName);

        if (symbol && symbol.length >= 3) {
          results.push({
            symbol,
            companyName,
            qib: ipo.subscriptionQIB || null,
            hni: ipo.subscriptionHNI || null,
            retail: ipo.subscriptionRetail || null,
            total: ipo.totalSubscription || null,
            source: "nse",
            timestamp: new Date(),
          });
        }
      }
    }

    console.log(`✅ [NSE] Found bid data for ${results.length} IPOs`);
    return results;
  } catch (error) {
    console.error("[NSE] Bid details fetch failed:", error);
    return [];
  }
}

export async function scrapeGmpFromMultipleSources(): Promise<GmpData[]> {
  console.log("💹 Fetching GMP from multiple sources...");

  const gmpUrls = [
    "https://www.chittorgarh.com/report/grey-market-premium-upcoming-ipo-mainboard/104/",
    "https://www.chittorgarh.com/report/ipo-grey-market-premium-latest-mainboard-sme/90/",
  ];

  const allGmpMap = new Map<string, GmpData>();

  // 1. Scrape Chittorgarh (Primary Source)
  for (const url of gmpUrls) {
    try {
      const html = await fetchPage(url);
      const $ = cheerio.load(html);

      $("table").find("tr").each((_, row) => {
        const cells = $(row).find("td");
        if (cells.length < 2) return;

        const companyName = cells.eq(0).text().trim();
        if (!companyName || companyName.length < 3) return;
        if (companyName.toLowerCase().includes("company") || companyName.toLowerCase().includes("ipo name")) return;

        const symbol = normalizeSymbol(companyName);
        const gmpText = cells.eq(1).text().trim();
        const expectedText = cells.eq(2)?.text()?.trim() || "";

        const gmpMatch = gmpText.match(/[+-]?\d+/);
        const gmp = gmpMatch ? parseInt(gmpMatch[0]) : 0;
        const expectedMatch = expectedText.match(/\d+/);
        const expectedListing = expectedMatch ? parseInt(expectedMatch[0]) : null;

        if (symbol && symbol.length >= 3) {
          if (!allGmpMap.has(symbol)) {
            allGmpMap.set(symbol, {
              symbol,
              companyName: companyName.replace(/\s+IPO$/i, "").trim(),
              gmp,
              expectedListing,
              trend: "stable",
              source: "chittorgarh",
              timestamp: new Date(),
            });
          }
        }
      });

      // If we got good data from one Chittorgarh page, we don't necessarily need the other redundant one
      // unless the first one was empty.
      if (allGmpMap.size > 5) break;
    } catch (error) {
      console.log(`GMP fetch from ${url} failed, trying next...`);
    }
  }

  // 2. Scrape IPO Watch (Secondary Source)
  try {
    console.log("💹 [IPOWatch] Fetching GMP data...");
    const ipoWatchResult = await ipoWatchScraper.getGmp();

    if (ipoWatchResult.success && ipoWatchResult.data.length > 0) {
      let addedCount = 0;
      for (const item of ipoWatchResult.data) {
        if (!allGmpMap.has(item.symbol)) {
          allGmpMap.set(item.symbol, {
            symbol: item.symbol,
            companyName: item.companyName,
            gmp: item.gmp,
            expectedListing: item.expectedListing,
            trend: "stable",
            source: "ipowatch",
            timestamp: new Date()
          });
          addedCount++;
        }
      }
      console.log(`✅ [IPOWatch] Added ${addedCount} new GMP entries`);
    }
  } catch (err) {
    console.error("[IPOWatch] GMP fetch failed:", err);
  }

  const allGmpData = Array.from(allGmpMap.values());

  console.log(`✅ Found GMP data for ${allGmpData.length} IPOs total`);
  return allGmpData;
}

export async function scrapeGrowwCalendar(): Promise<IpoCalendarData[]> {
  console.log("📅 [Groww] Fetching IPO calendar...");

  try {
    const html = await fetchPage("https://groww.in/ipo");
    const $ = cheerio.load(html);
    const results: IpoCalendarData[] = [];

    $("[class*='ipoCard'], [class*='ipo-card']").each((_, card) => {
      const companyName = $(card).find("[class*='name'], h3, h4").first().text().trim();
      const priceText = $(card).find("[class*='price']").text().trim();
      const dateText = $(card).find("[class*='date']").text().trim();

      if (companyName && companyName.length > 3) {
        const symbol = normalizeSymbol(companyName);
        results.push({
          companyName,
          symbol,
          openDate: dateText || null,
          closeDate: null,
          priceRange: priceText || "TBA",
          issueSize: "TBA",
          lotSize: null,
          status: "upcoming",
          source: "groww",
        });
      }
    });

    console.log(`✅ [Groww] Found ${results.length} IPOs in calendar`);
    return results;
  } catch (error) {
    console.error("[Groww] Calendar fetch failed:", error);
    return [];
  }
}

export async function fetchLivePriceFromNse(symbol: string): Promise<LivePriceData | null> {
  console.log(`📈 [NSE] Fetching live price for ${symbol}...`);

  try {
    const response = await axios.get(`https://www.nseindia.com/api/quote-equity?symbol=${encodeURIComponent(symbol)}`, {
      headers: {
        ...headers,
        "Accept": "application/json",
      },
      timeout: 15000,
    });

    const data = response.data;

    if (data && data.priceInfo) {
      return {
        symbol,
        companyName: data.info?.companyName || symbol,
        cmp: data.priceInfo.lastPrice || 0,
        listingPrice: null,
        change: data.priceInfo.change || 0,
        changePercent: data.priceInfo.pChange || 0,
        volume: data.preOpenMarket?.totalTradedVolume || 0,
        timestamp: new Date(),
      };
    }

    return null;
  } catch (error) {
    console.error(`[NSE] Price fetch failed for ${symbol}:`, error);
    return null;
  }
}

export interface AggregatedSubscriptionData {
  symbol: string;
  companyName: string;
  qib: number | null;
  hni: number | null;
  retail: number | null;
  total: number | null;
  sources: string[];
  confidence: "high" | "medium" | "low";
  timestamp: Date;
  previousTotal: number | null;
  delta: number | null;
}

export async function fetchAggregatedSubscription(previousData?: Map<string, number>): Promise<AggregatedSubscriptionData[]> {
  console.log("🔄 Fetching aggregated subscription data from multiple sources...");

  const [chittorgarhData, investorGainData, nseData] = await Promise.all([
    scrapeChittorgarhSubscription().catch(() => []),
    scrapeInvestorGainSubscription().catch(() => []),
    scrapeNseBidDetails().catch(() => []),
  ]);

  const aggregatedMap = new Map<string, AggregatedSubscriptionData>();

  const processSources = (data: SubscriptionData[]) => {
    for (const item of data) {
      const existing = aggregatedMap.get(item.symbol);

      if (existing) {
        existing.sources.push(item.source);
        if (item.qib !== null) existing.qib = existing.qib ?? item.qib;
        if (item.hni !== null) existing.hni = existing.hni ?? item.hni;
        if (item.retail !== null) existing.retail = existing.retail ?? item.retail;
        if (item.total !== null) existing.total = existing.total ?? item.total;
      } else {
        const previousTotal = previousData?.get(item.symbol) ?? null;
        const delta = item.total !== null && previousTotal !== null ? item.total - previousTotal : null;

        aggregatedMap.set(item.symbol, {
          symbol: item.symbol,
          companyName: item.companyName,
          qib: item.qib,
          hni: item.hni,
          retail: item.retail,
          total: item.total,
          sources: [item.source],
          confidence: "low",
          timestamp: new Date(),
          previousTotal,
          delta,
        });
      }
    }
  };

  processSources(chittorgarhData);
  processSources(investorGainData);
  processSources(nseData);

  aggregatedMap.forEach((data) => {
    if (data.sources.length >= 3) {
      data.confidence = "high";
    } else if (data.sources.length >= 2) {
      data.confidence = "medium";
    }
  });

  const results = Array.from(aggregatedMap.values());
  console.log(`✅ Aggregated subscription data for ${results.length} IPOs from ${new Set([...chittorgarhData, ...investorGainData, ...nseData].map(d => d.source)).size} sources`);

  return results;
}

export interface AlertTrigger {
  type: "subscription_threshold" | "gmp_spike" | "price_alert" | "new_ipo";
  symbol: string;
  companyName: string;
  message: string;
  severity: "info" | "warning" | "critical";
  data: Record<string, unknown>;
  timestamp: Date;
}

export function checkAlertThresholds(
  subscriptionData: AggregatedSubscriptionData[],
  gmpData: GmpData[],
  previousGmpMap?: Map<string, number>
): AlertTrigger[] {
  const alerts: AlertTrigger[] = [];

  for (const sub of subscriptionData) {
    if (sub.total !== null) {
      if (sub.total >= 20) {
        alerts.push({
          type: "subscription_threshold",
          symbol: sub.symbol,
          companyName: sub.companyName,
          message: `EXTREME DEMAND: ${sub.companyName} subscription at ${sub.total}x`,
          severity: "critical",
          data: { total: sub.total, qib: sub.qib, hni: sub.hni, retail: sub.retail },
          timestamp: new Date(),
        });
      } else if (sub.total >= 10) {
        alerts.push({
          type: "subscription_threshold",
          symbol: sub.symbol,
          companyName: sub.companyName,
          message: `HIGH DEMAND: ${sub.companyName} subscription at ${sub.total}x`,
          severity: "warning",
          data: { total: sub.total, qib: sub.qib, hni: sub.hni, retail: sub.retail },
          timestamp: new Date(),
        });
      }

      if (sub.delta !== null && sub.delta >= 5) {
        alerts.push({
          type: "subscription_threshold",
          symbol: sub.symbol,
          companyName: sub.companyName,
          message: `MOMENTUM: ${sub.companyName} subscription jumped +${sub.delta}x`,
          severity: "warning",
          data: { previous: sub.previousTotal, current: sub.total, delta: sub.delta },
          timestamp: new Date(),
        });
      }
    }
  }

  for (const gmp of gmpData) {
    const previousGmp = previousGmpMap?.get(gmp.symbol);
    if (previousGmp !== undefined && gmp.gmp !== previousGmp) {
      const change = gmp.gmp - previousGmp;
      const changePercent = previousGmp !== 0 ? (change / Math.abs(previousGmp)) * 100 : 0;

      if (Math.abs(changePercent) >= 10) {
        alerts.push({
          type: "gmp_spike",
          symbol: gmp.symbol,
          companyName: gmp.companyName,
          message: `GMP ${change > 0 ? "SPIKE" : "DROP"}: ${gmp.companyName} GMP changed ${change > 0 ? "+" : ""}${change} (${changePercent.toFixed(1)}%)`,
          severity: change > 0 ? "info" : "warning",
          data: { previousGmp, currentGmp: gmp.gmp, change, changePercent },
          timestamp: new Date(),
        });
      }
    }
  }

  return alerts;
}

export function isBiddingHours(): boolean {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);

  const hours = istTime.getUTCHours();
  const minutes = istTime.getUTCMinutes();
  const totalMinutes = hours * 60 + minutes;

  const startMinutes = 9 * 60 + 15;
  const endMinutes = 17 * 60 + 30;

  const dayOfWeek = istTime.getUTCDay();
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

  return isWeekday && totalMinutes >= startMinutes && totalMinutes <= endMinutes;
}

export function getNextPollTime(): Date {
  const now = new Date();
  const pollIntervalMs = 5 * 60 * 1000;
  return new Date(Math.ceil(now.getTime() / pollIntervalMs) * pollIntervalMs);
}
