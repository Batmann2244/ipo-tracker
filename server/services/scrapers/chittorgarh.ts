import * as cheerio from "cheerio";
import puppeteer from "puppeteer";
import pLimit from "p-limit";
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
  parseDecimal,
  parsePercentage
} from "./base";
import { getSourceLogger } from "../../logger/index";

const logger = getSourceLogger('chittorgarh');

const URLS = {
  // Updated URLs - Jan 2026
  ipoList: "https://www.chittorgarh.com/ipo",
  upcomingMainboard: "https://www.chittorgarh.com/report/mainboard-ipo-list-in-india-bse-nse/83/",
  upcomingSme: "https://www.chittorgarh.com/report/sme-ipo-list-in-india-bse-nse/87/",
  subscriptionLive: "https://www.chittorgarh.com/report/ipo-subscription-status-live-mainboard-sme/21/",
  gmpPage: "https://www.chittorgarh.com/report/ipo-grey-market-premium-latest-grey-market-premium-702/",
};

/**
 * Chittorgarh Scraper with Puppeteer
 * 
 * ✅ UPDATED: Now uses Puppeteer for browser automation (Feb 2026)
 * 
 * Chittorgarh.com uses JavaScript rendering for their IPO pages.
 * We use Puppeteer to render the page and extract data from the live DOM.
 * 
 * This provides reliable scraping of their JavaScript-rendered content.
 */
export class ChittorgarhScraper extends BaseScraper {
  constructor() {
    super("Chittorgarh");
  }

  async getIpos(): Promise<ScraperResult<IpoData>> {
    const startTime = Date.now();
    let browser;

    try {
      logger.info("🚀 Launching Puppeteer browser for Chittorgarh scraping...");

      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu'
        ]
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });

      logger.info(`Navigating to: ${URLS.upcomingMainboard}`);
      await page.goto(URLS.upcomingMainboard, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait for content to load (either tables or cards)
      try {
        await page.waitForSelector('table, .ipo-card, .report-table, [class*="ipo"]', {
          timeout: 10000
        });
        logger.info("✅ Page content loaded successfully");
      } catch (waitErr) {
        logger.warn("No IPO elements found after waiting. Page might use different selectors.");
      }

      // Extract IPO data from the rendered page
      const ipos = await page.evaluate(() => {
        const results: any[] = [];

        // Try to find tables first
        const tables = document.querySelectorAll('table');

        tables.forEach(table => {
          const rows = table.querySelectorAll('tr');

          rows.forEach((row, index) => {
            // Skip header rows
            if (index === 0) return;

            const cells = row.querySelectorAll('td');
            if (cells.length < 4) return;

            const companyName = cells[0]?.textContent?.trim();
            const companyLink = cells[0]?.querySelector('a')?.href || null;

            if (!companyName || companyName.length < 3) return;

            // Extract data from cells (adjust indices based on actual table structure)
            const openDate = cells[1]?.textContent?.trim() || null;
            const closeDate = cells[2]?.textContent?.trim() || null;
            const priceRange = cells[3]?.textContent?.trim() || null;
            const lotSize = cells[4]?.textContent?.trim() || null;
            const issueSize = cells[5]?.textContent?.trim() || null;

            results.push({
              companyName,
              companyLink,
              openDate,
              closeDate,
              priceRange,
              lotSize,
              issueSize
            });
          });
        });

        return results;
      });

      await browser.close();
      browser = null;

      logger.info(`📊 Extracted ${ipos.length} IPOs from browser`);

      // Convert raw data to IpoData format
      const initialIpos = ipos.map(ipo => {
        const { min, max } = parsePriceRange(ipo.priceRange || "");

        return {
          symbol: normalizeSymbol(ipo.companyName),
          companyName: ipo.companyName,
          openDate: parseDate(ipo.openDate),
          closeDate: parseDate(ipo.closeDate),
          listingDate: null,
          priceRange: ipo.priceRange || "TBA",
          priceMin: min,
          priceMax: max,
          lotSize: parseLotSize(ipo.lotSize),
          issueSize: ipo.issueSize || "TBA",
          issueSizeCrores: parseIssueSize(ipo.issueSize),
          status: determineStatus(parseDate(ipo.openDate), parseDate(ipo.closeDate)),
          ipoType: "mainboard",
          companyLink: ipo.companyLink
        };
      });

      // Fetch details for upcoming/open IPOs
      const limit = pLimit(5);
      logger.info("🔍 Fetching detailed financials for active IPOs...");

      const enrichedIpos: IpoData[] = await Promise.all(initialIpos.map((ipo: any) => limit(async () => {
        if ((ipo.status === 'upcoming' || ipo.status === 'open') && ipo.companyLink) {
            try {
                const details = await this.getIpoDetails(ipo.companyLink);

                // Merge details
                const merged = { ...ipo, ...details };

                // Re-calculate scores with new details
                return {
                    ...merged,
                    ...generateScores(merged),
                    ...generateRiskAssessment(merged)
                };
            } catch (err) {
                logger.warn(`Failed to fetch details for ${ipo.symbol}: ${err}`);
                return ipo;
            }
        }

        // Even without details, generate basic scores
        return {
            ...ipo,
            ...generateScores(ipo),
            ...generateRiskAssessment(ipo)
        };
      })));

      this.log(`Found ${enrichedIpos.length} IPOs (enriched with details)`);
      return this.wrapResult(enrichedIpos, startTime);

    } catch (err: any) {
      if (browser) {
        await browser.close().catch(() => { });
      }
      this.error("Puppeteer scraping failed", err);
      logger.error(`❌ Browser automation failed: ${err.message}`);
      return this.wrapResult([], startTime, err.message);
    }
  }

  async getIpoDetails(url: string): Promise<Partial<IpoData>> {
      try {
          const html = await this.fetchPage(url);
          const $ = cheerio.load(html);
          const details: Partial<IpoData> = {};

          // Parse KPI Table
          $("table").each((_, table) => {
              const tableText = $(table).text();
              if (tableText.includes("KPI") || tableText.includes("ROE") || tableText.includes("P/E")) {
                  $(table).find("tr").each((_, row) => {
                      const cells = $(row).find("td");
                      if (cells.length >= 2) {
                          const label = cells.eq(0).text().trim().toLowerCase();
                          const valStr = cells.eq(1).text().trim();

                          // Handle multiple columns (Pre/Post IPO)
                          // Usually Post IPO is the last column if there are 3 cols

                          if (label.includes("roe")) details.roe = parsePercentage(valStr) || undefined;
                          else if (label.includes("roce")) details.roce = parsePercentage(valStr) || undefined;
                          else if (label.includes("debt") && label.includes("equity")) details.debtToEquity = parseDecimal(valStr) || undefined;
                          else if (label.includes("pat margin")) details.patMargin = parsePercentage(valStr) || undefined;
                          else if (label.includes("p/e") || label.includes("pe ratio")) details.peRatio = parseDecimal(valStr) || undefined;
                          else if (label.includes("ronw")) details.roe = details.roe || parsePercentage(valStr) || undefined; // Fallback ROE

                          if (label.includes("promoter holding")) {
                              if (cells.length > 2) {
                                  // Assuming Col 1 is Pre, Col 2 is Post
                                  details.promoterHolding = parsePercentage(cells.eq(1).text()) || undefined;
                                  details.postIpoPromoterHolding = parsePercentage(cells.eq(2).text()) || undefined;
                              } else {
                                  details.promoterHolding = parsePercentage(valStr) || undefined;
                              }
                          }
                      }
                  });
              }
          });

          return details;
      } catch (e) {
          logger.warn(`Failed to fetch details from ${url}: ${e}`);
          return {};
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
    const divCount = $("div").length;
    const hasScriptTags = $("script").length;

    logger.info(`Parsing HTML: ${tableCount} tables, ${divCount} divs, ${hasScriptTags} script tags, HTML length: ${html.length} chars`);

    // Check if this is a JavaScript-rendered page
    if (tableCount === 0 && hasScriptTags > 10) {
      logger.warn("⚠️ CHITTORGARH: Page is JavaScript-rendered. Static scraping won't work.");
      logger.warn("📌 RECOMMENDATION: Implement Puppeteer for this source OR rely on other scrapers.");
      return []; // Return empty array - can't scrape JS-rendered content
    }

    // Look for JSON data embedded in scripts
    $("script").each((_, script) => {
      const scriptContent = $(script).html() || "";
      if (scriptContent.includes("ipo") && scriptContent.includes("{")) {
        logger.info("Found potential JSON data in script tag");
      }
    });

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
