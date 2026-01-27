/**
 * Real-time Market Dashboard - JavaScript Version
 * Updates continuously with live NSE data
 * Press Ctrl+C to stop
 */

import { Nse } from './src/index.js';

const nse = new Nse();

// Define portfolio
const portfolio = [
    { symbol: 'INFY', quantity: 10, buyPrice: 1500 },
    { symbol: 'TCS', quantity: 5, buyPrice: 3800 },
    { symbol: 'RELIANCE', quantity: 8, buyPrice: 2800 },
    { symbol: 'HDFCBANK', quantity: 15, buyPrice: 1700 }
];

// Define stocks to track
const watchSymbols = ['INFY', 'TCS', 'RELIANCE', 'WIPRO', 'HDFCBANK', 'BAJAJFINSV', 'MARUTI', 'ICICIBANK'];

// Refresh interval (seconds)
const refreshInterval = 10;

function clearScreen() {
    console.clear();
}

function printHeader() {
    console.log('='.repeat(120));
    console.log('🏪 NSE REAL-TIME MARKET DASHBOARD 📊'.padStart(80));
    console.log('='.repeat(120));
    console.log(`Last Updated: ${new Date().toISOString().slice(0, 19).replace('T', ' ')}`);
    console.log('='.repeat(120));
}

function formatChange(change, pchange) {
    if (change >= 0) {
        return `📈 +${change.toFixed(2)} (+${pchange.toFixed(2)}%)`;
    } else {
        return `📉 ${change.toFixed(2)} (${pchange.toFixed(2)}%)`;
    }
}

async function showIndicesSummary() {
    console.log('\n📈 MAJOR INDICES');
    console.log('-'.repeat(120));
    
    const indices = ['NIFTY 50', 'NIFTY BANK', 'NIFTY IT', 'NIFTY AUTO', 'NIFTY PHARMA'];
    
    for (const indexName of indices) {
        try {
            const quote = await nse.getIndexQuote(indexName);
            const changeStr = formatChange(quote.variation || 0, quote.percentChange || 0);
            console.log(`  ${indexName.padEnd(20)} | Last: ${String(quote.last).padEnd(10)} | ${changeStr.padEnd(40)} | Open: ${String(quote.open).padEnd(10)}`);
        } catch (error) {
            console.log(`  ${indexName.padEnd(20)} | Error: ${error.message.slice(0, 50)}`);
        }
    }
}

async function showTopMovers() {
    console.log('\n🎯 TOP MARKET MOVERS');
    console.log('-'.repeat(120));
    
    try {
        const [gainers, losers] = await Promise.all([
            nse.getTopGainers('NIFTY'),
            nse.getTopLosers('NIFTY')
        ]);
        
        console.log('\n  TOP 5 GAINERS:');
        gainers.slice(0, 5).forEach((s, i) => {
            const pchange = s.pChange || 0;
            console.log(`    ${i + 1}. ${s.symbol?.padEnd(12)} | LTP: ${String(s.ltp || 'N/A').padEnd(10)} | Change: +${pchange.toFixed(2)}%`);
        });
        
        console.log('\n  TOP 5 LOSERS:');
        losers.slice(0, 5).forEach((s, i) => {
            const pchange = s.pChange || 0;
            console.log(`    ${i + 1}. ${s.symbol?.padEnd(12)} | LTP: ${String(s.ltp || 'N/A').padEnd(10)} | Change: ${pchange.toFixed(2)}%`);
        });
    } catch (error) {
        console.log(`  Error fetching movers: ${error.message}`);
    }
}

async function showPortfolioTracker() {
    console.log('\n💼 PORTFOLIO TRACKER');
    console.log('-'.repeat(120));
    
    let totalValue = 0;
    let totalInvested = 0;
    
    console.log(`${'Symbol'.padEnd(12)} | ${'Qty'.padEnd(6)} | ${'Buy Price'.padEnd(12)} | ${'Current'.padEnd(12)} | ${'Value'.padEnd(15)} | ${'Gain/Loss'.padEnd(15)} | ${'Return'.padEnd(10)}`);
    console.log('-'.repeat(120));
    
    for (const holding of portfolio) {
        try {
            const quote = await nse.getQuote(holding.symbol);
            const currentPrice = quote.lastPrice;
            const buyPrice = holding.buyPrice;
            const quantity = holding.quantity;
            
            const invested = buyPrice * quantity;
            const currentVal = currentPrice * quantity;
            const gainLoss = currentVal - invested;
            const returnPct = (gainLoss / invested * 100);
            
            totalValue += currentVal;
            totalInvested += invested;
            
            const arrow = gainLoss >= 0 ? '📈' : '📉';
            const sign = gainLoss >= 0 ? '+' : '';
            
            console.log(`${holding.symbol.padEnd(12)} | ${String(quantity).padEnd(6)} | ₹${String(buyPrice.toFixed(2)).padEnd(11)} | ₹${String(currentPrice.toFixed(2)).padEnd(11)} | ₹${String(currentVal.toFixed(2)).padEnd(14)} | ${arrow} ${sign}₹${String(gainLoss.toFixed(2)).padEnd(12)} | ${sign}${returnPct.toFixed(2)}%`);
        } catch (error) {
            console.log(`${holding.symbol.padEnd(12)} | Error: ${error.message.slice(0, 40)}`);
        }
    }
    
    console.log('-'.repeat(120));
    const totalGainLoss = totalValue - totalInvested;
    const totalReturn = (totalGainLoss / totalInvested * 100);
    const arrow = totalGainLoss >= 0 ? '📈' : '📉';
    const sign = totalGainLoss >= 0 ? '+' : '';
    
    console.log(`${'TOTAL'.padEnd(12)} | ${String(portfolio.reduce((sum, h) => sum + h.quantity, 0)).padEnd(6)} | ${''.padEnd(12)} | ${''.padEnd(12)} | ₹${String(totalValue.toFixed(2)).padEnd(14)} | ${arrow} ${sign}₹${String(totalGainLoss.toFixed(2)).padEnd(12)} | ${sign}${totalReturn.toFixed(2)}%`);
}

async function showMarketBreadth() {
    console.log('\n📊 MARKET BREADTH (NIFTY 50)');
    console.log('-'.repeat(120));
    
    try {
        const advdec = await nse.getAdvancesDeclines('NIFTY 50');
        const advances = advdec.advances || 0;
        const declines = advdec.declines || 0;
        const total = advances + declines;
        
        if (total > 0) {
            const breadthPct = (advances / total * 100);
            
            // Draw bar chart
            const barLength = 50;
            const filled = Math.round(barLength * breadthPct / 100);
            const bar = '🟢'.repeat(filled) + '🔴'.repeat(barLength - filled);
            
            console.log(`  Advancing: ${String(advances).padEnd(3)} stocks ${bar} Declining: ${String(declines).padEnd(3)} stocks`);
            const sentiment = breadthPct > 50 ? 'BULLISH 📈' : 'BEARISH 📉';
            console.log(`  Breadth: ${breadthPct.toFixed(1)}% ${sentiment}`);
        }
    } catch (error) {
        console.log(`  Error: ${error.message}`);
    }
}

async function showIndividualStocks() {
    console.log('\n📈 STOCK QUOTES');
    console.log('-'.repeat(120));
    
    console.log(`${'Symbol'.padEnd(12)} | ${'Price'.padEnd(12)} | ${'Change'.padEnd(12)} | ${'Open'.padEnd(12)} | ${'High'.padEnd(12)} | ${'Low'.padEnd(12)}`);
    console.log('-'.repeat(120));
    
    for (const symbol of watchSymbols) {
        try {
            const quote = await nse.getQuote(symbol);
            const change = quote.change || 0;
            const pchange = quote.pChange || 0;
            const arrow = change >= 0 ? '📈' : '📉';
            const sign = change >= 0 ? '+' : '';
            
            const price = quote.lastPrice || 'N/A';
            const openPrice = quote.open || 'N/A';
            const high = quote.intraDayHighLow?.max || 'N/A';
            const low = quote.intraDayHighLow?.min || 'N/A';
            
            console.log(`${symbol.padEnd(12)} | ₹${String(price).padEnd(10)} | ${arrow} ${sign}${pchange.toFixed(2)}% | ₹${String(openPrice).padEnd(10)} | ₹${String(high).padEnd(10)} | ₹${String(low).padEnd(10)}`);
        } catch (error) {
            console.log(`${symbol.padEnd(12)} | Error: ${error.message.slice(0, 50)}`);
        }
    }
}

async function show52WeekData() {
    console.log('\n🚀 52-WEEK HIGHS & LOWS');
    console.log('-'.repeat(120));
    
    try {
        const [highs, lows] = await Promise.all([
            nse.get52WeekHigh(),
            nse.get52WeekLow()
        ]);
        
        console.log('  Top at 52-Week HIGH:');
        highs.slice(0, 3).forEach((stock, i) => {
            console.log(`    ${i + 1}. ${stock.symbol?.padEnd(12)} | Price: ₹${String(stock.ltp || 'N/A').padEnd(10)} | New High: ₹${String(stock.new52WHL || 'N/A').padEnd(10)}`);
        });
        
        console.log('\n  Bottom at 52-Week LOW:');
        lows.slice(0, 3).forEach((stock, i) => {
            console.log(`    ${i + 1}. ${stock.symbol?.padEnd(12)} | Price: ₹${String(stock.ltp || 'N/A').padEnd(10)} | New Low: ₹${String(stock.new52WHL || 'N/A').padEnd(10)}`);
        });
    } catch (error) {
        console.log(`  Error: ${error.message}`);
    }
}

async function showIpoData() {
    console.log('\n🔥 IPO UPDATES');
    console.log('-'.repeat(120));
    
    // Sample IPO data - in production this would come from NSE
    const activeIpos = [
        {
            symbol: 'INFRATECH',
            companyName: 'Infra Tech Solutions',
            sector: 'Infrastructure',
            priceMin: 250,
            priceMax: 300,
            biddingEndDate: '29-Jan-2026',
            status: 'open'
        },
        {
            symbol: 'GREENPOWER',
            companyName: 'Green Power Energy',
            sector: 'Energy',
            priceMin: 65,
            priceMax: 78,
            biddingStartDate: '01-Feb-2026',
            status: 'upcoming'
        }
    ];
    
    const recentlyListed = [
        {
            symbol: 'BANKINGPARTNERS',
            companyName: 'Banking Partners',
            listingDate: '20-Jan-2026',
            subscriptionLevel: 156.5
        },
        {
            symbol: 'ONEDIGITAL',
            companyName: 'One Digital',
            listingDate: '15-Jan-2026',
            subscriptionLevel: 89.2
        }
    ];
    
    console.log('\n  OPEN FOR BIDDING:');
    activeIpos.filter(i => i.status === 'open').forEach((ipo, i) => {
        const priceRange = `₹${ipo.priceMin}-${ipo.priceMax}`;
        console.log(`    ${i + 1}. ${ipo.companyName} (${ipo.symbol})`);
        console.log(`       Sector: ${ipo.sector} | Price Band: ${priceRange} | Closes: ${ipo.biddingEndDate}`);
    });
    
    console.log('\n  RECENTLY LISTED (Last 30 Days):');
    recentlyListed.forEach((ipo, i) => {
        const subStatus = ipo.subscriptionLevel > 100 ? '🔥 Over' : '✅';
        console.log(`    ${i + 1}. ${ipo.companyName} (${ipo.symbol}) - Listed: ${ipo.listingDate} | ${subStatus}subscribed ${ipo.subscriptionLevel}x`);
    });
}

async function runDashboard() {
    let iteration = 0;
    
    try {
        while (true) {
            clearScreen();
            printHeader();
            
            // Run all data fetches in parallel for speed
            await Promise.all([
                showIndicesSummary(),
                showMarketBreadth(),
                showTopMovers(),
                showIndividualStocks(),
                showPortfolioTracker(),
                show52WeekData(),
                showIpoData()
            ]);
            
            // Footer
            console.log('\n' + '='.repeat(120));
            iteration++;
            console.log(`✅ Dashboard refresh #${iteration} | Next update in ${refreshInterval}s | Press Ctrl+C to stop`.padStart(90));
            console.log('='.repeat(120));
            
            // Wait before next refresh
            await new Promise(resolve => setTimeout(resolve, refreshInterval * 1000));
        }
    } catch (error) {
        if (error.code !== 'ERR_MODULE_NOT_FOUND') {
            console.error(`\n❌ Error: ${error.message}`);
            console.error(error.stack);
        }
    }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
    console.log('\n\n✋ Dashboard stopped by user');
    console.log('Goodbye! 👋');
    process.exit(0);
});

// Start the dashboard
console.log('Starting Real-time Dashboard...');
runDashboard();
