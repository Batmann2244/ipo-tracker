
import { BaseScraper, ScraperResult, IpoData, SubscriptionData, GmpData } from './base';
import axios from 'axios';

// Interface based on actual API response
interface InvestorgainListItem {
    "~id": number;
    "~ipo_name": string;
    "~Srt_Open": string; // YYYY-MM-DD
    "~Srt_Close": string; // YYYY-MM-DD
    "~Str_Listing": string; // YYYY-MM-DD
    "Price (₹)": string;
    "Lot": string;
    "IPO Size (₹ in cr)": string;
    "~Listing_Date"?: string;
    "~IPO_Category"?: string; // e.g. "SME"
}

interface GmpApiData {
    d: {
        gmp: string;
        sub2: string;
        last_updated: string;
        est_listing: string;
        fire_rating: number;
    };
    gmpdata: {
        gmp: number;
        date: string; // ISO or similar
        label: string;
        updated: string;
    }[];
}

export class InvestorgainApiScraper extends BaseScraper {
    private readonly LIST_URL = 'https://webnodejs.investorgain.com/cloud/new/report/data-read/331/1/2/2026/2025-26/0/all?search=&v=17-49';
    private readonly GMP_BASE_URL = 'https://webnodejs.investorgain.com/cloud/ipo/ipo-gmp-read/';
    private readonly SUB_BASE_URL = 'https://webnodejs.investorgain.com/cloud/ipo/ipo-subscription-read/';

    constructor() {
        super('investorgain-api');
    }

    private getHeaders() {
        return {
            'Origin': 'https://www.investorgain.com',
            'Referer': 'https://www.investorgain.com/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        };
    }

    async getIpos(): Promise<ScraperResult<IpoData>> {
        try {
            this.sourceLogger.info("Fetching IPO List from Investorgain API...");
            const response = await axios.get(this.LIST_URL, { headers: this.getHeaders() });

            if (!response.data || !response.data.reportTableData) {
                throw new Error("Invalid API response format");
            }

            const items: InvestorgainListItem[] = response.data.reportTableData;
            const ipos: IpoData[] = [];

            // Process items in parallel chunks to avoid overwhelming but get data fast
            // Limit to top 25 recent IPOs to keep it efficient while capturing all active ones
            const processItem = async (item: InvestorgainListItem) => {
                const id = String(item["~id"]);
                if (!id) return null;

                const name = item["~ipo_name"];
                const openDate = item["~Srt_Open"] || null;
                const closeDate = item["~Srt_Close"] || null;
                const listingDate = item["~Str_Listing"] || null;

                // Determine status
                let status: 'open' | 'upcoming' | 'closed' = 'closed';
                const todayStr = new Date().toISOString().split('T')[0];

                if (openDate && openDate > todayStr) {
                    status = 'upcoming';
                } else if (openDate && closeDate && openDate <= todayStr && closeDate >= todayStr) {
                    status = 'open';
                } else if (listingDate && listingDate <= todayStr) {
                    status = 'closed'; // or listed
                }

                // Parse numeric fields
                const priceStr = item["Price (₹)"] || "";
                const priceMatch = priceStr.match(/(\d+)/);
                const priceMax = priceMatch ? parseInt(priceMatch[1]) : null;

                const sizeStr = item["IPO Size (₹ in cr)"] || "";
                const sizeCrores = parseFloat(sizeStr.replace(/,/g, ''));

                // FETCH RICH DETAILS
                let gmp = null;
                let gmpPercent = null;
                let estListing = null;

                try {
                    const gmpData = await this.fetchGmpData(id);
                    if (gmpData) {
                        gmp = gmpData.d?.gmp ? parseFloat(gmpData.d.gmp) : null;
                        estListing = gmpData.d?.est_listing ? parseFloat(gmpData.d.est_listing) : null;

                        if (gmp && priceMax) {
                            gmpPercent = (gmp / priceMax) * 100;
                        }
                    }
                } catch (e) {
                    // ignore detail fetch error
                }

                return {
                    symbol: this.generateSymbol(name),
                    companyName: name,
                    status: status,
                    openDate: openDate,
                    closeDate: closeDate,
                    listingDate: listingDate,
                    priceRange: priceStr || "TBA",
                    priceMin: null,
                    priceMax: priceMax,
                    issueSize: sizeStr ? `${sizeStr} Cr` : "TBA",
                    issueSizeCrores: isNaN(sizeCrores) ? null : sizeCrores,
                    lotSize: item["Lot"] ? parseInt(item["Lot"]) : null,
                    ipoType: (item["~IPO_Category"] || "").includes('SME') ? 'sme' : 'mainboard',

                    // Rich Data
                    gmp: gmp,
                    gmpPercent: gmpPercent,
                    estListingPrice: estListing,
                    investorGainId: parseInt(id)
                } as IpoData;
            };

            // execute details fetch
            const results = await Promise.all(items.slice(0, 30).map(processItem));

            results.forEach(r => {
                if (r) ipos.push(r);
            });

            return this.wrapResult(ipos, Date.now());

        } catch (error) {
            return this.handleError(error);
        }
    }

    private async fetchGmpData(id: string): Promise<GmpApiData | null> {
        try {
            const url = `${this.GMP_BASE_URL}${id}/true`;
            const response = await axios.get(url, { headers: this.getHeaders() });
            return response.data;
        } catch (e) {
            return null;
        }
    }

    async getSubscriptions(): Promise<ScraperResult<SubscriptionData>> {
        return this.wrapSubscriptionResult([], Date.now());
    }

    async getGmp(): Promise<ScraperResult<GmpData>> {
        return this.wrapGmpResult([], Date.now());
    }

    private generateSymbol(name: string): string {
        return name.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 15);
    }
}

export const investorgainApiScraper = new InvestorgainApiScraper();
