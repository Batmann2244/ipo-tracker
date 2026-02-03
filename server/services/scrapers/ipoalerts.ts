import { IpoData, ScraperResult, normalizeSymbol } from "./base";
import { scraperLogger } from "../scraper-logger";
import { getSourceLogger } from "../../logger";

const API_BASE = "https://api.ipoalerts.in";
const API_KEY = process.env.IPOALERTS_API_KEY;
const sourceLogger = getSourceLogger("ipoalerts");

const DAILY_LIMIT = 25;
// Updated based on API requirements - limit must be <= 1
// Fixed: API enforces "Limit must be less than or equal to 1"
const MAX_PER_REQUEST = 1;

interface UsageTracker {
  date: string;
  requestCount: number;
  lastReset: Date;
}

function getIstDateString(): string {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);
  return istTime.toISOString().split('T')[0];
}

function getIstTime(): { hours: number; minutes: number; timeValue: number } {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);
  const hours = istTime.getUTCHours();
  const minutes = istTime.getUTCMinutes();
  return { hours, minutes, timeValue: hours * 60 + minutes };
}

let usageTracker: UsageTracker = {
  date: getIstDateString(),
  requestCount: 0,
  lastReset: new Date(),
};

let lastFetchDateMap: Map<string, string> = new Map();

interface IpoAlertsIpo {
  id: string;
  name: string;
  symbol: string;
  slug: string;
  type: string;
  startDate: string;
  endDate: string;
  listingDate: string;
  priceRange: string;
  listingGain?: string;
  minQty: number;
  minAmount: number;
  issueSize: string;
  status: string;
  logo?: string;
  prospectusUrl?: string;
  schedule?: Array<{ date: string; event: string }>;
  about?: string;
  strengths?: string[];
  risks?: string[];
  nseInfoUrl?: string;
  infoUrl?: string;
}

interface IpoAlertsResponse {
  meta: {
    count: number;
    countOnPage: number;
    totalPages: number;
    page: number;
    limit: number;
    info?: string;
  };
  ipos: IpoAlertsIpo[];
}

function resetDailyUsageIfNeeded(): void {
  const todayIst = getIstDateString();
  if (usageTracker.date !== todayIst) {
    sourceLogger.info("Resetting daily usage counter", { todayIst });
    usageTracker = {
      date: todayIst,
      requestCount: 0,
      lastReset: new Date(),
    };
    lastFetchDateMap.clear();
  }
}

function canMakeRequest(): boolean {
  resetDailyUsageIfNeeded();
  return usageTracker.requestCount < DAILY_LIMIT;
}

function getRemainingRequests(): number {
  resetDailyUsageIfNeeded();
  return Math.max(0, DAILY_LIMIT - usageTracker.requestCount);
}

function isWithinMarketHours(): boolean {
  const { timeValue } = getIstTime();
  return timeValue >= 555 && timeValue <= 1050;
}

function getScheduledFetchType(): 'open' | 'upcoming' | 'listed' | null {
  resetDailyUsageIfNeeded();
  const todayIst = getIstDateString();
  const { timeValue } = getIstTime();

  if (timeValue >= 615 && timeValue < 660) {
    if (lastFetchDateMap.get('open') !== todayIst) return 'open';
  }
  if (timeValue >= 720 && timeValue < 780) {
    if (lastFetchDateMap.get('upcoming') !== todayIst) return 'upcoming';
  }
  if (timeValue >= 840 && timeValue < 900) {
    if (lastFetchDateMap.get('listed') !== todayIst) return 'listed';
  }

  return null;
}

function markFetchCompleted(fetchType: 'open' | 'upcoming' | 'listed'): void {
  const todayIst = getIstDateString();
  lastFetchDateMap.set(fetchType, todayIst);
}

async function fetchFromApi(endpoint: string): Promise<any> {
  if (!API_KEY) {
    throw new Error("IPOALERTS_API_KEY not configured");
  }

  if (!canMakeRequest()) {
    sourceLogger.warn("Daily request limit reached", {
      limit: DAILY_LIMIT,
      used: usageTracker.requestCount,
    });
    throw new Error(`Daily request limit (${DAILY_LIMIT}) reached. Remaining: ${getRemainingRequests()}`);
  }

  const startTime = Date.now();
  sourceLogger.info("Requesting IPOAlerts endpoint", { endpoint });

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        "x-api-key": API_KEY,
        "Content-Type": "application/json",
      },
    });

    usageTracker.requestCount++;
    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    sourceLogger.info("IPOAlerts request succeeded", {
      endpoint,
      responseTime,
      usage: `${usageTracker.requestCount}/${DAILY_LIMIT}`,
      status: response.status,
    });

    return data;
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const status = (error as any)?.response?.status;
    sourceLogger.error("IPOAlerts request failed", {
      endpoint,
      responseTime,
      error: (error as any)?.message,
      status,
      usage: `${usageTracker.requestCount}/${DAILY_LIMIT}`,
    });
    throw error;
  }
}

function parseIpoData(ipo: IpoAlertsIpo): IpoData {
  const priceRange = ipo.priceRange || "TBA";
  let priceMin: number | null = null;
  let priceMax: number | null = null;

  if (priceRange && priceRange !== "TBA") {
    const priceMatch = priceRange.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
    if (priceMatch) {
      priceMin = parseFloat(priceMatch[1]);
      priceMax = parseFloat(priceMatch[2]);
    } else {
      const singlePrice = parseFloat(priceRange.replace(/[^\d.]/g, ''));
      if (!isNaN(singlePrice)) {
        priceMin = singlePrice;
        priceMax = singlePrice;
      }
    }
  }

  let status: 'upcoming' | 'open' | 'closed' | 'listed' = 'upcoming';
  switch (ipo.status?.toLowerCase()) {
    case 'open': status = 'open'; break;
    case 'closed': status = 'closed'; break;
    case 'listed': status = 'listed'; break;
    case 'upcoming':
    case 'announced':
    default: status = 'upcoming';
  }

  let basisOfAllotmentDate: string | undefined;
  let refundsInitiationDate: string | undefined;
  let creditToDematDate: string | undefined;

  if (ipo.schedule) {
    for (const event of ipo.schedule) {
      const eventLower = event.event.toLowerCase();
      if (eventLower.includes('allotment')) {
        basisOfAllotmentDate = event.date;
      } else if (eventLower.includes('refund')) {
        refundsInitiationDate = event.date;
      } else if (eventLower.includes('credit') || eventLower.includes('demat')) {
        creditToDematDate = event.date;
      }
    }
  }

  return {
    symbol: normalizeSymbol(ipo.symbol || ipo.name),
    companyName: ipo.name,
    openDate: ipo.startDate || null,
    closeDate: ipo.endDate || null,
    listingDate: ipo.listingDate || null,
    priceRange: priceRange ? `₹${priceRange}` : "TBA",
    priceMin,
    priceMax,
    lotSize: ipo.minQty || null,
    issueSize: ipo.issueSize || "TBA",
    issueSizeCrores: null,
    status,
    ipoType: ipo.type === 'SME' ? 'sme' : 'mainboard',
    basisOfAllotmentDate,
    refundsInitiationDate,
    creditToDematDate,
  };
}

async function getIposByStatus(
  status: 'open' | 'upcoming' | 'listed' | 'closed',
  isScheduled = false
): Promise<ScraperResult<IpoData>> {
  const startTime = Date.now();
  const allIpos: IpoData[] = [];

  try {
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages && canMakeRequest()) {
      const response = await fetchFromApi(`/ipos?status=${status}&limit=${MAX_PER_REQUEST}&page=${page}`) as IpoAlertsResponse;

      // Update pagination info
      totalPages = response.meta?.totalPages || 1;

      sourceLogger.info("IPOAlerts page received", {
        status,
        page,
        totalPages,
        ipos: response.ipos.length,
        count: response.meta?.count,
        countOnPage: response.meta?.countOnPage,
        limit: response.meta?.limit,
        info: response.meta?.info,
      });

      // Collect IPOs
      allIpos.push(...response.ipos.map(parseIpoData));
      page++;
    }

    if (isScheduled && (status === 'open' || status === 'upcoming' || status === 'listed')) {
      markFetchCompleted(status);
    }

    const responseTime = Date.now() - startTime;

    await scraperLogger.logSuccess('ipoalerts' as any, 'ipos', allIpos.length, responseTime, {
      status,
      dailyUsage: usageTracker.requestCount,
      remaining: getRemainingRequests(),
      totalPages,
    });

    return {
      success: true,
      data: allIpos,
      source: "ipoalerts",
      timestamp: new Date(),
      responseTimeMs: responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    await scraperLogger.logError('ipoalerts' as any, 'ipos', errorMessage, responseTime);

    return {
      success: false,
      data: [],
      source: "ipoalerts",
      timestamp: new Date(),
      error: errorMessage,
      responseTimeMs: responseTime,
    };
  }
}

async function getOpenIpos(): Promise<ScraperResult<IpoData>> {
  return getIposByStatus('open');
}

async function getUpcomingIpos(): Promise<ScraperResult<IpoData>> {
  return getIposByStatus('upcoming');
}

async function getListedIpos(): Promise<ScraperResult<IpoData>> {
  return getIposByStatus('listed');
}

async function getScheduledIpos(): Promise<ScraperResult<IpoData>> {
  const fetchType = getScheduledFetchType();

  if (!fetchType) {
    return {
      success: true,
      data: [],
      source: "ipoalerts",
      timestamp: new Date(),
      responseTimeMs: 0,
    };
  }

  sourceLogger.info("Scheduled fetch", { fetchType });
  return getIposByStatus(fetchType, true);
}

async function getIpoDetails(identifier: string): Promise<ScraperResult<IpoData>> {
  const startTime = Date.now();

  try {
    const response = await fetchFromApi(`/ipos/${identifier}`);
    const ipo = response.ipo as IpoAlertsIpo;

    const ipoData = parseIpoData(ipo);
    const responseTime = Date.now() - startTime;

    await scraperLogger.logSuccess('ipoalerts' as any, 'ipos', 1, responseTime, {
      identifier,
      dailyUsage: usageTracker.requestCount,
    });

    return {
      success: true,
      data: [ipoData],
      source: "ipoalerts",
      timestamp: new Date(),
      responseTimeMs: responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    await scraperLogger.logError('ipoalerts' as any, 'ipos', errorMessage, responseTime);

    return {
      success: false,
      data: [],
      source: "ipoalerts",
      timestamp: new Date(),
      error: errorMessage,
      responseTimeMs: responseTime,
    };
  }
}

function getUsageStats(): { date: string; used: number; remaining: number; limit: number } {
  resetDailyUsageIfNeeded();
  return {
    date: usageTracker.date,
    used: usageTracker.requestCount,
    remaining: getRemainingRequests(),
    limit: DAILY_LIMIT,
  };
}

export const ipoAlertsScraper = {
  getOpenIpos,
  getUpcomingIpos,
  getListedIpos,
  getIposByStatus,
  getScheduledIpos,
  getIpoDetails,
  getUsageStats,
  canMakeRequest,
  getRemainingRequests,
  isWithinMarketHours,
  getScheduledFetchType,
};
