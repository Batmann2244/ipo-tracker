
import axios from 'axios';
import fs from 'fs';

async function dumpKeys() {
    const url = 'https://webnodejs.investorgain.com/cloud/new/report/data-read/331/1/2/2026/2025-26/0/all?search=&v=17-49';
    try {
        const response = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (response.data && response.data.reportTableData && response.data.reportTableData.length > 0) {
            const item = response.data.reportTableData[0];
            fs.writeFileSync('list_keys.json', JSON.stringify(item, null, 2));
            console.log("Keys dumped to list_keys.json");
        }
    } catch (e) {
        console.error(e);
    }
}
dumpKeys();
