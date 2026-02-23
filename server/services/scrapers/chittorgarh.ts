import * as cheerio from "cheerio";
import puppeteer from "puppeteer";
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
  // Updated URLs - Feb 2026
  ipoList: "https://www.chittorgarh.com/ipo",
  upcomingMainboard: "https://www.chittorgarh.com/report/ipo-in-india-list-main-board-sme/82/mainboard/",
  upcomingSme: "https://www.chittorgarh.com/report/ipo-in-india-list-main-board-sme/82/sme/",
  subscriptionLive: "https://www.chittorgarh.com/report/ipo-subscription-status-live-bidding-data-bse-nse/21/",
  gmpPage: "https://www.chittorgarh.com/report/ipo-grey-market-premium-latest-grey-market-premium-702/", // Redirects to InvestorGain now
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
    const allIpos: IpoData[] = [];

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

      // 1. Scrape Upcoming Mainboard
      try {
        const mainboardIpos = await this.scrapeCategory(browser, URLS.upcomingMainboard, "mainboard");
        logger.info(`Extracted ${mainboardIpos.length} Mainboard IPOs`);
        allIpos.push(...mainboardIpos);
      } catch (e: any) {
        logger.error(`Failed to scrape Mainboard IPOs: ${e.message}`);
      }

      // 2. Scrape Upcoming SME
      try {
        const smeIpos = await this.scrapeCategory(browser, URLS.upcomingSme, "sme");
        logger.info(`Extracted ${smeIpos.length} SME IPOs`);
        allIpos.push(...smeIpos);
      } catch (e: any) {
        logger.error(`Failed to scrape SME IPOs: ${e.message}`);
      }

      // 3. Scrape Current IPOs (might overlap, deduplication handles it)
      try {
        const currentIpos = await this.scrapeCategory(browser, URLS.ipoList, "mainboard"); // Type might vary, we'll assume mainboard or check
        logger.info(`Extracted ${currentIpos.length} Current IPOs`);
        allIpos.push(...currentIpos);
      } catch (e: any) {
        logger.error(`Failed to scrape Current IPOs: ${e.message}`);
      }

      await browser.close();
      browser = null;

      // Deduplicate by symbol
      const uniqueIposMap = new Map<string, IpoData>();
      for (const ipo of allIpos) {
        if (!uniqueIposMap.has(ipo.symbol)) {
           uniqueIposMap.set(ipo.symbol, ipo);
        }
      }
      const uniqueIpos = Array.from(uniqueIposMap.values());

      this.log(`Found ${uniqueIpos.length} total unique IPOs using Puppeteer`);
      return this.wrapResult(uniqueIpos, startTime);

    } catch (err: any) {
      if (browser) {
        await browser.close().catch(() => { });
      }
      this.error("Puppeteer scraping failed", err);
      logger.error(`❌ Browser automation failed: ${err.message}`);
      return this.wrapResult([], startTime, err.message);
    }
  }

  private async scrapeCategory(browser: any, url: string, defaultType: "mainboard" | "sme"): Promise<IpoData[]> {
      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });

      logger.info(`Navigating to: ${url}`);
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      try {
        await page.waitForSelector('table, .ipo-card, .report-table, [class*="ipo"]', {
          timeout: 10000
        });
      } catch (waitErr) {
        logger.warn(`No IPO elements found on ${url} after waiting.`);
      }

      // Extract IPO data from the rendered page
      const rawIpos = await page.evaluate(() => {
        const results: any[] = [];
        const tables = document.querySelectorAll('table');

        tables.forEach(table => {
          const rows = table.querySelectorAll('tr');
          rows.forEach((row, index) => {
            if (index === 0) return; // Skip header

            const cells = row.querySelectorAll('td');
            if (cells.length < 4) return;

            const companyName = cells[0]?.textContent?.trim();
            if (!companyName || companyName.length < 3) return;
            if (companyName.toLowerCase().includes("company")) return;

            const openDate = cells[1]?.textContent?.trim() || null;
            const closeDate = cells[2]?.textContent?.trim() || null;
            const priceRange = cells[3]?.textContent?.trim() || null;
            const lotSize = cells[4]?.textContent?.trim() || null;
            const issueSize = cells[5]?.textContent?.trim() || null;

            results.push({
              companyName,
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

      await page.close();

      return rawIpos.map((ipo: any) => {
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
          ipoType: defaultType
        };
      });
  }

  async getSubscriptions(): Promise<ScraperResult<SubscriptionData>> {
    const startTime = Date.now();
    let browser;

    try {
      logger.info(`Fetching subscriptions from ${URLS.subscriptionLive}`);

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
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
          req.abort();
        } else {
          req.continue();
        }
      });

      await page.goto(URLS.subscriptionLive, { waitUntil: 'domcontentloaded', timeout: 45000 });

      try {
        await page.waitForSelector('table', { timeout: 15000 });
      } catch (e) {
        logger.warn("Table selector timeout, continuing with current content");
      }

      const html = await page.content();
      await browser.close();
      browser = null;

      const $ = cheerio.load(html);
      const subscriptions: SubscriptionData[] = [];

      $("table").each((_, table) => {
        const rows = $(table).find("tr");
        if (rows.length < 2) return;

        rows.each((rowIdx, row) => {
          if (rowIdx === 0) return;

          const cells = $(row).find("td");
          if (cells.length < 12) return;

          const companyName = cells.eq(0).text().trim();
          if (!companyName || companyName.length < 3) return;
          if (companyName.toLowerCase().includes("company") || companyName.toLowerCase().includes("ipo name")) return;

          const symbol = normalizeSymbol(companyName);

          const subData: SubscriptionData = {
            symbol,
            companyName,
            qib: parseSubscriptionValue(cells.eq(3).text()),
            nii: parseSubscriptionValue(cells.eq(6).text()),
            hni: parseSubscriptionValue(cells.eq(6).text()),
            retail: parseSubscriptionValue(cells.eq(7).text()),
            total: parseSubscriptionValue(cells.eq(11).text()),
            applications: parseSubscriptionValue(cells.eq(12).text()),
          };

          subscriptions.push(subData);
        });
      });

      this.log(`Found ${subscriptions.length} subscription records`);
      return this.wrapResult(subscriptions, startTime);
    } catch (err: any) {
      if (browser) await browser.close().catch(() => {});
      this.error("Failed to get subscriptions", err);
      return this.wrapResult([], startTime, err.message);
    }
  }

  async getGmp(): Promise<ScraperResult<GmpData>> {
    const startTime = Date.now();
    // Chittorgarh GMP page now redirects to InvestorGain or is 404.
    // We rely on InvestorGain scraper for GMP.
    this.log("GMP data fetch skipped (using InvestorGain source instead)");
    return this.wrapResult([], startTime);
  }
}

export const chittorgarhScraper = new ChittorgarhScraper();
