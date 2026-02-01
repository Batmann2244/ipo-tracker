import { nseScraper } from '../server/services/scrapers/nse';

async function debugNse() {
    console.log("Starting NSE Debug...");
    try {
        const result = await nseScraper.getIpos();
        console.log("Result:", JSON.stringify(result, null, 2));
    } catch (e) {
        console.error("Error:", e);
    }
}

debugNse();
