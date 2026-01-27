/**
 * Combined Stock & IPO Tracker
 * Monitor both active stocks and upcoming IPOs in one unified view
 */

import { Nse } from '../src/index.js';

const nse = new Nse();

async function showMarketOverview() {
    console.log('\n' + '='.repeat(100));
    console.log('📊 MARKET OVERVIEW'.padStart(60));
    console.log('='.repeat(100));
    
    try {
        // Get NIFTY 50 status
        const quote = await nse.getIndexQuote('NIFTY 50');
        const change = quote.variation || 0;
        const pChange = quote.percentChange || 0;
        const arrow = change >= 0 ? '📈' : '📉';
        const sign = change >= 0 ? '+' : '';
        
        console.log(`\n  Index: NIFTY 50`);
        console.log(`  Current: ${quote.last} ${arrow} ${sign}${pChange.toFixed(2)}%`);
        console.log(`  Trading at: ${quote.lastUpdateTime || 'Live'}`);
    } catch (error) {
        console.log(`  Error fetching index: ${error.message}`);
    }
}

async function showTopStocks() {
    console.log('\n' + '='.repeat(100));
    console.log('📈 TOP PERFORMERS - STOCKS'.padStart(60));
    console.log('='.repeat(100));
    
    try {
        const gainers = await nse.getTopGainers('NIFTY');
        
        console.log('\n  TOP 5 GAINERS:\n');
        console.log(`  ${'#'.padEnd(3)} | ${'Symbol'.padEnd(12)} | ${'LTP'.padEnd(10)} | ${'Change'.padEnd(12)} | ${'Volume'}`);
        console.log('  ' + '-'.repeat(60));
        
        gainers.slice(0, 5).forEach((stock, i) => {
            const pChange = stock.pChange || 0;
            const arrow = pChange >= 0 ? '📈' : '📉';
            const ltp = stock.ltp || 'N/A';
            const volume = stock.volume || '0';
            
            console.log(`  ${(i + 1).toString().padEnd(3)} | ${stock.symbol?.padEnd(12)} | ₹${String(ltp).padEnd(9)} | ${arrow} ${String(pChange.toFixed(2) + '%').padEnd(11)} | ${volume}`);
        });
    } catch (error) {
        console.log(`  Error fetching gainers: ${error.message}`);
    }
}

async function showIpoOpportunities() {
    console.log('\n' + '='.repeat(100));
    console.log('🔥 IPO OPPORTUNITIES - UPCOMING BIDDING'.padStart(60));
    console.log('='.repeat(100));
    
    // Mock IPO data (in real scenario, would fetch from NSE)
    const ipos = [
        {
            symbol: 'INFRATECH',
            companyName: 'Infra Tech Solutions',
            sector: 'Infrastructure',
            priceMin: 250,
            priceMax: 300,
            biddingEndDate: '29-Jan-2026',
            daysLeft: 7,
            status: 'open'
        },
        {
            symbol: 'GREENPOWER',
            companyName: 'Green Power Energy',
            sector: 'Energy',
            priceMin: 65,
            priceMax: 78,
            biddingStartDate: '01-Feb-2026',
            daysLeft: 10,
            status: 'upcoming'
        }
    ];
    
    const active = ipos.filter(i => i.status === 'open');
    const upcoming = ipos.filter(i => i.status === 'upcoming');
    
    if (active.length > 0) {
        console.log('\n  🟢 OPEN FOR BIDDING NOW:\n');
        console.log(`  ${'Company'.padEnd(30)} | ${'Sector'.padEnd(18)} | ${'Price Band'.padEnd(15)} | ${'Days Left'}`);
        console.log('  ' + '-'.repeat(80));
        
        active.forEach(ipo => {
            const priceRange = `₹${ipo.priceMin}-${ipo.priceMax}`;
            console.log(`  ${ipo.companyName.padEnd(30)} | ${ipo.sector.padEnd(18)} | ${priceRange.padEnd(15)} | ${ipo.daysLeft} days`);
        });
    }
    
    if (upcoming.length > 0) {
        console.log('\n  ⏳ COMING SOON:\n');
        console.log(`  ${'Company'.padEnd(30)} | ${'Sector'.padEnd(18)} | ${'Price Band'.padEnd(15)} | ${'Opens In'}`);
        console.log('  ' + '-'.repeat(80));
        
        upcoming.forEach(ipo => {
            const priceRange = `₹${ipo.priceMin}-${ipo.priceMax}`;
            console.log(`  ${ipo.companyName.padEnd(30)} | ${ipo.sector.padEnd(18)} | ${priceRange.padEnd(15)} | ${ipo.daysLeft} days`);
        });
    }
}

async function showInvestmentGuide() {
    console.log('\n' + '='.repeat(100));
    console.log('💡 INVESTMENT GUIDE - STOCKS vs IPOs'.padStart(60));
    console.log('='.repeat(100));
    
    console.log(`
  ╔════════════════════╦══════════════════════════════════════════════════╦═══════════════════════════╗
  ║ Aspect             ║ Active Stocks (NSE)                              ║ New IPOs                  ║
  ╠════════════════════╬══════════════════════════════════════════════════╬═══════════════════════════╣
  ║ Liquidity          ║ Very High - Buy/Sell anytime                     ║ Limited during bidding    ║
  ║ Price Discovery    ║ Continuous price updates                         ║ Fixed price band          ║
  ║ Risk Level         ║ Established track record                         ║ Higher uncertainty        ║
  ║ Entry Point        ║ Current market price                             ║ Fixed IPO price           ║
  ║ Trading Hours      ║ 9:15 AM - 3:30 PM (IST)                        ║ Bidding on fixed dates    ║
  ║ Minimum Investment │ Depends on stock price                           ║ Depends on price band     ║
  ║ Volatility         ║ Varies by stock/sector                           ║ Often high on listing     ║
  ║ Best For           ║ Swing trading, Investing                         ║ Long-term investors       ║
  ╚════════════════════╩══════════════════════════════════════════════════╩═══════════════════════════╝
    `);
}

async function showPortfolioStrategy() {
    console.log('\n' + '='.repeat(100));
    console.log('🎯 BALANCED PORTFOLIO STRATEGY'.padStart(60));
    console.log('='.repeat(100));
    
    console.log(`
  Recommended Allocation for Different Investor Types:
  
  👨‍💼 Conservative Investor (Low Risk):
     • 70% - Established Blue-chip stocks (TCS, INFY, RELIANCE)
     • 20% - Index funds (NIFTY 50, NIFTY BANK)
     • 10% - Selective quality IPOs only
  
  🎯 Moderate Investor (Medium Risk):
     • 50% - Quality established stocks
     • 20% - Index funds
     • 20% - Growth stocks with good fundamentals
     • 10% - IPOs with strong sectors
  
  🚀 Aggressive Investor (High Risk):
     • 40% - Growth & tech stocks
     • 20% - Emerging sector stocks
     • 30% - Attractive IPOs (high growth potential)
     • 10% - Index funds (stability)
  
  💰 IPO Investment Strategy:
     ✅ DO: Analyze sector trends, company fundamentals, market conditions
     ✅ DO: Subscribe to IPOs in growth sectors matching your portfolio
     ✅ DO: Check subscription levels before deciding
     ❌ DONT: Invest blindly in all IPOs
     ❌ DONT: Exceed 10-15% of portfolio in new IPOs
     ❌ DONT: Ignore market conditions and existing portfolio balance
    `);
}

async function showRecentlyListed() {
    console.log('\n' + '='.repeat(100));
    console.log('🎉 RECENTLY LISTED IPOs - PERFORMANCE'.padStart(60));
    console.log('='.repeat(100));
    
    // Mock data for recently listed IPOs
    const recently = [
        {
            symbol: 'BANKINGPARTNERS',
            companyName: 'Banking Partners',
            ipoPrice: 91.5,
            currentPrice: 143.75,
            gain: 57.0,
            listingDate: '20-Jan-2026'
        },
        {
            symbol: 'ONEDIGITAL',
            companyName: 'One Digital',
            ipoPrice: 132.5,
            currentPrice: 118.25,
            gain: -10.7,
            listingDate: '15-Jan-2026'
        }
    ];
    
    console.log('\n  ${"Company".padEnd(30)} | ${"IPO Price".padEnd(12)} | ${"Current".padEnd(12)} | ${"Gain/Loss".padEnd(12)} | ${"Date Listed"}\n');
    console.log('  ' + '-'.repeat(85));
    
    recently.forEach(ipo => {
        const arrow = ipo.gain >= 0 ? '📈' : '📉';
        const color = ipo.gain >= 0 ? '+' : '';
        console.log(`  ${ipo.companyName.padEnd(30)} | ₹${String(ipo.ipoPrice).padEnd(11)} | ₹${String(ipo.currentPrice).padEnd(11)} | ${arrow} ${color}${ipo.gain.toFixed(1)}%${' '.padEnd(7)} | ${ipo.listingDate}`);
    });
}

async function showDashboard() {
    console.clear();
    
    console.log('\n' + '='.repeat(100));
    console.log('🏪 NSE STOCKS & IPO UNIFIED TRACKER'.padStart(75));
    console.log('='.repeat(100));
    console.log(`Last Updated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n`);
    
    try {
        await Promise.all([
            showMarketOverview(),
            showTopStocks(),
            showIpoOpportunities(),
            showRecentlyListed(),
            showInvestmentGuide(),
            showPortfolioStrategy()
        ]);
        
        console.log('\n' + '='.repeat(100));
        console.log('✅ Tracker Complete'.padStart(95));
        console.log('='.repeat(100));
        console.log('\n💡 Tips:');
        console.log('  • Monitor IPO calendar for upcoming opportunities');
        console.log('  • Compare IPO sectors with your existing portfolio');
        console.log('  • Check stock performance before bidding for IPOs in related companies');
        console.log('  • Balance risk by diversifying across established stocks and IPOs\n');
        
    } catch (error) {
        console.error(`Error: ${error.message}`);
    }
}

// Run the dashboard
showDashboard();
