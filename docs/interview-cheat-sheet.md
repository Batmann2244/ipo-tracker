# IPO Tracker Backend - Interview Cheat Sheet

> **Quick Reference**: Print this or keep it open during interviews for instant recall of key details

---

## 30-Second Elevator Pitch

*"I built an IPO Tracker that aggregates data from 7+ sources including NSE and BSE to help investors analyze Indian IPOs. The backend uses Node.js and Express with a modular scraping architecture, a proprietary scoring engine that evaluates IPOs across fundamentals, valuation, and governance, and provides AI-powered analysis. It handles automated data updates, email alerts, and exposes a RESTful API with tiered access control."*

---

## Key Numbers to Remember

| Metric | Value |
|--------|-------|
| **Data Sources** | 7+ (NSE, BSE, Chittorgarh, Groww, InvestorGain, IPOAlerts, IPOWatch) |
| **Scoring Dimensions** | 3 (Fundamentals 40%, Valuation 35%, Governance 25%) |
| **API Endpoints** | 30+ REST endpoints |
| **Database Tables** | 10+ (users, ipos, watchlist, gmp_history, etc.) |
| **Background Jobs** | 4 (30min subscription, hourly GMP, daily sync, daily alerts) |
| **AI Providers** | 3 (Gemini, Mistral, OpenAI) |
| **Risk Levels** | 3 (Conservative ≥7, Moderate 5-7, Aggressive <5) |

---

## Tech Stack (One-Liner)

**Backend**: Node.js + Express + TypeScript + SQLite + Drizzle ORM  
**Scraping**: Axios + Cheerio + Custom NSE Client  
**Auth**: Replit Auth + API Key Management  
**Jobs**: Node-cron Scheduler  
**AI**: Google Gemini / Mistral / OpenAI  
**Email**: Resend API

---

## Architecture in 3 Layers

```
┌─────────────────────────────────────────┐
│  SCRAPING LAYER                         │
│  - 7 individual scrapers                │
│  - Aggregator (merges + confidence)     │
│  - NSE Client (TypeScript library)      │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  BUSINESS LOGIC LAYER                   │
│  - Scoring Engine (3 dimensions)        │
│  - AI Analysis (multi-provider)         │
│  - Scheduler (cron jobs)                │
│  - Email Service (alerts)               │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  API + DATA LAYER                       │
│  - Express Routes (REST API)            │
│  - Auth Middleware (Replit + API keys)  │
│  - Storage Service (Drizzle ORM)        │
│  - SQLite Database (local.db)           │
└─────────────────────────────────────────┘
```

---

## Data Flow (5 Steps)

1. **Fetch**: Scrapers pull data from 7+ sources
2. **Merge**: Aggregator combines data, assigns confidence
3. **Score**: Scoring engine calculates 3 dimensions + red flags
4. **Store**: Upsert to SQLite via Drizzle ORM
5. **Serve**: REST API delivers to React frontend

---

## Scoring Algorithm (Quick Reference)

### Fundamentals Score (40%)
- Revenue Growth: >30% = +3, 20-30% = +2, 10-20% = +1
- ROE: >20% = +2, 15-20% = +1.5, <15% = +0.5
- Debt-to-Equity: <0.5 = +2, 0.5-1.0 = +1, >1.5 = -1

### Valuation Score (35%)
- P/E vs Sector: Below = +3, At = +2, Above = +1
- GMP: >20% = +2, 10-20% = +1.5, 0-10% = +1, Negative = -1

### Governance Score (25%)
- OFS: <25% = +3, 25-50% = +2, >50% = 0
- Promoter Holding: >75% = +2, 50-75% = +1.5, <50% = +0.5

**Overall Score** = (Fund × 0.4) + (Val × 0.35) + (Gov × 0.25)

---

## Red Flags Detected

1. ❌ High OFS (>50%) - Promoters aggressively exiting
2. ❌ Expensive P/E - Significantly above sector median
3. ❌ Weak Revenue Growth - Below industry average
4. ❌ High Debt (>1.5) - Financial leverage risk
5. ❌ Low Promoter Holding (<50%) - Lack of skin in the game
6. ❌ Negative GMP - Market sentiment bearish
7. ❌ Low ROE/ROCE (<10%) - Poor capital efficiency

---

## Key API Endpoints

### Public
- `GET /api/ipos` - List all IPOs (filterable)
- `GET /api/ipos/:id` - Get single IPO details

### Authenticated
- `GET /api/watchlist` - User's watchlist
- `POST /api/watchlist/:ipoId` - Add to watchlist
- `POST /api/ipos/:id/analyze` - Trigger AI analysis
- `GET /api/alerts/preferences` - Alert settings

### Admin
- `POST /api/admin/sync` - Manual data sync
- `GET /api/admin/stats` - Database statistics
- `GET /api/admin/sync/test` - Test scrapers

### API v1 (External Developers)
- `GET /api/v1/ipos` - Public IPO data (rate limited)
- Requires API key in header: `X-API-Key`

---

## Database Schema (Core Tables)

```
users (id, email, firstName, lastName)
  ↓
ipos (id, symbol, companyName, status, scores, gmp)
  ↓
watchlist (userId, ipoId)
gmp_history (ipoId, gmp, recordedAt)
peer_companies (ipoId, companyName, peRatio)
timeline_events (ipoId, eventType, eventDate)
alert_preferences (userId, emailEnabled, alertTypes)
api_keys (userId, keyHash, tier, isActive)
subscriptions (userId, tier, startDate, endDate)
api_usage (apiKeyId, endpoint, timestamp)
```

---

## Scraper Architecture Pattern

```typescript
// Base Scraper Class (abstract)
class BaseScraper {
  async fetchWithRetry() { /* retry logic */ }
  handleError() { /* error handling */ }
}

// Individual Scrapers (extend base)
class ChittorgarhScraper extends BaseScraper {
  async getIpos() { /* scrape logic */ }
  async getGmp() { /* GMP data */ }
}

// Aggregator (merges all)
class ScraperAggregator {
  async getIpos(sources: string[]) {
    // Fetch from all sources
    // Merge by company name/symbol
    // Assign confidence levels
    // Detect GMP trends
    return mergedData;
  }
}
```

---

## Background Scheduler Jobs

| Frequency | Job | Purpose |
|-----------|-----|---------|
| **Every 30 min** | Subscription Sync | Live bidding data (during market hours) |
| **Every hour** | GMP Sync | Grey market premium updates |
| **Daily 9 AM** | Full Data Sync | Complete IPO data refresh |
| **Daily 8 AM** | Opening Alerts | Remind users of IPOs opening today |

---

## Common Interview Questions & Answers

### Q: Why SQLite instead of PostgreSQL?

**A**: *"SQLite was ideal for this project because it's file-based, requires no external setup, and handles the read-heavy workload well. The data volume is manageable (hundreds of IPOs, not millions). For production at scale, I'd migrate to PostgreSQL for better concurrency and horizontal scaling, but SQLite simplified development and deployment."*

---

### Q: How do you handle data inconsistencies from multiple sources?

**A**: *"I use a scraper aggregator pattern. Each source has its own scraper, and the aggregator merges data by matching company names and symbols. I assign confidence levels: 'high' if 2+ sources agree, 'medium' if only 1 source. I prioritize official sources like NSE/BSE over third-party sites. When values conflict, I use the most recent data from the highest-confidence source."*

---

### Q: How does your scoring engine work?

**A**: *"I evaluate IPOs across three dimensions: Fundamentals (40% weight) looks at revenue growth, ROE, and debt; Valuation (35%) compares P/E ratio to sector median and considers GMP; Governance (25%) examines OFS ratio and promoter holding. Each dimension is scored 0-10, then I calculate a weighted average. I also detect red flags like high debt or negative GMP, which affect the risk classification."*

---

### Q: How do you prevent rate limiting from data sources?

**A**: *"I implement exponential backoff and retry logic in the base scraper class. For API sources like IPOAlerts, I track daily usage limits and throttle requests. The scheduler respects market hours to avoid unnecessary requests. I also cache frequently accessed data and use the aggregator to minimize redundant calls."*

---

### Q: What would you improve if you rebuilt this?

**A**: *"I'd separate the scraping service into its own microservice for better scalability. I'd add Redis for caching and as a message queue for background jobs instead of in-memory scheduling. I'd implement database connection pooling and consider sharding if data volume grows. I'd also add more comprehensive error monitoring with tools like Sentry."*

---

### Q: How do you ensure data quality?

**A**: *"Multiple strategies: (1) Multi-source aggregation with confidence scoring, (2) Data validation using Zod schemas, (3) Automated tests for scrapers, (4) Admin panel to test connections before sync, (5) Logging and error tracking, (6) Fallback mechanisms if primary sources fail."*

---

### Q: Explain your authentication strategy

**A**: *"I use Replit Auth for user authentication, which provides OAuth-based login. For the public API, I implemented API key management with hashed keys stored in the database. Each key has a tier (free/basic/pro/enterprise) with different rate limits. I track usage per key and enforce limits using middleware."*

---

### Q: How do you handle background jobs?

**A**: *"I use node-cron for scheduling. Jobs run at different frequencies: subscription data every 30 minutes during market hours, GMP data hourly, full sync daily at 9 AM, and opening alerts at 8 AM. Each job is idempotent and has error handling. Admins can also trigger manual syncs via the admin panel."*

---

## Technical Decisions & Rationale

| Decision | Rationale |
|----------|-----------|
| **TypeScript** | Type safety reduces bugs, better IDE support |
| **SQLite** | Simple, file-based, no external DB needed, sufficient for scale |
| **Drizzle ORM** | Type-safe queries, lightweight, good TypeScript integration |
| **Modular Scrapers** | Isolation (one failure doesn't break others), easy to add sources |
| **Aggregator Pattern** | Single source of truth, confidence scoring, conflict resolution |
| **Weighted Scoring** | Domain knowledge: fundamentals matter most for IPOs |
| **Multi-AI Support** | Fallback if one provider fails, cost optimization |
| **API Keys** | Monetization ready, rate limiting, usage tracking |

---

## Project Highlights (Brag Points)

✅ **Multi-source reliability**: 7+ data sources with automatic failover  
✅ **Proprietary algorithm**: Custom scoring based on financial analysis  
✅ **Production-ready API**: Authentication, rate limiting, versioning  
✅ **Automated operations**: Scheduler handles data updates without manual intervention  
✅ **AI integration**: Multi-provider support with intelligent fallback  
✅ **Type safety**: Full TypeScript coverage, Zod validation  
✅ **Scalable architecture**: Modular design, easy to extend  
✅ **User features**: Watchlist, email alerts, personalized preferences

---

## Code Snippets to Mention

### Aggregator Pattern
```typescript
const ipoResult = await scraperAggregator.getIpos([
  "nsetools", "groww", "chittorgarh"
]);
// Returns: { data: IPO[], confidence: "high" | "medium" | "low" }
```

### Scoring Engine
```typescript
const score = calculateIpoScore(ipoData);
// Returns: {
//   fundamentalsScore: 7.5,
//   valuationScore: 6.8,
//   governanceScore: 8.2,
//   overallScore: 7.4,
//   riskLevel: "conservative",
//   redFlags: ["High OFS ratio"]
// }
```

### Upsert Pattern
```typescript
const savedIpo = await storage.upsertIpo(ipoData);
// INSERT if new, UPDATE if exists (by symbol)
```

---

## What to Avoid Saying

❌ "I just used a library for everything"  
✅ "I built a custom NSE client library and aggregator"

❌ "It's a simple CRUD app"  
✅ "It's a data aggregation platform with intelligent scoring"

❌ "I didn't think about scaling"  
✅ "For current scale SQLite works, but I'd use PostgreSQL + Redis for millions of users"

❌ "The scoring is random"  
✅ "The scoring is based on financial analysis principles with weighted dimensions"

---

## Closing Statement

*"This project taught me a lot about building production-ready backends: handling unreliable external data sources, designing algorithms for domain-specific problems, implementing authentication and rate limiting, and creating maintainable, modular architectures. I'm proud of the multi-source aggregation system and the scoring engine, which provides real value to users making investment decisions."*

---

## Resources to Have Ready

- GitHub repo link
- Live demo URL (if deployed)
- Architecture diagrams (from the other document)
- Sample API responses
- Database schema diagram

---

**Good luck! You've got this! 🚀**
