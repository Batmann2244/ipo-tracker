/**
 * URL constants for NSE related operations
 */

// Base URLs
export const NSE_HOME = "https://nseindia.com";
export const NSE_MAIN = "https://www.nseindia.com";
export const NSE_LEGACY = "https://www1.nseindia.com";

// Quote URLs
export const QUOTE_EQUITY_URL = `${NSE_MAIN}/get-quotes/equity?symbol=%s`;
export const QUOTE_API_URL = `${NSE_MAIN}/api/quote-equity?symbol=%s`;

// Stock list URLs
export const STOCKS_CSV_URL = "https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv";

// Market movers URLs
export const TOP_GAINERS_URL = `${NSE_MAIN}/api/live-analysis-variations?index=gainers`;
export const TOP_LOSERS_URL = `${NSE_MAIN}/api/live-analysis-variations?index=loosers`;
export const TOP_FNO_GAINER_URL = `${NSE_LEGACY}/live_market/dynaContent/live_analysis/gainers/fnoGainers1.json`;
export const TOP_FNO_LOSER_URL = `${NSE_LEGACY}/live_market/dynaContent/live_analysis/losers/fnoLosers1.json`;
export const FIFTYTWO_WEEK_HIGH_URL = `${NSE_MAIN}/api/live-analysis-data-52weekhighstock`;
export const FIFTYTWO_WEEK_LOW_URL = `${NSE_MAIN}/api/live-analysis-data-52weeklowstock`;

// Index URLs
export const ALL_INDICES_URL = `${NSE_MAIN}/api/allIndices`;
export const STOCKS_IN_INDEX_URL = `${NSE_MAIN}/api/equity-stockIndices?index=%s`;

// Historical data URLs
export const BHAVCOPY_BASE_URL = `${NSE_LEGACY}/content/historical/EQUITIES/%s/%s/cm%s%s%sbhav.csv.zip`;
export const BHAVCOPY_BASE_FILENAME = "cm%s%s%sbhav.csv";

// Derivative URLs
export const QUOTE_DERIVATIVE_URL = `${NSE_MAIN}/api/quote-derivative?symbol=%s`;

// Market status URL
export const MARKET_STATUS_URL = `${NSE_MAIN}/api/marketStatus`;

// IPO URLs - Real NSE endpoints
export const IPO_UPCOMING_URL = `${NSE_MAIN}/market-data/all-upcoming-issues-ipo`;
export const IPO_ACTIVE_URL = `${NSE_MAIN}/market-data/live-active-upcoming-issues-ipo`;
export const IPO_RECENT_URL = `${NSE_MAIN}/market-data/live-recent-listed-companies`;
export const IPO_LIST_URL = `${NSE_MAIN}/market-data/all-upcoming-issues-ipo`;
export const IPO_CALENDAR_URL = `${NSE_MAIN}/api/ipo-calendar`;
export const IPO_STATUS_URL = `${NSE_MAIN}/api/ipo-application-status`;
