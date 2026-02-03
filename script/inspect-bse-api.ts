
async function main() {
    const url = 'https://api.bseindia.com/BseIndiaAPI/api/GetPipoData?id=1&status=L&Type=P';

    console.log(`Fetching ${url}...`);

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.bseindia.com/',
                'Origin': 'https://www.bseindia.com',
                'Accept': 'application/json, text/plain, */*'
            }
        });

        console.log('Status:', response.status);
        const text = await response.text();
        console.log('Raw Response Length:', text.length);

        try {
            const data = JSON.parse(text);
            console.log('Data Type:', typeof data);

            if (Array.isArray(data)) {
                console.log(`Received array with ${data.length} items.`);
                if (data.length > 0) {
                    console.log('First Item keys:', Object.keys(data[0]));
                    console.log('First Item:', JSON.stringify(data[0], null, 2));
                }
            } else if (typeof data === 'object') {
                console.log('Received Object Keys:', Object.keys(data));
                if (data.Table) {
                    console.log('Found .Table property with length:', data.Table.length);
                    console.log('Sample:', JSON.stringify(data.Table[0], null, 2));
                }
            }
        } catch (e) {
            console.log('Response is not JSON:', text.substring(0, 500));
        }

    } catch (error: any) {
        console.error('Error fetching API:', error.message);
    }
}

main();
