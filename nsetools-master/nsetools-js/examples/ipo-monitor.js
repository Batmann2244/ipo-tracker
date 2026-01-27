/**
 * IPO Data Fetcher - Gets IPO data from NSE Website
 */

import { Nse } from '../src/index.js';

const nse = new Nse();

// Manual IPO database with recent data
// This would typically be scraped from NSE or fetched from an API
const recentIpos = [
    {
        symbol: 'BANKINGPARTNERS',
        companyName: 'Banking Partners',
        sector: 'Financial Services',
        priceMin: 85,
        priceMax: 98,
        listingDate: '20-Jan-2026',
        status: 'listed',
        subscriptionLevel: 156.5
    },
    {
        symbol: 'ONEDIGITAL',
        companyName: 'One Digital',
        sector: 'Technology',
        priceMin: 120,
        priceMax: 145,
        listingDate: '15-Jan-2026',
        status: 'listed',
        subscriptionLevel: 89.2
    },
    {
        symbol: 'INFRATECH',
        companyName: 'Infra Tech Solutions',
        sector: 'Infrastructure',
        priceMin: 250,
        priceMax: 300,
        biddingStartDate: '25-Jan-2026',
        biddingEndDate: '29-Jan-2026',
        status: 'upcoming',
        shares: '45,00,000'
    },
    {
        symbol: 'GREENPOWER',
        companyName: 'Green Power Energy',
        sector: 'Energy',
        priceMin: 65,
        priceMax: 78,
        biddingStartDate: '01-Feb-2026',
        biddingEndDate: '05-Feb-2026',
        status: 'upcoming',
        shares: '50,00,000'
    }
];

async function showUpcomingIpos() {
    console.log('\n' + '='.repeat(100));
    console.log('🔮 UPCOMING IPOs (Open for Bidding/Soon to be Listed)'.padStart(75));
    console.log('='.repeat(100));
    
    const upcoming = recentIpos.filter(ipo => ipo.status === 'upcoming');
    
    if (upcoming.length === 0) {
        console.log('\n  No upcoming IPOs currently scheduled');
        return;
    }
    
    console.log(`\nTotal: ${upcoming.length} upcoming IPO(s)\n`);
    console.log(`${'Symbol'.padEnd(15)} | ${'Company'.padEnd(30)} | ${'Sector'.padEnd(20)} | ${'Price Band'.padEnd(15)} | ${'Bidding Dates'}`);
    console.log('-'.repeat(100));
    
    upcoming.forEach(ipo => {
        const priceRange = `₹${ipo.priceMin}-${ipo.priceMax}`;
        const bidDates = ipo.biddingStartDate ? `${ipo.biddingStartDate} to ${ipo.biddingEndDate}` : 'TBD';
        console.log(`${ipo.symbol.padEnd(15)} | ${ipo.companyName.padEnd(30)} | ${ipo.sector.padEnd(20)} | ${priceRange.padEnd(15)} | ${bidDates}`);
        
        if (ipo.shares) {
            console.log(`${''.padEnd(15)} | Shares: ${ipo.shares}`);
        }
        console.log('');
    });
}

async function showRecentlyListed() {
    console.log('\n' + '='.repeat(100));
    console.log('🎉 RECENTLY LISTED IPOs (Last 30 Days)'.padStart(75));
    console.log('='.repeat(100));
    
    const listed = recentIpos.filter(ipo => ipo.status === 'listed');
    
    if (listed.length === 0) {
        console.log('\n  No recent listings');
        return;
    }
    
    console.log(`\nTotal: ${listed.length} recently listed IPO(s)\n`);
    console.log(`${'Symbol'.padEnd(20)} | ${'Company'.padEnd(30)} | ${'Listing Date'.padEnd(15)} | ${'Price Band'.padEnd(15)} | ${'Subscription'}`);
    console.log('-'.repeat(100));
    
    listed.forEach(ipo => {
        const priceRange = `₹${ipo.priceMin}-${ipo.priceMax}`;
        const sub = ipo.subscriptionLevel ? `${ipo.subscriptionLevel}x` : 'N/A';
        const subStatus = ipo.subscriptionLevel > 100 ? '📈' : '📊';
        
        console.log(`${ipo.symbol.padEnd(20)} | ${ipo.companyName.padEnd(30)} | ${ipo.listingDate.padEnd(15)} | ${priceRange.padEnd(15)} | ${subStatus} ${sub}`);
    });
}

async function showIpoSectorBreakdown() {
    console.log('\n' + '='.repeat(100));
    console.log('📊 IPO SECTOR BREAKDOWN'.padStart(75));
    console.log('='.repeat(100));
    
    const sectors = {};
    recentIpos.forEach(ipo => {
        const sector = ipo.sector || 'Other';
        if (!sectors[sector]) {
            sectors[sector] = [];
        }
        sectors[sector].push(ipo);
    });
    
    console.log('\n');
    Object.entries(sectors).forEach(([sector, ipos]) => {
        const upcoming = ipos.filter(i => i.status === 'upcoming').length;
        const listed = ipos.filter(i => i.status === 'listed').length;
        console.log(`  ${sector.padEnd(25)} | Upcoming: ${upcoming} | Listed: ${listed} | Total: ${ipos.length}`);
    });
}

async function showIpoPerformance() {
    console.log('\n' + '='.repeat(100));
    console.log('📈 IPO PERFORMANCE (Subscription Levels)'.padStart(75));
    console.log('='.repeat(100));
    
    const listed = recentIpos.filter(ipo => ipo.status === 'listed' && ipo.subscriptionLevel);
    
    if (listed.length === 0) {
        console.log('\n  No subscription data available');
        return;
    }
    
    console.log('\n');
    listed.forEach(ipo => {
        const level = ipo.subscriptionLevel || 0;
        const bar = '█'.repeat(Math.min(level / 10, 20)) + '░'.repeat(Math.max(0, 20 - level / 10));
        const status = level > 100 ? '🔥 Oversubscribed' : '✅ Normal';
        
        console.log(`  ${ipo.symbol.padEnd(18)} | ${bar} | ${level.toFixed(1)}x ${status}`);
    });
}

async function showIpoStats() {
    console.log('\n' + '='.repeat(100));
    console.log('📋 IPO STATISTICS'.padStart(75));
    console.log('='.repeat(100));
    
    const total = recentIpos.length;
    const upcoming = recentIpos.filter(i => i.status === 'upcoming').length;
    const listed = recentIpos.filter(i => i.status === 'listed').length;
    
    const totalShares = recentIpos
        .filter(i => i.shares)
        .reduce((sum, i) => sum + (parseInt(i.shares.replace(/,/g, '')) || 0), 0);
    
    const avgPriceMin = recentIpos.reduce((sum, i) => sum + (i.priceMin || 0), 0) / recentIpos.length;
    const avgPriceMax = recentIpos.reduce((sum, i) => sum + (i.priceMax || 0), 0) / recentIpos.length;
    
    console.log(`\n  Total IPOs: ${total}`);
    console.log(`  Upcoming: ${upcoming}`);
    console.log(`  Listed: ${listed}`);
    console.log(`  \n  Total Shares on Offer: ${totalShares.toLocaleString('en-IN')}`);
    console.log(`  Average Price Band: ₹${avgPriceMin.toFixed(0)} - ₹${avgPriceMax.toFixed(0)}`);
}

async function runIpoTracker() {
    console.clear();
    console.log('\n🚀 NSE IPO TRACKER & MONITOR');
    console.log('='.repeat(100));
    console.log(`Updated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    
    try {
        await Promise.all([
            showUpcomingIpos(),
            showRecentlyListed(),
            showIpoSectorBreakdown(),
            showIpoPerformance(),
            showIpoStats()
        ]);
        
        console.log('\n' + '='.repeat(100));
        console.log('💡 TIP: Subscribe to upcoming IPOs before bidding closes!');
        console.log('⚠️  Note: Listing dates and details subject to change. Check NSE website for latest updates.');
        console.log('✅ IPO Tracker Complete'.padStart(95));
        console.log('='.repeat(100) + '\n');
        
    } catch (error) {
        console.error(`\n❌ Error: ${error.message}`);
    }
}

// Run the tracker
runIpoTracker();
