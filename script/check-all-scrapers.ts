
import {
    chittorgarhScraper,
    growwScraper,
    investorGainScraper,
    nseScraper,
    nseToolsScraper,
    ipoAlertsScraper,
    bseScraper,
    ipoWatchScraper,
    zeodhaScraper
} from "../server/services/scrapers";

async function main() {
    console.log("Starting COMPREHENSIVE scraper check...");

    const results: any[] = [];

    // Helper to run a test
    async function runTest(name: string, fn: () => Promise<any>) {
        console.log(`Testing ${name}...`);
        const start = Date.now();
        try {
            const result = await fn();
            const time = Date.now() - start;
            const success = result && result.success;
            const count = result.data ? result.data.length : 0;

            console.log(`✅ ${name} finished in ${time}ms. Success: ${success}. Items: ${count}`);

            results.push({
                name,
                success,
                count,
                time,
                error: result.error
            });
        } catch (err: any) {
            const time = Date.now() - start;
            console.log(`❌ ${name} failed in ${time}ms.`);
            results.push({
                name,
                success: false,
                time,
                error: err.message
            });
        }
    }

    // Run tests sequentially to avoid overwhelming network/resources (or parallel if preferred, but sequential is safer for logs)
    await runTest("nsetools", () => nseToolsScraper.fetchIpos());
    await runTest("groww", () => growwScraper.getIpos());
    await runTest("chittorgarh", () => chittorgarhScraper.getIpos());
    await runTest("investorgain", () => investorGainScraper.getIpos()); // assuming getIpos exists, checked earlier script passed it
    await runTest("nse", () => nseScraper.getIpos());

    // Additional scrapers
    await runTest("ipoalerts", () => ipoAlertsScraper.getOpenIpos()); // using getOpenIpos as primary check
    await runTest("bse", () => bseScraper.getIpos());
    await runTest("ipowatch", () => ipoWatchScraper.getIpos());
    await runTest("zerodha", () => zeodhaScraper.getIpos());

    console.log("\n================ SUMMARY ================");
    const passed = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.table(results.map(r => ({
        Source: r.name,
        Status: r.success ? "PASS" : "FAIL",
        Items: r.count,
        TimeMs: r.time,
        Error: r.error ? r.error.substring(0, 50) + "..." : "-"
    })));

    console.log(`\nTotal: ${results.length}, Passed: ${passed.length}, Failed: ${failed.length}`);

    if (failed.length > 0) {
        console.log("\nFailures Details:");
        failed.forEach(f => console.log(`- ${f.name}: ${f.error}`));
        process.exit(1);
    } else {
        console.log("\nAll scrapers are functional!");
    }
}

main();
