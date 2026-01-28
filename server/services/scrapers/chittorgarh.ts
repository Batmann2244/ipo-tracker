import * as cheerio from "cheerio";
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
  parseLotSize,
  parseSubscriptionValue,
  determineStatus,
  parseFinancialMetrics,
  generateScores,
  generateRiskAssessment,
} from "./base";
import { getSourceLogger } from "../../logger/index";

const logger = getSourceLogger('chittorgarh');

const URLS = {
  ipoList: "https://www.chittorgarh.com/ipo/ipo_list.asp",
  upcomingMainboard: "https://www.chittorgarh.com/report/mainboard-ipo-list-in-india-702/",
  upcomingSme: "https://www.chittorgarh.com/report/sme-ipo-list-in-india/702/",
  subscriptionLive: "https://www.chittorgarh.com/report/ipo-subscription-status-live-mainboard-sme/21/",
  gmpPage: "https://www.chittorgarh.com/report/ipo-grey-market-premium-latest-grey-market-premium-702/",
};

export class ChittorgarhScraper extends BaseScraper {
  constructor() {
    super("Chittorgarh");
  }

  async getIpos(): Promise<ScraperResult<IpoData>> {
    const startTime = Date.now();
    const allIpos: IpoData[] = [];

    try {
      const [mainboardIpos, smeIpos, currentIpos] = await Promise.all([
        this.scrapeUpcomingMainboard(),
        this.scrapeUpcomingSme(),
        this.scrapeCurrentIpos(),
      ]);

      const symbolMap = new Map<string, IpoData>();

      for (const ipo of [...mainboardIpos, ...smeIpos, ...currentIpos]) {
        const existing = symbolMap.get(ipo.symbol);
        if (!existing || this.isMoreComplete(ipo, existing)) {
          symbolMap.set(ipo.symbol, ipo);
        }
      }

      allIpos.push(...Array.from(symbolMap.values()));
      this.log(`Found ${allIpos.length} IPOs total`);

      return this.wrapResult(allIpos, startTime);
    } catch (err: any) {
      this.error("Failed to get IPOs", err);
      return this.wrapResult([], startTime, err.message);
    }
  }

  private isMoreComplete(a: IpoData, b: IpoData): boolean {
    const scoreA = (a.openDate ? 1 : 0) + (a.priceMin ? 1 : 0) + (a.lotSize ? 1 : 0);
    const scoreB = (b.openDate ? 1 : 0) + (b.priceMin ? 1 : 0) + (b.lotSize ? 1 : 0);
    return scoreA > scoreB;
  }

  private async scrapeUpcomingMainboard(): Promise<IpoData[]> {
    try {
      const html = await this.fetchPage(URLS.upcomingMainboard);
      return this.parseIpoTable(html, "mainboard");
    } catch (err) {
      this.error("Failed to scrape mainboard IPOs", err);
      return [];
    }
  }

  private async scrapeUpcomingSme(): Promise<IpoData[]> {
    try {
      const html = await this.fetchPage(URLS.upcomingSme);
      return this.parseIpoTable(html, "sme");
    } catch (err) {
      this.error("Failed to scrape SME IPOs", err);
      return [];
    }
  }

  private async scrapeCurrentIpos(): Promise<IpoData[]> {
    try {
      const html = await this.fetchPage(URLS.ipoList);
      return this.parseIpoTable(html, "mainboard");
    } catch (err) {
      this.error("Failed to scrape current IPOs", err);
      return [];
    }
  }

  private parseIpoTable(html: string, ipoType: "mainboard" | "sme"): IpoData[] {
    const $ = cheerio.load(html);
    const ipos: IpoData[] = [];
    
    const tableCount = $("table").length;
    logger.info(`Parsing HTML: ${tableCount} tables found, HTML length: ${html.length} chars`);

    $("table").each((tableIdx, table) => {
      const rowCount = $(table).find("tr").length;
      logger.info(`Table ${tableIdx}: ${rowCount} rows`);
      
      $(table).find("tr").each((rowIdx, row) => {
        const cells = $(row).find("td");
        if (cells.length < 4) {
          if (rowIdx < 3) logger.info(`  Row ${rowIdx}: ${cells.length} cells (skipped - less than 4)`);
          return;
        }

        const companyName = cells.eq(0).text().trim();
        if (!companyName || companyName.length < 3) return;
        if (companyName.toLowerCase().includes("company") || companyName.toLowerCase().includes("ipo name")) return;

        logger.info(`  Found company: ${companyName} (${cells.length} cells)`);
        
        const symbol = normalizeSymbol(companyName);

        let openDate: string | null = null;
        let closeDate: string | null = null;
        let priceRange = "";
        let lotSize: number | null = null;
        let issueSize = "";

        for (let i = 1; i < cells.length; i++) {
          const cellText = cells.eq(i).text().trim();

          if (cellText.match(/\d{1,2}\s*[a-zA-Z]+\s*,?\s*\d{4}/)) {
            if (!openDate) {
              openDate = parseDate(cellText);
            } else if (!closeDate) {
              closeDate = parseDate(cellText);
            }
          }

          if (cellText.includes("₹") || cellText.match(/\d+\s*to\s*\d+/) || cellText.match(/\d+-\d+/)) {
            priceRange = cellText;
          }

          if (cellText.toLowerCase().includes("cr") || cellText.toLowerCase().includes("crore")) {
            issueSize = cellText;
          }

          if (cellText.match(/^\d+$/) && parseInt(cellText) < 500) {
            lotSize = parseInt(cellText, 10);
          }
        }

        const { min: priceMin, max: priceMax } = parsePriceRange(priceRange);
        const issueSizeCrores = parseIssueSize(issueSize);
        const status = determineStatus(openDate, closeDate);

        const ipoData: IpoData = {
          symbol,
          companyName,
          openDate,
          closeDate,
          listingDate: null,
          priceRange,
          priceMin,
          priceMax,
          lotSize,
          issueSize,
          issueSizeCrores,
          status,
          ipoType,
        };

        // Enrich with scores and risk assessment
        const enriched = {
          ...ipoData,
          ...generateScores(ipoData),
          ...generateRiskAssessment(ipoData),
        };

        ipos.push(enriched);
      });
    });

    return ipos;
  }

  async getSubscriptions(): Promise<ScraperResult<SubscriptionData>> {
    const startTime = Date.now();

    try {
      const html = await this.fetchPage(URLS.subscriptionLive);
      const $ = cheerio.load(html);
      const subscriptions: SubscriptionData[] = [];

      $("table").each((_, table) => {
        $(table).find("tr").each((_, row) => {
          const cells = $(row).find("td");
          if (cells.length < 5) return;

          const companyName = cells.eq(0).text().trim();
          if (!companyName || companyName.length < 3) return;
          if (companyName.toLowerCase().includes("company") || companyName.toLowerCase().includes("ipo name")) return;

          const symbol = normalizeSymbol(companyName);

          subscriptions.push({
            symbol,
            companyName,
            qib: parseSubscriptionValue(cells.eq(1).text()),
            nii: parseSubscriptionValue(cells.eq(2).text()),
            hni: parseSubscriptionValue(cells.eq(2).text()),
            retail: parseSubscriptionValue(cells.eq(3).text()),
            total: parseSubscriptionValue(cells.eq(4).text()),
            applications: null,
          });
        });
      });

      this.log(`Found ${subscriptions.length} subscription records`);
      return this.wrapResult(subscriptions, startTime);
    } catch (err: any) {
      this.error("Failed to get subscriptions", err);
      return this.wrapResult([], startTime, err.message);
    }
  }

  async getGmp(): Promise<ScraperResult<GmpData>> {
    const startTime = Date.now();

    try {
      const html = await this.fetchPage(URLS.gmpPage);
      const $ = cheerio.load(html);
      const gmpData: GmpData[] = [];

      $("table").each((_, table) => {
        $(table).find("tr").each((_, row) => {
          const cells = $(row).find("td");
          if (cells.length < 3) return;

          const companyName = cells.eq(0).text().trim();
          if (!companyName || companyName.length < 3) return;
          if (companyName.toLowerCase().includes("company") || companyName.toLowerCase().includes("ipo name")) return;

          const symbol = normalizeSymbol(companyName);

          const gmpText = cells.eq(1).text().trim();
          const gmpMatch = gmpText.match(/[+-]?\s*₹?\s*(\d+)/);
          const gmp = gmpMatch ? parseInt(gmpMatch[1], 10) : 0;

          const expectedText = cells.eq(2).text().trim();
          const expectedMatch = expectedText.match(/₹?\s*(\d+)/);
          const expectedListing = expectedMatch ? parseInt(expectedMatch[1], 10) : null;

          const percentMatch = gmpText.match(/\(([+-]?\d+\.?\d*)%\)/);
          const gmpPercent = percentMatch ? parseFloat(percentMatch[1]) : null;

          gmpData.push({
            symbol,
            companyName,
            gmp,
            expectedListing,
            gmpPercent,
          });
        });
      });

      this.log(`Found ${gmpData.length} GMP records`);
      return this.wrapResult(gmpData, startTime);
    } catch (err: any) {
      this.error("Failed to get GMP data", err);
      return this.wrapResult([], startTime, err.message);
    }
  }
}

export const chittorgarhScraper = new ChittorgarhScraper();
