import {
  BaseScraper,
  IpoData,
  SubscriptionData,
  GmpData,
  ScraperResult,
  normalizeSymbol,
  parseFinancialMetrics,
  generateScores,
  generateRiskAssessment,
} from "./base";

import { Nse } from "./nse-client";

const nse = new Nse();

interface NseToolsIpoData {
  symbol?: string;
  companyName?: string;
  name?: string;
  priceMin?: number;
  priceMax?: number;
  biddingStartDate?: string;
  biddingEndDate?: string;
  listingDate?: string;
  sector?: string;
  status?: string;
  subscribed?: number;
  shares?: string;
  issueSize?: number | string;
}

/**
 * NSETools Scraper - Official NSE API Integration
 * 
 * Primary data source using NSETools library which connects to official NSE endpoints
 * More reliable than HTML scraping as it uses official APIs
 */
export class NseToolsScraper extends BaseScraper {
  constructor() {
    super("NSETools", { timeout: 15000, retries: 3 });
  }

  /**
   * Fetch IPO data from NSETools
   * Combines upcoming, current, and past IPOs
   */
  async fetchIpos(): Promise<ScraperResult<IpoData>> {
    const startTime = Date.now();
    try {
      this.log("Fetching IPO data from NSETools...");

      const [upcomingIpos, currentIpos] = await Promise.all([
        this.fetchUpcomingIpos().catch((err) => {
          this.error("Failed to fetch upcoming IPOs", err);
          return [];
        }),
        this.fetchCurrentIpos().catch((err) => {
          this.error("Failed to fetch current IPOs", err);
          return [];
        }),
      ]);

      const ipos: IpoData[] = [];
      const seenSymbols = new Set<string>();

      // Process upcoming IPOs
      for (const ipo of upcomingIpos) {
        const converted = this.convertToIpoData(ipo, "upcoming");
        if (converted && !seenSymbols.has(converted.symbol)) {
          ipos.push(converted);
          seenSymbols.add(converted.symbol);
        }
      }

      // Process current IPOs
      for (const ipo of currentIpos) {
        const converted = this.convertToIpoData(ipo, "open");
        if (converted && !seenSymbols.has(converted.symbol)) {
          ipos.push(converted);
          seenSymbols.add(converted.symbol);
        }
      }

      this.log(`✅ Successfully fetched ${ipos.length} IPOs from NSETools`);

      return this.wrapResult(ipos, startTime);
    } catch (err) {
      this.error("Failed to fetch IPOs", err);
      return this.wrapResult([], startTime, err instanceof Error ? err.message : "Unknown error");
    }
  }

  /**
   * Fetch subscription data from NSETools
   * Gets current subscription statistics
   */
  async fetchSubscriptions(): Promise<ScraperResult<SubscriptionData>> {
    const startTime = Date.now();
    try {
      this.log("Fetching subscription data from NSETools...");

      const currentIpos = await this.fetchCurrentIpos();
      const subscriptions: SubscriptionData[] = [];

      for (const ipo of currentIpos) {
        const symbol = normalizeSymbol(ipo.symbol || ipo.companyName || "");
        if (!symbol) continue;

        const qib = ipo.subscribed ? this.parseSubscription(ipo.subscribed) : null;

        subscriptions.push({
          symbol,
          companyName: ipo.companyName || ipo.name || "",
          qib,
          nii: null,
          hni: null,
          retail: null,
          total: qib,
          applications: null,
        });
      }

      this.log(`✅ Successfully fetched ${subscriptions.length} subscription records from NSETools`);

      return this.wrapSubscriptionResult(subscriptions, startTime);
    } catch (err) {
      this.error("Failed to fetch subscriptions", err);
      return this.wrapSubscriptionResult([], startTime, err instanceof Error ? err.message : "Unknown error");
    }
  }

  /**
   * NSETools doesn't provide direct GMP data
   * Return empty result as this is handled by other scrapers
   */
  async fetchGmp(): Promise<ScraperResult<GmpData>> {
    const startTime = Date.now();
    this.log("Note: NSETools doesn't provide GMP data (handled by other scrapers)");
    
    return {
      success: true,
      data: [],
      source: "NSETools",
      timestamp: new Date(),
      responseTimeMs: Date.now() - startTime,
    };
  }

  async getIpos(): Promise<ScraperResult<IpoData>> {
    return this.fetchIpos();
  }

  async getSubscriptions(): Promise<ScraperResult<SubscriptionData>> {
    return this.fetchSubscriptions();
  }

  async getGmp(): Promise<ScraperResult<GmpData>> {
    return this.fetchGmp();
  }

  async testConnection(): Promise<boolean> {
    try {
      this.log("Testing NSETools connection...");
      const result = await nse.getIndexQuote("NIFTY 50");
      
      if (result) {
        this.log("✅ NSETools connection successful");
        return true;
      }
      return false;
    } catch (err) {
      this.error("NSETools connection test failed", err);
      return false;
    }
  }

  // ========================================
  // PRIVATE HELPER METHODS
  // ========================================

  /**
   * Fetch upcoming IPOs from NSETools
   */
  private async fetchUpcomingIpos(): Promise<NseToolsIpoData[]> {
    try {
      const data = await nse.getUpcomingIpos();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      this.error("Failed to fetch upcoming IPOs from NSETools", err);
      return [];
    }
  }

  /**
   * Fetch current (active) IPOs from NSETools
   */
  private async fetchCurrentIpos(): Promise<NseToolsIpoData[]> {
    try {
      const data = await nse.getCurrentIpos();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      this.error("Failed to fetch current IPOs from NSETools", err);
      return [];
    }
  }

  /**
   * Convert NSETools IPO data to standard IpoData format
   */
  private convertToIpoData(
    ipoData: NseToolsIpoData,
    defaultStatus: "upcoming" | "open" | "closed" | "listed" = "upcoming"
  ): IpoData | null {
    const companyName = ipoData.companyName || ipoData.name || "";
    const symbol = normalizeSymbol(ipoData.symbol || companyName);

    if (!symbol || !companyName) {
      return null;
    }

    const priceMin = ipoData.priceMin || null;
    const priceMax = ipoData.priceMax || null;
    const priceRange =
      priceMin && priceMax
        ? `₹${priceMin} - ₹${priceMax}`
        : priceMin
          ? `₹${priceMin}`
          : "TBA";

    const issueSizeStr = ipoData.issueSize
      ? typeof ipoData.issueSize === "string"
        ? ipoData.issueSize
        : `${ipoData.issueSize} Cr`
      : "TBA";

    // Parse issue size in crores
    const issueSizeCrores = ipoData.issueSize
      ? typeof ipoData.issueSize === "number"
        ? ipoData.issueSize
        : null
      : null;

    // Determine status based on dates
    let status: "upcoming" | "open" | "closed" | "listed" = defaultStatus;
    const statusStr = (ipoData.status || "").toLowerCase();
    if (statusStr.includes("listed")) {
      status = "listed";
    } else if (statusStr.includes("closed")) {
      status = "closed";
    } else if (statusStr.includes("open") || statusStr.includes("active")) {
      status = "open";
    }

    return {
      symbol,
      companyName,
      openDate: ipoData.biddingStartDate || null,
      closeDate: ipoData.biddingEndDate || null,
      listingDate: ipoData.listingDate || null,
      priceRange,
      priceMin,
      priceMax,
      lotSize: 1,
      issueSize: issueSizeStr,
      issueSizeCrores,
      status,
      ipoType: "mainboard",
      // Enrich with scores and risk assessment
      ...generateScores({
        symbol,
        companyName,
        priceMin,
        priceMax,
        status,
      }),
      ...generateRiskAssessment({
        symbol,
        companyName,
        priceMin,
        priceMax,
        status,
      }),
    };
  }

  /**
   * Parse subscription value (e.g., "123.45x" -> 123.45)
   */
  private parseSubscription(value: any): number | null {
    if (!value) return null;

    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const match = value.match(/([\d.]+)/);
      return match ? parseFloat(match[1]) : null;
    }

    return null;
  }
}

// Singleton instance
export const nseToolsScraper = new NseToolsScraper();
