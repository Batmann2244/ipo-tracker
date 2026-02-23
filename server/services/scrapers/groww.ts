import {
  BaseScraper,
  DEFAULT_HEADERS,
  IpoData,
  SubscriptionData,
  GmpData,
  ScraperResult,
  normalizeSymbol,
  parseDate,
  parsePriceRange,
  parseIssueSize,
  parseFinancialMetrics,
  generateScores,
  generateRiskAssessment,
} from "./base";
import puppeteer from "puppeteer";
import { getSourceLogger } from "../../logger/index";

const logger = getSourceLogger('groww');

const URLS = {
  ipoApi: "https://groww.in/v1/api/stocks_ipo/v1/ipo",
  ipoPage: "https://groww.in/ipo",
};

interface GrowwIpoResponse {
  searchId: string;
  ipoDetailUrl: string;
  logoUrl: string;
  companyName: string;
  ipoType: string;
  ipoStatus: string;
  issuePrice: {
    minIssuePrice: number;
    maxIssuePrice: number;
  } | null;
  lotSize: number | null;
  totalIssueSize: number | null;
  applicationRanges: {
    minApplications: number | null;
    maxApplications: number | null;
  } | null;
  bidStartDate: string | null;
  bidEndDate: string | null;
  listingDate: string | null;
  subscriptionDetails: {
    totalSubscription: number;
    qibSubscription: number;
    niiSubscription: number;
    retailSubscription: number;
    employeeSubscription: number;
  } | null;
}

interface GrowwApiResponse {
  openIpos: GrowwIpoResponse[];
  upcomingIpos: GrowwIpoResponse[];
  closedIpos: GrowwIpoResponse[];
}

/**
 * Groww Scraper with Puppeteer
 * 
 * ✅ UPDATED: Now uses Puppeteer for browser automation (Feb 2026)
 * 
 * Groww's IPO API is deprecated, and the website uses JavaScript rendering.
 * We use Puppeteer to render the page and extract data from the live DOM.
 */
export class GrowwScraper extends BaseScraper {
  constructor() {
    super("Groww");
  }

  async getIpos(): Promise<ScraperResult<IpoData>> {
    const startTime = Date.now();
    let browser;

    try {
      logger.info("🚀 Launching Puppeteer browser for Groww...");

      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          // '--window-size=1920,1080', // Not needed for JSON extraction
          `--user-agent=${DEFAULT_HEADERS["User-Agent"]}`
        ]
      });

      const page = await browser.newPage();

      // Set extra headers
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      });

      logger.info(`Navigating to: ${URLS.ipoPage}`);
      await page.goto(URLS.ipoPage, {
        waitUntil: 'networkidle2',
        timeout: 45000
      });

      // Wait a bit for hydration script to be fully available (usually instant, but safety first)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Extract data from Next.js hydration script
      const ipoData = await page.evaluate(() => {
        try {
          const nextDataEl = document.getElementById('__NEXT_DATA__');
          if (!nextDataEl) return null;

          const json = JSON.parse(nextDataEl.textContent || '{}');
          return json.props?.pageProps;
        } catch (e) {
          return null;
        }
      });

      await browser.close();
      browser = null;

      const ipos: any[] = [];

      if (ipoData) {
        logger.info("✅ Found Next.js data! Parsing...");

        // Helper to map Groww's JSON structure
        const mapGrowwIpo = (item: any, status: 'open' | 'upcoming' | 'closed' | 'listed') => {
          return {
            companyName: item.companyName || item.searchId,
            symbol: item.symbol || item.searchId,
            openDate: item.openingDate || item.openDate,
            closeDate: item.closingDate || item.closeDate,
            listingDate: item.listingDate,
            priceRange: item.priceBand || (item.minPrice ? `₹${item.minPrice}-₹${item.maxPrice}` : null),
            priceMin: item.minPrice,
            priceMax: item.maxPrice,
            issueSize: item.issueSize,
            status: status
          };
        };

        // 1. Open IPOs
        if (Array.isArray(ipoData.openDataList)) {
          ipoData.openDataList.forEach((item: any) => ipos.push(mapGrowwIpo(item, 'open')));
        }

        // 2. Upcoming IPOs
        if (Array.isArray(ipoData.upcomingDataList)) {
          ipoData.upcomingDataList.forEach((item: any) => ipos.push(mapGrowwIpo(item, 'upcoming')));
        }

        // 3. Closed IPOs
        if (Array.isArray(ipoData.closedDataList)) {
          ipoData.closedDataList.forEach((item: any) => ipos.push(mapGrowwIpo(item, 'closed')));
        }
      } else {
        logger.warn("⚠️ JSON extraction failed (no __NEXT_DATA__).");
      }

      // Convert to standardized IpoData format
      const formattedIpos: IpoData[] = ipos.map(ipo => {
        const { min, max } = parsePriceRange(ipo.priceRange || "");

        return {
          symbol: normalizeSymbol(ipo.companyName),
          companyName: ipo.companyName,
          openDate: parseDate(ipo.openDate),
          closeDate: parseDate(ipo.closeDate),
          listingDate: parseDate(ipo.listingDate),
          priceRange: ipo.priceRange || "TBA",
          priceMin: min || ipo.priceMin,
          priceMax: max || ipo.priceMax,
          lotSize: ipo.lotSize ? parseInt(String(ipo.lotSize).replace(/,/g, '')) : null,
          issueSize: ipo.issueSize || "TBA",
          issueSizeCrores: parseIssueSize(ipo.issueSize),
          status: ipo.status,
          ipoType: "mainboard"
        };
      });

      this.log(`Found ${formattedIpos.length} IPOs via JSON extraction`);
      return this.wrapResult(formattedIpos, startTime);

    } catch (err: any) {
      if (browser) await browser.close().catch(() => { });
      this.error("Puppeteer scraping failed", err);
      return this.wrapResult([], startTime, err.message);
    }
  }

  async getSubscriptions(): Promise<ScraperResult<SubscriptionData>> {
    const startTime = Date.now();

    try {
      const data = await this.fetchJson<GrowwApiResponse>(URLS.ipoApi);
      const subscriptions: SubscriptionData[] = [];

      const processSubscriptions = (list: GrowwIpoResponse[]) => {
        for (const ipo of list || []) {
          if (!ipo.subscriptionDetails) continue;

          const symbol = normalizeSymbol(ipo.companyName);
          const { totalSubscription, qibSubscription, niiSubscription, retailSubscription } = ipo.subscriptionDetails;

          if (totalSubscription > 0) {
            subscriptions.push({
              symbol,
              companyName: ipo.companyName,
              qib: qibSubscription || null,
              nii: niiSubscription || null,
              hni: niiSubscription || null,
              retail: retailSubscription || null,
              total: totalSubscription,
              applications: null,
            });
          }
        }
      };

      processSubscriptions(data.openIpos);
      processSubscriptions(data.closedIpos);

      this.log(`Found ${subscriptions.length} subscription records`);
      return this.wrapResult(subscriptions, startTime);
    } catch (err: any) {
      this.error("Failed to get subscriptions", err);
      return this.wrapResult([], startTime, err.message);
    }
  }

  async getGmp(): Promise<ScraperResult<GmpData>> {
    const startTime = Date.now();
    this.log("GMP data not available from Groww API");
    return this.wrapResult([], startTime);
  }
}

export const growwScraper = new GrowwScraper();
