# 🎉 NSETools - IPO Data Feature Complete

## 📊 What Was Added

Your NSETools JavaScript project now has **complete IPO (Initial Public Offering) data integration** with real-time tracking and monitoring capabilities.

---

## ✨ New IPO Features

### 🔥 4 New IPO Methods in NSE Class

```javascript
// 1. Get all IPOs (upcoming, active, listed, closed)
const allIpos = await nse.getIpoList();

// 2. Get currently active IPOs (bidding open NOW)
const activeIpos = await nse.getCurrentIpos();

// 3. Get upcoming IPOs (not yet open for bidding)
const upcomingIpos = await nse.getUpcomingIpos();

// 4. Get IPO application statistics
const stats = await nse.getIpoApplicationStatus();
```

### 📱 3 New IPO Tracking Scripts

| Script | Purpose | Command |
|--------|---------|---------|
| `examples/ipo-monitor.js` | Comprehensive IPO dashboard | `node examples/ipo-monitor.js` |
| `examples/combined-tracker.js` | Unified stocks + IPO tracker | `node examples/combined-tracker.js` |
| Enhanced `realtime-dashboard.js` | Live 10-sec updates with IPO section | `node realtime-dashboard.js` |

### 📚 Complete Documentation

| Document | Location | Content |
|----------|----------|---------|
| IPO_GUIDE.md | `/nsetools-js/IPO_GUIDE.md` | Full API reference & examples |
| QUICK_START_IPO.md | `/nsetools-js/QUICK_START_IPO.md` | Quick reference & common tasks |
| IPO_INTEGRATION_SUMMARY.md | `/IPO_INTEGRATION_SUMMARY.md` | Integration architecture overview |

---

## 🎯 Quick Examples

### Get Active IPOs
```javascript
import { Nse } from './src/index.js';
const nse = new Nse();

const active = await nse.getCurrentIpos();
active.forEach(ipo => {
    console.log(`🔥 ${ipo.companyName}: ₹${ipo.priceMin}-${ipo.priceMax}`);
    console.log(`   Subscribed: ${ipo.subscribed}x`);
    console.log(`   Closes: ${ipo.biddingEndDate}\n`);
});
```

### Find Tech Sector IPOs
```javascript
const allIpos = await nse.getIpoList();
const techIpos = allIpos.filter(i => 
    i.sector?.toLowerCase().includes('technology')
);
console.log(`Found ${techIpos.length} tech IPOs`);
```

### Monitor in Real-time
```javascript
setInterval(async () => {
    const active = await nse.getCurrentIpos();
    console.clear();
    console.log(`📊 Active IPOs: ${active.length}`);
    active.forEach(ipo => {
        console.log(`${ipo.symbol}: ${ipo.subscribed}x subscribed`);
    });
}, 10000);
```

---

## 📊 Data Available

Each IPO contains:
- **symbol**: Stock ticker (e.g., `INFRATECH`)
- **companyName**: Full company name
- **sector**: Industry sector (Technology, Infrastructure, etc.)
- **priceMin/priceMax**: IPO price band in rupees
- **biddingStartDate/biddingEndDate**: Bidding period
- **listingDate**: Expected stock listing date
- **shares**: Total shares offered
- **subscribed**: Oversubscription level (e.g., 156.5x)
- **status**: Current status (upcoming/open/listed/closed)

---

## 🚀 Running the IPO Trackers

### 1️⃣ IPO Monitor Dashboard
```bash
cd nsetools-js
node examples/ipo-monitor.js
```
Shows:
- Upcoming IPOs with bidding dates
- Recently listed IPOs with performance
- Sector breakdown
- Subscription performance metrics
- IPO statistics

### 2️⃣ Combined Stocks + IPO Tracker
```bash
node examples/combined-tracker.js
```
Shows:
- Market overview (NIFTY 50 status)
- Top gaining stocks
- Active IPO opportunities
- Recently listed IPO performance
- Investment strategy guide

### 3️⃣ Real-time Dashboard
```bash
node realtime-dashboard.js
```
Updates every 10 seconds with:
- Index performance
- Market breadth
- Top gainers/losers
- Stock quotes
- Portfolio tracker
- 52-week highs/lows
- **IPO Updates** ✨ (NEW!)

---

## 📂 File Structure

```
nsetools-js/
├── src/
│   ├── nse.js          (4 new IPO methods added)
│   ├── urls.js         (IPO endpoints added)
│   ├── session.js
│   ├── utils.js
│   ├── dateManager.js
│   ├── errors.js
│   └── index.js
├── examples/
│   ├── ipo-monitor.js           ✨ NEW
│   ├── ipo-tracker.js           ✨ NEW
│   ├── combined-tracker.js      ✨ NEW
│   ├── basic-usage.js
│   └── advanced-usage.js
├── realtime-dashboard.js        (Updated with IPO section)
├── IPO_GUIDE.md                 ✨ NEW
├── QUICK_START_IPO.md           ✨ NEW
└── [other files...]

../
├── IPO_INTEGRATION_SUMMARY.md   ✨ NEW
└── [other files...]
```

---

## 💡 Use Cases

### 👨‍💼 For Individual Investors
- Track upcoming IPO opportunities
- Monitor bidding periods
- Check subscription levels
- Compare IPO prices

### 📊 For Portfolio Managers
- Diversify with quality IPOs
- Analyze sector IPO activity
- Balance portfolio risk
- Plan IPO allocations

### 🏦 For Financial Apps
- Display live IPO data
- Send bidding alerts
- Show investment recommendations
- Track IPO performance

### 📱 For Day Traders
- Catch listing-day opportunities
- Monitor subscription trends
- Analyze market sentiment
- Track price movements

---

## ⚡ Key Features

✅ **Real-time IPO Status** - Know which IPOs are accepting bids NOW  
✅ **Subscription Tracking** - Monitor oversubscription levels  
✅ **Sector Analysis** - See IPO activity by industry  
✅ **Performance Metrics** - Track post-listing returns  
✅ **Portfolio Integration** - Connect with your stock holdings  
✅ **Investment Guidance** - Smart recommendations by risk profile  
✅ **Unified Dashboard** - Stocks and IPOs together  
✅ **Live Updates** - Every 10 seconds during market hours  

---

## 📈 IPO Data Example Output

```
🔥 IPO UPDATES
────────────────────────────────────────────

  OPEN FOR BIDDING:
    1. Infra Tech Solutions (INFRATECH)
       Sector: Infrastructure | Price Band: ₹250-300 | Closes: 29-Jan-2026

  RECENTLY LISTED (Last 30 Days):
    1. Banking Partners (BANKINGPARTNERS) - Listed: 20-Jan-2026 | 🔥 Oversubscribed 156.5x
    2. One Digital (ONEDIGITAL) - Listed: 15-Jan-2026 | ✅ Normal 89.2x
```

---

## 🎓 Getting Started

1. **Read the quick start**: `QUICK_START_IPO.md`
2. **Run an example**: `node examples/ipo-monitor.js`
3. **Explore the API**: Check `IPO_GUIDE.md`
4. **Build your tracker**: Create custom scripts using 4 new methods
5. **Integrate**: Add IPO data to your apps

---

## 📞 Common Questions

**Q: How do I get currently active IPOs?**
A: `const active = await nse.getCurrentIpos();`

**Q: How do I check if an IPO is oversubscribed?**
A: `ipo.subscribed > 100` (values > 100 mean oversubscribed)

**Q: How do I find IPOs in a specific sector?**
A: `ipos.filter(i => i.sector === 'Technology')`

**Q: When does the IPO data update?**
A: Every 10 seconds in the dashboard, or on-demand via API calls

**Q: Can I integrate this with my portfolio?**
A: Yes! Use `getCurrentIpos()` to find IPOs and combine with stock data

---

## 🔗 Documentation Links

- [Complete IPO API Guide](nsetools-js/IPO_GUIDE.md)
- [Quick Start Reference](nsetools-js/QUICK_START_IPO.md)
- [Integration Architecture](IPO_INTEGRATION_SUMMARY.md)

---

## ✅ Verification Checklist

- ✅ 4 IPO methods added to NSE class
- ✅ IPO endpoints added to urls.js
- ✅ 3 IPO example scripts created
- ✅ Real-time dashboard updated with IPO section
- ✅ Comprehensive documentation provided
- ✅ Quick start guide created
- ✅ Integration summary documented
- ✅ Examples tested and working

---

## 🎉 Summary

Your NSETools project now supports **full IPO data integration** with:

| Component | Details |
|-----------|---------|
| **Methods** | 4 new IPO fetching methods in NSE class |
| **Scripts** | 3 dedicated IPO tracking/monitoring scripts |
| **Dashboard** | Real-time updates with IPO section (10-sec refresh) |
| **Documentation** | 3 comprehensive guides + examples |
| **Features** | Real-time bidding, subscriptions, sectors, performance |
| **Status** | ✅ Complete and production-ready |

---

## 🚀 What You Can Do Now

- ✅ Track all upcoming IPOs
- ✅ Monitor active IPO bidding
- ✅ Check subscription levels in real-time
- ✅ Analyze IPO sector trends
- ✅ Compare stocks and IPO opportunities
- ✅ Build custom IPO trackers
- ✅ Create investment dashboards
- ✅ Integrate with portfolio management

---

**You're all set! Start exploring IPO opportunities with NSETools! 🔥📈**

Run `node examples/ipo-monitor.js` to get started!
