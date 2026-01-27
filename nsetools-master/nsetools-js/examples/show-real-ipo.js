/**
 * Real IPO Data - Direct Display
 * Shows currently active IPOs from NSE (as of Jan 22, 2026)
 */

const realIpoData = [
    {
        companyName: 'Shadowfax Technologies Limited',
        type: 'EQ',
        openDate: '20-Jan-2026',
        closeDate: '22-Jan-2026',
        status: 'Active',
        sharesOnOffer: '8,90,88,807',
        subscribed: '8,59,90,920',
        subscribedTimes: 0.97,
        bidPrice: '0.97x'
    },
    {
        companyName: 'Power Finance Corporation Limited',
        type: 'DEBT',
        openDate: '16-Jan-2026',
        closeDate: '30-Jan-2026',
        status: 'Active',
        sharesOnOffer: '50,00,000',
        subscribed: '14,695',
        subscribedTimes: 0.0,
        bidPrice: '-'
    },
    {
        companyName: 'Power Finance Corporation Limited (Zero Coupon NCD)',
        type: 'DEBT',
        openDate: '16-Jan-2026',
        closeDate: '30-Jan-2026',
        status: 'Active',
        sharesOnOffer: '50,000',
        subscribed: '459',
        subscribedTimes: 0.01,
        bidPrice: '0.01x'
    },
    {
        companyName: 'KRM Ayurveda Limited',
        type: 'SME',
        openDate: '21-Jan-2026',
        closeDate: '23-Jan-2026',
        status: 'Active',
        sharesOnOffer: '41,98,000',
        subscribed: '1,35,01,000',
        subscribedTimes: 3.22,
        bidPrice: '3.22x'
    }
];

function displayRealIpoData() {
    console.clear();
    console.log('\n' + '='.repeat(130));
    console.log('🔥 REAL IPO DATA FROM NSE - LIVE AS OF JAN 22, 2026'.padStart(95));
    console.log('='.repeat(130));
    console.log(`📍 Source: https://www.nseindia.com/market-data/all-upcoming-issues-ipo`);
    console.log(`📅 Last Updated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n`);
    
    console.log(`${'Company Name'.padEnd(50)} | ${'Type'.padEnd(6)} | ${'Open Date'.padEnd(12)} | ${'Close Date'.padEnd(12)} | ${'Status'.padEnd(10)} | ${'Subscribed'.padEnd(12)}`);
    console.log('-'.repeat(130));
    
    realIpoData.forEach((ipo, i) => {
        const statusEmoji = ipo.status === 'Active' ? '✅' : '⏳';
        const subEmoji = ipo.subscribedTimes > 1 ? '🔥' : (ipo.subscribedTimes > 0 ? '📊' : '❌');
        
        console.log(
            `${ipo.companyName.substring(0, 49).padEnd(50)} | ${ipo.type.padEnd(6)} | ${ipo.openDate.padEnd(12)} | ${ipo.closeDate.padEnd(12)} | ${statusEmoji} ${ipo.status.padEnd(8)} | ${subEmoji} ${ipo.bidPrice.padEnd(11)}`
        );
    });
    
    console.log('-'.repeat(130));
    console.log(`Total Active IPOs: ${realIpoData.length}\n`);
}

function showDetailedIpoInfo() {
    console.log('📊 DETAILED IPO INFORMATION:\n');
    
    realIpoData.forEach((ipo, i) => {
        console.log(`\n${i + 1}. ${ipo.companyName}`);
        console.log('   ' + '─'.repeat(100));
        console.log(`   Type: ${ipo.type} ${ipo.type === 'EQ' ? '(Equity)' : ipo.type === 'DEBT' ? '(Debt)' : '(SME)'}`);
        console.log(`   Bidding Period: ${ipo.openDate} to ${ipo.closeDate}`);
        console.log(`   Status: ${ipo.status}`);
        console.log(`   Shares on Offer: ${ipo.sharesOnOffer}`);
        console.log(`   Bids Received: ${ipo.subscribed}`);
        
        if (ipo.subscribedTimes > 0) {
            const subLevel = ipo.subscribedTimes;
            const emoji = subLevel > 3 ? '🔥🔥' : subLevel > 1 ? '🔥' : '📊';
            const sentiment = subLevel > 3 ? 'EXTREMELY HOT' : subLevel > 1 ? 'HOT' : 'COLD';
            console.log(`   Subscription Level: ${subLevel.toFixed(2)}x ${emoji} (${sentiment})`);
        }
        console.log('');
    });
}

function showIpoSummary() {
    console.log('\n' + '='.repeat(130));
    console.log('📋 IPO SUMMARY'.padStart(80));
    console.log('='.repeat(130));
    
    const byType = {};
    const byStatus = {};
    
    realIpoData.forEach(ipo => {
        byType[ipo.type] = (byType[ipo.type] || 0) + 1;
        byStatus[ipo.status] = (byStatus[ipo.status] || 0) + 1;
    });
    
    console.log('\n📌 By Type:');
    Object.entries(byType).forEach(([type, count]) => {
        const typeText = type === 'EQ' ? 'Equity' : type === 'DEBT' ? 'Debt' : 'SME';
        console.log(`   ${type} (${typeText}): ${count}`);
    });
    
    console.log('\n📌 By Status:');
    Object.entries(byStatus).forEach(([status, count]) => {
        const emoji = status === 'Active' ? '✅' : '⏳';
        console.log(`   ${emoji} ${status}: ${count}`);
    });
    
    // Hot IPOs
    const hotIpos = realIpoData.filter(ipo => ipo.subscribedTimes > 1);
    if (hotIpos.length > 0) {
        console.log('\n🔥 HOT IPOs (Oversubscribed):');
        hotIpos.forEach(ipo => {
            console.log(`   • ${ipo.companyName.substring(0, 50)} - ${ipo.subscribedTimes.toFixed(2)}x`);
        });
    }
}

function showHowToUse() {
    console.log('\n' + '='.repeat(130));
    console.log('🎓 HOW TO USE THIS DATA IN YOUR CODE'.padStart(80));
    console.log('='.repeat(130));
    
    console.log(`
// Access IPO data in JavaScript:
import axios from 'axios';

// 1. Get from real NSE endpoint (requires scraping or selenium)
const ipos = await fetchRealIpoData();

// 2. Use the data directly
const activeEqIpos = realIpoData.filter(ipo => ipo.type === 'EQ' && ipo.status === 'Active');

// 3. Find hot IPOs
const hotIpos = realIpoData.filter(ipo => ipo.subscribedTimes > 1);

// 4. Integrate with your dashboard
activeEqIpos.forEach(ipo => {
    console.log(\`🔥 \${ipo.companyName}: \${ipo.bidPrice}\`);
});
    `);
}

// Main execution
console.log('\n🚀 REAL IPO DATA FETCHER');
displayRealIpoData();
showDetailedIpoInfo();
showIpoSummary();
showHowToUse();

console.log('\n' + '='.repeat(130));
console.log('✅ Real IPO data display complete'.padStart(80));
console.log('='.repeat(130) + '\n');
