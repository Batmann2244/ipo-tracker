import { BaseScraper, ScraperResult, IpoData, SubscriptionData, GmpData } from './base';
import * as puppeteer from 'puppeteer';

export class BseScraper extends BaseScraper {
    constructor() {
        super('bse');
    }

    async getIpos(): Promise<ScraperResult<IpoData>> {
        let browser: puppeteer.Browser | null = null;
        const startTime = Date.now();

        try {
            this.sourceLogger.info("Starting BSE scraper (simplified)");

            const interceptedData: any[] = [];

            browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                ]
            });

            const page = await browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

            page.on('console', msg => this.sourceLogger.debug('PAGE LOG:', msg.text()));

            const url = 'https://www.bseindia.com/markets/PublicIssues/IPOIssues_New.aspx';

            try {
                this.sourceLogger.info(`Navigating to ${url}`);
                await page.goto(url, {
                    waitUntil: 'domcontentloaded',
                    timeout: 20000
                });

                // Interact with the form
                try {
                    this.sourceLogger.info("Selecting IPO option...");
                    await page.waitForSelector('#ctl00_ContentPlaceHolder1_ddlIssueType', { timeout: 5000 });
                    await page.select('#ctl00_ContentPlaceHolder1_ddlIssueType', 'IPO');

                    this.sourceLogger.info("Clicking Submit...");
                    await page.waitForSelector('#ctl00_ContentPlaceHolder1_btnSubmit', { timeout: 5000 });

                    await Promise.all([
                        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }),
                        page.click('#ctl00_ContentPlaceHolder1_btnSubmit')
                    ]);

                    this.sourceLogger.info("Form submitted, waiting for results...");
                 } catch (interactionError: any) {
                     this.sourceLogger.warn(`Form interaction failed: ${interactionError.message}`);
                 }

                 // Extract data
                 const domData = await page.evaluate(() => {
                    const results: any[] = [];
                    // Try specific BSE table ID first
                    let targetTable = document.querySelector('#ContentPlaceHolder1_gvIPO');

                    // Fallback to any table with data
                    if (!targetTable) {
                        const tables = Array.from(document.querySelectorAll('table'));
                        targetTable = tables.find(t => {
                            const rows = t.querySelectorAll('tr');
                            return rows.length > 1; // Has header + data
                        }) || null;
                    }

                    if (targetTable) {
                        const rows = targetTable.querySelectorAll('tr');
                        // Skip first row (header)
                        for (let i = 1; i < rows.length; i++) {
                            const cells = rows[i].querySelectorAll('td');
                            if (cells.length >= 4) {
                                const cellTexts = Array.from(cells).map(c => c.textContent?.trim() || '');
                                const nameCell = cellTexts.find(text => text && text.length > 3 && !text.match(/^\d+$/) && !text.toLowerCase().includes('no records'));

                                if (nameCell) {
                                    results.push({
                                        Scrip_Name: nameCell,
                                        Scrip_cd: cellTexts[0] || '',
                                        Status: 'L',
                                        Price_Band: cellTexts[3] || 'TBA',
                                        Market_Lot: cellTexts[4] || '1',
                                        Start_Dt: cellTexts[5] || new Date().toISOString(),
                                        End_Dt: cellTexts[6] || new Date().toISOString(),
                                        eXCHANGE_PLATFORM: 'MAIN'
                                    });
                                }
                            }
                        }
                    }
                    return results;
                });

                if (domData.length > 0) {
                    this.sourceLogger.info(`DOM extraction found ${domData.length} records`);
                    interceptedData.push(...domData);
                } else {
                     this.sourceLogger.warn('DOM extraction returned 0 records');
                }

            } catch (navError: any) {
                this.sourceLogger.warn(`Navigation/Interaction error: ${navError.message}`);
            }

             // Transform to IpoData
            const ipos: IpoData[] = interceptedData.map(item => ({
                symbol: item.Scrip_cd ? String(item.Scrip_cd) : 'UNKNOWN',
                companyName: item.Scrip_Name || 'Unknown',
                status: 'closed' as const,
                priceRange: item.Price_Band || 'TBA',
                issueSize: 'TBA',
                issueSizeCrores: null,
                priceMin: null,
                priceMax: null,
                lotSize: item.Market_Lot ? parseInt(item.Market_Lot) : null,
                listingDate: null,
                ipoType: item.eXCHANGE_PLATFORM === 'SME' ? 'sme' : 'mainboard',
                openDate: item.Start_Dt ? item.Start_Dt.split('T')[0] : null,
                closeDate: item.End_Dt ? item.End_Dt.split('T')[0] : null,
            }));

            this.sourceLogger.info(`BSE scraper completed: ${ipos.length} IPOs extracted`);
            return this.wrapResult(ipos, startTime);

        } catch (error: any) {
            this.sourceLogger.error('BSE scraper error', { error: error.message });
            return this.handleError(error);
        } finally {
             if (browser) await browser.close();
        }
    }

    async getSubscriptions(): Promise<ScraperResult<SubscriptionData>> {
        return this.wrapSubscriptionResult([], Date.now());
    }

    async getGmp(): Promise<ScraperResult<GmpData>> {
        return this.wrapGmpResult([], Date.now());
    }
}

export const bseScraper = new BseScraper();
