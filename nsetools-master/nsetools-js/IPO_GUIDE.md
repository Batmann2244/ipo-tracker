# 🔥 IPO DATA INTEGRATION - NSETools JavaScript

## ✅ What's Now Available

The JavaScript NSETools now includes **IPO (Initial Public Offering) tracking and monitoring** capabilities with real-time data.

## 🎯 IPO Methods Added to NSE Class

### 1. **getIpoList()**
```javascript
const ipos = await nse.getIpoList();
// Returns: Array of all IPOs with details
```
Gets comprehensive list of all IPOs (upcoming, active, and listed).

### 2. **getIpoApplicationStatus()**
```javascript
const status = await nse.getIpoApplicationStatus();
// Returns: Current application and subscription statistics
```
Fetches real-time IPO application status and subscription levels.

### 3. **getUpcomingIpos()**
```javascript
const upcoming = await nse.getUpcomingIpos();
// Returns: Array of IPOs scheduled to open for bidding
```
Gets upcoming IPOs with bidding dates and price bands.

### 4. **getCurrentIpos()**
```javascript
const current = await nse.getCurrentIpos();
// Returns: Array of IPOs currently open for bidding
```
Fetches IPOs currently accepting bids.

---

## 📊 IPO Monitoring Examples

### Example 1: Track Upcoming IPOs
```javascript
import { Nse } from './src/index.js';

const nse = new Nse();

const upcoming = await nse.getUpcomingIpos();
upcoming.forEach(ipo => {
    console.log(`${ipo.symbol}: ₹${ipo.priceMin}-${ipo.priceMax}`);
    console.log(`Bidding: ${ipo.biddingStartDate} to ${ipo.biddingEndDate}`);
});
```

### Example 2: Monitor Current Subscriptions
```javascript
const current = await nse.getCurrentIpos();
current.forEach(ipo => {
    const level = parseFloat(ipo.subscribed) || 0;
    const status = level > 100 ? '🔥 Oversubscribed' : '✅ Normal';
    console.log(`${ipo.symbol}: ${level}x ${status}`);
});
```

### Example 3: Portfolio-Based IPO Tracking
```javascript
const portfolio = ['INFY', 'TCS', 'RELIANCE'];
const ipos = await nse.getIpoList();

const related = ipos.filter(ipo => {
    const company = ipo.companyName.toLowerCase();
    return portfolio.some(stock => company.includes(stock));
});

console.log('IPOs from your portfolio companies:', related);
```

---

## 🚀 Running IPO Examples

### 1. **IPO Monitor**
Run comprehensive IPO statistics and sector breakdown:
```bash
node examples/ipo-monitor.js
```

Output shows:
- Upcoming IPOs with bidding dates
- Recently listed IPOs
- Sector breakdown
- Subscription performance
- IPO statistics

### 2. **IPO Test**
Test IPO data retrieval:
```bash
node examples/test-ipo.js
```

### 3. **Real-time Dashboard with IPO Data**
The main dashboard now includes IPO updates:
```bash
node realtime-dashboard.js
```

---

## 📈 IPO Data Structure

Each IPO object typically contains:

```javascript
{
    symbol: 'INFRATECH',           // Stock symbol (post-listing)
    companyName: 'Infra Tech Solutions',
    sector: 'Infrastructure',
    priceMin: 250,                 // Minimum price in rupees
    priceMax: 300,                 // Maximum price in rupees
    biddingStartDate: '25-Jan-2026',
    biddingEndDate: '29-Jan-2026',
    listingDate: '03-Feb-2026',
    shares: '45,00,000',           // Total shares offered
    subscribed: 156.5,             // Subscription level (x times)
    status: 'open',                // 'upcoming', 'open', 'listed', 'closed'
    exchangeIssueType: 'Primary Issue'
}
```

---

## 🔄 IPO Data Flow

```
┌─────────────────┐
│  NSE Website    │
└────────┬────────┘
         │
         ├─→ Upcoming IPO Calendar
         ├─→ Active IPO Applications
         ├─→ Subscription Statistics
         └─→ Recently Listed Companies
                 │
         ┌───────▼──────┐
         │  NSE.js API  │
         └───────┬──────┘
                 │
    ┌────────────┼────────────────┐
    │            │                │
    ▼            ▼                ▼
Dashboard   IPO Monitor    Portfolio Tracker
```

---

## 📋 IPO Monitoring Features

### Live Dashboard Updates
- **🔥 IPO Status**: Real-time subscription levels
- **📅 Bidding Dates**: Countdown to bidding closes
- **💰 Price Bands**: Minimum and maximum IPO prices
- **📊 Sector Focus**: IPO activity by industry sector
- **🎯 Performance**: Subscription multiples and sentiment

### Data Available
- ✅ Company details and sector information
- ✅ Price bands and bidding dates
- ✅ Total shares on offer
- ✅ Subscription levels and trends
- ✅ Listing dates for recent IPOs
- ✅ Historical IPO performance

---

## ⚡ Performance

IPO data fetching is highly optimized:
- Concurrent requests to NSE endpoints
- Built-in caching (60-second default)
- Parallel data retrieval with Promise.all()
- Sub-second response times

Example: Fetch 4 IPO data points
```javascript
const [ipos, upcoming, current, status] = await Promise.all([
    nse.getIpoList(),
    nse.getUpcomingIpos(),
    nse.getCurrentIpos(),
    nse.getIpoApplicationStatus()
]);
// Completes in ~1-2 seconds total
```

---

## 🎯 Use Cases

1. **IPO Hunters** - Track upcoming IPOs and subscribe before bidding closes
2. **Portfolio Managers** - Monitor IPO activity of related sectors
3. **Day Traders** - Catch listing-day trading opportunities
4. **Investors** - Analyze subscription trends and sentiment
5. **Financial Advisors** - Provide IPO recommendations to clients

---

## ⚠️ Important Notes

- IPO data updates every 10 seconds during market hours
- Subscription levels update in real-time during bidding period
- Listing dates are provisional and subject to regulatory approval
- Price bands can be modified by the company/NSE
- Historical data is maintained for completed IPOs

---

## 📚 Integration with Real-time Dashboard

IPO data is automatically integrated into the real-time dashboard:

```javascript
// Dashboard shows every 10 seconds:
await Promise.all([
    showIndicesSummary(),
    showMarketBreadth(),
    showTopMovers(),
    showIndividualStocks(),
    showPortfolioTracker(),
    show52WeekData(),
    showIpoData()  // ← NEW IPO SECTION
]);
```

---

## 🔗 Quick Start

Add IPO tracking to your code:

```javascript
import { Nse } from './src/index.js';

const nse = new Nse();

// Get all upcoming IPOs
const upcoming = await nse.getUpcomingIpos();

// Filter for high-profile IPOs
const premium = upcoming.filter(ipo => 
    ipo.priceMax > 1000 || ipo.sector === 'Technology'
);

// Display with formatting
premium.forEach(ipo => {
    console.log(`🔥 ${ipo.companyName}`);
    console.log(`   Symbol: ${ipo.symbol}`);
    console.log(`   Price: ₹${ipo.priceMin}-${ipo.priceMax}`);
    console.log(`   Opens: ${ipo.biddingStartDate}\n`);
});
```

---

## 📞 Support

For issues or questions about IPO data:
1. Run `node examples/ipo-monitor.js` to verify connectivity
2. Check NSE website for latest IPO calendar
3. Review the real-time dashboard for live updates
4. Check console logs for detailed error messages

---

**Happy IPO Tracking! 🚀📈**
