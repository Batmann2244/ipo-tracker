import {
  BaseScraper,
  IpoData,
  SubscriptionData,
  GmpData,
  ScraperResult,
  normalizeSymbol,
} from "./base";

const API_URLS = {
  ipoMaster: "https://webnodejs.investorgain.com/cloud/report/data-read/331/1/6/2025/2025-26/0/all",
  gmpHistory: "https://webnodejs.investorgain.com/cloud/ipo/ipo-gmp-read",
  subscription: "https://webnodejs.investorgain.com/cloud/ipo/ipo-subscription-read",
};

interface InvestorGainIPO {
  "~orderby1": number;
  Name: string;
  GMP: string;
  Rating: string;
  Sub: string;
  "GMP(L/H) (₹)": string;
  "Price (₹)": string;
  "IPO Size (₹ in cr)": string;
  Lot: string;
  "~P/E": string;
  "~id": number;
  Open: string;
  Close: string;
  "BoA Dt": string;
  Listing: string;
  "Updated-On": string;
  "~Srt_Open": string;
  "~Srt_Close": string;
  "~Srt_BoA_Dt": string;
  "~Str_Listing": string;
  "~urlrewrite_folder_name": string;
  "~Display_Order": number;
  "~IPO_Category": string;
  "~gmp_percent_calc": string;
  "~ipo_name": string;
}

interface InvestorGainAPIResponse {
  reportTableData: InvestorGainIPO[];
}

export interface GmpHistoryItem {
  date: string;
  gmp: number;
  gmpPercent: number;
  estimatedListing: number | null;
  estimatedProfit: number | null;
  movement: "up" | "down" | "none";
  lastUpdated: string;
}

export interface SubscriptionDetails {
  qib: number;
  nii: number;
  rii: number;
  total: number;
  bidDate: string;
}

export interface IpoActivityDates {
  biddingStartDate: string | null;
  biddingEndDate: string | null;
  basisOfAllotmentDate: string | null;
  refundsInitiationDate: string | null;
  creditToDematDate: string | null;
  listingDate: string | null;
}

interface GmpHistoryResponse {
  msg: number;
  ipoGmpData: Array<{
    gmp_date: string;
    gmp: string;
    gmp_percent_calc: string;
    estimated_listing_price: string;
    est_profit: string;
    up_down_status: string;
    last_updated: string;
  }>;
}

interface SubscriptionResponse {
  msg: number;
  data: {
    ipoBiddingData: Array<{
      bid_date: string;
      qib: string;
      nii: string;
      rii: string;
      total: string;
    }>;
  };
}

export class InvestorGainScraper extends BaseScraper {
  constructor() {
    super("InvestorGain", { timeout: 20000, retries: 2 });
  }

  async getIpos(): Promise<ScraperResult<IpoData>> {
    const startTime = Date.now();

    try {
      const url = `${API_URLS.ipoMaster}?search=&v=${Date.now()}`;
      this.log(`Fetching IPO data from API: ${url}`);
      
      const response = await this.fetchJson<InvestorGainAPIResponse>(url);
      
      if (!response.reportTableData || !Array.isArray(response.reportTableData)) {
        throw new Error("Invalid API response format");
      }

      const ipos: IpoData[] = response.reportTableData.map(ipo => {
        const companyName = this.extractCleanName(ipo["~ipo_name"] || ipo.Name);
        const symbol = normalizeSymbol(companyName);
        const status = this.determineStatus(ipo);
        const price = this.parsePrice(ipo["Price (₹)"]);
        const gmp = this.parseGmp(ipo.GMP);
        const lotSize = this.parseLotSize(ipo.Lot);
        const issueSize = ipo["IPO Size (₹ in cr)"] || "TBA";

        return {
          symbol,
          companyName,
          openDate: ipo["~Srt_Open"] || null,
          closeDate: ipo["~Srt_Close"] || null,
          listingDate: ipo["~Str_Listing"] || null,
          priceRange: ipo["Price (₹)"] || "TBA",
          priceMin: price,
          priceMax: price,
          lotSize,
          issueSize,
          issueSizeCrores: this.parseIssueSize(issueSize),
          status,
          ipoType: (ipo["~IPO_Category"]?.toLowerCase().includes("sme") ? "sme" : "mainboard") as "mainboard" | "sme",
          gmp,
          gmpPercent: this.parseGmpPercent(ipo["~gmp_percent_calc"]) ?? undefined,
          subscriptionQib: this.parseSubscriptionValue(ipo.Sub) ?? undefined,
          investorGainId: ipo["~id"],
          basisOfAllotmentDate: ipo["~Srt_BoA_Dt"] || undefined,
        };
      });

      this.log(`Found ${ipos.length} IPOs from InvestorGain API`);
      return this.wrapResult(ipos, startTime);
    } catch (err: any) {
      this.error("Failed to fetch IPOs from API", err);
      return this.wrapResult([], startTime, err.message);
    }
  }

  async getGmpHistory(ipoId: number): Promise<GmpHistoryItem[]> {
    try {
      const url = `${API_URLS.gmpHistory}/${ipoId}/true`;
      this.log(`Fetching GMP history for IPO ID: ${ipoId}`);
      
      const response = await this.fetchJson<GmpHistoryResponse>(url);
      
      if (response.msg !== 1 || !response.ipoGmpData) {
        return [];
      }

      return response.ipoGmpData.map(item => ({
        date: item.gmp_date,
        gmp: parseFloat(item.gmp) || 0,
        gmpPercent: parseFloat(item.gmp_percent_calc) || 0,
        estimatedListing: parseFloat(item.estimated_listing_price) || null,
        estimatedProfit: parseFloat(item.est_profit) || null,
        movement: this.parseMovement(item.up_down_status),
        lastUpdated: item.last_updated,
      }));
    } catch (err: any) {
      this.error(`Failed to fetch GMP history for IPO ${ipoId}`, err);
      return [];
    }
  }

  async getSubscriptionDetails(ipoId: number): Promise<SubscriptionDetails | null> {
    try {
      const url = `${API_URLS.subscription}/${ipoId}`;
      this.log(`Fetching subscription data for IPO ID: ${ipoId}`);
      
      const response = await this.fetchJson<SubscriptionResponse>(url);
      
      if (response.msg !== 1 || !response.data?.ipoBiddingData?.length) {
        return null;
      }

      const latest = response.data.ipoBiddingData[response.data.ipoBiddingData.length - 1];
      
      return {
        qib: parseFloat(latest.qib) || 0,
        nii: parseFloat(latest.nii) || 0,
        rii: parseFloat(latest.rii) || 0,
        total: parseFloat(latest.total) || 0,
        bidDate: latest.bid_date,
      };
    } catch (err: any) {
      this.error(`Failed to fetch subscription for IPO ${ipoId}`, err);
      return null;
    }
  }

  async getSubscriptions(): Promise<ScraperResult<SubscriptionData>> {
    const startTime = Date.now();

    try {
      const iposResult = await this.getIpos();
      if (!iposResult.success || iposResult.data.length === 0) {
        return this.wrapResult([], startTime, "No IPOs to fetch subscriptions for");
      }

      const subscriptions: SubscriptionData[] = [];

      for (const ipo of iposResult.data.slice(0, 10)) {
        const ipoWithId = ipo as IpoData & { investorGainId?: number };
        if (!ipoWithId.investorGainId) continue;

        const subData = await this.getSubscriptionDetails(ipoWithId.investorGainId);
        if (subData) {
          subscriptions.push({
            symbol: ipo.symbol,
            companyName: ipo.companyName,
            qib: subData.qib,
            nii: subData.nii,
            hni: subData.nii,
            retail: subData.rii,
            total: subData.total,
            applications: null,
          });
        }
      }

      this.log(`Found ${subscriptions.length} subscription records`);
      return this.wrapSubscriptionResult(subscriptions, startTime);
    } catch (err: any) {
      this.error("Failed to get subscriptions", err);
      return this.wrapSubscriptionResult([], startTime, err.message);
    }
  }

  async getGmp(): Promise<ScraperResult<GmpData>> {
    const startTime = Date.now();

    try {
      const iposResult = await this.getIpos();
      if (!iposResult.success || iposResult.data.length === 0) {
        return this.wrapResult([], startTime, "No IPOs to fetch GMP for");
      }

      const gmpData: GmpData[] = iposResult.data
        .filter(ipo => ipo.gmp !== undefined)
        .map(ipo => ({
          symbol: ipo.symbol,
          companyName: ipo.companyName,
          gmp: ipo.gmp || 0,
          expectedListing: ipo.priceMax ? (ipo.priceMax + (ipo.gmp || 0)) : null,
          gmpPercent: ipo.gmpPercent || null,
        }));

      this.log(`Found ${gmpData.length} GMP records`);
      return this.wrapGmpResult(gmpData, startTime);
    } catch (err: any) {
      this.error("Failed to get GMP data", err);
      return this.wrapGmpResult([], startTime, err.message);
    }
  }

  private extractCleanName(nameHtml: string): string {
    return nameHtml
      .replace(/<[^>]*>/g, "")
      .replace(/\s+IPO$/i, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  private determineStatus(ipo: InvestorGainIPO): "upcoming" | "open" | "closed" | "listed" {
    const nameHtml = ipo.Name.toLowerCase();
    
    if (nameHtml.includes("badge-success") || nameHtml.includes("open")) {
      return "open";
    }
    if (nameHtml.includes("badge-info") || nameHtml.includes("upcoming")) {
      return "upcoming";
    }
    if (nameHtml.includes("badge-warning") || nameHtml.includes("pending")) {
      return "closed";
    }
    if (nameHtml.includes("badge-secondary") || nameHtml.includes("listed")) {
      return "listed";
    }

    const today = new Date();
    const openDate = ipo["~Srt_Open"] ? new Date(ipo["~Srt_Open"]) : null;
    const closeDate = ipo["~Srt_Close"] ? new Date(ipo["~Srt_Close"]) : null;
    const listingDate = ipo["~Str_Listing"] ? new Date(ipo["~Str_Listing"]) : null;

    if (listingDate && today >= listingDate) return "listed";
    if (closeDate && today > closeDate) return "closed";
    if (openDate && closeDate && today >= openDate && today <= closeDate) return "open";
    if (openDate && today < openDate) return "upcoming";

    return "upcoming";
  }

  private parsePrice(priceStr: string): number | null {
    if (!priceStr) return null;
    const match = priceStr.match(/₹?\s*(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  private parseGmp(gmpStr: string): number {
    if (!gmpStr) return 0;
    if (gmpStr.includes("--") || gmpStr.includes("<b>--</b>")) return 0;
    const cleaned = gmpStr.replace(/&#\d+;/g, "").replace(/<[^>]+>/g, "");
    const match = cleaned.match(/[+-]?\s*₹?\s*(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  private parseGmpPercent(percentStr: string): number | null {
    if (!percentStr) return null;
    const value = parseFloat(percentStr);
    return isNaN(value) ? null : value;
  }

  private parseLotSize(lotStr: string): number | null {
    if (!lotStr) return null;
    const match = lotStr.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  private parseIssueSize(sizeStr: string): number | null {
    if (!sizeStr || sizeStr === "TBA") return null;
    const match = sizeStr.match(/([\d,.]+)/);
    if (!match) return null;
    return parseFloat(match[1].replace(/,/g, ""));
  }

  private parseSubscriptionValue(subStr: string): number | null {
    if (!subStr) return null;
    const match = subStr.match(/([\d.]+)/);
    return match ? parseFloat(match[1]) : null;
  }

  private parseMovement(status: string): "up" | "down" | "none" {
    if (!status) return "none";
    const lower = status.toLowerCase();
    if (lower.includes("up") || lower.includes("rise")) return "up";
    if (lower.includes("down") || lower.includes("fall")) return "down";
    return "none";
  }
}

export const investorGainScraper = new InvestorGainScraper();
