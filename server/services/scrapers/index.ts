export * from "./base";

export { chittorgarhScraper, ChittorgarhScraper } from "./chittorgarh";
export { growwScraper, GrowwScraper } from "./groww";
export { investorGainScraper, InvestorGainScraper } from "./investorgain";
export { investorgainApiScraper } from './investorgain-api';
export { nseScraper, NseScraper } from "./nse";
export { nseToolsScraper, NseToolsScraper } from "./nsetools";
export { ipoAlertsScraper } from "./ipoalerts";
export { bseScraper, BseScraper } from "./bse";
export { ipoWatchScraper, IpoWatchScraper } from "./ipowatch";
export { zeodhaScraper, ZeodhaScraper } from "./zerodha";

export {
  scraperAggregator,
  ScraperAggregator,
  type AggregatedIpoData,
  type AggregatedSubscriptionData,
  type AggregatedGmpData,
  type AggregatorResult,
} from "./aggregator";

import { scraperAggregator } from "./aggregator";

export async function fetchAllIpos(sources?: string[]) {
  return scraperAggregator.getIpos(sources);
}

export async function fetchAllSubscriptions(sources?: string[]) {
  return scraperAggregator.getSubscriptions(sources);
}

export async function fetchAllGmp(sources?: string[]) {
  return scraperAggregator.getGmp(sources);
}

export async function testScraperConnection(source: string) {
  return scraperAggregator.testConnection(source);
}

export async function testAllScrapers() {
  return scraperAggregator.testAllConnections();
}
