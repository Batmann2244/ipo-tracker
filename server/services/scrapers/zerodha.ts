import { BaseScraper, ScraperResult, IpoData, SubscriptionData, GmpData } from './base';
import * as cheerio from 'cheerio';
import * as puppeteer from 'puppeteer';

export class ZeodhaScraper extends BaseScraper {
    constructor() {
        super('zerodha');
    }

    async getIpos(): Promise<ScraperResult<IpoData>> {
        let browser;
        try {
            const url = 'https://zerodha.com/ipo';

            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            const page = await browser.newPage();

            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

            // Optimization: Block unnecessary resources
            await page.setRequestInterception(true);
            page.on('request', (req: puppeteer.HTTPRequest) => {
                const resourceType = req.resourceType();
                if (['image', 'media', 'font', 'stylesheet'].includes(resourceType)) {
                    req.abort();
                } else {
                    req.continue();
                }
            });

            // Navigate to the page with domcontentloaded to avoid timeout
            try {
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            } catch (e: any) {
                this.sourceLogger.warn(`Navigation timeout/error (continuing): ${e.message}`);
            }

            // Try to wait for content with multiple fallback selectors
            try {
                await page.waitForSelector('table, .ipo-row, [data-ipo], .table-container', { timeout: 5000 });
            } catch (e) {
                this.sourceLogger.warn("Primary selectors not found, trying generic fallback");
                try {
                    await page.waitForSelector('div', { timeout: 2000 });
                } catch (fallbackError) {
                    this.sourceLogger.warn("All selectors failed, proceeding with HTML extraction anyway");
                }
            }

            const content = await page.content();
            const $ = cheerio.load(content);
            const ipos: IpoData[] = [];

            // The page has sections like "Live IPOs", "Upcoming IPOs", "Closed IPOs"
            // We iterate through all rows in all tables
            $('tr').each((_, element) => {
                const row = $(element);
                const cells = row.find('td');

                // Ensure it's a data row (has name and date)
                if (cells.length < 4) return;

                const nameCell = row.find('.ipo-name');
                const symbolCell = row.find('.ipo-symbol');

                if (!nameCell.length) return;

                const companyName = nameCell.text().trim();
                const symbol = symbolCell.text().replace(/SME/i, '').trim() || this.generateSymbol(companyName);
                const isSme = symbolCell.text().includes('SME');

                // Dates are usually in 3rd and 4th columns (index 2 and 3)
                // But structure might vary slightly, let's grab text from cells
                const dateRangeText = $(cells[2]).text().trim(); // e.g. "06th – 10th Feb 2026"
                const listingDateText = $(cells[3]).text().trim(); // e.g. "13 Feb 2026"
                const priceRange = row.find('.text-right').last().text().trim(); // e.g. "₹102 – ₹108"

                // FIXED: Determine status with multiple fallback strategies
                let status: 'open' | 'upcoming' | 'closed' | 'listed' = 'upcoming';
                
                // Strategy 1: Check section headers (h2, h3, h4, or heading class)
                const sectionTitle = row.closest('section, div[class*="section"], .table-container')
                    .find('h2, h3, h4, .heading, [class*="title"]')
                    .first()
                    .text()
                    .toLowerCase();
                
                if (sectionTitle) {
                    if (sectionTitle.includes('live') || sectionTitle.includes('open') || sectionTitle.includes('ongoing')) {
                        status = 'open';
                    } else if (sectionTitle.includes('upcoming') || sectionTitle.includes('future')) {
                        status = 'upcoming';
                    } else if (sectionTitle.includes('closed') || sectionTitle.includes('past')) {
                        status = 'closed';
                    } else if (sectionTitle.includes('listed')) {
                        status = 'listed';
                    }
                } else {
                    // Strategy 2: Check row or parent classes
                    const rowClass = (row.attr('class') || '').toLowerCase();
                    const parentClass = (row.parent().attr('class') || '').toLowerCase();
                    const combinedClass = rowClass + ' ' + parentClass;
                    
                    if (combinedClass.includes('open') || combinedClass.includes('live')) {
                        status = 'open';
                    } else if (combinedClass.includes('upcoming')) {
                        status = 'upcoming';
                    } else if (combinedClass.includes('closed')) {
                        status = 'closed';
                    }
                }

                const ipo: IpoData = {
                    symbol: symbol,
                    companyName: companyName,
                    status: status,
                    priceRange: priceRange,
                    issueSize: "TBA",
                    issueSizeCrores: null,
                    priceMin: null,
                    priceMax: null,
                    lotSize: null,
                    openDate: dateRangeText.split('–')[0]?.trim() || null,
                    closeDate: dateRangeText.split('–')[1]?.trim() || null,
                    listingDate: listingDateText,
                    ipoType: isSme ? 'sme' : 'mainboard',
                };

                ipos.push(ipo);
            });

            return this.wrapResult(ipos, Date.now());
        } catch (error) {
            return this.handleError(error);
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }

    async getSubscriptions(): Promise<ScraperResult<SubscriptionData>> {
        return this.wrapSubscriptionResult([], Date.now());
    }

    async getGmp(): Promise<ScraperResult<GmpData>> {
        return this.wrapGmpResult([], Date.now());
    }

    private generateSymbol(companyName: string): string {
        return companyName
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .substring(0, 15);
    }
}

export const zeodhaScraper = new ZeodhaScraper();
