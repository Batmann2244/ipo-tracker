/**
 * Basic usage examples for NSETools JavaScript
 */

import { Nse } from '../src/index.js';

async function main() {
    console.log('🚀 NSETools JavaScript - Basic Usage Examples\n');

    // Initialize NSE client
    const nse = new Nse();

    try {
        // Example 1: Get stock quote
        console.log('📊 Example 1: Get Stock Quote for INFY');
        console.log('─'.repeat(50));
        const quote = await nse.getQuote('INFY');
        console.log(`Symbol: INFY`);
        console.log(`Last Price: ₹${quote.lastPrice}`);
        console.log(`Change: ${quote.change} (${quote.pChange}%)`);
        console.log(`Open: ₹${quote.open}`);
        console.log(`High: ₹${quote.intraDayHighLow?.max}`);
        console.log(`Low: ₹${quote.intraDayHighLow?.min}`);
        console.log(`Previous Close: ₹${quote.previousClose}`);
        console.log(`VWAP: ₹${quote.vwap}\n`);

        // Example 2: Get index quote
        console.log('📈 Example 2: Get NIFTY 50 Index Quote');
        console.log('─'.repeat(50));
        const niftyQuote = await nse.getIndexQuote('NIFTY 50');
        console.log(`Index: ${niftyQuote.index}`);
        console.log(`Last: ${niftyQuote.last}`);
        console.log(`Change: ${niftyQuote.variation} (${niftyQuote.percentChange}%)`);
        console.log(`Open: ${niftyQuote.open}`);
        console.log(`High: ${niftyQuote.high}`);
        console.log(`Low: ${niftyQuote.low}`);
        console.log(`Advances: ${niftyQuote.advances}, Declines: ${niftyQuote.declines}\n`);

        // Example 3: Get top gainers
        console.log('🎯 Example 3: Top 5 Gainers');
        console.log('─'.repeat(50));
        const gainers = await nse.getTopGainers('NIFTY');
        gainers.slice(0, 5).forEach((stock, index) => {
            console.log(`${index + 1}. ${stock.symbol}: ${stock.pChange?.toFixed(2)}%`);
        });
        console.log();

        // Example 4: Get top losers
        console.log('📉 Example 4: Top 5 Losers');
        console.log('─'.repeat(50));
        const losers = await nse.getTopLosers('NIFTY');
        losers.slice(0, 5).forEach((stock, index) => {
            console.log(`${index + 1}. ${stock.symbol}: ${stock.pChange?.toFixed(2)}%`);
        });
        console.log();

        // Example 5: Get stock codes
        console.log('📋 Example 5: Total Stock Codes');
        console.log('─'.repeat(50));
        const stockCodes = await nse.getStockCodes();
        console.log(`Total stocks listed on NSE: ${stockCodes.length}`);
        console.log(`First 10 stocks: ${stockCodes.slice(0, 10).join(', ')}\n`);

        // Example 6: Validate stock code
        console.log('✅ Example 6: Validate Stock Codes');
        console.log('─'.repeat(50));
        const isValidINFY = await nse.isValidCode('INFY');
        const isValidINVALID = await nse.isValidCode('INVALID123');
        console.log(`INFY is valid: ${isValidINFY}`);
        console.log(`INVALID123 is valid: ${isValidINVALID}\n`);

        // Example 7: Get all index list
        console.log('📊 Example 7: Available Indices');
        console.log('─'.repeat(50));
        const indices = await nse.getIndexList();
        console.log(`Total indices: ${indices.length}`);
        console.log(`Major indices: ${indices.slice(0, 10).join(', ')}\n`);

        // Example 8: Get stocks in index
        console.log('🎯 Example 8: Stocks in NIFTY 50');
        console.log('─'.repeat(50));
        const niftyStocks = await nse.getStocksInIndex('NIFTY 50');
        console.log(`Stocks in NIFTY 50: ${niftyStocks.length}`);
        console.log(`First 10: ${niftyStocks.slice(0, 10).join(', ')}\n`);

        // Example 9: Get 52-week high stocks
        console.log('🚀 Example 9: Stocks at 52-Week High (Top 5)');
        console.log('─'.repeat(50));
        const weekHigh = await nse.get52WeekHigh();
        weekHigh.slice(0, 5).forEach((stock, index) => {
            console.log(`${index + 1}. ${stock.symbol}: ₹${stock.ltp} (New High: ₹${stock.new52WHL})`);
        });
        console.log();

        // Example 10: Get advances/declines
        console.log('📊 Example 10: Advances vs Declines');
        console.log('─'.repeat(50));
        const advDec = await nse.getAdvancesDeclines('NIFTY 50');
        console.log(`Advancing stocks: ${advDec.advances}`);
        console.log(`Declining stocks: ${advDec.declines}`);
        const ratio = (advDec.advances / (advDec.advances + advDec.declines) * 100).toFixed(1);
        console.log(`Market breadth: ${ratio}% positive\n`);

        console.log('✅ All examples completed successfully!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.stack) {
            console.error('Stack trace:', error.stack);
        }
    }
}

// Run examples
main();
