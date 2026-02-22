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
            this.sourceLogger.info("Starting BSE scraper with network interception");

            const interceptedData: any[] = [];

            browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--disable-background-networking',
                    '--disable-sync',
                    '--metrics-recording-only',
                    '--mute-audio'
                ]
            });

            const page = await browser.newPage();

            // Set user agent
            await page.setUserAgent(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            );

            // CRITICAL FIX 1: Set up request interception FIRST (before any navigation)
            await page.setRequestInterception(true);

            page.on('request', (req: puppeteer.HTTPRequest) => {
                const resourceType = req.resourceType();
                // Block images, media, fonts, stylesheets for speed
                if (['image', 'media', 'font', 'stylesheet'].includes(resourceType)) {
                    req.abort();
                } else {
                    req.continue();
                }
            });

            // CRITICAL FIX 2: Set up response listener AFTER request interception
            page.on('response', async (response) => {
                const url = response.url();
                const status = response.status();

                // Log all responses for debugging
                this.sourceLogger.debug(`Response: ${url} - Status: ${status}`);

                // Intercept BSE API calls
                if (
                    url.includes('GetPipoData') ||
                    url.includes('IPOIssues') ||
                    url.includes('PublicIssueData') ||
                    url.includes('/api/') ||
                    url.includes('GetData')
                ) {
                    try {
                        const contentType = response.headers()['content-type'] || '';

                        this.sourceLogger.info(`📡 Intercepted BSE endpoint: ${url}`, {
                            status,
                            contentType
                        });

                        // FIX: Attempt to parse JSON for API URLs even if content-type is wrong
                        // Some BSE API endpoints return JSON even with incorrect content-type headers (e.g. text/html).
                        // We attempt to parse JSON for all matched URLs regardless of content-type.
                        try {
                            const data = await response.json();
                            this.sourceLogger.info('JSON data received', {
                                dataType: typeof data,
                                isArray: Array.isArray(data),
                                keys: Object.keys(data || {})
                            });

                            // Handle different response structures
                            if (Array.isArray(data)) {
                                interceptedData.push(...data);
                            } else if (data.Table) {
                                // ASP.NET DataTable format
                                interceptedData.push(...(Array.isArray(data.Table) ? data.Table : [data.Table]));
                            } else if (data.d) {
                                // ASP.NET WebMethod format
                                const parsed = typeof data.d === 'string' ? JSON.parse(data.d) : data.d;
                                if (Array.isArray(parsed)) {
                                    interceptedData.push(...parsed);
                                } else if (parsed.Table) {
                                    interceptedData.push(...(Array.isArray(parsed.Table) ? parsed.Table : [parsed.Table]));
                                }
                            } else if (data.data || data.result || data.ipos) {
                                const arr = data.data || data.result || data.ipos;
                                if (Array.isArray(arr)) {
                                    interceptedData.push(...arr);
                                }
                            } else {
                                // Log unexpected structure
                                this.sourceLogger.warn('Unexpected JSON structure', { data });
                            }
                        } catch (parseError) {
                            // Ignore parse errors for non-JSON
                        }
                    } catch (e: any) {
                        this.sourceLogger.debug('Response parse error', { error: e.message });
                    }
                }
            });

            // Navigate to BSE IPO page
            const url = 'https://www.bseindia.com/markets/PublicIssues/IPOIssues_New.aspx';

            try {
                this.sourceLogger.info(`Navigating to ${url}`);
                await page.goto(url, {
                    waitUntil: 'networkidle2',
                    timeout: 60000
                });

                // Wait additional time for AJAX to complete
                this.sourceLogger.info('Waiting for AJAX calls to complete...');
                await new Promise(resolve => setTimeout(resolve, 5000));

            } catch (navError: any) {
                this.sourceLogger.warn(`Navigation timeout (continuing): ${navError.message}`);
            }

            // CRITICAL FIX 3: Improved DOM fallback
            if (interceptedData.length === 0) {
                this.sourceLogger.warn('No API data intercepted, attempting DOM extraction');

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
                                // Extract text from cells
                                const cellTexts = Array.from(cells).map(c => c.textContent?.trim() || '');

                                // Look for company name (usually in column 1 or 2)
                                const nameCell = cellTexts.find(text =>
                                    text &&
                                    text.length > 3 &&
                                    !text.match(/^\d+$/) && // Not just numbers
                                    !text.toLowerCase().includes('no records')
                                );

                                if (nameCell) {
                                    results.push({
                                        Scrip_Name: nameCell,
                                        Scrip_cd: cellTexts[0] || '',
                                        Status: 'L', // Listed
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
                    this.sourceLogger.error('DOM extraction also returned 0 records');
                }
            }

            await browser.close();
            browser = null;

            // Transform to IpoData
            const ipos: IpoData[] = interceptedData
                .filter(item => {
                    const name = item.Scrip_Name || item.SecurityName || item.Name;
                    return name && name.trim().length > 0;
                })
                .map(item => {
                    const companyName = item.Scrip_Name || item.SecurityName || item.Name || 'Unknown';
                    const openDate = item.Start_Dt ? item.Start_Dt.split('T')[0] : null;
                    const closeDate = item.End_Dt ? item.End_Dt.split('T')[0] : null;

                    let status: 'open' | 'upcoming' | 'closed' = 'closed';
                    if (item.Status === 'L' || item.Status === 'C') {
                        status = 'open';
                    } else if (item.Status === 'F') {
                        status = 'upcoming';
                    }

                    return {
                        symbol: item.Scrip_cd ? String(item.Scrip_cd) : this.generateSymbol(companyName),
                        companyName,
                        status,
                        priceRange: item.Price_Band || 'TBA',
                        issueSize: 'TBA',
                        issueSizeCrores: null,
                        priceMin: null,
                        priceMax: null,
                        lotSize: item.Market_Lot ? parseInt(item.Market_Lot) : null,
                        listingDate: null,
                        ipoType: item.eXCHANGE_PLATFORM === 'SME' ? 'sme' : 'mainboard',
                        openDate,
                        closeDate,
                    };
                });

            this.sourceLogger.info(`BSE scraper completed: ${ipos.length} IPOs extracted`);
            return this.wrapResult(ipos, startTime);

        } catch (error: any) {
            this.sourceLogger.error('BSE scraper error', { error: error.message, stack: error.stack });
            if (browser) await browser.close();
            return this.handleError(error);
        }
    }

    async getSubscriptions(): Promise<ScraperResult<SubscriptionData>> {
        return this.wrapSubscriptionResult([], Date.now());
    }

    async getGmp(): Promise<ScraperResult<GmpData>> {
        return this.wrapGmpResult([], Date.now());
    }

    private generateSymbol(name: string): string {
        return name
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .substring(0, 15);
    }
}

export const bseScraper = new BseScraper();
