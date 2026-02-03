# IPO Tracker - Backend Architecture Diagrams

> **Interview Guide**: Use these diagrams to explain your backend architecture clearly and confidently. Start with Diagram 1 (System Overview) and drill down into specific areas based on interviewer questions.

---

## Diagram 1: High-Level System Architecture

**Use this to**: Start your explanation - shows the complete system at a glance

```mermaid
graph TB
    subgraph "External Data Sources"
        NSE[NSE API<br/>Official Exchange Data]
        BSE[BSE API<br/>Official Exchange Data]
        Chittorgarh[Chittorgarh<br/>Live Subscription & GMP]
        Groww[Groww API<br/>Calendar & Pricing]
        InvestorGain[InvestorGain<br/>Real-time Bidding]
        IPOAlerts[IPOAlerts API<br/>Comprehensive Data]
        IPOWatch[IPOWatch<br/>GMP Trends]
    end

    subgraph "Backend Services - Node.js/Express"
        subgraph "Scraping Layer"
            Aggregator[Scraper Aggregator<br/>Multi-source Merger]
            NSEScraper[NSE Client]
            BSEScraper[BSE Scraper]
            ChitScraper[Chittorgarh Scraper]
            GrowwScraper[Groww Scraper]
            IGScraper[InvestorGain Scraper]
            IPOAScraper[IPOAlerts Scraper]
            IPOWScraper[IPOWatch Scraper]
        end
        
        subgraph "Business Logic"
            Scoring[Scoring Engine<br/>Fundamentals/Valuation/Governance]
            AIAnalysis[AI Analysis Service<br/>Gemini/Mistral/OpenAI]
            Scheduler[Data Scheduler<br/>Automated Polling]
            EmailService[Email Service<br/>Resend Integration]
        end
        
        subgraph "API Layer"
            Routes[Express Routes<br/>REST API]
            Auth[Replit Auth<br/>Authentication]
            APIKeys[API Key Service<br/>Rate Limiting]
        end
        
        subgraph "Data Layer"
            Storage[Storage Service<br/>Drizzle ORM]
            DB[(SQLite Database<br/>local.db)]
        end
    end

    subgraph "Frontend - React/TypeScript"
        Dashboard[Dashboard<br/>IPO Listings]
        Details[IPO Details<br/>Analysis & Scores]
        Watchlist[Watchlist<br/>User Tracking]
        Admin[Admin Panel<br/>Data Sync]
    end

    NSE --> NSEScraper
    BSE --> BSEScraper
    Chittorgarh --> ChitScraper
    Groww --> GrowwScraper
    InvestorGain --> IGScraper
    IPOAlerts --> IPOAScraper
    IPOWatch --> IPOWScraper
    
    NSEScraper --> Aggregator
    BSEScraper --> Aggregator
    ChitScraper --> Aggregator
    GrowwScraper --> Aggregator
    IGScraper --> Aggregator
    IPOAScraper --> Aggregator
    IPOWScraper --> Aggregator
    
    Aggregator --> Scoring
    Scoring --> Storage
    Storage --> DB
    
    Routes --> Storage
    Routes --> Scoring
    Routes --> AIAnalysis
    Routes --> Scheduler
    Routes --> EmailService
    
    Auth --> Routes
    APIKeys --> Routes
    
    Dashboard --> Routes
    Details --> Routes
    Watchlist --> Routes
    Admin --> Routes
    
    Scheduler -.Triggers.-> Aggregator
    EmailService -.Sends Alerts.-> Dashboard

    style Aggregator fill:#4CAF50,stroke:#2E7D32,color:#fff
    style Scoring fill:#2196F3,stroke:#1565C0,color:#fff
    style Routes fill:#FF9800,stroke:#E65100,color:#fff
    style DB fill:#9C27B0,stroke:#6A1B9A,color:#fff
```

**Key Points to Mention**:
- Multi-source data aggregation from 7+ sources
- Modular scraping architecture with individual scrapers
- Scoring engine calculates risk assessment
- RESTful API with authentication and rate limiting
- SQLite for simple, file-based storage

---

## Diagram 2: Data Flow - From Scraping to Display

**Use this to**: Explain how data moves through the system

```mermaid
flowchart TD
    Start([User Triggers Sync<br/>or Scheduler Runs]) --> Fetch[Fetch Data from All Sources]
    
    Fetch --> NSEData[NSE: Official IPO Calendar]
    Fetch --> ChitData[Chittorgarh: Live Subscription]
    Fetch --> GrowwData[Groww: Pricing & Dates]
    Fetch --> IGData[InvestorGain: GMP & Bidding]
    
    NSEData --> Merge[Aggregator Merges Data]
    ChitData --> Merge
    GrowwData --> Merge
    IGData --> Merge
    
    Merge --> Confidence{Assign Confidence<br/>Based on Sources}
    
    Confidence -->|2+ Sources| HighConf[High Confidence]
    Confidence -->|1 Source| MedConf[Medium Confidence]
    
    HighConf --> Enrich[Enrich with GMP Trends]
    MedConf --> Enrich
    
    Enrich --> Score[Calculate Scores]
    
    Score --> Fund[Fundamentals Score<br/>Revenue, ROE, Debt]
    Score --> Val[Valuation Score<br/>P/E, Sector Comparison]
    Score --> Gov[Governance Score<br/>OFS, Promoter Holding]
    
    Fund --> Overall[Overall Score = <br/>Fundamentals×0.4 + <br/>Valuation×0.35 + <br/>Governance×0.25]
    Val --> Overall
    Gov --> Overall
    
    Overall --> RedFlags{Detect Red Flags}
    
    RedFlags -->|High OFS| Flag1[Red Flag: High OFS]
    RedFlags -->|High Debt| Flag2[Red Flag: Debt Burden]
    RedFlags -->|Low ROE| Flag3[Red Flag: Weak Returns]
    
    Flag1 --> Risk[Assign Risk Level]
    Flag2 --> Risk
    Flag3 --> Risk
    
    Risk -->|Score >= 7| Conservative[Conservative Risk]
    Risk -->|5 <= Score < 7| Moderate[Moderate Risk]
    Risk -->|Score < 5| Aggressive[Aggressive Risk]
    
    Conservative --> Upsert[Upsert to Database]
    Moderate --> Upsert
    Aggressive --> Upsert
    
    Upsert --> DB[(SQLite Database)]
    
    DB --> API[REST API Endpoint]
    API --> Frontend[React Frontend]
    Frontend --> Display([User Sees IPO Data])

    style Merge fill:#4CAF50,stroke:#2E7D32,color:#fff
    style Score fill:#2196F3,stroke:#1565C0,color:#fff
    style Overall fill:#FF9800,stroke:#E65100,color:#fff
    style DB fill:#9C27B0,stroke:#6A1B9A,color:#fff
```

**Key Points to Mention**:
- Data aggregation from multiple sources for reliability
- Confidence scoring based on source count
- Three-dimensional scoring system (Fundamentals, Valuation, Governance)
- Automated red flag detection
- Risk classification based on scores

---

## Diagram 3: Scraping Architecture Deep Dive

**Use this to**: Explain the scraping system in detail

```mermaid
graph TB
    subgraph "Scraper Aggregator Pattern"
        Main[Main Scraper Module<br/>scraper.ts]
        Agg[Scraper Aggregator<br/>aggregator.ts]
        
        Main --> Agg
    end
    
    subgraph "Individual Scrapers - Base Class Pattern"
        Base[Base Scraper Class<br/>Error Handling, Retry Logic]
        
        NSEClient[NSE Client<br/>TypeScript Library]
        BSEScr[BSE Scraper<br/>HTML Parsing]
        ChitScr[Chittorgarh Scraper<br/>Subscription & GMP]
        GrowwScr[Groww Scraper<br/>API + HTML Fallback]
        IGScr[InvestorGain Scraper<br/>Live Bidding Data]
        IPOAScr[IPOAlerts Scraper<br/>API with Rate Limiting]
        IPOWScr[IPOWatch Scraper<br/>GMP Trends]
        
        Base -.Extends.-> BSEScr
        Base -.Extends.-> ChitScr
        Base -.Extends.-> GrowwScr
        Base -.Extends.-> IGScr
        Base -.Extends.-> IPOAScr
        Base -.Extends.-> IPOWScr
    end
    
    subgraph "NSE Client Internal Architecture"
        NSEClient --> Session[Session Manager<br/>Cookie Handling]
        NSEClient --> URLs[URL Constants<br/>API Endpoints]
        NSEClient --> Utils[Utility Functions<br/>Data Parsing]
        
        Session --> GetUpcoming[getUpcomingIpos]
        Session --> GetCurrent[getCurrentIpos]
        Session --> GetQuote[getStockQuote]
    end
    
    Agg --> NSEClient
    Agg --> BSEScr
    Agg --> ChitScr
    Agg --> GrowwScr
    Agg --> IGScr
    Agg --> IPOAScr
    Agg --> IPOWScr
    
    subgraph "Aggregation Logic"
        Agg --> Merge[Merge by Company Name/Symbol]
        Merge --> Dedup[Deduplicate & Normalize]
        Dedup --> Confidence[Assign Confidence Levels]
        Confidence --> Trend[Detect GMP Trends]
    end
    
    Trend --> Output[Unified IPO Data Array]
    
    subgraph "Data Enrichment"
        Output --> AddGMP[Add GMP History]
        Output --> AddSub[Add Subscription Data]
        Output --> AddPeers[Generate Peer Companies]
        Output --> AddTimeline[Generate Timeline Events]
    end
    
    AddTimeline --> Final[Complete IPO Object]

    style Agg fill:#4CAF50,stroke:#2E7D32,color:#fff
    style NSEClient fill:#2196F3,stroke:#1565C0,color:#fff
    style Base fill:#FF9800,stroke:#E65100,color:#fff
    style Merge fill:#9C27B0,stroke:#6A1B9A,color:#fff
```

**Key Points to Mention**:
- Base scraper class provides common functionality (error handling, retries)
- Each scraper is independent and can fail without affecting others
- NSE Client is a custom TypeScript library for official NSE APIs
- Aggregator merges data intelligently using company name/symbol matching
- Confidence levels help prioritize data quality
- Enrichment adds analytical data (peers, timeline, history)

---

## Diagram 4: API Request Lifecycle

**Use this to**: Explain how API requests are processed

```mermaid
sequenceDiagram
    participant Client as React Frontend
    participant Auth as Auth Middleware
    participant Routes as Express Routes
    participant Storage as Storage Service
    participant ORM as Drizzle ORM
    participant DB as SQLite Database
    participant Scoring as Scoring Engine
    participant AI as AI Analysis Service

    Client->>Routes: GET /api/ipos?status=open
    Routes->>Auth: Check Authentication
    
    alt User Not Authenticated (Public Endpoint)
        Auth-->>Routes: Allow (Public Route)
    else User Authenticated
        Auth->>Auth: Verify Replit Session
        Auth-->>Routes: User Object
    end
    
    Routes->>Storage: getIpos(status, sector)
    Storage->>ORM: Query Builder
    ORM->>DB: SELECT * FROM ipos WHERE status='open'
    DB-->>ORM: Raw Data Rows
    ORM-->>Storage: Typed IPO Objects
    Storage-->>Routes: IPO Array
    Routes-->>Client: JSON Response

    Note over Client,DB: For IPO Details with AI Analysis

    Client->>Routes: POST /api/ipos/:id/analyze
    Routes->>Auth: Require Authentication
    Auth-->>Routes: Authenticated User
    
    Routes->>Storage: getIpo(id)
    Storage->>DB: SELECT * FROM ipos WHERE id=?
    DB-->>Storage: IPO Data
    Storage-->>Routes: IPO Object
    
    Routes->>AI: analyzeIpo(ipoData)
    
    alt Gemini API Available
        AI->>AI: Use Gemini API
    else Mistral API Available
        AI->>AI: Use Mistral API
    else OpenAI Available
        AI->>AI: Use OpenAI API
    end
    
    AI-->>Routes: AI Analysis (summary, recommendation)
    
    Routes->>Storage: updateIpo(id, aiData)
    Storage->>DB: UPDATE ipos SET aiSummary=?, aiRecommendation=?
    DB-->>Storage: Updated Row
    Storage-->>Routes: Updated IPO
    
    Routes-->>Client: JSON Response with Analysis

    Note over Client,DB: For Admin Sync Operation

    Client->>Routes: POST /api/admin/sync
    Routes->>Auth: Require Authentication
    Auth-->>Routes: Authenticated User
    
    Routes->>Routes: scrapeAndTransformIPOs()
    Routes->>Routes: Fetch from All Scrapers
    Routes->>Scoring: calculateIpoScore(ipoData)
    
    Scoring->>Scoring: Calculate Fundamentals (40%)
    Scoring->>Scoring: Calculate Valuation (35%)
    Scoring->>Scoring: Calculate Governance (25%)
    Scoring->>Scoring: Detect Red Flags
    Scoring-->>Routes: Scored IPO Data
    
    loop For Each IPO
        Routes->>Storage: upsertIpo(ipoData)
        Storage->>DB: INSERT OR UPDATE
        DB-->>Storage: Saved IPO
    end
    
    Routes-->>Client: Sync Complete Response
```

**Key Points to Mention**:
- Middleware-based authentication using Replit Auth
- Storage service abstracts database operations
- Drizzle ORM provides type-safe database queries
- AI analysis supports multiple providers with fallback
- Upsert pattern prevents duplicate entries
- Synchronous scoring during data sync

---

## Diagram 5: Database Schema & Relationships

**Use this to**: Explain data modeling and relationships

```mermaid
erDiagram
    USERS ||--o{ WATCHLIST : "has many"
    USERS ||--o{ ALERT_PREFERENCES : "has one"
    USERS ||--o{ API_KEYS : "has many"
    USERS ||--o{ SUBSCRIPTIONS : "has one"
    
    IPOS ||--o{ WATCHLIST : "tracked by"
    IPOS ||--o{ GMP_HISTORY : "has many"
    IPOS ||--o{ PEER_COMPANIES : "compared with"
    IPOS ||--o{ FUND_UTILIZATION : "has many"
    IPOS ||--o{ TIMELINE_EVENTS : "has many"
    IPOS ||--o{ SUBSCRIPTION_HISTORY : "has many"
    
    API_KEYS ||--o{ API_USAGE : "tracks"
    
    USERS {
        text id PK "Replit User ID"
        text email
        text firstName
        text lastName
        text profileImageUrl
        integer createdAt
        integer updatedAt
    }
    
    IPOS {
        integer id PK
        text symbol UK "Stock Symbol"
        text companyName
        text status "open/upcoming/closed/listed"
        text priceRange
        text issueSize
        integer lotSize
        text sector
        integer gmp "Grey Market Premium"
        real fundamentalsScore "0-10"
        real valuationScore "0-10"
        real governanceScore "0-10"
        real overallScore "Weighted Average"
        text riskLevel "conservative/moderate/aggressive"
        text redFlags "JSON Array"
        text aiSummary
        text aiRecommendation
        text expectedDate
        integer investorGainId
        integer subscriptionQib
        integer subscriptionHni
        integer subscriptionRetail
    }
    
    WATCHLIST {
        integer id PK
        text userId FK
        integer ipoId FK
        integer addedAt
    }
    
    ALERT_PREFERENCES {
        integer id PK
        text userId FK
        boolean emailEnabled
        text emailAddress
        boolean newIpoAlerts
        boolean gmpAlerts
        boolean openingDateAlerts
        boolean watchlistOnly
    }
    
    GMP_HISTORY {
        integer id PK
        integer ipoId FK
        integer gmp
        real gmpPercentage
        integer recordedAt
    }
    
    PEER_COMPANIES {
        integer id PK
        integer ipoId FK
        text companyName
        real peRatio
        real marketCap
        text sector
    }
    
    TIMELINE_EVENTS {
        integer id PK
        integer ipoId FK
        text eventType "drhp_filing/open_date/close_date/listing"
        text eventDate
        text description
        boolean isConfirmed
    }
    
    API_KEYS {
        integer id PK
        text userId FK
        text keyHash "Hashed API Key"
        text keyPrefix "First 8 chars for display"
        text name "User-defined name"
        text tier "free/basic/pro/enterprise"
        boolean isActive
        integer createdAt
        integer lastUsedAt
    }
    
    SUBSCRIPTIONS {
        integer id PK
        text userId FK
        text tier "free/basic/pro/enterprise"
        integer startDate
        integer endDate
        boolean isActive
    }
    
    API_USAGE {
        integer id PK
        integer apiKeyId FK
        text endpoint
        text method
        integer statusCode
        integer responseTimeMs
        integer timestamp
    }
```

**Key Points to Mention**:
- SQLite for simplicity (file-based, no external DB needed)
- User-centric design with watchlist and preferences
- IPO as central entity with rich relationships
- Historical tracking (GMP history, subscription history)
- API key management with usage tracking
- Timeline events for IPO lifecycle tracking

---

## Diagram 6: Scoring Engine Algorithm

**Use this to**: Explain the scoring logic in detail

```mermaid
flowchart TD
    Start([IPO Data Input]) --> Extract[Extract Financial Metrics]
    
    Extract --> Fund[Calculate Fundamentals Score]
    Extract --> Val[Calculate Valuation Score]
    Extract --> Gov[Calculate Governance Score]
    
    subgraph "Fundamentals Score - 40% Weight"
        Fund --> RevGrowth{Revenue Growth}
        RevGrowth -->|> 30%| F1[+3 points]
        RevGrowth -->|20-30%| F2[+2 points]
        RevGrowth -->|10-20%| F3[+1 point]
        RevGrowth -->|< 10%| F4[+0 points]
        
        Fund --> ROE{Return on Equity}
        ROE -->|> 20%| F5[+2 points]
        ROE -->|15-20%| F6[+1.5 points]
        ROE -->|< 15%| F7[+0.5 points]
        
        Fund --> Debt{Debt-to-Equity}
        Debt -->|< 0.5| F8[+2 points]
        Debt -->|0.5-1.0| F9[+1 point]
        Debt -->|> 1.5| F10[-1 point]
        
        F1 --> FundTotal[Sum / 10 × 10]
        F2 --> FundTotal
        F3 --> FundTotal
        F4 --> FundTotal
        F5 --> FundTotal
        F6 --> FundTotal
        F7 --> FundTotal
        F8 --> FundTotal
        F9 --> FundTotal
        F10 --> FundTotal
    end
    
    subgraph "Valuation Score - 35% Weight"
        Val --> PE{P/E Ratio vs Sector}
        PE -->|Below Sector Median| V1[+3 points]
        PE -->|At Sector Median| V2[+2 points]
        PE -->|Above Sector Median| V3[+1 point]
        
        Val --> GMP{Grey Market Premium}
        GMP -->|> 20%| V4[+2 points]
        GMP -->|10-20%| V5[+1.5 points]
        GMP -->|0-10%| V6[+1 point]
        GMP -->|Negative| V7[-1 point]
        
        V1 --> ValTotal[Sum / 5 × 10]
        V2 --> ValTotal
        V3 --> ValTotal
        V4 --> ValTotal
        V5 --> ValTotal
        V6 --> ValTotal
        V7 --> ValTotal
    end
    
    subgraph "Governance Score - 25% Weight"
        Gov --> OFS{OFS Percentage}
        OFS -->|< 25%| G1[+3 points]
        OFS -->|25-50%| G2[+2 points]
        OFS -->|> 50%| G3[+0 points]
        
        Gov --> Promoter{Promoter Holding}
        Promoter -->|> 75%| G4[+2 points]
        Promoter -->|50-75%| G5[+1.5 points]
        Promoter -->|< 50%| G6[+0.5 points]
        
        G1 --> GovTotal[Sum / 5 × 10]
        G2 --> GovTotal
        G3 --> GovTotal
        G4 --> GovTotal
        G5 --> GovTotal
        G6 --> GovTotal
    end
    
    FundTotal --> Weighted[Overall Score = <br/>Fundamentals × 0.40 +<br/>Valuation × 0.35 +<br/>Governance × 0.25]
    ValTotal --> Weighted
    GovTotal --> Weighted
    
    Weighted --> RedFlag{Check Red Flags}
    
    RedFlag -->|High OFS > 50%| RF1[Add Red Flag]
    RedFlag -->|High Debt > 1.5| RF2[Add Red Flag]
    RedFlag -->|Negative GMP| RF3[Add Red Flag]
    RedFlag -->|Low ROE < 10%| RF4[Add Red Flag]
    
    RF1 --> RiskCalc{Calculate Risk Level}
    RF2 --> RiskCalc
    RF3 --> RiskCalc
    RF4 --> RiskCalc
    
    RiskCalc -->|Score >= 7 AND<br/>Few Red Flags| Conservative[Conservative Risk]
    RiskCalc -->|5 <= Score < 7 OR<br/>Some Red Flags| Moderate[Moderate Risk]
    RiskCalc -->|Score < 5 OR<br/>Many Red Flags| Aggressive[Aggressive Risk]
    
    Conservative --> Output([Scored IPO Object])
    Moderate --> Output
    Aggressive --> Output

    style FundTotal fill:#4CAF50,stroke:#2E7D32,color:#fff
    style ValTotal fill:#2196F3,stroke:#1565C0,color:#fff
    style GovTotal fill:#FF9800,stroke:#E65100,color:#fff
    style Weighted fill:#9C27B0,stroke:#6A1B9A,color:#fff
```

**Key Points to Mention**:
- Three-dimensional scoring: Fundamentals (40%), Valuation (35%), Governance (25%)
- Each dimension scored 0-10 based on specific metrics
- Weighted average produces overall score
- Red flags are detected independently
- Risk level considers both score and red flags
- Transparent, rule-based algorithm (not black box)

---

## Diagram 7: Scheduler & Background Jobs

**Use this to**: Explain automated data updates

```mermaid
sequenceDiagram
    participant Scheduler as Data Scheduler
    participant Scraper as Scraper Aggregator
    participant DB as Database
    participant Email as Email Service
    participant Users as Alert Subscribers

    Note over Scheduler: Scheduler Starts on Server Boot
    
    Scheduler->>Scheduler: Initialize Cron Jobs
    
    rect rgb(200, 220, 255)
        Note over Scheduler: Every 30 Minutes (Bidding Hours)
        Scheduler->>Scraper: Fetch Live Subscription Data
        Scraper-->>Scheduler: Subscription Updates
        
        Scheduler->>DB: Update IPO Subscription Stats
        DB-->>Scheduler: Updated
        
        Scheduler->>Scheduler: Check for Significant Changes
        
        alt Subscription > 100x or GMP Change > 20%
            Scheduler->>Email: Trigger Alert
            Email->>Users: Send Email Notification
        end
    end
    
    rect rgb(220, 255, 220)
        Note over Scheduler: Every Hour (Market Hours)
        Scheduler->>Scraper: Fetch GMP Data
        Scraper-->>Scheduler: Latest GMP Values
        
        Scheduler->>DB: Add GMP History Entry
        DB-->>Scheduler: Recorded
        
        Scheduler->>Scheduler: Detect GMP Trends
        
        alt Rising/Falling Trend Detected
            Scheduler->>Email: Send Trend Alert
            Email->>Users: Email Notification
        end
    end
    
    rect rgb(255, 240, 220)
        Note over Scheduler: Daily at 9 AM
        Scheduler->>Scraper: Full Data Sync
        Scraper-->>Scheduler: All IPO Data
        
        Scheduler->>DB: Upsert All IPOs
        DB-->>Scheduler: Sync Complete
        
        Scheduler->>Scheduler: Check for New IPOs
        
        alt New IPO Detected
            Scheduler->>Email: Send New IPO Alert
            Email->>Users: Email Notification
        end
    end
    
    rect rgb(255, 220, 220)
        Note over Scheduler: Daily at 8 AM
        Scheduler->>DB: Get IPOs Opening Today
        DB-->>Scheduler: IPO List
        
        loop For Each Opening IPO
            Scheduler->>Email: Send Opening Reminder
            Email->>Users: Email Notification
        end
    end
    
    Note over Scheduler: Manual Trigger Available via Admin Panel
    
    Users->>Scheduler: POST /api/scheduler/poll
    Scheduler->>Scraper: Immediate Sync
    Scraper-->>Scheduler: Fresh Data
    Scheduler->>DB: Update Database
    DB-->>Scheduler: Complete
    Scheduler-->>Users: Sync Success Response
```

**Key Points to Mention**:
- Cron-based scheduling for automated updates
- Different frequencies for different data types
- Market hours awareness (only fetch during trading hours)
- Alert system for significant changes
- Manual trigger option for admins
- Email notifications via Resend API

---

## Interview Talking Points

### Opening Statement
> "I built an IPO Tracker application that aggregates data from 7+ sources including NSE, BSE, and market data providers. The backend is built with Node.js, Express, and TypeScript, using a modular scraping architecture to ensure data reliability even if individual sources fail."

### Key Technical Highlights

1. **Multi-Source Data Aggregation**
   - "I implemented a scraper aggregator pattern where each data source has its own scraper module extending a base class"
   - "The aggregator merges data intelligently, assigns confidence levels based on source count, and handles conflicts"

2. **Scoring Engine**
   - "I designed a proprietary scoring algorithm that evaluates IPOs across three dimensions: Fundamentals (40%), Valuation (35%), and Governance (25%)"
   - "The system automatically detects red flags like high debt, low promoter holding, or negative market sentiment"

3. **API Architecture**
   - "I built a RESTful API with authentication, rate limiting, and tiered access control"
   - "The API supports both internal frontend consumption and external developer access with API keys"

4. **Database Design**
   - "I chose SQLite for simplicity and portability, using Drizzle ORM for type-safe queries"
   - "The schema supports rich relationships including watchlists, GMP history, peer comparisons, and timeline tracking"

5. **Background Jobs**
   - "I implemented a scheduler that polls data sources at different intervals based on market hours"
   - "The system sends email alerts for new IPOs, significant GMP changes, and opening date reminders"

6. **Error Handling & Reliability**
   - "Each scraper has retry logic and error handling, so if one source fails, others continue working"
   - "The aggregator assigns confidence levels to help users understand data quality"

### Questions You Might Get

**Q: Why did you choose SQLite over PostgreSQL/MySQL?**
> "For this project, SQLite was ideal because it's file-based, requires no external setup, and handles the read-heavy workload well. The data volume is manageable (hundreds of IPOs, not millions), and SQLite's simplicity made deployment easier. If we needed horizontal scaling or concurrent writes, I'd migrate to PostgreSQL."

**Q: How do you handle rate limiting from data sources?**
> "I implemented exponential backoff and retry logic in the base scraper class. For API sources like IPOAlerts, I track daily usage limits and implement request throttling. The scheduler also respects market hours to avoid unnecessary requests."

**Q: How do you ensure data accuracy when sources conflict?**
> "The aggregator prioritizes data based on source reliability and completeness. NSE and BSE (official exchanges) are trusted most. When values conflict, I use the most recent data from the highest-confidence source. I also expose confidence levels to users."

**Q: What would you do differently if you rebuilt this?**
> "I'd consider using a message queue (like Bull/Redis) for background jobs instead of in-memory scheduling. I'd also implement caching (Redis) for frequently accessed data. For scaling, I'd separate the scraping service into its own microservice."

---

## How to Use These Diagrams in Interviews

1. **Start with Diagram 1** - Give the big picture
2. **Use Diagram 2** - Explain data flow when asked "how does it work?"
3. **Use Diagram 3** - Deep dive into scraping when asked about data collection
4. **Use Diagram 4** - Explain request handling when asked about API design
5. **Use Diagram 5** - Show database design when asked about data modeling
6. **Use Diagram 6** - Explain scoring logic when asked about business logic
7. **Use Diagram 7** - Discuss background jobs when asked about automation

**Pro Tip**: Practice drawing simplified versions of these on a whiteboard. Interviewers often ask you to diagram your architecture live!
