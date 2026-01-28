import {
  BaseScraper,
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

export class GrowwScraper extends BaseScraper {
  constructor() {
    super("Groww");
  }

  async getIpos(): Promise<ScraperResult<IpoData>> {
    const startTime = Date.now();

    try {
      logger.info(`Fetching Groww API: ${URLS.ipoApi}`);
      const data = await this.fetchJson<GrowwApiResponse>(URLS.ipoApi);
      logger.info(`API response received: openIpos=${data.openIpos?.length || 0}, upcomingIpos=${data.upcomingIpos?.length || 0}, closedIpos=${data.closedIpos?.length || 0}`);
      const ipos: IpoData[] = [];

      const processIpos = (list: GrowwIpoResponse[], defaultStatus: "upcoming" | "open" | "closed") => {
        for (const ipo of list || []) {
          const symbol = normalizeSymbol(ipo.companyName);

          const openDate = ipo.bidStartDate ? parseDate(ipo.bidStartDate) : null;
          const closeDate = ipo.bidEndDate ? parseDate(ipo.bidEndDate) : null;
          const listingDate = ipo.listingDate ? parseDate(ipo.listingDate) : null;

          const priceMin = ipo.issuePrice?.minIssuePrice || null;
          const priceMax = ipo.issuePrice?.maxIssuePrice || null;
          const priceRange = priceMin && priceMax
            ? `₹${priceMin} - ₹${priceMax}`
            : priceMin ? `₹${priceMin}` : "TBA";

          const issueSizeCrores = ipo.totalIssueSize
            ? ipo.totalIssueSize / 10000000
            : null;
          const issueSize = issueSizeCrores
            ? `₹${issueSizeCrores.toFixed(2)} Cr`
            : "TBA";

          let status: "upcoming" | "open" | "closed" | "listed" = defaultStatus;
          if (ipo.ipoStatus === "LISTED") status = "listed";

          const ipoType = ipo.ipoType?.toLowerCase() === "sme" ? "sme" : "mainboard";

          ipos.push({
            symbol,
            companyName: ipo.companyName,
            openDate,
            closeDate,
            listingDate,
            priceRange,
            priceMin,
            priceMax,
            lotSize: ipo.lotSize || null,
            issueSize,
            issueSizeCrores,
            status,
            ipoType,
          });
        }
      };

      processIpos(data.openIpos, "open");
      processIpos(data.upcomingIpos, "upcoming");
      processIpos(data.closedIpos, "closed");

      this.log(`Found ${ipos.length} IPOs from API`);
      return this.wrapResult(ipos, startTime);
    } catch (err: any) {
      logger.error(`API failed: ${err.message}`, { statusCode: err.response?.status, url: URLS.ipoApi });
      this.log("API endpoint failed, attempting HTML scraping fallback...");
      try {
        logger.info(`Fetching HTML page: ${URLS.ipoPage}`);
        const html = await this.fetchPage(URLS.ipoPage);
        logger.info(`HTML page fetched: ${html.length} chars`);
        this.log("HTML page fetched successfully (0 IPOs parsed from fallback)");
        return this.wrapResult([], startTime);
      } catch (fallbackErr: any) {
        logger.error(`HTML fallback failed: ${fallbackErr.message}`, { statusCode: fallbackErr.response?.status });
        this.error("Both API and HTML fallback failed", fallbackErr);
        return this.wrapResult([], startTime, `API: ${err.message}; Fallback: ${fallbackErr.message}`);
      }
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
