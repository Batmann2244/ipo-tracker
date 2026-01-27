# 🔥 IPO DATA - QUICK START GUIDE

## 📍 Location & Files

| File | Purpose | Run Command |
|------|---------|---|
| `src/nse.js` | IPO methods | Part of core library |
| `examples/ipo-monitor.js` | IPO dashboard | `node examples/ipo-monitor.js` |
| `examples/combined-tracker.js` | Stocks + IPO | `node examples/combined-tracker.js` |
| `realtime-dashboard.js` | Live updates | `node realtime-dashboard.js` |
| `IPO_GUIDE.md` | Full documentation | Reference |

---

## 🚀 Get Started in 30 Seconds

```javascript
import { Nse } from './src/index.js';

const nse = new Nse();

// Show upcoming IPOs
const upcoming = await nse.getUpcomingIpos();
upcoming.forEach(ipo => {
    console.log(`${ipo.companyName}: ₹${ipo.priceMin}-${ipo.priceMax}`);
});

// Show active IPOs
const current = await nse.getCurrentIpos();
current.forEach(ipo => {
    console.log(`${ipo.symbol}: ${ipo.subscribed}x subscribed`);
});
```

---

## 4 IPO Methods

```javascript
// 1. Get all IPOs (upcoming, active, listed, closed)
const all = await nse.getIpoList();

// 2. Get IPOs open for bidding NOW
const active = await nse.getCurrentIpos();

// 3. Get IPOs opening soon
const upcoming = await nse.getUpcomingIpos();

// 4. Get subscription statistics
const stats = await nse.getIpoApplicationStatus();
```

---

## 📊 IPO Object Structure

```javascript
{
    symbol: 'INFRATECH',           // Stock symbol
    companyName: 'Infra Tech Solutions',
    sector: 'Infrastructure',
    priceMin: 250,                 // ₹ minimum
    priceMax: 300,                 // ₹ maximum
    biddingStartDate: '25-Jan-2026',
    biddingEndDate: '29-Jan-2026',
    listingDate: '03-Feb-2026',
    shares: '45,00,000',           // Total offer
    subscribed: 156.5,             // Oversubscribed 156.5x
    status: 'open'                 // upcoming/open/listed/closed
}
```

---

## 🎯 Common Tasks

### Find Tech IPOs
```javascript
const ipos = await nse.getIpoList();
const tech = ipos.filter(i => 
    i.sector?.toLowerCase().includes('tech')
);
console.log('Tech IPOs:', tech.map(i => i.companyName));
```

### Check Active IPOs
```javascript
const active = await nse.getCurrentIpos();
if (active.length > 0) {
    console.log(`${active.length} IPOs open for bidding!`);
    active.forEach(ipo => {
        console.log(`  • ${ipo.companyName} (${ipo.symbol})`);
    });
}
```

### Find Oversubscribed IPOs
```javascript
const active = await nse.getCurrentIpos();
const hot = active.filter(i => (i.subscribed || 0) > 100);
console.log('Oversubscribed IPOs:', hot.map(i => i.symbol));
```

### Get IPO Performance
```javascript
const all = await nse.getIpoList();
const listed = all.filter(i => i.status === 'listed');
listed.forEach(ipo => {
    const gainPercentage = ((ipo.currentPrice - ipo.ipoPrice) / ipo.ipoPrice * 100).toFixed(1);
    console.log(`${ipo.symbol}: ${gainPercentage}% return`);
});
```

---

## 🎨 Display Examples

### Simple Table
```javascript
const ipos = await nse.getUpcomingIpos();
console.log('Symbol | Company | Price Band | Bidding Period');
console.log('-------.-------.-----------|---------------');
ipos.forEach(ipo => {
    console.log(`${ipo.symbol} | ${ipo.companyName} | ₹${ipo.priceMin}-${ipo.priceMax} | ${ipo.biddingStartDate} to ${ipo.biddingEndDate}`);
});
```

### With Status Emoji
```javascript
const current = await nse.getCurrentIpos();
current.forEach(ipo => {
    const emoji = (ipo.subscribed || 0) > 100 ? '🔥' : '✅';
    console.log(`${emoji} ${ipo.symbol}: ${ipo.subscribed}x`);
});
```

### Countdown
```javascript
const upcoming = await nse.getUpcomingIpos();
upcoming.forEach(ipo => {
    const days = Math.ceil(
        (new Date(ipo.biddingEndDate) - new Date()) / 86400000
    );
    console.log(`${ipo.symbol}: ${days} days left to bid`);
});
```

---

## 🔧 Filtering Examples

```javascript
// By sector
ipos.filter(i => i.sector === 'Technology')

// By price range
ipos.filter(i => i.priceMax - i.priceMin < 100)

// By status
ipos.filter(i => i.status === 'open')

// By date
ipos.filter(i => new Date(i.biddingEndDate) > new Date())

// By subscription
ipos.filter(i => (i.subscribed || 0) > 50)

// Combination
ipos.filter(i => 
    i.sector === 'Technology' &&
    i.status === 'open' &&
    (i.subscribed || 0) < 100
)
```

---

## 📱 Real-time Monitoring

```javascript
// Update every 10 seconds
setInterval(async () => {
    const active = await nse.getCurrentIpos();
    console.clear();
    console.log('🔥 ACTIVE IPOs:');
    active.forEach(ipo => {
        console.log(`${ipo.symbol}: ${ipo.subscribed}x subscribed`);
    });
}, 10000);
```

---

## 💾 Save to File

```javascript
import fs from 'fs';

const ipos = await nse.getIpoList();

// Save as JSON
fs.writeFileSync('ipos.json', JSON.stringify(ipos, null, 2));

// Save as CSV
const csv = 'Symbol,Company,Sector,Price Min,Price Max,Status\n' +
    ipos.map(i => 
        `${i.symbol},${i.companyName},${i.sector},${i.priceMin},${i.priceMax},${i.status}`
    ).join('\n');
fs.writeFileSync('ipos.csv', csv);
```

---

## ✅ Verification Checklist

- [ ] Can run `node examples/ipo-monitor.js` ✅
- [ ] Can run `node examples/combined-tracker.js` ✅
- [ ] Can fetch IPO data in your code ✅
- [ ] Integrated with real-time dashboard ✅
- [ ] Read IPO_GUIDE.md for details ✅

---

## 🎓 Learning Path

1. **Start here**: `node examples/ipo-monitor.js`
2. **Then see**: `node examples/combined-tracker.js`
3. **Read**: IPO_GUIDE.md for full API
4. **Build**: Your own IPO tracker
5. **Integrate**: With portfolio management

---

## 📞 Quick Help

**Question**: How do I get active IPOs?
**Answer**: `await nse.getCurrentIpos()`

**Question**: How do I find upcoming IPOs?
**Answer**: `await nse.getUpcomingIpos()`

**Question**: How do I check subscription level?
**Answer**: `ipo.subscribed` or `ipo.subscribed > 100` to check if oversubscribed

**Question**: How do I filter by sector?
**Answer**: `ipos.filter(i => i.sector === 'Technology')`

**Question**: How do I run the IPO tracker?
**Answer**: `node examples/ipo-monitor.js`

---

## 🚀 Now Go Build!

You have everything needed to:
- ✅ Track IPO opportunities
- ✅ Monitor bidding status
- ✅ Analyze subscription trends
- ✅ Build investment strategies
- ✅ Create your own IPO dashboards

**Happy IPO tracking! 🔥📈**
