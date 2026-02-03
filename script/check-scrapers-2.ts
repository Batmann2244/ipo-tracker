import { scraperAggregator } from '../server/services/scrapers/aggregator';
import { bseScraper } from '../server/services/scrapers/bse';
import { investorgainApiScraper } from '../server/services/scrapers/investorgain-api';
import { zeodhaScraper } from '../server/services/scrapers/zerodha'; // Added for usage
import { nseScraper } from '../server/services/scrapers/nse';

async function checkScrapers() { // Renamed main to checkScrapers
    // const sources = ['nsetools', 'groww', 'chittorgarh', 'investorgain', 'nse', 'ipoalerts', 'bse', 'ipowatch', 'zerodha'];
    const sources = ['bse', 'nse', 'zerodha', 'investorgain-api']; // Targeted check

    console.log(`Starting TARGETED scraper check for: ${sources.join(', ')}...`); // Updated log message

    async function runTest(name: string, fn: () => Promise<any>) {
        console.log(`Testing ${name}...`);
        const start = Date.now();
        try {
            const result = await fn();
            const time = Date.now() - start;
            console.log(`${name} Result:`, JSON.stringify({
                success: result.success,
                count: result.data ? result.data.length : 0,
                time: `${time}ms`,
                firstItem: result.data && result.data.length > 0 ? result.data[0].companyName : null,
                error: result.error
            }, null, 2));
        } catch (err: any) {
            console.log(`❌ ${name} failed:`, err.message);
        }
    }

    // await runTest("ipowatch", () => ipoWatchScraper.getIpos()); // Already passed
    await runTest("zerodha", () => zeodhaScraper.getIpos());
    await runTest("bse", () => bseScraper.getIpos());
    await runTest("nse", () => nseScraper.getIpos());

    process.exit(0);
}

// Run the check
checkScrapers();
