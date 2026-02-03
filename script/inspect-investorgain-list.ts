
import axios from 'axios';

async function testListApi() {
    const url = 'https://webnodejs.investorgain.com/cloud/new/report/data-read/331/1/2/2026/2025-26/0/all?search=&v=17-49';
    try {
        console.log(`Fetching List Data from: ${url}`);
        const response = await axios.get(url, {
            headers: {
                'Origin': 'https://www.investorgain.com',
                'Referer': 'https://www.investorgain.com/',
                'User-Agent': 'Mozilla/5.0'
            }
        });

        const data = response.data;
        if (data && data.reportTableData && data.reportTableData.length > 0) {
            const firstItem = data.reportTableData[0];
            console.log("Keys:", Object.keys(firstItem));
            console.log("Sample Item:", JSON.stringify(firstItem, null, 2));
        } else {
            console.log("No data found or structure different.");
            console.log("Keys in root:", Object.keys(data));
        }

    } catch (error: any) {
        console.error("Fetch Failed:", error.message);
    }
}

testListApi();
