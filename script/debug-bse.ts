import { bseScraper } from '../server/services/scrapers/bse';

async function debugBse() {
    console.log("Starting BSE Debug...");
    try {
        const result = await bseScraper.getIpos();
        console.log("Result:", JSON.stringify(result, null, 2));
    } catch (e) {
        console.error("Error:", e);
    }
}

debugBse();
