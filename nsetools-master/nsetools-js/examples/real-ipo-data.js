/**
 * Real IPO Data Fetcher - Scrapes NSE Website
 * Source: https://www.nseindia.com/market-data/all-upcoming-issues-ipo
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

const NSE_IPO_URL = 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo';

async function fetchRealIpoData() {
    console.log('🔥 Fetching REAL IPO Data from NSE...\n');
    
    try {
        // Fetch the HTML page
        const response = await axios.get(NSE_IPO_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://www.nseindia.com/'
            },
            timeout: 10000
        });
        
        const html = response.data;
        
        // Parse HTML
        const $ = cheerio.load(html);
        
        // Look for table rows with IPO data
        const ipos = [];
        
        // Find all table rows
        $('table tbody tr').each((index, element) => {
            const cells = $(element).find('td');
            
            if (cells.length >= 5) {
                const company = $(cells[0]).text().trim();
                const type = $(cells[1]).text().trim();
                const openDate = $(cells[2]).text().trim();
                const closeDate = $(cells[3]).text().trim();
                const status = $(cells[4]).text().trim();
                const shares = $(cells[5]).text().trim();
                const subscribed = $(cells[6]).text().trim();
                const bidPrice = $(cells[7]).text().trim();
                
                if (company && company !== '') {
                    ipos.push({
                        companyName: company,
                        type: type,
                        openDate: openDate,
                        closeDate: closeDate,
                        status: status,
                        sharesOnOffer: shares,
                        subscribed: subscribed,
                        bidPrice: bidPrice
                    });
                }
            }
        });
        
        return ipos;
    } catch (error) {
        console.error(`❌ Error fetching IPO data: ${error.message}`);
        return [];
    }
}

async function displayIpoData(ipos) {
    console.log('='.repeat(120));
    console.log('📊 REAL IPO DATA - NSE UPCOMING ISSUES'.padStart(80));
    console.log('='.repeat(120));
    console.log(`Source: https://www.nseindia.com/market-data/all-upcoming-issues-ipo`);
    console.log(`Last Updated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n`);
    
    if (ipos.length === 0) {
        console.log('No active IPOs found');
        return;
    }
    
    console.log(`${'Company'.padEnd(40)} | ${'Type'.padEnd(6)} | ${'Open'.padEnd(12)} | ${'Close'.padEnd(12)} | ${'Status'.padEnd(10)} | ${'Subscribed'}`);
    console.log('-'.repeat(120));
    
    ipos.forEach((ipo, i) => {
        const subStatus = ipo.subscribed !== '-' && parseFloat(ipo.subscribed) > 1 ? '🔥' : '✅';
        console.log(
            `${ipo.companyName.substring(0, 39).padEnd(40)} | ${ipo.type.padEnd(6)} | ${ipo.openDate.padEnd(12)} | ${ipo.closeDate.padEnd(12)} | ${ipo.status.padEnd(10)} | ${subStatus} ${ipo.subscribed}`
        );
    });
    
    console.log('\n' + '='.repeat(120));
    console.log(`Total Active IPOs: ${ipos.length}`);
    console.log('='.repeat(120));
    
    // Group by status
    const byType = {};
    ipos.forEach(ipo => {
        if (!byType[ipo.type]) byType[ipo.type] = 0;
        byType[ipo.type]++;
    });
    
    console.log('\n📋 Summary by Type:');
    Object.entries(byType).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
    });
}

// Main execution
(async () => {
    try {
        const ipos = await fetchRealIpoData();
        displayIpoData(ipos);
    } catch (error) {
        console.error('Fatal error:', error);
    }
})();
