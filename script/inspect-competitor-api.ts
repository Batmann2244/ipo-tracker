
import axios from 'axios';

async function testCompetitorSources() {
    console.log("Testing Investorgain API endpoints used by competitor...");

    // 1. GMP Data Endpoint (Found via browser network analysis)
    // ID 1573 is 'Bai Kakaji Polymers' from the browser session
    const gmpUrl = 'https://webnodejs.investorgain.com/cloud/ipo/ipo-gmp-read/1573/true';
    try {
        console.log(`\nFetching GMP Data from: ${gmpUrl}`);
        const gmpResponse = await axios.get(gmpUrl, {
            headers: {
                'Origin': 'https://www.investorgain.com',
                'Referer': 'https://www.investorgain.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        console.log("✅ GMP Data Success!");
        console.log("Sample Data:", JSON.stringify(gmpResponse.data).substring(0, 200) + "...");
    } catch (error: any) {
        console.error("❌ GMP Fetch Failed:", error.message);
    }

    // 2. Subscription Data Endpoint
    const subUrl = 'https://webnodejs.investorgain.com/cloud/ipo/ipo-subscription-read/1573';
    try {
        console.log(`\nFetching Subscription Data from: ${subUrl}`);
        const subResponse = await axios.get(subUrl, {
            headers: {
                'Origin': 'https://www.investorgain.com',
                'Referer': 'https://www.investorgain.com/',
            }
        });
        console.log("✅ Subscription Data Success!");
        console.log("Sample Data:", JSON.stringify(subResponse.data).substring(0, 200) + "...");
    } catch (error: any) {
        console.error("❌ Subscription Fetch Failed:", error.message);
    }
}

testCompetitorSources();
