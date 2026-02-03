# IPO Scraper Analysis & Documentation
**Generated:** February 1, 2026  
**Project:** IPO Analyzer - Multi-Source Data Aggregation System

---

## 📊 Executive Summary

### Overall Performance Metrics
| Scraper | Status | Success Rate | Avg Response Time | Data Quality | Issues |
|---------|--------|--------------|-------------------|--------------|--------|
| **InvestorGain** | ✅ Excellent | 100% | 787ms | High | None |
| **Groww** | ✅ Good | 93% | 9902ms | High | Occasional timeouts |
| **Chittorgarh** | ✅ Good | 93% | 13334ms | Medium | Occasional timeouts |
| **IPOWatch** | ⚠️ Fair | 91% | ~7000ms | Medium | Timeout issues |
| **Zerodha** | ⚠️ Fair | 95% | ~3000ms | High | Selector failures |
| **BSE** | ❌ Failing | 100% (0 data) | N/A | None | No data extraction |
| **NSE** | ✅ Good | 100% | 4334ms | High | API limitations |
| **NSETools** | ✅ Good | 100% | 925ms | Low (0 records) | External API down |
| **IPOAlerts** | ❌ Failed | 0% | 418ms | None | API parameter error |

---

## 🔍 Detailed Scraper Analysis

### 1. **InvestorGain Scraper** ⭐ BEST PERFORMER
**File:** `server/services/scrapers/investorgain.ts`  
**Strategy:** Direct API Integration  
**URL:** `https://webnodejs.investorgain.com/cloud/report/data-read/331/1/6/2025/2025-26/0/all`

#### Scraping Method:
```typescript
Method: Direct HTTP API Call (Axios)
Authentication: None required
Data Format: JSON
```

#### Process Flow:
1. **Direct API Request** → Fetch JSON from API endpoint
2. **Parse Response** → Extract `reportTableData` array
3. **Data Mapping** → Map fields to IpoData schema
4. **Return Results** → Wrap in ScraperResult

#### Data Extraction:
- **Records:** 30 IPOs consistently
- **Fields Extracted:**
  - Company Name (`Name`)
  - GMP (`GMP`)
  - Price Range (`Price (₹)`)
  - IPO Size (`IPO Size (₹ in cr)`)
  - Lot Size (`Lot`)
  - Dates (`Open`, `Close`, `BoA Dt`, `Listing`)
  - InvestorGain ID (`~id`)

#### Strengths:
✅ **Most Reliable** - Direct API with no scraping complexity  
✅ **Fast** - Average 787ms response time  
✅ **100% Success Rate**  
✅ **Rich Data** - Provides GMP, subscription, and dates  
✅ **No Rate Limits Observed**

#### Weaknesses:
⚠️ **API Dependency** - If API changes, scraper breaks  
⚠️ **Limited Coverage** - Only 30 IPOs (may not be complete)

#### Logs Analysis:
```log
✓ Consistent 30 records every poll
✓ No errors in last 24 hours
✓ Response times: 271ms - 989ms
```

---

### 2. **Groww Scraper** ⭐ HIGH VOLUME
**File:** `server/services/scrapers/groww.ts`  
**Strategy:** Puppeteer Browser Automation + JSON Extraction  
**URL:** `https://groww.in/ipo`

#### Scraping Method:
```typescript
Method: Puppeteer (Headless Chrome) → Extract Next.js Data
Technology: Browser Automation
Data Format: JSON embedded in HTML
```

#### Process Flow:
1. **Launch Puppeteer** → Headless Chrome with stealth settings
2. **Navigate to Page** → `https://groww.in/ipo`
3. **Wait for Content** → `networkidle2` event
4. **Extract JSON** → Parse `__NEXT_DATA__` script tag
5. **Parse IPO Data** → Map from Next.js props
6. **Close Browser** → Return results

#### Data Extraction Strategy:
```typescript
// Extracts embedded JSON from Next.js application
const nextData = await page.evaluate(() => {
  const scriptTag = document.querySelector('#__NEXT_DATA__');
  return JSON.parse(scriptTag.textContent);
});

// Navigates through nested object:
nextData.props.pageProps.ipoData
  ├── openIpos (currently open)
  ├── upcomingIpos (future IPOs)
  └── closedIpos (past IPOs)
```

#### Data Fields:
- Company Name, Symbol, Status
- Price Range (min/max)
- Lot Size, Issue Size
- Bid Dates (start/end)
- Listing Date
- Subscription Details (QIB, NII, Retail)

#### Strengths:
✅ **Highest Volume** - 130 IPOs extracted  
✅ **Rich Data** - Complete subscription details  
✅ **Reliable Structure** - Next.js JSON is stable  
✅ **93% Success Rate**

#### Weaknesses:
⚠️ **Slow** - 9902ms average (Puppeteer overhead)  
⚠️ **Resource Intensive** - Requires Chrome process  
⚠️ **Occasional Timeouts** - 7% failure rate

#### Logs Analysis:
```log
✓ Successfully extracting 130 IPOs per poll
✓ Response times: 11078ms - 47504ms
⚠ 2 timeout errors in last 24 hours
```

---

### 3. **Chittorgarh Scraper** ⭐ LEGACY RELIABLE
**File:** `server/services/scrapers/chittorgarh.ts`  
**Strategy:** Puppeteer Browser Automation + HTML Table Parsing  
**URL:** `https://www.chittorgarh.com/report/mainboard-ipo-list-in-india-bse-nse/83/`

#### Scraping Method:
```typescript
Method: Puppeteer → DOM Extraction via page.evaluate()
Technology: Browser Automation + Cheerio-style DOM parsing
Data Format: HTML Tables
```

#### Process Flow:
1. **Launch Puppeteer** → Headless browser
2. **Navigate** → Mainboard IPO list page
3. **Wait for Tables** → `waitForSelector('table')`
4. **Extract DOM** → `page.evaluate()` to parse tables
5. **Map Data** → Convert table rows to IpoData
6. **Close Browser** → Return results

#### Data Extraction Strategy:
```typescript
// In-browser JavaScript execution
const ipos = await page.evaluate(() => {
  const tables = document.querySelectorAll('table');
  tables.forEach(table => {
    const rows = table.querySelectorAll('tr');
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      // Extract: Name, Open Date, Close Date, Price, Size
    });
  });
});
```

#### Strengths:
✅ **Comprehensive** - Mainboard + SME coverage  
✅ **Historical Data** - Long-established source  
✅ **93% Success Rate**  
✅ **Consistent Structure** - Tables rarely change

#### Weaknesses:
⚠️ **Very Slow** - 13334ms average  
⚠️ **Low Volume** - Only 3 IPOs extracted recently  
⚠️ **Timeout Prone** - 7% failure rate

#### Logs Analysis:
```log
✓ Extracting 3 IPOs per poll
⚠ Navigation timeouts: 2 in last 24 hours
✓ Page load: 8378ms - 21525ms
```

---

### 4. **IPOWatch Scraper** ⚠️ GMP SPECIALIST
**File:** `server/services/scrapers/ipowatch.ts`  
**Strategy:** Puppeteer + Cheerio HTML Parsing  
**URL:** `https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/`

#### Scraping Method:
```typescript
Method: Puppeteer (fetchWithPuppeteer) → Cheerio Parsing
Technology: Browser fetch + HTML parsing
Data Format: HTML Table (GMP focused)
```

#### Process Flow:
1. **Fetch Page** → `fetchWithPuppeteer(url)` (inherited method)
2. **Load Cheerio** → Parse HTML content
3. **Find GMP Table** → `$('table').first()`
4. **Extract Rows** → Parse IPO name, GMP, price, dates
5. **Return Results** → IpoData + GmpData

#### Data Extraction Strategy:
```typescript
// Cheerio-based table parsing
table.find('tr').each((index, element) => {
  const cells = $(element).find('td');
  // Columns: [0] Name, [1] GMP, [2] Price, [3] Gain, 
  //          [4] Review, [5] Date, [6] Type (SME/Mainline)
  
  const gmp = parseFloat(cells[1].text().replace(/[^0-9.-]/g, ''));
});
```

#### Data Fields:
- Company Name
- GMP (Grey Market Premium)
- Price Range
- Expected Gain Percentage
- IPO Type (SME/Mainboard)
- Opening Date

#### Strengths:
✅ **GMP Focused** - Best source for grey market data  
✅ **Reasonable Speed** - ~7000ms  
✅ **Consistent Format** - Table structure stable

#### Weaknesses:
⚠️ **91% Success Rate** - Occasional timeouts  
⚠️ **Low Volume** - Only 9 IPOs  
⚠️ **Timeout Issues** - 30-second navigation timeouts

#### Logs Analysis:
```log
✓ Extracting 9 IPOs with GMP data
⚠ Navigation timeout: 1 failure in last 6 hours
✓ Typical load time: 6114ms - 9605ms
⚠ One 41162ms extreme timeout observed
```

---

### 5. **Zerodha Scraper** ⚠️ CLEAN DATA
**File:** `server/services/scrapers/zerodha.ts`  
**Strategy:** Puppeteer + Cheerio Table Parsing  
**URL:** `https://zerodha.com/ipo`

#### Scraping Method:
```typescript
Method: Puppeteer → Cheerio HTML Parsing
Technology: Browser automation + DOM parsing
Data Format: HTML Tables with sections
```

#### Process Flow:
1. **Launch Browser** → Puppeteer with resource blocking
2. **Navigate** → `https://zerodha.com/ipo`
3. **Wait for Tables** → `waitForSelector('table, .ipo-row')`
4. **Extract HTML** → Get page content
5. **Parse with Cheerio** → Find tables and rows
6. **Map Data** → Determine status by section headers
7. **Close Browser** → Return 50 IPOs

#### Data Extraction Strategy:
```typescript
// Cheerio parsing after Puppeteer fetch
$('tr').each((_, element) => {
  const row = $(element);
  const nameCell = row.find('.ipo-name');
  const symbolCell = row.find('.ipo-symbol');
  
  // Determine status from section heading
  const sectionTitle = row.closest('.table-container')
    .prev('h2').text().toLowerCase();
  
  if (sectionTitle.includes('live')) status = 'open';
  else if (sectionTitle.includes('upcoming')) status = 'upcoming';
});
```

#### Strengths:
✅ **High Volume** - 50 IPOs extracted  
✅ **Clean Data** - Well-structured HTML  
✅ **Fast** - ~3000ms average  
✅ **95% Success Rate**

#### Weaknesses:
⚠️ **Recent Selector Failure** - "h2, h3" selector timeout  
⚠️ **Fragile** - Depends on specific HTML structure  
⚠️ **One Critical Error** - Latest run failed with selector issue

#### Logs Analysis:
```log
✓ Consistently extracting 50 IPOs
✓ Response times: 2644ms - 7006ms
❌ Latest error: "Waiting for selector `h2, h3` failed"
✓ Overall: 18 successes, 1 failure
```

#### CRITICAL ISSUE IDENTIFIED:
```log
{"level":"error","message":"Scraper error: Waiting for selector `h2, h3` failed","timestamp":"2026-02-01 18:35:46"}
```
**Root Cause:** The scraper uses `waitForSelector('table, .ipo-row, [data-ipo]')` but then later expects `h2, h3` elements in section detection logic. Page structure may have changed.

---

### 6. **BSE Scraper** ❌ CRITICAL FAILURE
**File:** `server/services/scrapers/bse.ts`  
**Strategy:** Puppeteer + Angular Scope Extraction (FAILING)  
**URL:** `https://www.bseindia.com/markets/PublicIssues/IPOIssues_New.aspx?id=1&status=L`

#### Scraping Method:
```typescript
Method: Puppeteer → AngularJS Scope Extraction
Technology: Browser automation + Angular object inspection
Data Format: AngularJS scope data OR HTML tables (fallback)
```

#### Process Flow:
1. **Launch Browser** → Puppeteer with resource blocking
2. **Navigate** → BSE IPO page
3. **Wait (Tolerant)** → Try `domcontentloaded` with timeout tolerance
4. **Extract Angular Scope** → Try to access `window.angular`
5. **Fallback to HTML** → Parse table rows if Angular fails
6. **Return Results** → **Currently: 0 records**

#### Data Extraction Strategy:
```typescript
const extractedData = await page.evaluate(() => {
  // Strategy 1: Try AngularJS scope
  const rows = document.querySelectorAll('tr[ng-repeat]');
  if (rows.length > 0) {
    const angular = window.angular;
    if (angular) {
      const scope = angular.element(rows[0]).scope();
      return { success: true, data: scope.pi };
    }
  }
  
  // Strategy 2: Fallback to HTML table parsing
  const tableRows = document.querySelectorAll('table tr');
  // Parse cells manually
});
```

#### Strengths:
✅ **Dual Strategy** - Angular + HTML fallback  
✅ **No Crashes** - 100% execution success

#### Weaknesses:
❌ **ZERO DATA** - Extracting 0 records every time  
❌ **Angular Not Found** - Scope extraction failing  
❌ **HTML Fallback Failing** - Table parsing not working  
❌ **Navigation Timeouts** - 30-second timeouts common  
❌ **API Errors** - Direct API calls return header errors

#### Logs Analysis:
```log
⚠ "Angular selector not found immediately, checking content..."
⚠ "Angular extraction failed or no data."
✓ "BSE ✓ ipos - 0 records" (success with no data)
❌ Multiple navigation timeouts: 30000ms exceeded
❌ API attempt failed: "Parse Error: Unexpected whitespace after header value"
```

#### CRITICAL ISSUES:
1. **AngularJS Not Loading**: Page may no longer use AngularJS or scope is inaccessible
2. **HTML Parsing Broken**: Fallback table extraction returns empty
3. **Navigation Timeouts**: Page takes >30 seconds to load
4. **API Alternative Failed**: Direct API call has malformed headers

#### Recommended Fix:
```typescript
// Option 1: Wait longer for Angular
await page.waitForFunction(() => typeof window.angular !== 'undefined', { timeout: 60000 });

// Option 2: Use Network Interception
page.on('response', async (response) => {
  if (response.url().includes('GetPipoData')) {
    const data = await response.json();
    // Extract from API response
  }
});

// Option 3: Rewrite HTML extraction with correct selectors
const ipos = await page.$$eval('#ContentPlaceHolder1_gvIPO tr', rows => {
  return rows.map(row => ({
    name: row.cells[1]?.innerText,
    // etc.
  }));
});
```

---

### 7. **NSE Scraper** ✅ OFFICIAL SOURCE
**File:** `server/services/scrapers/nse.ts` (uses `nse-client/`)  
**Strategy:** Official NSE API with Session Management  
**URL:** `https://www.nseindia.com/api/ipo-current-issue`

#### Scraping Method:
```typescript
Method: HTTP API with Cookie-based Session
Technology: Axios + Custom NSE Client
Data Format: JSON
```

#### Process Flow:
1. **Initialize Session** → Fetch NSE homepage to get cookies
2. **API Request** → Use cookies for authenticated API call
3. **Parse JSON** → Extract IPO array
4. **Map Data** → Convert to IpoData schema
5. **Return Results** → 1 IPO typically

#### Strengths:
✅ **Official Source** - Direct NSE data  
✅ **100% Success Rate**  
✅ **Fast** - 4334ms average  
✅ **Reliable JSON** - Stable API structure

#### Weaknesses:
⚠️ **Low Volume** - Only 1 IPO (current issue only)  
⚠️ **API Limitations** - Upcoming IPOs API returns 404  
⚠️ **Session Dependency** - Requires cookie management

#### Logs Analysis:
```log
✓ NSE session initialized successfully
✓ Extracting 1 IPO per poll
✓ Consistent 100% success rate
❌ Upcoming IPOs API: 404 errors (external limitation)
```

---

### 8. **NSETools Scraper** ⚠️ EXTERNAL API DOWN
**File:** `server/services/scrapers/nsetools.ts`  
**Strategy:** Third-party NSE API wrapper  
**URL:** NSE Tools API endpoints

#### Scraping Method:
```typescript
Method: HTTP API (Third-party service)
Technology: REST API wrapper
Data Format: JSON
```

#### Status:
❌ **External API Unavailable** - Returns 404 errors  
✅ **100% Execution Success** - Handles errors gracefully  
⚠️ **0 Records** - No data extracted

#### Logs Analysis:
```log
❌ "Failed to fetch upcoming IPOs from NSETools: NSE API error: 404 - Not Found"
❌ "Failed to fetch current IPOs from NSETools: NSE API error: 404 - Not Found"
✓ "Successfully fetched 0 IPOs from NSETools"
```

**Note:** This is an **external service issue**, not a scraper problem.

---

### 9. **IPOAlerts Scraper** ❌ API PARAMETER ERROR
**File:** `server/services/scrapers/ipoalerts.ts`  
**Strategy:** Premium IPO API  
**URL:** IPO Alerts API endpoints

#### Scraping Method:
```typescript
Method: HTTP API (Premium service with rate limits)
Technology: REST API
Data Format: JSON
```

#### Status:
❌ **0% Success Rate** - All requests failing  
❌ **API Error:** `"Limit must be less than or equal to 1"`  
⚠️ **Rate Limit:** 25 calls per day

#### Logs Analysis:
```log
❌ "API error 400: {"status":"400","title":"Bad Request","detail":"Limit must be less than or equal to 1"}"
```

#### CRITICAL ISSUE:
The scraper is passing an invalid `limit` parameter to the API. The API enforces `limit <= 1`.

#### Recommended Fix:
```typescript
// In ipoalerts.ts
const params = {
  limit: 1, // Change from higher value to 1
  // other params...
};
```

---

## 🔧 Critical Issues Summary

### 🔴 HIGH PRIORITY (Blocking Data Collection)

1. **BSE Scraper - Zero Data Extraction**
   - **Impact:** No BSE IPO data available
   - **Status:** Scraper runs but extracts 0 records
   - **Root Cause:** AngularJS scope extraction failing + HTML fallback broken
   - **Fix Required:** Rewrite extraction logic with correct selectors

2. **IPOAlerts - API Parameter Error**
   - **Impact:** Premium data source completely unavailable
   - **Status:** 100% failure rate
   - **Root Cause:** Invalid `limit` parameter (>1)
   - **Fix Required:** Set `limit: 1` in API request

### 🟡 MEDIUM PRIORITY (Occasional Failures)

3. **Zerodha - Selector Timeout**
   - **Impact:** Recent failure (1 in last run)
   - **Status:** 95% success rate, but latest run failed
   - **Root Cause:** `waitForSelector('h2, h3')` timeout
   - **Fix Required:** Remove or make optional the h2/h3 selector

4. **IPOWatch - Navigation Timeouts**
   - **Impact:** 9% failure rate
   - **Status:** Occasional 30-second timeouts
   - **Root Cause:** Slow page load
   - **Fix Required:** Increase timeout or implement retry logic

5. **Chittorgarh - Slow Performance**
   - **Impact:** High response times (13s average)
   - **Status:** 93% success, but very slow
   - **Root Cause:** Heavy page rendering
   - **Fix Required:** Optimize Puppeteer settings (block more resources)

---

## 📈 Performance Recommendations

### For BSE (CRITICAL):
```typescript
// Use network listener approach
page.on('response', async (response) => {
  if (response.url().includes('IPOIssues') || response.url().includes('GetPipoData')) {
    try {
      const data = await response.json();
      // Process API data directly
    } catch {}
  }
});
```

### For Zerodha (HIGH):
```typescript
// Make h2/h3 selector optional
try {
  await page.waitForSelector('h2, h3', { timeout: 5000 });
} catch {
  this.sourceLogger.warn("Section headers not found, proceeding anyway");
}
```

### For IPOAlerts (HIGH):
```typescript
// Fix API parameter
const response = await axios.get(API_URL, {
  params: { limit: 1 } // Changed from limit: 25
});
```

### For All Puppeteer Scrapers:
```typescript
// Optimize resource blocking
await page.setRequestInterception(true);
page.on('request', (req) => {
  if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
    req.abort();
  } else {
    req.continue();
  }
});
```

---

## 📊 Data Quality Assessment

| Source | Volume | Freshness | Completeness | Reliability |
|--------|--------|-----------|--------------|-------------|
| InvestorGain | Medium (30) | Excellent | High (GMP+Dates) | ⭐⭐⭐⭐⭐ |
| Groww | High (130) | Excellent | Very High | ⭐⭐⭐⭐ |
| Chittorgarh | Low (3) | Good | Medium | ⭐⭐⭐⭐ |
| IPOWatch | Low (9) | Good | Medium (GMP focus) | ⭐⭐⭐ |
| Zerodha | High (50) | Excellent | High | ⭐⭐⭐⭐ |
| BSE | **None (0)** | N/A | **0%** | ⭐ |
| NSE | Very Low (1) | Excellent | High | ⭐⭐⭐⭐⭐ |
| NSETools | None (0) | N/A | 0% (External issue) | N/A |
| IPOAlerts | **None (0)** | N/A | **0%** | ⭐ |

---

## 🎯 Recommended Action Plan

### Immediate (Today):
1. ✅ Fix IPOAlerts API parameter (`limit: 1`)
2. ✅ Fix Zerodha selector timeout (make h2/h3 optional)
3. ✅ Investigate BSE page structure (use browser DevTools)

### Short-term (This Week):
4. ⚠️ Rewrite BSE scraper with network interception
5. ⚠️ Add retry logic for IPOWatch timeouts
6. ⚠️ Optimize Puppeteer settings for speed

### Long-term (This Month):
7. 📊 Monitor NSETools API status (external dependency)
8. 📊 Add fallback sources for redundancy
9. 📊 Implement scraper health dashboard with real-time alerts

---

## 🔍 Scraper Architecture Overview

### Base Class Pattern:
All scrapers extend `BaseScraper` which provides:
- `fetchWithPuppeteer()` - Shared Puppeteer launch logic
- `wrapResult()` - Standard result formatting
- `handleError()` - Centralized error handling
- `sourceLogger` - Per-source logging

### Data Flow:
```
1. Scheduler triggers aggregator
2. Aggregator calls all scrapers in parallel
3. Each scraper:
   a. Fetches data (API/Puppeteer/HTTP)
   b. Parses content (JSON/Cheerio/DOM)
   c. Maps to IpoData schema
   d. Logs to source-specific log file
   e. Returns ScraperResult
4. Aggregator merges all results
5. Deduplicates by symbol
6. Saves to database
```

---

## 📝 Conclusion

**Working Well:**
- InvestorGain, Groww, NSE provide reliable high-quality data
- Aggregator successfully merges from multiple sources
- Logging system tracks all scraper activity

**Needs Immediate Attention:**
- **BSE:** Complete rewrite of extraction logic
- **IPOAlerts:** Simple parameter fix
- **Zerodha:** Remove brittle selector

**System Health:** 6/9 scrapers working properly (67% operational)

---

**Document Version:** 1.0  
**Last Updated:** 2026-02-01 18:45 IST  
**Next Review:** 2026-02-08
