import { BaseScraper, ScraperResult, IpoData, SubscriptionData, GmpData } from './base';
import * as cheerio from 'cheerio';

export class BseScraper extends BaseScraper {
    constructor() {
        super('bse');
    }

    async getIpos(): Promise<ScraperResult<IpoData>> {
        const startTime = Date.now();

        try {
            this.sourceLogger.info("Starting BSE scraper with Axios + Cheerio");

            const url = 'https://www.bseindia.com/markets/PublicIssues/IPOIssues_New.aspx?id=1&status=L';

            // Use fetchPage (Axios) instead of Puppeteer for speed and reliability
            const html = await this.fetchPage(url);
            const $ = cheerio.load(html);
            const ipos: IpoData[] = [];

            // Target table ID
            let table = $('#ctl00_ContentPlaceHolder1_tblID');

            // Fallback
            if (!table.length) {
                // Find any table with enough rows
                const tables = $('table');
                table = tables.filter((_, t) => $(t).find('tr').length > 5).first();
            }

            if (table.length) {
                const rows = table.find('tr');

                rows.each((index, row) => {
                    if (index === 0) return; // Skip header

                    const cells = $(row).find('td');
                    if (cells.length < 7) return;

                    // Helper to get text
                    const getText = (idx: number) => $(cells[idx]).text().trim();

                    const name = getText(0);
                    if (name.toLowerCase().includes('no records') || name.length < 2) return;

                    const platform = getText(1);
                    const startDate = getText(2);
                    const endDate = getText(3);
                    const price = getText(4);
                    const faceValue = getText(5);
                    const type = getText(6);
                    const statusText = getText(7);

                    // Parse dates DD-MM-YYYY
                    const parseDate = (d: string) => {
                        if (!d) return null;
                        const parts = d.split(/[-/]/);
                        if (parts.length === 3) {
                            return `${parts[2]}-${parts[1]}-${parts[0]}`;
                        }
                        return null;
                    };

                    const openDate = parseDate(startDate);
                    const closeDate = parseDate(endDate);

                    let status: 'open' | 'upcoming' | 'closed' = 'closed';
                    const statusLower = statusText.toLowerCase();

                    if (statusLower.includes('live') || statusLower.includes('open')) {
                        status = 'open';
                    } else if (statusLower.includes('forthcoming') || statusLower.includes('upcoming')) {
                        status = 'upcoming';
                    } else {
                        const now = new Date();
                        if (closeDate && new Date(closeDate) < now) {
                            status = 'closed';
                        } else if (openDate && new Date(openDate) > now) {
                            status = 'upcoming';
                        } else {
                            status = 'open';
                        }
                    }

                    ipos.push({
                        symbol: this.generateSymbol(name),
                        companyName: name,
                        status,
                        priceRange: price || 'TBA',
                        issueSize: 'TBA',
                        issueSizeCrores: null,
                        priceMin: null,
                        priceMax: null,
                        lotSize: null,
                        listingDate: null,
                        ipoType: platform.toLowerCase().includes('sme') ? 'sme' : 'mainboard',
                        openDate,
                        closeDate,
                    });
                });
            } else {
                this.sourceLogger.error('BSE scraper: Table not found in HTML');
            }

            this.sourceLogger.info(`BSE scraper completed: ${ipos.length} IPOs extracted`);
            return this.wrapResult(ipos, startTime);

        } catch (error: any) {
            this.sourceLogger.error('BSE scraper error', { error: error.message, stack: error.stack });
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
