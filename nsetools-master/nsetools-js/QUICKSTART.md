# NSETools JavaScript - Quick Start Guide

## Installation & Setup (5 Minutes)

### Step 1: Install Node.js
Make sure you have Node.js 16+ installed:
```bash
node --version  # Should be 16.0.0 or higher
```

### Step 2: Install Dependencies
```bash
cd nsetools-js
npm install
```

This installs:
- `axios` - HTTP requests
- `csv-parse` - CSV parsing
- `dayjs` - Date handling

### Step 3: Run Examples
```bash
# Basic usage examples
npm run example

# Or run directly
node examples/basic-usage.js
node examples/advanced-usage.js
```

---

## Your First Program (30 Seconds)

Create `test.js`:

```javascript
import { Nse } from './src/index.js';

const nse = new Nse();

// Get stock quote
const quote = await nse.getQuote('INFY');
console.log(`Infosys: ₹${quote.lastPrice} (${quote.pChange}%)`);

// Get index
const nifty = await nse.getIndexQuote('NIFTY 50');
console.log(`Nifty 50: ${nifty.last} (${nifty.percentChange}%)`);
```

Run it:
```bash
node test.js
```

---

## Common Use Cases

### 1. Track Your Portfolio

```javascript
import { Nse } from './src/index.js';

const nse = new Nse();

const portfolio = [
    { symbol: 'INFY', quantity: 100, buyPrice: 1400 },
    { symbol: 'TCS', quantity: 50, buyPrice: 3500 },
    { symbol: 'RELIANCE', quantity: 75, buyPrice: 2400 }
];

// Fetch all quotes concurrently
const positions = await Promise.all(
    portfolio.map(async (holding) => {
        const quote = await nse.getQuote(holding.symbol);
        const invested = holding.buyPrice * holding.quantity;
        const current = quote.lastPrice * holding.quantity;
        const profit = current - invested;
        
        return {
            symbol: holding.symbol,
            currentValue: current,
            invested: invested,
            profit: profit,
            profitPercent: (profit / invested * 100).toFixed(2)
        };
    })
);

console.log('Portfolio Summary:');
positions.forEach(p => {
    const sign = p.profit >= 0 ? '+' : '';
    console.log(
        `${p.symbol}: ₹${p.currentValue.toFixed(2)} (${sign}${p.profitPercent}%)`
    );
});

const totalCurrent = positions.reduce((sum, p) => sum + p.currentValue, 0);
const totalInvested = positions.reduce((sum, p) => sum + p.invested, 0);
const totalProfit = totalCurrent - totalInvested;

console.log(`\nTotal Portfolio: ₹${totalCurrent.toFixed(2)}`);
console.log(`Total Profit: ₹${totalProfit.toFixed(2)}`);
```

### 2. Market Dashboard

```javascript
const nse = new Nse();

async function showMarketDashboard() {
    // Fetch everything in parallel
    const [nifty, bankNifty, gainers, losers] = await Promise.all([
        nse.getIndexQuote('NIFTY 50'),
        nse.getIndexQuote('NIFTY BANK'),
        nse.getTopGainers('NIFTY'),
        nse.getTopLosers('NIFTY')
    ]);

    console.log('📊 Market Dashboard');
    console.log('─'.repeat(50));
    console.log(`NIFTY 50: ${nifty.last} (${nifty.percentChange}%)`);
    console.log(`NIFTY BANK: ${bankNifty.last} (${bankNifty.percentChange}%)`);
    
    console.log('\nTop 3 Gainers:');
    gainers.slice(0, 3).forEach((s, i) => {
        console.log(`${i + 1}. ${s.symbol}: +${s.pChange?.toFixed(2)}%`);
    });
    
    console.log('\nTop 3 Losers:');
    losers.slice(0, 3).forEach((s, i) => {
        console.log(`${i + 1}. ${s.symbol}: ${s.pChange?.toFixed(2)}%`);
    });
}

showMarketDashboard();
```

### 3. Stock Screener

```javascript
const nse = new Nse();

async function findStocksAboveVWAP() {
    const symbols = ['INFY', 'TCS', 'WIPRO', 'TECHM', 'HCLTECH'];
    
    const quotes = await Promise.all(
        symbols.map(symbol => nse.getQuote(symbol))
    );

    const aboveVWAP = quotes.filter(q => q.lastPrice > q.vwap);

    console.log('Stocks trading above VWAP:');
    aboveVWAP.forEach(q => {
        console.log(`${q.symbol}: ₹${q.lastPrice} (VWAP: ₹${q.vwap})`);
    });
}

findStocksAboveVWAP();
```

### 4. Alert System

```javascript
const nse = new Nse();

async function checkPriceAlerts() {
    const alerts = [
        { symbol: 'INFY', targetPrice: 1450, type: 'above' },
        { symbol: 'TCS', targetPrice: 3400, type: 'below' }
    ];

    const quotes = await Promise.all(
        alerts.map(alert => 
            nse.getQuote(alert.symbol).then(quote => ({ ...alert, quote }))
        )
    );

    quotes.forEach(({ symbol, targetPrice, type, quote }) => {
        const triggered = type === 'above' 
            ? quote.lastPrice > targetPrice
            : quote.lastPrice < targetPrice;

        if (triggered) {
            console.log(`🚨 ALERT: ${symbol} is ${type} ₹${targetPrice}`);
            console.log(`   Current price: ₹${quote.lastPrice}`);
        }
    });
}

// Check every 5 minutes
setInterval(checkPriceAlerts, 5 * 60 * 1000);
checkPriceAlerts(); // Initial check
```

### 5. Watchlist

```javascript
const nse = new Nse();

async function watchlist() {
    const symbols = ['INFY', 'TCS', 'RELIANCE', 'HDFCBANK'];

    console.clear();
    console.log('📈 Watchlist - Real-time Updates\n');
    console.log('Symbol    | Price    | Change  | High    | Low');
    console.log('─'.repeat(60));

    const quotes = await Promise.all(
        symbols.map(symbol => nse.getQuote(symbol))
    );

    quotes.forEach(q => {
        const change = q.pChange >= 0 ? `+${q.pChange.toFixed(2)}%` : `${q.pChange.toFixed(2)}%`;
        const color = q.pChange >= 0 ? '\x1b[32m' : '\x1b[31m'; // Green/Red
        const reset = '\x1b[0m';
        
        console.log(
            `${q.symbol?.padEnd(9)} | ₹${String(q.lastPrice).padEnd(7)} | ${color}${change.padEnd(7)}${reset} | ₹${q.intraDayHighLow?.max || 'N/A'} | ₹${q.intraDayHighLow?.min || 'N/A'}`
        );
    });

    console.log('\nLast updated:', new Date().toLocaleTimeString());
}

// Update every 10 seconds
setInterval(watchlist, 10000);
watchlist(); // Initial display
```

---

## Integrating with Your Dashboard

If you have an existing React/Vue/HTML dashboard:

### Option 1: REST API Wrapper

Create `api-wrapper.js`:

```javascript
import express from 'express';
import cors from 'cors';
import { Nse } from './src/index.js';

const app = express();
const nse = new Nse();

app.use(cors());

app.get('/api/quote/:symbol', async (req, res) => {
    try {
        const quote = await nse.getQuote(req.params.symbol);
        res.json({ success: true, data: quote });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/index/:name', async (req, res) => {
    try {
        const quote = await nse.getIndexQuote(req.params.name);
        res.json({ success: true, data: quote });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(3000, () => {
    console.log('NSE API running on http://localhost:3000');
});
```

Then from your dashboard:
```javascript
// Fetch from your dashboard
const response = await fetch('http://localhost:3000/api/quote/INFY');
const data = await response.json();
console.log(data.data.lastPrice);
```

### Option 2: Direct Import (if your dashboard uses Node.js)

```javascript
import { Nse } from './nsetools-js/src/index.js';

const nse = new Nse();
const quote = await nse.getQuote('INFY');
// Use in your dashboard
```

---

## Tips & Tricks

### 1. Error Handling
```javascript
try {
    const quote = await nse.getQuote('INVALID');
} catch (error) {
    console.error('Error:', error.message);
    // Handle gracefully
}
```

### 2. Concurrent Requests (Faster!)
```javascript
// ❌ Slow (sequential) - 3 seconds
const infy = await nse.getQuote('INFY');
const tcs = await nse.getQuote('TCS');
const reliance = await nse.getQuote('RELIANCE');

// ✅ Fast (parallel) - 1 second
const [infy, tcs, reliance] = await Promise.all([
    nse.getQuote('INFY'),
    nse.getQuote('TCS'),
    nse.getQuote('RELIANCE')
]);
```

### 3. Caching is Automatic
Responses are cached for 60 seconds. No need to implement your own caching!

### 4. Session Management is Automatic
Sessions refresh every 2 minutes automatically. Just use the API!

---

## Troubleshooting

### "Cannot find module" error
Make sure you're using ES6 imports and have `"type": "module"` in package.json (already included).

### "Rate limit" or "403 Forbidden"
NSE may block too many requests. Add delays between calls:
```javascript
await new Promise(r => setTimeout(r, 1000)); // Wait 1 second
```

### Market is closed
Outside trading hours (9:15 AM - 3:30 PM IST), you'll get last closing prices.

---

## Next Steps

1. ✅ Run the examples: `npm run example`
2. ✅ Try the use cases above
3. ✅ Integrate with your dashboard
4. ✅ Build your own features!

Need help? All the code is in `src/` and heavily commented. Just read through the files!

Happy coding! 🚀
