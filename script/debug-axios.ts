
import axios from 'axios';

async function test(name: string, headers: any) {
    const url = 'https://api.bseindia.com/BseIndiaAPI/api/GetPipoData?id=1&status=L&Type=P';
    console.log(`Testing ${name}...`);
    try {
        const response = await axios.get(url, { headers });
        console.log(`  Success: ${response.status}`);
    } catch (error: any) {
        console.error(`  Error: ${error.message} (${error.code})`);
    }
}

async function main() {
    await test("No Headers", {});
    await test("User-Agent Only", { 'User-Agent': 'Mozilla/5.0' });
    await test("Referer Only", { 'Referer': 'https://www.bseindia.com/' });
}

main();
