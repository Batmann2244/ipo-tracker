
import axios from 'axios';
import { ipoWatchScraper } from '../server/services/scrapers/ipowatch';
import { scrapeGmpFromMultipleSources } from '../server/services/multi-source-scraper';

// Mock axios
(axios as any).get = async (url: string) => {
    console.log(`[Mock] Fetching ${url}`);
    if (url.includes('chittorgarh')) {
        return {
            data: `
                <html>
                <body>
                <table>
                    <!-- Row 1: Valid Data -->
                    <tr>
                        <td>TestCorp A IPO</td>
                        <td>GMP 50</td>
                        <td>Expected 150</td>
                    </tr>
                    <!-- Row 2: Duplicate of TestCorp A -->
                    <tr>
                        <td>TestCorp A IPO</td>
                        <td>GMP 50</td>
                        <td>Expected 150</td>
                    </tr>
                    <!-- Row 3: TestCorp B -->
                    <tr>
                        <td>TestCorp B IPO</td>
                        <td>GMP 20</td>
                        <td>Expected 120</td>
                    </tr>
                </table>
                </body>
                </html>
            `
        };
    }
    return { data: '' };
};

// Mock ipoWatchScraper
ipoWatchScraper.getGmp = async () => {
    // console.log('[Mock] Fetching IPOWatch GMP');
    return {
        success: true,
        data: [
            // Duplicate of TestCorp B (should be ignored if existing logic prefers first source)
            {
                symbol: 'TESTCORPB',
                companyName: 'TestCorp B',
                gmp: 25,
                expectedListing: 125,
                trend: 'stable',
                source: 'ipowatch',
                timestamp: new Date()
            },
            // New TestCorp C
            {
                symbol: 'TESTCORPC',
                companyName: 'TestCorp C',
                gmp: 30,
                expectedListing: 130,
                trend: 'stable',
                source: 'ipowatch',
                timestamp: new Date()
            }
        ]
    } as any;
};

async function runTest() {
    console.log('Starting GMP Scraper Verification...');

    const results = await scrapeGmpFromMultipleSources();

    console.log(`Result count: ${results.length}`);
    results.forEach(r => {
        console.log(`- ${r.symbol}: GMP ${r.gmp}, Source: ${r.source}`);
    });

    // Validation
    const symbols = results.map(r => r.symbol);
    const uniqueSymbols = new Set(symbols);

    if (symbols.length !== uniqueSymbols.size) {
        console.error('FAILED: Duplicate symbols found!');
        process.exit(1);
    }

    // NormalizeSymbol for "TestCorp A" -> TESTCORPA
    if (!symbols.includes('TESTCORPA') || !symbols.includes('TESTCORPB') || !symbols.includes('TESTCORPC')) {
        console.error('FAILED: Missing expected symbols! Found:', symbols);
        process.exit(1);
    }

    const testCorpB = results.find(r => r.symbol === 'TESTCORPB');
    if (testCorpB?.source !== 'chittorgarh') {
        console.error(`FAILED: TestCorp B should be from chittorgarh, got ${testCorpB?.source}`);
         process.exit(1);
    }

    console.log('PASSED: Verification successful.');
}

runTest().catch(err => {
    console.error(err);
    process.exit(1);
});
