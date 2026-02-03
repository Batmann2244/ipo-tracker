# Backend Interview Q&A - IPO Tracker Project
## 50 Real Questions for 1-Year Experience (7-10 LPA)

---

## Part 1: Project Overview & Architecture (10 Questions)

### Q1: Walk me through your IPO Tracker project.

**Answer**: "I built a full-stack IPO tracking application for the Indian stock market. The backend aggregates data from 7+ sources including NSE, BSE, and market data providers like Chittorgarh and Groww. It uses Node.js with Express and TypeScript, implements a modular scraping architecture where each data source has its own scraper, and includes a proprietary scoring engine that evaluates IPOs across fundamentals, valuation, and governance. The system handles automated data updates via a scheduler, sends email alerts, and exposes a RESTful API with authentication and rate limiting."

---

### Q2: Why did you choose Node.js for the backend?

**Answer**: "I chose Node.js because it's excellent for I/O-heavy operations like web scraping and API calls. Since I'm making concurrent requests to 7+ data sources, Node's non-blocking event loop handles this efficiently. Also, using JavaScript/TypeScript across both frontend and backend allowed me to share types and schemas, reducing code duplication. The npm ecosystem has great libraries for scraping (Axios, Cheerio) and scheduling (node-cron)."

---

### Q3: Why SQLite instead of PostgreSQL or MongoDB?

**Answer**: "For this project's scale, SQLite was the right choice. The data volume is manageable - a few hundred IPOs with related data, not millions of records. It's file-based so there's no external database setup needed, which simplified deployment. The workload is read-heavy (users browsing IPOs) with infrequent writes (scheduled updates), which SQLite handles well. If we needed to scale to millions of users with high concurrent writes, I'd migrate to PostgreSQL with connection pooling and potentially read replicas."

---

### Q4: Explain your backend architecture in simple terms.

**Answer**: "It's a three-layer architecture. The **scraping layer** has individual scrapers for each data source that extend a base class, plus an aggregator that merges data and assigns confidence levels. The **business logic layer** includes the scoring engine that calculates IPO scores, an AI analysis service, a scheduler for background jobs, and an email service. The **API and data layer** has Express routes for the REST API, authentication middleware, a storage service that abstracts database operations using Drizzle ORM, and SQLite for persistence."

---

### Q5: How does data flow through your system?

**Answer**: "When a sync is triggered, all scrapers fetch data from their sources concurrently. The aggregator merges this data by matching company names and symbols, assigns confidence levels based on how many sources agree, and detects GMP trends. Then the scoring engine calculates three scores - fundamentals, valuation, and governance - and detects red flags. The scored data is upserted to SQLite via Drizzle ORM. Finally, the REST API serves this data to the React frontend, and the scheduler triggers email alerts for significant changes."

---

### Q6: What is the most complex part of your backend?

**Answer**: "The scraper aggregator is the most complex. It needs to merge data from 7 sources that have different formats, field names, and reliability levels. I implemented fuzzy matching for company names since sources might use 'ABC Ltd' vs 'ABC Limited'. I assign confidence levels - 'high' if 2+ sources agree, 'medium' if only one source. When values conflict, I prioritize official sources like NSE/BSE over third-party sites, and use the most recent data. I also detect GMP trends by comparing historical values."

---

### Q7: How do you handle errors in your backend?

**Answer**: "I use multiple strategies. Each scraper extends a base class that implements retry logic with exponential backoff - if a request fails, it retries up to 3 times with increasing delays. Scrapers are isolated, so if one fails, others continue working. I use try-catch blocks around critical operations and log errors with context. For API routes, I have error middleware that catches unhandled errors and returns proper HTTP status codes. The aggregator assigns lower confidence when sources fail, so users know data quality."

---

### Q8: Why did you use TypeScript instead of plain JavaScript?

**Answer**: "TypeScript catches bugs at compile time instead of runtime. For example, if I'm passing IPO data between functions, TypeScript ensures I'm not missing required fields or using wrong types. It makes refactoring safer - if I change a database schema, TypeScript shows me everywhere that needs updating. The IDE autocomplete is much better with types. For a project with multiple layers (scrapers, business logic, API, database), type safety prevents a lot of integration bugs."

---

### Q9: What design patterns did you use?

**Answer**: "I used several patterns. **Base class pattern** for scrapers - all scrapers extend a base class that provides common functionality like retry logic and error handling. **Aggregator pattern** to merge data from multiple sources into a single source of truth. **Repository pattern** with the storage service that abstracts database operations, so routes don't directly interact with the database. **Middleware pattern** in Express for authentication and error handling. **Strategy pattern** for AI analysis - the system can use Gemini, Mistral, or OpenAI based on what's configured."

---

### Q10: How would you scale this application to handle 1 million users?

**Answer**: "First, I'd move from SQLite to PostgreSQL with connection pooling. Add Redis for caching frequently accessed data like the IPO list, with a TTL of 15-30 minutes. Implement read replicas for the database to handle read traffic. Separate the scraping service into its own microservice so it can scale independently. Use a message queue like Bull with Redis for background jobs instead of in-memory scheduling. Add a CDN for static assets. Implement database indexing on commonly queried fields like status and sector. Consider horizontal scaling with load balancers if needed."

---

## Part 2: Database & Data Modeling (8 Questions)

### Q11: Explain your database schema.

**Answer**: "The core table is `ipos` with fields like symbol, companyName, status, priceRange, scores, and GMP. It relates to `gmp_history` for tracking GMP over time, `peer_companies` for sector comparisons, `timeline_events` for IPO lifecycle tracking, and `subscription_history` for live bidding data. For users, I have `users` table that connects to `watchlist`, `alert_preferences`, `api_keys`, and `subscriptions`. The `api_usage` table tracks API calls for rate limiting. All relationships use foreign keys for referential integrity."

---

### Q12: Why did you use Drizzle ORM instead of Prisma or TypeORM?

**Answer**: "Drizzle is lightweight and has excellent TypeScript support with minimal overhead. Unlike Prisma which generates a client, Drizzle is closer to SQL, giving me more control. It's faster than TypeORM for simple queries. The schema definition is intuitive and type-safe. For this project's complexity, Drizzle provided the right balance - more type safety than raw SQL, but less abstraction than Prisma. It also works great with SQLite."

---

### Q13: How do you handle database migrations?

**Answer**: "Drizzle has a migration system. I define schema changes in the schema file, then run `drizzle-kit generate` to create migration files. These are SQL files that can be version controlled. When deploying, I run `drizzle-kit push` to apply migrations. For this project, since it's early stage, I sometimes use `drizzle-kit push` directly in development. In production, I'd use proper migrations with rollback capabilities."

---

### Q14: What indexes did you create and why?

**Answer**: "I created indexes on frequently queried fields. An index on `ipos.status` since users filter by open/upcoming/closed. An index on `ipos.symbol` since it's used for lookups and is unique. A composite index on `watchlist(userId, ipoId)` for fast watchlist queries. An index on `gmp_history.ipoId` for historical GMP lookups. An index on `api_usage.apiKeyId` and `api_usage.timestamp` for usage analytics. These significantly speed up queries without much storage overhead."

---

### Q15: How do you prevent duplicate IPOs in the database?

**Answer**: "I use the upsert pattern. The `symbol` field has a unique constraint. When syncing data, I use `INSERT OR REPLACE` in SQLite (or `ON CONFLICT DO UPDATE` in PostgreSQL). The storage service has an `upsertIpo` function that first checks if an IPO with that symbol exists. If yes, it updates the existing record. If no, it inserts a new one. This ensures each IPO appears only once, even if I run sync multiple times."

---

### Q16: How do you store JSON data like red flags or pros/cons?

**Answer**: "I store them as JSON strings in TEXT columns. For example, `redFlags` is a TEXT column that stores `JSON.stringify(['High OFS', 'Negative GMP'])`. When reading, I parse it back to an array. SQLite doesn't have native JSON type like PostgreSQL, but this works fine. If I migrated to PostgreSQL, I'd use the JSONB type for better querying capabilities. For now, since I don't query inside these JSON fields, TEXT is sufficient."

---

### Q17: What's your strategy for database backups?

**Answer**: "For SQLite, I'd use the `.backup` command to create periodic backups. In a production environment, I'd schedule daily backups to cloud storage like AWS S3 or Google Cloud Storage. I'd keep backups for 30 days with a retention policy. If using PostgreSQL, I'd use `pg_dump` for logical backups or WAL archiving for point-in-time recovery. I'd also test restore procedures regularly to ensure backups are valid."

---

### Q18: How do you handle database transactions?

**Answer**: "Drizzle supports transactions. For operations that need atomicity, like adding an IPO and its timeline events together, I wrap them in a transaction. If any operation fails, the entire transaction rolls back. For example, when syncing data, if updating an IPO fails, I don't want partial data. However, for independent operations like syncing multiple IPOs, I don't use transactions to avoid locking the database for too long."

---

## Part 3: API Design & REST (8 Questions)

### Q19: Explain your API structure.

**Answer**: "I have three API groups. **Public endpoints** like `GET /api/ipos` and `GET /api/ipos/:id` don't require authentication. **Authenticated endpoints** like watchlist and alerts require Replit Auth. **Admin endpoints** like `/api/admin/sync` require authentication and admin privileges. I also have **API v1** at `/api/v1/*` for external developers with API key authentication. All endpoints return JSON and use proper HTTP status codes."

---

### Q20: How did you implement authentication?

**Answer**: "I use Replit Auth for user authentication, which provides OAuth-based login. It sets up Passport.js under the hood. I have a `requireAuth` middleware that checks `req.isAuthenticated()`. For the public API, I implemented API key authentication. Keys are hashed using bcrypt and stored in the database. The middleware checks the `X-API-Key` header, validates it, and attaches the key's tier and user info to the request for rate limiting."

---

### Q21: How do you handle rate limiting?

**Answer**: "API keys have tiers (free, basic, pro, enterprise) with different limits. I track usage in the `api_usage` table with timestamps. The middleware checks today's usage count for the API key. If it exceeds the tier's daily limit, I return 429 Too Many Requests. I also track requests per minute to prevent bursts. For authenticated users without API keys, I use session-based rate limiting. In production, I'd use Redis with a sliding window algorithm for more efficient rate limiting."

---

### Q22: What HTTP status codes do you use and when?

**Answer**: "200 for successful GET requests, 201 for successful POST that creates a resource, 204 for successful DELETE with no content. 400 for bad requests like invalid input, 401 for unauthenticated requests, 403 for authenticated but unauthorized, 404 for not found resources, 429 for rate limit exceeded. 500 for server errors. I also use 503 if a scraper is temporarily unavailable. Proper status codes help clients handle errors appropriately."

---

### Q23: How do you validate request data?

**Answer**: "I use Zod for schema validation. I define schemas for request bodies, like `insertIpoSchema` for creating IPOs. In routes, I parse the request body with the schema - `schema.parse(req.body)`. If validation fails, Zod throws a ZodError with detailed error messages. I catch this and return 400 with the specific field and error. This ensures type safety and prevents invalid data from reaching the database."

---

### Q24: Explain your API versioning strategy.

**Answer**: "I use URL-based versioning with `/api/v1/*` for the public API. This makes it clear which version clients are using. If I make breaking changes, I'd create `/api/v2/*` while keeping v1 running for backward compatibility. For internal APIs used by my frontend, I don't version them since I control both sides. Versioning is important for external developers who depend on stable contracts."

---

### Q25: How do you handle pagination in your API?

**Answer**: "For the IPO list endpoint, I'd add query parameters like `?page=1&limit=20`. The default would be 20 items per page. In the database query, I'd use `LIMIT` and `OFFSET`. The response would include metadata like `{ data: [...], page: 1, totalPages: 5, totalItems: 100 }`. For cursor-based pagination (better for real-time data), I'd use `?cursor=lastId&limit=20` and return the next cursor in the response."

---

### Q26: What's the difference between PUT and PATCH?

**Answer**: "PUT replaces the entire resource, while PATCH updates specific fields. For example, `PUT /api/ipos/:id` would require sending all IPO fields and replace the entire record. `PATCH /api/ipos/:id` would only update the fields sent, like `{ gmp: 50 }`. In my project, I mostly use PATCH for updates since I rarely need to replace entire resources. PUT is useful when you want to ensure the resource matches exactly what you send."

---

## Part 4: Scraping & External APIs (8 Questions)

### Q27: How does your web scraping work?

**Answer**: "I use Axios to fetch HTML pages and Cheerio to parse them. Cheerio provides a jQuery-like API for server-side HTML parsing. For example, to scrape Chittorgarh, I fetch the subscription page, load it with Cheerio, then use selectors like `$('table tbody tr')` to find rows and extract data from specific columns. I also handle API endpoints - for Groww, I first try their JSON API, and if that fails, I fall back to HTML scraping."

---

### Q28: How do you handle rate limiting from data sources?

**Answer**: "I implement exponential backoff in the base scraper class. If a request fails with 429, I wait 1 second, then 2, then 4, up to 3 retries. I add random jitter to avoid thundering herd. For API sources like IPOAlerts, I track daily usage limits in memory and stop making requests when the limit is reached. The scheduler respects market hours - I don't scrape subscription data outside trading hours. I also add delays between requests to the same source."

---

### Q29: What happens if one data source is down?

**Answer**: "Scrapers are isolated, so if one fails, others continue. Each scraper has try-catch blocks and returns an empty array on failure rather than throwing. The aggregator collects results from all scrapers, even if some failed. If NSE is down but Groww works, I still get data from Groww. The confidence level reflects this - if only 1 source worked, confidence is 'medium'. I log failures so I can investigate later. This resilience is why I use multiple sources."

---

### Q30: How do you merge data from different sources?

**Answer**: "The aggregator normalizes company names by converting to lowercase and removing special characters. It creates a map with both normalized names and symbols as keys. When merging, it matches IPOs from different sources using these keys. If multiple sources have the same IPO, I merge their data - taking the most complete values. For conflicts, I prioritize official sources (NSE/BSE) over third-party. I also compare timestamps and use the most recent data."

---

### Q31: How do you handle different date formats from sources?

**Answer**: "Different sources use different formats - some use 'DD-MM-YYYY', others 'YYYY-MM-DD' or 'DD MMM YYYY'. I have utility functions that try multiple parsing strategies. I use JavaScript's Date object and handle edge cases like invalid dates. I normalize all dates to ISO format (YYYY-MM-DD) before storing in the database. I also validate that dates are reasonable - for example, an IPO opening date shouldn't be in the past by more than a few days."

---

### Q32: What's your strategy for testing scrapers?

**Answer**: "I have a test endpoint `/api/admin/sync/test` that checks if each scraper can connect to its source and return data. It doesn't save to the database, just returns success/failure and sample data. I also save sample HTML responses in the repo for unit tests. I test the parsing logic against these saved responses. For integration tests, I run scrapers against real sources in a staging environment. I monitor scraper success rates and set up alerts if they start failing."

---

### Q33: How do you handle CAPTCHA or anti-bot measures?

**Answer**: "Most of my sources don't have CAPTCHA since they're public data sites. I use proper User-Agent headers to identify as a legitimate client. I respect robots.txt. For sources with stricter measures, I'd use official APIs where available - like the NSE Client library I built that uses NSE's official endpoints. If needed, I could implement request throttling, rotating user agents, or use headless browsers like Puppeteer, but that's overkill for this project."

---

### Q34: Why did you build a custom NSE Client library?

**Answer**: "NSE's official APIs require specific headers and cookie handling for authentication. Existing libraries were outdated or didn't support TypeScript well. I built a TypeScript library with a session manager that handles cookies, proper headers, and provides methods like `getUpcomingIpos()` and `getCurrentIpos()`. It's modular with separate files for session management, URL constants, and utilities. This gives me full control and better error handling than third-party libraries."

---

## Part 5: Background Jobs & Scheduling (6 Questions)

### Q35: How do you handle background jobs?

**Answer**: "I use node-cron for scheduling. I have four main jobs: subscription data every 30 minutes during market hours, GMP data every hour, full data sync daily at 9 AM, and opening date alerts at 8 AM. Each job is a cron expression like `'*/30 9-15 * * 1-5'` for every 30 minutes, 9 AM to 3 PM, Monday to Friday. Jobs are idempotent - running them multiple times produces the same result. I also have manual trigger endpoints for admins."

---

### Q36: What happens if a scheduled job fails?

**Answer**: "Each job has try-catch blocks that log errors but don't crash the server. If a sync fails, the next scheduled run will try again. I track job status in memory - last run time, success/failure, error message. The admin panel shows this status. For critical jobs, I'd add retry logic or send alerts. In production, I'd use a proper job queue like Bull with Redis that has built-in retry, failure handling, and monitoring."

---

### Q37: How do you prevent jobs from overlapping?

**Answer**: "I use a simple flag - when a job starts, I set `isSyncing = true`, and when it finishes, I set it to `false`. If a job is triggered while `isSyncing` is true, it returns early. This prevents concurrent runs that could cause database conflicts or duplicate API calls. For a more robust solution, I'd use distributed locks with Redis, especially if running multiple server instances."

---

### Q38: Why schedule jobs at specific times like 9 AM?

**Answer**: "The 9 AM sync is right after market opens, so we get fresh data for the day. The 8 AM alert gives users time to prepare before IPOs open. Subscription data updates every 30 minutes during market hours (9 AM - 3:30 PM) because that's when bidding happens. GMP updates hourly since it changes throughout the day. Scheduling aligns with market activity and user needs while minimizing unnecessary API calls."

---

### Q39: How would you improve the scheduling system?

**Answer**: "I'd migrate to Bull with Redis for better reliability. Bull provides job queues with priorities, retries, and failure handling. It has a dashboard for monitoring. I'd separate jobs into different queues - high priority for alerts, low priority for analytics. I'd implement job concurrency limits. For horizontal scaling, Bull supports multiple workers. I'd also add dead letter queues for failed jobs that need manual intervention."

---

### Q40: How do you handle timezone issues in scheduling?

**Answer**: "All times are in IST (Indian Standard Time) since this is for the Indian stock market. Node-cron uses the server's timezone, so I ensure the server is set to IST. In the database, I store dates in ISO format (YYYY-MM-DD) without timezone for simplicity. For timestamps, I use Unix timestamps (milliseconds since epoch) which are timezone-agnostic. When displaying to users, I'd convert to their local timezone in the frontend."

---

## Part 6: Security & Best Practices (5 Questions)

### Q41: How do you secure your API?

**Answer**: "Multiple layers: Authentication with Replit Auth for users and API key authentication for external access. API keys are hashed with bcrypt before storing. I use HTTPS in production to encrypt data in transit. Rate limiting prevents abuse. Input validation with Zod prevents injection attacks. I don't expose sensitive data like full API keys in responses. CORS is configured to allow only my frontend domain. I use environment variables for secrets, never hardcoding them."

---

### Q42: How do you prevent SQL injection?

**Answer**: "I use Drizzle ORM which uses parameterized queries. Instead of string concatenation like `SELECT * FROM ipos WHERE id = ${id}`, Drizzle uses placeholders that are safely escaped. Even if user input contains SQL syntax, it's treated as data, not code. I also validate all inputs with Zod before they reach the database. For raw queries (which I avoid), I'd use prepared statements."

---

### Q43: How do you handle sensitive data like API keys?

**Answer**: "API keys are hashed with bcrypt before storing in the database. When a user creates a key, I show the plain key once, then only store the hash. For verification, I hash the incoming key and compare hashes. Environment variables like `GEMINI_API_KEY` are stored in Replit Secrets, never in code. I use `.gitignore` to exclude `.env` files. In logs, I mask sensitive data. I also implement key rotation - users can revoke and create new keys."

---

### Q44: What's your error handling strategy?

**Answer**: "I use try-catch blocks around async operations. Each layer handles errors appropriately - scrapers return empty arrays, routes return HTTP errors, business logic throws custom errors. I have error middleware in Express that catches unhandled errors and returns 500 with a generic message (not exposing internals). I log errors with context (user ID, endpoint, timestamp) for debugging. For expected errors like validation failures, I return specific error messages."

---

### Q45: How do you handle environment-specific configuration?

**Answer**: "I use environment variables for configuration. In development, I use a `.env` file. In production (Replit), I use Secrets. I have different configs for dev/prod - like database paths, API URLs, log levels. I check `process.env.NODE_ENV` to determine the environment. For example, debug routes are only enabled in development. I never commit secrets to Git. I document all required environment variables in a README."

---

## Part 7: Testing & Debugging (5 Questions)

### Q46: How do you test your backend?

**Answer**: "I have manual testing through the admin panel's test connection feature. For scrapers, I test against saved HTML samples. I test API endpoints using tools like Postman or Thunder Client. For critical functions like the scoring engine, I'd write unit tests with Jest, testing different input scenarios. I test error cases - what happens if a scraper fails, if invalid data is sent, if the database is unavailable. In production, I'd add integration tests and end-to-end tests."

---

### Q47: How do you debug issues in production?

**Answer**: "I use console.log strategically with prefixes like `[SCRAPER]` or `[API]` to filter logs. I log important events - sync started/completed, errors with stack traces, API requests. I'd use a logging library like Winston to write logs to files with rotation. For production, I'd integrate tools like Sentry for error tracking or LogRocket for session replay. I also have admin endpoints to check system status, recent alerts, and scraper health."

---

### Q48: What would you do if users report incorrect IPO data?

**Answer**: "First, I'd check which sources provided that data and their confidence level. I'd manually verify against official sources like NSE or the IPO prospectus. If a scraper is broken, I'd fix the parsing logic and test it. If a source is unreliable, I'd reduce its priority in the aggregator or remove it. I'd add a manual override feature in the admin panel to correct data. I'd also add a 'Report Issue' feature for users to flag incorrect data."

---

### Q49: How do you monitor your application's health?

**Answer**: "I have a `/api/scheduler/status` endpoint that shows if the scheduler is running, last sync time, and success/failure status. The admin panel displays database stats and scraper connection tests. I log all errors with timestamps. In production, I'd use monitoring tools like New Relic or Datadog for metrics like response times, error rates, and resource usage. I'd set up alerts for critical failures like all scrapers failing or database connection issues."

---

### Q50: What's the biggest bug you fixed in this project?

**Answer**: "The aggregator was initially matching IPOs only by exact company name, which failed when sources used different formats like 'ABC Ltd' vs 'ABC Limited'. This caused duplicates and missed merges. I fixed it by normalizing names - converting to lowercase, removing special characters, and creating a fuzzy matching function. I also added symbol-based matching as a fallback. This improved merge accuracy from about 60% to 95%. I learned the importance of data normalization when integrating multiple sources."

---

## Bonus Tips for Interview Success

### Before the Interview
- Review these answers and practice saying them out loud
- Be ready to show your code on screen share
- Have the project running locally to demo
- Know your GitHub repo structure

### During the Interview
- Start with a brief overview, then go deeper based on questions
- Use specific examples from your code
- Admit when you don't know something, but explain how you'd find out
- Ask clarifying questions if needed

### Red Flags to Avoid
- Don't say "I just copied from Stack Overflow"
- Don't claim you know everything
- Don't badmouth technologies (e.g., "MongoDB is terrible")
- Don't give one-word answers - explain your reasoning

### Good Luck! 🚀
