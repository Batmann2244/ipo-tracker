import {
  BaseScraper,
  IpoData,
  SubscriptionData,
  GmpData,
  ScraperResult,
  normalizeSymbol,
  parseDate,
  generateScores,
  generateRiskAssessment,
} from "./base";
import axios, { AxiosRequestConfig } from 'axios';

const URLS = {
  currentIpos: "https://www.nseindia.com/api/ipo-current-issue",
  upcomingIpos: "https://www.nseindia.com/api/ipo-upcoming",
  pastIpos: "https://www.nseindia.com/api/ipo-past-issues",
};

const NSE_BASE_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Connection": "keep-alive",
  "Referer": "https://www.nseindia.com/market-data/all-upcoming-issues-ipo",
  "Origin": "https://www.nseindia.com",
};

interface NseIpoData {
  symbol: string;
  companyName: string;
  issueStartDate: string;
  issueEndDate: string;
  issuePrice: string;
  issueSizeAmount: string;
  issueType: string;
  listingDate?: string;
}

interface NseCurrentIpo {
  symbol: string;
  companyName: string;
  issueStartDate: string;
  issueEndDate: string;
  issuePrice: string;
  issueSizeAmount: string;
  qibSubscription?: number;
  niiSubscription?: number;
  retailSubscription?: number;
  totalSubscription?: number;
}

export class NseScraper extends BaseScraper {
  private cookies: string = "";
  private cookieJar: Map<string, string> = new Map();

  constructor() {
    super("NSE");
  }

  // CRITICAL FIX 1: Properly capture and store cookies
  private async initSession(): Promise<void> {
    try {
      this.log("Initializing NSE session...");

      const response = await axios.get("https://www.nseindia.com", {
        headers: NSE_BASE_HEADERS,
        maxRedirects: 5,
        validateStatus: () => true, // Accept any status
      });

      // CRITICAL: Extract cookies from response
      const setCookieHeaders = response.headers['set-cookie'];

      if (setCookieHeaders) {
        setCookieHeaders.forEach((cookieStr: string) => {
          const [nameValue] = cookieStr.split(';');
          const [name, value] = nameValue.split('=');
          if (name && value) {
            this.cookieJar.set(name.trim(), value.trim());
          }
        });

        // Build cookie string for subsequent requests
        this.cookies = Array.from(this.cookieJar.entries())
          .map(([name, value]) => `${name}=${value}`)
          .join('; ');

        this.log(`NSE session initialized with ${this.cookieJar.size} cookies`);
      } else {
        this.log("Warning: No cookies received from NSE homepage");
      }

    } catch (err: any) {
      this.error("Failed to init NSE session", err);
      throw err;
    }
  }

  // CRITICAL FIX 2: Use cookies in all API requests
  private getHeadersWithCookies(): Record<string, string> {
    return {
      ...NSE_BASE_HEADERS,
      ...(this.cookies ? { "Cookie": this.cookies } : {}),
    };
  }

  async getIpos(): Promise<ScraperResult<IpoData>> {
    const startTime = Date.now();

    try {
      await this.initSession();

      const [currentIpos, upcomingIpos] = await Promise.allSettled([
        this.fetchCurrentIpos(),
        this.fetchUpcomingIpos(),
      ]);

      const ipos: IpoData[] = [];

      if (currentIpos.status === "fulfilled") {
        ipos.push(...currentIpos.value);
        this.log(`Current IPOs: ${currentIpos.value.length}`);
      } else {
        this.error("Failed to fetch current IPOs", currentIpos.reason);
      }

      if (upcomingIpos.status === "fulfilled") {
        ipos.push(...upcomingIpos.value);
        this.log(`Upcoming IPOs: ${upcomingIpos.value.length}`);
      } else {
        this.error("Failed to fetch upcoming IPOs", upcomingIpos.reason);
      }

      this.log(`Total found: ${ipos.length} IPOs from NSE`);
      return this.wrapResult(ipos, startTime);

    } catch (err: any) {
      this.error("Failed to get IPOs from NSE", err);
      return this.wrapResult([], startTime, err.message);
    }
  }

  private async fetchCurrentIpos(): Promise<IpoData[]> {
    try {
      // Use axios directly with proper cookies
      const response = await axios.get<NseCurrentIpo[]>(URLS.currentIpos, {
        headers: this.getHeadersWithCookies(),
        timeout: 15000,
        validateStatus: (status) => status < 500,
      });

      if (response.status === 401 || response.status === 403) {
        this.log("Authentication failed, reinitializing session");
        await this.initSession();

        // Retry with new cookies
        const retryResponse = await axios.get<NseCurrentIpo[]>(URLS.currentIpos, {
          headers: this.getHeadersWithCookies(),
          timeout: 15000,
        });

        return (retryResponse.data || []).map(ipo => this.transformNseIpo(ipo, "open"));
      }

      const data = response.data;
      if (!Array.isArray(data) || data.length === 0) {
        this.log(`NSE Current IPOs empty or invalid: ${JSON.stringify(data).substring(0, 500)}`);
      }

      return (data || []).map(ipo => this.transformNseIpo(ipo, "open"));

    } catch (err: any) {
      this.error("Failed to fetch current IPOs", {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data
      });
      return [];
    }
  }

  private async fetchUpcomingIpos(): Promise<IpoData[]> {
    try {
      const response = await axios.get<NseIpoData[]>(URLS.upcomingIpos, {
        headers: this.getHeadersWithCookies(),
        timeout: 15000,
        validateStatus: (status) => status < 500,
      });

      if (response.status === 401 || response.status === 403) {
        this.log("Authentication failed for upcoming IPOs");
        await this.initSession();

        const retryResponse = await axios.get<NseIpoData[]>(URLS.upcomingIpos, {
          headers: this.getHeadersWithCookies(),
          timeout: 15000,
        });

        return (retryResponse.data || []).map(ipo => this.transformNseIpo(ipo, "upcoming"));
      }

      return (response.data || []).map(ipo => this.transformNseIpo(ipo, "upcoming"));

    } catch (err: any) {
      this.error("Failed to fetch upcoming IPOs", {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data
      });
      return [];
    }
  }

  private transformNseIpo(ipo: any, defaultStatus: "upcoming" | "open" | "closed"): IpoData {
    const symbol = ipo.symbol ? ipo.symbol.toUpperCase() : normalizeSymbol(ipo.companyName);

    const priceMatch = ipo.issuePrice?.match(/[\d,]+\.?\d*/g);
    let priceMin: number | null = null;
    let priceMax: number | null = null;

    if (priceMatch) {
      const prices = priceMatch.map((p: string) => parseFloat(p.replace(/,/g, "")));
      priceMin = Math.min(...prices);
      priceMax = Math.max(...prices);
    }

    const sizeMatch = ipo.issueSizeAmount?.match(/([\d,]+\.?\d*)/);
    const issueSizeCrores = sizeMatch ? parseFloat(sizeMatch[1].replace(/,/g, "")) : null;

    return {
      symbol,
      companyName: ipo.companyName,
      openDate: parseDate(ipo.issueStartDate),
      closeDate: parseDate(ipo.issueEndDate),
      listingDate: ipo.listingDate ? parseDate(ipo.listingDate) : null,
      priceRange: ipo.issuePrice || "TBA",
      priceMin,
      priceMax,
      lotSize: null,
      issueSize: ipo.issueSizeAmount || "TBA",
      issueSizeCrores,
      status: defaultStatus,
      ipoType: "mainboard",
      ...generateScores({
        symbol,
        companyName: ipo.companyName,
        priceMin,
        priceMax,
        status: defaultStatus,
      }),
      ...generateRiskAssessment({
        symbol,
        companyName: ipo.companyName,
        priceMin,
        priceMax,
        status: defaultStatus,
      }),
    };
  }

  async getSubscriptions(): Promise<ScraperResult<SubscriptionData>> {
    const startTime = Date.now();

    try {
      await this.initSession();

      const response = await axios.get<NseCurrentIpo[]>(URLS.currentIpos, {
        headers: this.getHeadersWithCookies(),
        timeout: 15000,
      });

      const subscriptions: SubscriptionData[] = [];

      for (const ipo of response.data || []) {
        if (ipo.totalSubscription) {
          subscriptions.push({
            symbol: ipo.symbol?.toUpperCase() || normalizeSymbol(ipo.companyName),
            companyName: ipo.companyName,
            qib: ipo.qibSubscription || null,
            nii: ipo.niiSubscription || null,
            hni: ipo.niiSubscription || null,
            retail: ipo.retailSubscription || null,
            total: ipo.totalSubscription,
            applications: null,
          });
        }
      }

      this.log(`Found ${subscriptions.length} subscription records from NSE`);
      return this.wrapResult(subscriptions, startTime);

    } catch (err: any) {
      this.error("Failed to get subscriptions from NSE", err);
      return this.wrapResult([], startTime, err.message);
    }
  }

  async getGmp(): Promise<ScraperResult<GmpData>> {
    const startTime = Date.now();
    this.log("GMP data not available from NSE (unofficial data)");
    return this.wrapResult([], startTime);
  }
}

export const nseScraper = new NseScraper();
