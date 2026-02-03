import { BaseScraper, ScraperResult, IpoData, SubscriptionData, GmpData } from './base';
import * as cheerio from 'cheerio';

export class IpoWatchScraper extends BaseScraper {
    constructor() {
        super('ipowatch');
    }

    async getIpos(): Promise<ScraperResult<IpoData>> { // Changed return type to IpoData to match usage
        try {
            // IPO Watch GMP Page
            const url = 'https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/';
            const content = await this.fetchWithPuppeteer(url);
            const $ = cheerio.load(content);
            const ipos: IpoData[] = [];

            // Find the main table - usually the first table in the content
            const table = $('table').first();

            if (!table.length) {
                throw new Error('GMP table not found on IPOWatch');
            }

            // Iterate through rows, skipping header
            table.find('tr').each((index, element) => {
                if (index === 0) return; // Skip header

                const cells = $(element).find('td');
                if (cells.length < 5) return;

                // Clean text helper
                const cleanCell = (cell: any) => $(cell).text().trim();

                // Extract Data based on analyzed columns:
                // 0: IPO Name | 1: GMP | 2: Price | 3: Gain | 4: Review | 5: Date | 6: Type
                const nameRaw = cleanCell(cells[0]);
                const gmpRaw = cleanCell(cells[1]);
                const priceRaw = cleanCell(cells[2]);
                const dateRaw = cleanCell(cells[5]);
                const typeRaw = cleanCell(cells[6]); // SME or Mainline

                if (!nameRaw) return;

                // Parse Name (often has " IPO" at end)
                const companyName = nameRaw.replace(/\s+IPO$/, '').trim();

                // Parse GMP (e.g. "₹50" or "-")
                const gmp = parseFloat(gmpRaw.replace(/[^0-9.-]/g, '')) || 0;

                const ipo: IpoData = {
                    symbol: this.generateSymbol(companyName),
                    companyName: companyName,
                    status: 'upcoming', // Default
                    priceRange: priceRaw,
                    gmp: gmp,
                    issueSize: "TBA",
                    issueSizeCrores: null,
                    priceMin: null,
                    priceMax: null,
                    lotSize: null,
                    openDate: null,
                    closeDate: null,
                    listingDate: null,
                    ipoType: typeRaw.includes('SME') ? 'sme' : 'mainboard',
                    sector: typeRaw
                };

                ipos.push(ipo);
            });

            return this.wrapResult(ipos, Date.now());

        } catch (error) {
            return this.handleError(error);
        }
    }

    async getSubscriptions(): Promise<ScraperResult<SubscriptionData>> { // Changed return type to SubscriptionData
        return this.wrapSubscriptionResult([], Date.now());
    }

    async getGmp(): Promise<ScraperResult<GmpData>> { // Changed return type to GmpData
        // We can reuse getIpos logic or extract just GMP here.
        // For now, let's just return empty as Aggregator might merge from getIpos 
        // OR we should ideally return GMP data structure.
        // Let's implement it properly to return GMP data
        try {
            const result = await this.getIpos();
            if (!result.success) return this.wrapGmpResult([], Date.now(), result.error);

            const gmpData: GmpData[] = result.data.map(ipo => ({
                symbol: ipo.symbol,
                companyName: ipo.companyName,
                gmp: ipo.gmp || 0,
                expectedListing: null,
                gmpPercent: null
            }));

            return this.wrapGmpResult(gmpData, Date.now());
        } catch (error) {
            return this.handleError(error);
        }
    }

    // Symbol generation helper
    private generateSymbol(name: string): string {
        return name
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .substring(0, 15);
    }
}

export const ipoWatchScraper = new IpoWatchScraper();
