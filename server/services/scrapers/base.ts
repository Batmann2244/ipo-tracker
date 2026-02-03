import axios, { AxiosRequestConfig } from "axios";
import * as puppeteer from "puppeteer";
import type { Logger } from "winston";
import { getSourceLogger } from "../../logger";
import { scraperLogger, type ScraperSource, type ScraperOperation } from "../scraper-logger";

export const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  "Cache-Control": "no-cache",
};

export interface IpoData {
  // Basic Information
  symbol: string;
  companyName: string;
  description?: string;
  sector?: string;

  // Dates
  openDate: string | null;
  closeDate: string | null;
  listingDate: string | null;

  // Price & Offer Details
  priceRange: string;
  priceMin: number | null;
  priceMax: number | null;
  lotSize: number | null;
  minInvestment?: string;
  issueSize: string;
  issueSizeCrores: number | null;
  totalShares?: string;
  freshIssue?: number;
  ofsRatio?: number;

  // Status
  status: "upcoming" | "open" | "closed" | "listed";
  ipoType: "mainboard" | "sme";

  // Financial Metrics
  revenueGrowth?: number;
  ebitdaMargin?: number;
  patMargin?: number;
  roe?: number;
  roce?: number;
  debtToEquity?: number;

  // Valuation Metrics
  peRatio?: number;
  pbRatio?: number;
  sectorPeMedian?: number;

  // Market Sentiment
  gmp?: number;
  gmpPercent?: number;
  subscriptionQib?: number;
  subscriptionNii?: number;
  subscriptionHni?: number;
  subscriptionRetail?: number;

  // Promoter Info
  promoterHolding?: number;
  postIpoPromoterHolding?: number;

  // Scores
  fundamentalsScore?: number;
  valuationScore?: number;
  governanceScore?: number;
  overallScore?: number;

  // Risk Assessment
  riskLevel?: "conservative" | "moderate" | "aggressive";
  redFlags?: string[];
  pros?: string[];

  // AI Analysis
  aiSummary?: string;
  aiRecommendation?: "SUBSCRIBE" | "AVOID" | "NEUTRAL";

  // External IDs
  investorGainId?: number;

  // Activity Dates
  basisOfAllotmentDate?: string;
  refundsInitiationDate?: string;
  creditToDematDate?: string;
}

export interface SubscriptionData {
  symbol: string;
  companyName: string;
  qib: number | null;
  nii: number | null;
  hni: number | null;
  retail: number | null;
  total: number | null;
  applications: number | null;
}

export interface GmpData {
  symbol: string;
  companyName: string;
  gmp: number;
  expectedListing: number | null;
  gmpPercent: number | null;
}

export interface ScraperResult<T> {
  success: boolean;
  data: T[];
  source: string;
  timestamp: Date;
  error?: string;
  responseTimeMs: number;
}

export interface ScraperConfig {
  timeout: number;
  retries: number;
  retryDelay: number;
}

export const DEFAULT_CONFIG: ScraperConfig = {
  timeout: 30000,
  retries: 2,
  retryDelay: 1000,
};

export abstract class BaseScraper {
  protected name: string;
  protected config: ScraperConfig;
  protected sourceKey: ScraperSource;
  protected sourceLogger: Logger;

  constructor(name: string, config: Partial<ScraperConfig> = {}) {
    this.name = name;
    this.sourceKey = name.toLowerCase() as ScraperSource;
    this.sourceLogger = getSourceLogger(this.sourceKey);
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  protected log(message: string): void {
    this.sourceLogger.info(message);
  }

  protected error(message: string, err?: any): void {
    this.sourceLogger.error(message, {
      error: err?.message,
      status: err?.response?.status,
    });
  }

  protected async fetchPage(url: string, options: AxiosRequestConfig = {}): Promise<string> {
    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.retries; attempt++) {
      try {
        if (attempt > 0) {
          this.sourceLogger.warn("Retrying page fetch", {
            url,
            attempt,
            retries: this.config.retries,
          });
          await this.delay(this.config.retryDelay * attempt);
        }

        const response = await axios.get(url, {
          headers: DEFAULT_HEADERS,
          timeout: this.config.timeout,
          ...options,
        });

        this.sourceLogger.info("Fetched page", {
          url,
          durationMs: Date.now() - startTime,
          attempt,
        });
        return response.data;
      } catch (err: any) {
        lastError = err;
        this.sourceLogger.error("Failed to fetch page", {
          url,
          attempt,
          retries: this.config.retries,
          error: err?.message,
          status: err?.response?.status,
        });
      }
    }

    throw lastError || new Error(`Failed to fetch ${url}`);
  }

  protected async fetchJson<T>(url: string, options: AxiosRequestConfig = {}): Promise<T> {
    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.retries; attempt++) {
      try {
        if (attempt > 0) {
          this.sourceLogger.warn("Retrying JSON fetch", {
            url,
            attempt,
            retries: this.config.retries,
          });
          await this.delay(this.config.retryDelay * attempt);
        }

        const response = await axios.get<T>(url, {
          headers: {
            ...DEFAULT_HEADERS,
            Accept: "application/json",
          },
          timeout: this.config.timeout,
          ...options,
        });

        this.sourceLogger.info("Fetched JSON", {
          url,
          durationMs: Date.now() - startTime,
          attempt,
        });
        return response.data;
      } catch (err: any) {
        lastError = err;
        this.sourceLogger.error("Failed to fetch JSON", {
          url,
          attempt,
          retries: this.config.retries,
          error: err?.message,
          status: err?.response?.status,
        });
      }
    }

    throw lastError || new Error(`Failed to fetch ${url}`);
  }

  protected async fetchWithPuppeteer(url: string, waitForSelector: string = 'body', waitUntil: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2' = 'networkidle2'): Promise<string> {
    const startTime = Date.now();
    let browser;
    try {
      this.sourceLogger.info(`Launching Puppeteer for ${url}`);
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--no-first-run',
          '--no-zygote',
          '--disable-extensions',
          '--disable-background-networking',
          '--disable-sync',
          '--metrics-recording-only',
          '--mute-audio'
        ]
      });
      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });

      // PERFORMANCE: Block unnecessary resources (30-40% speed boost)
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const blocklist = ['image', 'stylesheet', 'font', 'media', 'websocket'];
        if (blocklist.includes(req.resourceType())) {
          req.abort();
        } else {
          req.continue();
        }
      });

      // Stealthier headers
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': DEFAULT_HEADERS["User-Agent"]
      });

      await page.goto(url, { waitUntil, timeout: this.config.timeout });

      if (waitForSelector) {
        try {
          await page.waitForSelector(waitForSelector, { timeout: this.config.timeout / 2 });
        } catch (selectorErr: any) {
          this.sourceLogger.warn(`Selector '${waitForSelector}' not found, continuing anyway`);
        }
      }

      const content = await page.content();
      await browser.close();

      this.sourceLogger.info("Fetched page with Puppeteer", {
        url,
        durationMs: Date.now() - startTime
      });

      return content;
    } catch (err: any) {
      if (browser) await browser.close().catch(() => { });
      throw new Error(`Puppeteer fetch failed: ${err.message}`);
    }
  }

  protected handleError(error: any): ScraperResult<any> {
    const message = error instanceof Error ? error.message : String(error);
    this.sourceLogger.error(`Scraper error: ${message}`);
    return {
      success: false,
      data: [],
      error: message,
      source: this.name,
      timestamp: new Date(),
      responseTimeMs: 0
    };
  }

  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected wrapResult<T>(data: T[], startTime: number, error?: string, operation: ScraperOperation = 'ipos'): ScraperResult<T> {
    const responseTimeMs = Date.now() - startTime;
    const sourceName = this.name.toLowerCase() as ScraperSource;

    // Log the result to the scraper logger (async but not awaited)
    if (!error) {
      scraperLogger.logSuccess(sourceName, operation, data.length, responseTimeMs, {
        dataTypes: data.length > 0 ? Object.keys(data[0] as any).slice(0, 5) : []
      }).catch(err => console.error(`[${this.name}] Failed to log success:`, err));
    } else {
      scraperLogger.logError(sourceName, operation, error, responseTimeMs)
        .catch(err => console.error(`[${this.name}] Failed to log error:`, err));
    }

    return {
      success: !error,
      data,
      source: this.name,
      timestamp: new Date(),
      responseTimeMs,
      error,
    };
  }

  protected wrapSubscriptionResult(data: SubscriptionData[], startTime: number, error?: string): ScraperResult<SubscriptionData> {
    return this.wrapResult(data, startTime, error, 'subscription');
  }

  protected wrapGmpResult(data: GmpData[], startTime: number, error?: string): ScraperResult<GmpData> {
    return this.wrapResult(data, startTime, error, 'gmp');
  }

  abstract getIpos(): Promise<ScraperResult<IpoData>>;
  abstract getSubscriptions(): Promise<ScraperResult<SubscriptionData>>;
  abstract getGmp(): Promise<ScraperResult<GmpData>>;
}

export function normalizeSymbol(name: string): string {
  return name
    .replace(/\s+(Ltd|Limited|IPO|India|Private|Pvt|Technologies|Tech|Industries|Infra|Services|Solutions|Corporation|Corp)\.?/gi, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 15);
}

export function parseDate(dateStr: string): string | null {
  if (!dateStr || dateStr.toLowerCase() === "tba" || dateStr === "-" || dateStr === "N/A") {
    return null;
  }

  const cleaned = dateStr.trim().replace(/\s+/g, " ");

  const months: { [key: string]: string } = {
    jan: "01", january: "01",
    feb: "02", february: "02",
    mar: "03", march: "03",
    apr: "04", april: "04",
    may: "05",
    jun: "06", june: "06",
    jul: "07", july: "07",
    aug: "08", august: "08",
    sep: "09", sept: "09", september: "09",
    oct: "10", october: "10",
    nov: "11", november: "11",
    dec: "12", december: "12",
  };

  const match = cleaned.match(/(\d{1,2})\s*([a-zA-Z]+)\s*,?\s*(\d{4})/);
  if (match) {
    const day = match[1].padStart(2, "0");
    const monthKey = match[2].toLowerCase();
    const month = months[monthKey];
    const year = match[3];
    if (month) return `${year}-${month}-${day}`;
  }

  const isoMatch = cleaned.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return cleaned;

  const ddmmyyyy = cleaned.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (ddmmyyyy) {
    const day = ddmmyyyy[1].padStart(2, "0");
    const month = ddmmyyyy[2].padStart(2, "0");
    const year = ddmmyyyy[3];
    return `${year}-${month}-${day}`;
  }

  return null;
}

export function parsePriceRange(priceStr: string): { min: number | null; max: number | null } {
  if (!priceStr || priceStr.toLowerCase() === "tba" || priceStr === "-") {
    return { min: null, max: null };
  }

  const numbers = priceStr.match(/[\d,]+\.?\d*/g);
  if (!numbers || numbers.length === 0) return { min: null, max: null };

  const parsed = numbers.map(n => parseFloat(n.replace(/,/g, "")));

  if (parsed.length === 1) {
    return { min: parsed[0], max: parsed[0] };
  }

  return {
    min: Math.min(...parsed),
    max: Math.max(...parsed),
  };
}

export function parseIssueSize(sizeStr: string): number | null {
  if (!sizeStr || sizeStr.toLowerCase() === "tba" || sizeStr === "-") {
    return null;
  }

  const match = sizeStr.match(/([\d,]+\.?\d*)\s*(cr|crore|crores|lakh|lakhs)?/i);
  if (!match) return null;

  let value = parseFloat(match[1].replace(/,/g, ""));
  const unit = match[2]?.toLowerCase();

  if (unit === "lakh" || unit === "lakhs") {
    value = value / 100;
  }

  return value;
}

export function parseLotSize(lotStr: string): number | null {
  if (!lotStr || lotStr.toLowerCase() === "tba" || lotStr === "-") {
    return null;
  }

  const match = lotStr.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

export function parseSubscriptionValue(text: string): number | null {
  if (!text || text === "-" || text.toLowerCase() === "n/a") return null;
  const match = text.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : null;
}

export function determineStatus(openDate: string | null, closeDate: string | null): "upcoming" | "open" | "closed" {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (openDate) {
    const open = new Date(openDate);
    if (open > today) return "upcoming";
  }

  if (closeDate) {
    const close = new Date(closeDate);
    if (close < today) return "closed";
  }

  if (openDate && closeDate) {
    const open = new Date(openDate);
    const close = new Date(closeDate);
    if (open <= today && close >= today) return "open";
  }

  return "upcoming";
}

// Financial Metrics Parsing
export function parsePercentage(text: string | number | undefined | null): number | null {
  if (text === undefined || text === null) return null;
  if (typeof text === "number") return text;
  if (typeof text !== "string" || text === "-" || text.toLowerCase() === "n/a") return null;

  const match = text.match(/([\d.]+)/);
  return match ? parseFloat(match[1]) : null;
}

export function parseDecimal(text: string | number | undefined | null): number | null {
  if (text === undefined || text === null) return null;
  if (typeof text === "number") return text;
  if (typeof text !== "string" || text === "-" || text.toLowerCase() === "n/a") return null;

  const match = text.match(/([\d.]+)/);
  return match ? parseFloat(match[1]) : null;
}

export function parseFinancialMetrics(data: any): Partial<IpoData> {
  return {
    revenueGrowth: parsePercentage(data.revenueGrowth) ?? undefined,
    ebitdaMargin: parsePercentage(data.ebitdaMargin) ?? undefined,
    patMargin: parsePercentage(data.patMargin) ?? undefined,
    roe: parsePercentage(data.roe) ?? undefined,
    roce: parsePercentage(data.roce) ?? undefined,
    debtToEquity: parseDecimal(data.debtToEquity) ?? undefined,
    peRatio: parseDecimal(data.peRatio) ?? undefined,
    pbRatio: parseDecimal(data.pbRatio) ?? undefined,
    sectorPeMedian: parseDecimal(data.sectorPeMedian) ?? undefined,
    gmp: typeof data.gmp === "number" ? data.gmp : (data.gmp ? parseDecimal(data.gmp) ?? undefined : undefined),
    gmpPercent: parsePercentage(data.gmpPercent) ?? undefined,
    subscriptionQib: parseDecimal(data.subscriptionQib) ?? undefined,
    subscriptionNii: parseDecimal(data.subscriptionNii) ?? undefined,
    subscriptionHni: parseDecimal(data.subscriptionHni) ?? undefined,
    subscriptionRetail: parseDecimal(data.subscriptionRetail) ?? undefined,
    promoterHolding: parsePercentage(data.promoterHolding) ?? undefined,
    postIpoPromoterHolding: parsePercentage(data.postIpoPromoterHolding) ?? undefined,
  };
}

export function generateScores(data: Partial<IpoData>): Partial<IpoData> {
  // Fundamentals Score (0-10)
  let fundamentalsScore = 5;
  if (data.revenueGrowth) fundamentalsScore += Math.min(2, data.revenueGrowth / 20);
  if (data.roe) fundamentalsScore += Math.min(2, data.roe / 15);
  if (data.roce) fundamentalsScore += Math.min(1, data.roce / 30);

  // Valuation Score (0-10)
  let valuationScore = 5;
  if (data.peRatio && data.sectorPeMedian) {
    const peDiff = (data.peRatio - data.sectorPeMedian) / data.sectorPeMedian;
    valuationScore += Math.max(-3, Math.min(2, -peDiff * 5));
  }
  if (data.pbRatio) valuationScore += Math.min(2, Math.max(-1, 3 - data.pbRatio / 2));

  // Governance Score (0-10)
  let governanceScore = 5;
  if (data.promoterHolding && data.promoterHolding < 75) governanceScore += 2;
  if (data.debtToEquity && data.debtToEquity < 0.5) governanceScore += 2;
  if (data.patMargin && data.patMargin > 10) governanceScore += 1;

  const validScores = [fundamentalsScore, valuationScore, governanceScore].filter(s => !isNaN(s));
  const overallScore = validScores.length > 0
    ? (fundamentalsScore * 0.4 + valuationScore * 0.35 + governanceScore * 0.25) / 1
    : undefined;

  return {
    fundamentalsScore: Math.max(0, Math.min(10, fundamentalsScore)),
    valuationScore: Math.max(0, Math.min(10, valuationScore)),
    governanceScore: Math.max(0, Math.min(10, governanceScore)),
    overallScore: overallScore ? Math.max(0, Math.min(10, overallScore)) : undefined,
  };
}

export function generateRiskAssessment(data: Partial<IpoData>): Partial<IpoData> {
  const redFlags: string[] = [];
  const pros: string[] = [];

  // Red flags
  if (data.peRatio && data.sectorPeMedian && data.peRatio > data.sectorPeMedian * 1.3) {
    redFlags.push(`P/E ratio ${((data.peRatio / data.sectorPeMedian - 1) * 100).toFixed(0)}% above sector median`);
  }
  if (data.ofsRatio && data.ofsRatio > 0.3) {
    redFlags.push("Offer for Sale (OFS) ratio above 30%");
  }
  if (data.debtToEquity && data.debtToEquity > 1) {
    redFlags.push(`High debt-to-equity ratio (${data.debtToEquity.toFixed(2)})`);
  }
  if (data.revenueGrowth && data.revenueGrowth < 5) {
    redFlags.push("Low revenue growth");
  }

  // Pros
  if (data.revenueGrowth && data.revenueGrowth > 20) {
    pros.push(`Strong revenue growth (${data.revenueGrowth.toFixed(1)}% CAGR)`);
  }
  if (data.roe && data.roe > 18) {
    pros.push(`Healthy ROE (${data.roe.toFixed(1)}%)`);
  }
  if (data.debtToEquity && data.debtToEquity < 0.5) {
    pros.push(`Low debt levels (D/E: ${data.debtToEquity.toFixed(2)})`);
  }
  if (data.gmp && data.gmp > 0) {
    pros.push("Positive GMP indicating market confidence");
  }

  const riskLevel: "conservative" | "moderate" | "aggressive" =
    redFlags.length > 3 ? "aggressive" :
      redFlags.length > 1 ? "moderate" :
        "conservative";

  return {
    redFlags: redFlags.length > 0 ? redFlags : undefined,
    pros: pros.length > 0 ? pros : undefined,
    riskLevel: redFlags.length > 0 ? riskLevel : undefined,
  };
}
