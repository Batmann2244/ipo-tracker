import { testAllScrapers } from "../server/services/scrapers";

async function main() {
    console.log("Starting scraper check...");
    try {
        const results = await testAllScrapers();
        console.log("Scraper Results:", JSON.stringify(results, null, 2));

        const passed = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);

        console.log(`\nSummary: ${passed.length} passed, ${failed.length} failed.`);
        if (failed.length > 0) {
            console.log("Failed Scrapers:");
            failed.forEach(f => console.log(`- ${f.source}: ${f.error}`));
            process.exit(1);
        } else {
            console.log("All scrapers are working fine.");
        }
    } catch (error) {
        console.error("Error executing scraper check:", error);
        process.exit(1);
    }
}

main();
