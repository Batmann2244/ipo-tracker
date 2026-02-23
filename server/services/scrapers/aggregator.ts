import {
  IpoData,
  SubscriptionData,
  GmpData,
  ScraperResult,
  normalizeSymbol,
} from "./base";
import { chittorgarhScraper } from "./chittorgarh";
import { growwScraper } from "./groww";
import { investorGainScraper } from "./investorgain";
import { nseScraper } from "./nse";
import { ipoAlertsScraper } from "./ipoalerts";
import { bseScraper } from "./bse";
import { ipoWatchScraper } from "./ipowatch";
import { zeodhaScraper } from "./zerodha";
import { investorgainApiScraper } from "./investorgain-api";
import { scraperLogger, type ScraperSource, type ScraperOperation } from "../scraper-logger";
import pLimit from "p-limit";

export interface AggregatedIpoData extends IpoData {
  sources: string[];
  confidence: "high" | "medium" | "low";
  lastUpdated: Date;
}

export interface AggregatedSubscriptionData extends SubscriptionData {
  sources: string[];
  confidence: "high" | "medium" | "low";
  lastUpdated: Date;
}

export interface AggregatedGmpData extends GmpData {
  sources: string[];
  trend: "rising" | "falling" | "stable";
  lastUpdated: Date;
}

export interface AggregatorResult<T> {
  data: T[];
  sourceResults: { source: string; success: boolean; count: number; responseTimeMs: number }[];
  totalSources: number;
  successfulSources: number;
  timestamp: Date;
}

export class ScraperAggregator {
  // Limit concurrency to 2 to prevent resource exhaustion (browser crashes)
  private limit = pLimit(2);

  private log(message: string): void {
    console.log(`[Aggregator] ${message}`);
  }

  // Validate IPO data to filter out corrupted/malformed records
  private isValidIpoData(ipo: IpoData): boolean {
    // Check if company name is reasonable length (not concatenated table data)
    if (!ipo.companyName || ipo.companyName.length > 150) {
      console.warn(`[Aggregator] Rejected IPO with invalid company name length: ${ipo.companyName?.substring(0, 50)}...`);
      return false;
    }

    // Check for table headers in company name (sign of scraping error)
    const invalidPatterns = [
      /security.*name.*exchange.*platform/i,
      /start.*date.*end.*date/i,
      /offer.*price.*face.*value/i,
      /issue.*status.*type.*of.*issue/i,
      /mainboard.*sme.*forthcoming/i,
    ];

    for (const pattern of invalidPatterns) {
      if (pattern.test(ipo.companyName)) {
        console.warn(`[Aggregator] Rejected IPO with table header pattern: ${ipo.companyName.substring(0, 50)}...`);
        return false;
      }
    }

    // Check if symbol is reasonable
    if (!ipo.symbol || ipo.symbol.length > 20) {
      console.warn(`[Aggregator] Rejected IPO with invalid symbol: ${ipo.symbol}`);
      return false;
    }

    // Check for multiple IPO names concatenated (contains multiple "LTD" or "LIMITED")
    const ltdCount = (ipo.companyName.match(/\b(LTD|LIMITED)\b/gi) || []).length;
    if (ltdCount > 2) {
      console.warn(`[Aggregator] Rejected IPO with multiple company names: ${ipo.companyName.substring(0, 50)}...`);
      return false;
    }

    return true;
  }

  async getIpos(sources: string[] = ["investorgain", "groww", "chittorgarh", "ipoalerts", "bse", "ipowatch", "zerodha", "nse"]): Promise<AggregatorResult<AggregatedIpoData>> {
    this.log("Fetching IPOs from multiple sources...");
    const results: ScraperResult<IpoData>[] = [];

    const tasks: Promise<ScraperResult<IpoData>>[] = [];

    if (sources.includes("investorgain")) tasks.push(this.limit(() => investorGainScraper.getIpos()));
    if (sources.includes("groww")) tasks.push(this.limit(() => growwScraper.getIpos()));
    if (sources.includes("chittorgarh")) tasks.push(this.limit(() => chittorgarhScraper.getIpos()));
    if (sources.includes("nse")) tasks.push(this.limit(() => nseScraper.getIpos()));
    if (sources.includes("ipoalerts")) tasks.push(this.limit(() => ipoAlertsScraper.getOpenIpos()));
    if (sources.includes("bse")) tasks.push(this.limit(() => bseScraper.getIpos()));
    if (sources.includes("ipowatch")) tasks.push(this.limit(() => ipoWatchScraper.getIpos()));
    if (sources.includes("zerodha")) tasks.push(this.limit(() => zeodhaScraper.getIpos()));

    const settled = await Promise.allSettled(tasks);

    for (const result of settled) {
      if (result.status === "fulfilled") {
        results.push(result.value);
      }
    }

    const symbolMap = new Map<string, { data: IpoData; sources: string[] }>();

    for (const result of results) {
      if (!result.success) continue;

      for (const ipo of result.data) {
        // Validate IPO data before adding to aggregation
        if (!this.isValidIpoData(ipo)) {
          continue;
        }

        const existing = symbolMap.get(ipo.symbol);

        if (!existing) {
          symbolMap.set(ipo.symbol, { data: ipo, sources: [result.source] });
        } else {
          existing.sources.push(result.source);
          existing.data = this.mergeIpoData(existing.data, ipo);
        }
      }
    }

    const aggregated: AggregatedIpoData[] = [];

    for (const [symbol, { data, sources: ipoSources }] of Array.from(symbolMap.entries())) {
      const confidence = this.calculateConfidence(ipoSources.length, results.length);

      aggregated.push({
        ...data,
        sources: ipoSources,
        confidence,
        lastUpdated: new Date(),
      });
    }

    const sourceResults = results.map(r => ({
      source: r.source,
      success: r.success,
      count: r.data.length,
      responseTimeMs: r.responseTimeMs,
    }));

    // Log each source result
    for (const result of results) {
      const source = result.source as ScraperSource;
      if (result.success) {
        scraperLogger.logSuccess(source, 'ipos', result.data.length, result.responseTimeMs);
      } else {
        scraperLogger.logError(source, 'ipos', result.error || 'Unknown error', result.responseTimeMs);
      }
    }

    this.log(`Aggregated ${aggregated.length} IPOs from ${results.filter(r => r.success).length} sources`);

    return {
      data: aggregated,
      sourceResults,
      totalSources: results.length,
      successfulSources: results.filter(r => r.success).length,
      timestamp: new Date(),
    };
  }

  private mergeIpoData(existing: IpoData, incoming: IpoData): IpoData {
    return {
      symbol: existing.symbol,
      companyName: existing.companyName || incoming.companyName,
      openDate: existing.openDate ?? incoming.openDate,
      closeDate: existing.closeDate ?? incoming.closeDate,
      listingDate: existing.listingDate ?? incoming.listingDate,
      priceRange: existing.priceRange !== "TBA" ? existing.priceRange : incoming.priceRange,
      priceMin: existing.priceMin ?? incoming.priceMin,
      priceMax: existing.priceMax ?? incoming.priceMax,
      lotSize: existing.lotSize ?? incoming.lotSize,
      issueSize: existing.issueSize !== "TBA" ? existing.issueSize : incoming.issueSize,
      issueSizeCrores: existing.issueSizeCrores ?? incoming.issueSizeCrores,
      status: existing.status !== "upcoming" ? existing.status : incoming.status,
      ipoType: existing.ipoType,
      gmp: existing.gmp ?? incoming.gmp,
      gmpPercent: existing.gmpPercent ?? incoming.gmpPercent,
      investorGainId: existing.investorGainId ?? incoming.investorGainId,
      basisOfAllotmentDate: existing.basisOfAllotmentDate ?? incoming.basisOfAllotmentDate,
      refundsInitiationDate: existing.refundsInitiationDate ?? incoming.refundsInitiationDate,
      creditToDematDate: existing.creditToDematDate ?? incoming.creditToDematDate,
    };
  }

  async getSubscriptions(sources: string[] = ["chittorgarh", "groww", "investorgain", "nse"]): Promise<AggregatorResult<AggregatedSubscriptionData>> {
    this.log("Fetching subscriptions from multiple sources...");
    const results: ScraperResult<SubscriptionData>[] = [];

    const tasks: Promise<ScraperResult<SubscriptionData>>[] = [];

    if (sources.includes("chittorgarh")) tasks.push(this.limit(() => chittorgarhScraper.getSubscriptions()));
    if (sources.includes("groww")) tasks.push(this.limit(() => growwScraper.getSubscriptions()));
    if (sources.includes("investorgain")) tasks.push(this.limit(() => investorGainScraper.getSubscriptions()));
    if (sources.includes("nse")) tasks.push(this.limit(() => nseScraper.getSubscriptions()));

    const settled = await Promise.allSettled(tasks);

    for (const result of settled) {
      if (result.status === "fulfilled") {
        results.push(result.value);
      }
    }

    const symbolMap = new Map<string, { data: SubscriptionData; sources: string[] }>();

    for (const result of results) {
      if (!result.success) continue;

      for (const sub of result.data) {
        const existing = symbolMap.get(sub.symbol);

        if (!existing) {
          symbolMap.set(sub.symbol, { data: sub, sources: [result.source] });
        } else {
          existing.sources.push(result.source);
          existing.data = this.mergeSubscriptionData(existing.data, sub);
        }
      }
    }

    const aggregated: AggregatedSubscriptionData[] = [];

    for (const [symbol, { data, sources: subSources }] of Array.from(symbolMap.entries())) {
      const confidence = this.calculateConfidence(subSources.length, results.length);

      aggregated.push({
        ...data,
        sources: subSources,
        confidence,
        lastUpdated: new Date(),
      });
    }

    const sourceResults = results.map(r => ({
      source: r.source,
      success: r.success,
      count: r.data.length,
      responseTimeMs: r.responseTimeMs,
    }));

    this.log(`Aggregated ${aggregated.length} subscriptions from ${results.filter(r => r.success).length} sources`);

    return {
      data: aggregated,
      sourceResults,
      totalSources: results.length,
      successfulSources: results.filter(r => r.success).length,
      timestamp: new Date(),
    };
  }

  private mergeSubscriptionData(existing: SubscriptionData, incoming: SubscriptionData): SubscriptionData {
    return {
      symbol: existing.symbol,
      companyName: existing.companyName || incoming.companyName,
      qib: existing.qib ?? incoming.qib,
      nii: existing.nii ?? incoming.nii,
      hni: existing.hni ?? incoming.hni,
      retail: existing.retail ?? incoming.retail,
      total: existing.total ?? incoming.total,
      applications: existing.applications ?? incoming.applications,
    };
  }

  async getGmp(sources: string[] = ["chittorgarh", "investorgain"]): Promise<AggregatorResult<AggregatedGmpData>> {
    this.log("Fetching GMP from multiple sources...");
    const results: ScraperResult<GmpData>[] = [];

    const tasks: Promise<ScraperResult<GmpData>>[] = [];

    if (sources.includes("chittorgarh")) tasks.push(this.limit(() => chittorgarhScraper.getGmp()));
    if (sources.includes("investorgain")) tasks.push(this.limit(() => investorGainScraper.getGmp()));

    const settled = await Promise.allSettled(tasks);

    for (const result of settled) {
      if (result.status === "fulfilled") {
        results.push(result.value);
      }
    }

    const symbolMap = new Map<string, { data: GmpData; sources: string[]; values: number[] }>();

    for (const result of results) {
      if (!result.success) continue;

      for (const gmp of result.data) {
        const existing = symbolMap.get(gmp.symbol);

        if (!existing) {
          symbolMap.set(gmp.symbol, { data: gmp, sources: [result.source], values: [gmp.gmp] });
        } else {
          existing.sources.push(result.source);
          existing.values.push(gmp.gmp);
          if (gmp.gmp > existing.data.gmp) {
            existing.data = gmp;
          }
        }
      }
    }

    const aggregated: AggregatedGmpData[] = [];

    for (const [symbol, { data, sources: gmpSources, values }] of Array.from(symbolMap.entries())) {
      const confidence = this.calculateConfidence(gmpSources.length, results.length);
      const trend = this.calculateTrend(values);

      aggregated.push({
        ...data,
        sources: gmpSources,
        trend,
        lastUpdated: new Date(),
      });
    }

    const sourceResults = results.map(r => ({
      source: r.source,
      success: r.success,
      count: r.data.length,
      responseTimeMs: r.responseTimeMs,
    }));

    this.log(`Aggregated ${aggregated.length} GMP records from ${results.filter(r => r.success).length} sources`);

    return {
      data: aggregated,
      sourceResults,
      totalSources: results.length,
      successfulSources: results.filter(r => r.success).length,
      timestamp: new Date(),
    };
  }

  private calculateConfidence(sourceCount: number, totalSources: number): "high" | "medium" | "low" {
    if (sourceCount >= 2) return "high";
    if (sourceCount === 1 && totalSources >= 2) return "medium";
    return "low";
  }

  private calculateTrend(values: number[]): "rising" | "falling" | "stable" {
    if (values.length < 2) return "stable";

    const first = values[0];
    const last = values[values.length - 1];
    const diff = last - first;

    if (diff > 5) return "rising";
    if (diff < -5) return "falling";
    return "stable";
  }

  async testConnection(source: string): Promise<{ source: string; success: boolean; responseTimeMs: number; error?: string }> {
    const startTime = Date.now();

    try {
      let result: ScraperResult<any>;

      switch (source.toLowerCase()) {
        case "groww":
          result = await growwScraper.getIpos();
          break;
        case "chittorgarh":
          result = await chittorgarhScraper.getIpos();
          break;
        case "investorgain":
          result = await investorGainScraper.getSubscriptions();
          break;
        case "nse":
          result = await nseScraper.getIpos();
          break;
        default:
          return { source, success: false, responseTimeMs: Date.now() - startTime, error: "Unknown source" };
      }

      return {
        source,
        success: result.success,
        responseTimeMs: Date.now() - startTime,
        error: result.error,
      };
    } catch (err: any) {
      return {
        source,
        success: false,
        responseTimeMs: Date.now() - startTime,
        error: err.message,
      };
    }
  }

  async testAllConnections(): Promise<{ source: string; success: boolean; responseTimeMs: number; error?: string }[]> {
    const sources = ["groww", "chittorgarh", "investorgain", "nse"];
    const results = await Promise.all(sources.map(s => this.testConnection(s)));
    return results;
  }
}

export const scraperAggregator = new ScraperAggregator();
