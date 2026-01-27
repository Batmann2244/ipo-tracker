/**
 * Advanced usage examples - concurrent requests and batch operations
 */

import { Nse } from '../src/index.js';

async function main() {
    console.log('🚀 NSETools JavaScript - Advanced Usage Examples\n');

    const nse = new Nse();

    try {
        // Example 1: Fetch multiple stock quotes concurrently
        console.log('⚡ Example 1: Fetch Multiple Stocks Concurrently');
        console.log('─'.repeat(60));
        
        const symbols = ['INFY', 'TCS', 'RELIANCE', 'WIPRO', 'HDFCBANK'];
        const startTime = Date.now();
        
        // Fetch all quotes in parallel
        const quotes = await Promise.all(
            symbols.map(symbol => nse.getQuote(symbol))
        );
        
        const endTime = Date.now();
        
        quotes.forEach((quote, index) => {
            const change = quote.pChange >= 0 ? '+' : '';
            console.log(`${symbols[index]}: ₹${quote.lastPrice} (${change}${quote.pChange}%)`);
        });
        
        console.log(`\n⏱️  Fetched ${symbols.length} stocks in ${endTime - startTime}ms\n`);

        // Example 2: Create a portfolio tracker
        console.log('💼 Example 2: Portfolio Tracker');
        console.log('─'.repeat(60));
        
        const portfolio = [
            { symbol: 'INFY', quantity: 100 },
            { symbol: 'TCS', quantity: 50 },
            { symbol: 'RELIANCE', quantity: 75 }
        ];

        const portfolioQuotes = await Promise.all(
            portfolio.map(async (holding) => {
                const quote = await nse.getQuote(holding.symbol);
                return {
                    ...holding,
                    currentPrice: quote.lastPrice,
                    change: quote.change,
                    pChange: quote.pChange,
                    value: quote.lastPrice * holding.quantity
                };
            })
        );

        let totalValue = 0;
        portfolioQuotes.forEach(holding => {
            totalValue += holding.value;
            console.log(
                `${holding.symbol}: ${holding.quantity} shares @ ₹${holding.currentPrice} = ₹${holding.value.toFixed(2)}`
            );
        });
        
        console.log(`\n💰 Total Portfolio Value: ₹${totalValue.toFixed(2)}\n`);

        // Example 3: Market snapshot
        console.log('📸 Example 3: Market Snapshot');
        console.log('─'.repeat(60));
        
        const [nifty, bankNifty, niftyIT] = await Promise.all([
            nse.getIndexQuote('NIFTY 50'),
            nse.getIndexQuote('NIFTY BANK'),
            nse.getIndexQuote('NIFTY IT')
        ]);

        const formatIndex = (index) => {
            const arrow = index.percentChange >= 0 ? '📈' : '📉';
            const sign = index.percentChange >= 0 ? '+' : '';
            return `${arrow} ${index.index}: ${index.last} (${sign}${index.percentChange}%)`;
        };

        console.log(formatIndex(nifty));
        console.log(formatIndex(bankNifty));
        console.log(formatIndex(niftyIT));
        console.log();

        // Example 4: Market movers dashboard
        console.log('🎯 Example 4: Market Movers Dashboard');
        console.log('─'.repeat(60));
        
        const [topGainers, topLosers] = await Promise.all([
            nse.getTopGainers('NIFTY'),
            nse.getTopLosers('NIFTY')
        ]);

        console.log('Top 3 Gainers:');
        topGainers.slice(0, 3).forEach((stock, i) => {
            console.log(`  ${i + 1}. ${stock.symbol}: ${stock.ltp} (+${stock.pChange?.toFixed(2)}%)`);
        });

        console.log('\nTop 3 Losers:');
        topLosers.slice(0, 3).forEach((stock, i) => {
            console.log(`  ${i + 1}. ${stock.symbol}: ${stock.ltp} (${stock.pChange?.toFixed(2)}%)`);
        });
        console.log();

        // Example 5: Sector analysis
        console.log('🏢 Example 5: Sector Analysis');
        console.log('─'.repeat(60));
        
        const sectors = ['NIFTY IT', 'NIFTY BANK', 'NIFTY AUTO', 'NIFTY PHARMA'];
        const sectorData = await Promise.all(
            sectors.map(async sector => {
                try {
                    const quote = await nse.getIndexQuote(sector);
                    return {
                        name: sector,
                        change: quote.percentChange,
                        value: quote.last
                    };
                } catch (error) {
                    return { name: sector, change: 0, value: 0 };
                }
            })
        );

        // Sort by performance
        sectorData.sort((a, b) => b.change - a.change);
        
        sectorData.forEach(sector => {
            const arrow = sector.change >= 0 ? '🟢' : '🔴';
            const sign = sector.change >= 0 ? '+' : '';
            console.log(`${arrow} ${sector.name}: ${sign}${sector.change.toFixed(2)}%`);
        });
        console.log();

        // Example 6: Batch stock validation
        console.log('✅ Example 6: Batch Stock Validation');
        console.log('─'.repeat(60));
        
        const symbolsToCheck = ['INFY', 'TCS', 'INVALID123', 'RELIANCE', 'FAKE'];
        const validationResults = await Promise.all(
            symbolsToCheck.map(async symbol => ({
                symbol,
                valid: await nse.isValidCode(symbol)
            }))
        );

        validationResults.forEach(result => {
            const status = result.valid ? '✓' : '✗';
            console.log(`  ${status} ${result.symbol}`);
        });
        console.log();

        // Example 7: Compare multiple stocks
        console.log('⚖️  Example 7: Stock Comparison');
        console.log('─'.repeat(60));
        
        const compareSymbols = ['TCS', 'INFY', 'WIPRO', 'TECHM'];
        const compareQuotes = await Promise.all(
            compareSymbols.map(symbol => nse.getQuote(symbol))
        );

        console.log('Symbol    | Price    | Change  | VWAP    | Volume');
        console.log('─'.repeat(60));
        
        compareQuotes.forEach((quote, i) => {
            const change = quote.pChange >= 0 ? `+${quote.pChange?.toFixed(2)}%` : `${quote.pChange?.toFixed(2)}%`;
            console.log(
                `${compareSymbols[i].padEnd(9)} | ₹${String(quote.lastPrice).padEnd(7)} | ${change.padEnd(7)} | ₹${String(quote.vwap).padEnd(6)} | ${quote.totalTradedVolume || 'N/A'}`
            );
        });
        console.log();

        console.log('✅ All advanced examples completed successfully!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Run examples
main();
