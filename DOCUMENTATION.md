# IPO Analyzer - Complete Documentation

## Table of Contents

1. [Introduction](#introduction)
   - [Data Sources & Disclaimers](#data-sources--disclaimers)
2. [Features Overview](#features-overview)
3. [How IPO Scoring Works](#how-ipo-scoring-works)
4. [User Guide](#user-guide)
5. [Technical Architecture](#technical-architecture)
6. [Data Scraping System](#data-scraping-system)
7. [API Reference](#api-reference)
8. [AI Analysis](#ai-analysis)
9. [Email Alerts](#email-alerts)
10. [Admin Panel](#admin-panel)
11. [Environment Variables](#environment-variables)
12. [Database Schema](#database-schema)
13. [Deployment](#deployment)

---

## Introduction

IPO Analyzer is a comprehensive web application designed to help investors track and analyze Initial Public Offerings (IPOs) in the Indian stock market (NSE/BSE). The platform aggregates data from publicly available sources, computes risk scores, identifies red flags, and provides AI-powered analysis to help users make informed decisions.

### Important Disclaimer

**This is a screening tool only.** The scores, analysis, and recommendations provided by IPO Analyzer are computed from publicly available data and should not be considered investment advice. Users are strongly encouraged to:

- Review the complete DRHP (Draft Red Herring Prospectus) or RHP (Red Herring Prospectus)
- Consult SEBI-registered investment advisors
- Conduct their own due diligence before making any investment decisions

### Data Sources & Disclaimers

IPO Analyzer aggregates data from multiple publicly accessible sources to provide comprehensive IPO information. The platform is **not affiliated with NSE, BSE, SEBI, or any other regulatory authority.**

**Data Accuracy & Timeliness:**
- All data is aggregated from publicly available sources
- IPO Analyzer does not claim ownership or guarantee accuracy of this data
- Information should not be used for real-time trading or automated decision-making
- Data may have delays or inconsistencies depending on source availability

**GMP Data Disclaimer:**
- Grey Market Premium (GMP) data is collected from publicly available market sources
- GMP is offered for general informational purposes only
- It should not be construed as financial or investment advice
- Users are advised to independently verify GMP data before making investment decisions

**Data Sources Used:**
- **NSE (National Stock Exchange)** - Official exchange IPO calendar and real-time data
- **BSE (Bombay Stock Exchange)** - Official exchange IPO listings (Beta since Jan 2, 2026)
- **Chittorgarh** - Live subscription status and GMP data
- **InvestorGain** - Real-time bidding and GMP information
- **Groww** - IPO calendar and pricing data
- **IPOWatch** - Grey Market Premium trends
- **IPOAlerts API** - Comprehensive IPO master data
- **NSETools** - NSE data aggregation library
- **Zerodha** - Data enrichment (secondary source)

---

## Features Overview

### Core Features

| Feature | Description |
|---------|-------------|
| **IPO Dashboard** | Browse all IPOs with filtering by status (Open, Upcoming, Closed) |
| **IPO Scoring** | Automated scoring based on fundamentals, valuation, and governance |
| **Red Flag Detection** | Automatic identification of potential risk factors |
| **Grey Market Premium (GMP)** | Live GMP data tracking from market sources |
| **Watchlist** | Personal watchlist to track IPOs of interest |
| **AI Analysis** | AI-powered insights using Gemini, Mistral, or OpenAI |
| **Email Alerts** | Notifications for new IPOs, GMP changes, and opening dates |
| **Admin Panel** | Data synchronization and database management |

### User Authentication

The application uses Replit Auth for secure authentication. Users can:
- Sign in with their Replit account
- Access personalized features (watchlist, alerts)
- Manage alert preferences

---

## How IPO Scoring Works

IPO Analyzer uses a proprietary scoring system that evaluates IPOs across three key dimensions:

### 1. Fundamentals Score (40% Weight)

Evaluates the company's financial health based on:

| Metric | What It Measures | Scoring Criteria |
|--------|------------------|------------------|
| **Revenue Growth** | Year-over-year revenue increase | Higher growth = Higher score |
| **ROE (Return on Equity)** | Profitability relative to shareholder equity | >15% is considered good |
| **ROCE (Return on Capital Employed)** | Efficiency of capital utilization | >15% is considered good |
| **EBITDA Margin** | Operating profitability | Higher margin = Higher score |
| **Debt-to-Equity Ratio** | Financial leverage | <1.0 is preferred, >1.5 is a red flag |

### 2. Valuation Score (35% Weight)

Assesses whether the IPO is priced fairly:

| Metric | What It Measures | Scoring Criteria |
|--------|------------------|------------------|
| **P/E Ratio** | Price relative to earnings | Compared against sector median |
| **P/E vs Sector Median** | Relative valuation | Lower than sector = Better score |
| **Issue Size** | Total offering amount | Contextual assessment |
| **Grey Market Premium** | Market sentiment indicator | Positive GMP = Higher score |

### 3. Governance Score (25% Weight)

Evaluates management and ownership structure:

| Metric | What It Measures | Scoring Criteria |
|--------|------------------|------------------|
| **OFS Ratio** | Offer for Sale percentage | High OFS (>50%) is a red flag |
| **Promoter Holding** | Post-issue promoter stake | Higher retention = Better score |
| **Fresh Issue vs OFS** | Capital usage allocation | More fresh issue = Better |

### Overall Score Calculation

```
Overall Score = (Fundamentals × 0.40) + (Valuation × 0.35) + (Governance × 0.25)
```

Each component is scored on a scale of 0-10, resulting in an overall score of 0-10.

### Risk Level Classification

| Risk Level | Criteria |
|------------|----------|
| **Conservative** | Overall score >= 7.0 with minimal red flags |
| **Moderate** | Overall score 5.0-7.0 OR few red flags present |
| **Aggressive** | Overall score < 5.0 OR significant red flags |

### Red Flags Detected

The system automatically detects and flags these risk factors:

1. **High OFS Ratio** - Promoters selling >50% of shares (aggressively exiting)
2. **Expensive P/E** - P/E ratio significantly above sector median
3. **Weak Revenue Growth** - Below-average revenue growth trends
4. **High Debt Burden** - Debt-to-Equity ratio >1.5
5. **Low Promoter Holding** - Post-issue promoter stake <50%
6. **Negative GMP** - Grey market trading below issue price
7. **Below-Average ROE/ROCE** - Returns below industry benchmarks

---

## User Guide

### Getting Started

1. **Visit the Landing Page** - View the scrolling ticker with live GMP data
2. **Sign In** - Click "Login" to authenticate with your Replit account
3. **Browse IPOs** - Go to Dashboard to view all IPOs
4. **Filter by Status** - Use tabs to filter Open, Upcoming, or Closed IPOs
5. **View Details** - Click on any IPO to see detailed analysis

### Using the Dashboard

The Dashboard provides a comprehensive view of all IPOs:

- **Search** - Find IPOs by company name or symbol
- **Status Filters** - Filter by Open, Upcoming, Announced, or Closed
- **Sort Options** - Sort by date, score, or GMP
- **IPO Cards** - Each card shows key metrics and scores at a glance

### Managing Your Watchlist

1. Navigate to any IPO detail page
2. Click "Add to Watchlist" button
3. Access your watchlist from the navigation menu
4. Remove items by clicking the remove button

### Setting Up Email Alerts

1. Go to Settings page
2. Enable email alerts
3. Enter your email address
4. Choose alert types:
   - New IPO announcements
   - GMP (Grey Market Premium) changes
   - IPO opening date reminders
5. Optionally, limit alerts to watchlist items only

---

## Technical Architecture

### Technology Stack

#### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| TypeScript | Type-safe development |
| Vite | Build tool and dev server |
| Tailwind CSS | Utility-first styling |
| shadcn/ui | Component library |
| TanStack Query | Server state management |
| Wouter | Lightweight routing |
| Framer Motion | Animations |

#### Backend
| Technology | Purpose |
|------------|---------|
| Node.js | Runtime environment |
| Express.js | Web framework |
| TypeScript | Type-safe development |
| Drizzle ORM | Database operations |
| SQLite | Data storage (local file-based) |
| Zod | Schema validation |

### Project Structure

```
ipo-analyzer/
├── client/                    # Frontend React application
│   └── src/
│       ├── components/        # Reusable UI components
│       │   ├── ui/           # shadcn/ui components
│       │   ├── IpoCard.tsx   # IPO card component
│       │   └── ...
│       ├── pages/            # Route page components
│       │   ├── Dashboard.tsx # Main IPO listing
│       │   ├── IpoDetail.tsx # Individual IPO page
│       │   ├── Watchlist.tsx # User watchlist
│       │   ├── Settings.tsx  # User settings
│       │   └── Admin.tsx     # Admin panel
│       ├── hooks/            # Custom React hooks
│       ├── lib/              # Utilities and helpers
│       └── App.tsx           # Main application entry
│
├── server/                    # Backend Express application
│   ├── index.ts              # Server entry point
│   ├── routes.ts             # API route definitions
│   ├── storage.ts            # Database operations
│   ├── db.ts                 # SQLite database connection
│   ├── services/
│   │   ├── scraper.ts        # Main unified scraper
│   │   ├── scrapers/         # Modular scraper system
│   │   │   ├── aggregator.ts # Multi-source data aggregator
│   │   │   ├── base.ts       # Base scraper class
│   │   │   ├── nse-client/   # NSE API client (TypeScript)
│   │   │   │   ├── nse.ts    # Main NSE API class
│   │   │   │   ├── session.ts # HTTP session manager
│   │   │   │   ├── urls.ts   # NSE API endpoints
│   │   │   │   └── utils.ts  # Utility functions
│   │   │   ├── nsetools.ts   # NSETools integration wrapper
│   │   │   ├── chittorgarh.ts # Chittorgarh scraper
│   │   │   ├── groww.ts      # Groww scraper
│   │   │   ├── investorgain.ts # InvestorGain scraper
│   │   │   └── nse.ts        # Direct NSE scraper
│   │   ├── scoring.ts        # IPO scoring engine
│   │   ├── ai-analysis.ts    # AI analysis service
│   │   └── email.ts          # Email notification service
│   └── replit_integrations/  # Replit auth integration
│
├── shared/                    # Shared types and schemas
│   ├── schema.ts             # Database schema (Drizzle)
│   └── models/               # Domain models
│
└── data/
    └── local.db              # SQLite database file
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DATA SOURCES                                 │
├─────────────────┬─────────────────┬─────────────────┬───────────────┤
│   NSETools      │   Chittorgarh   │     Groww       │ InvestorGain  │
│   (Official     │   (Live subs,   │   (IPO calendar │  (Live bidding│
│    NSE APIs)    │    GMP data)    │    & pricing)   │    data)      │
└────────┬────────┴────────┬────────┴────────┬────────┴───────┬───────┘
         │                 │                 │                │
         └─────────────────┴─────────────────┴────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │       SCRAPER AGGREGATOR      │
                    │  - Merges data from sources   │
                    │  - Assigns confidence levels  │
                    │  - Detects GMP trends         │
                    └───────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │        SCORING ENGINE         │
                    │  - Calculates scores          │
                    │  - Detects red flags          │
                    │  - Assigns risk levels        │
                    └───────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │      DATABASE (SQLite)        │
                    │      ./data/local.db          │
                    └───────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │         EXPRESS API           │
                    │       /api/ipos, etc.         │
                    └───────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │      REACT FRONTEND           │
                    │  Dashboard, IPO Details, etc. │
                    └───────────────────────────────┘
```

---

## Data Scraping System

The IPO Analyzer uses a sophisticated multi-source data scraping system to gather comprehensive IPO data.

### Architecture Overview

The scraping system follows a modular architecture with three main components:

1. **Individual Scrapers** - Specialized modules for each data source
2. **Aggregator** - Merges data from multiple sources and assigns confidence
3. **Scoring Engine** - Calculates scores and risk assessments

### Data Sources

#### 1. NSE Client (Primary Source)

**Location:** `server/services/scrapers/nse-client/`

The NSE Client is a TypeScript library that connects to official NSE (National Stock Exchange) APIs. It serves as the primary and most reliable data source, fully integrated into the scrapers folder.

**What it provides:**
- Upcoming IPO calendar
- Current (active bidding) IPOs
- Stock quotes and market data
- Official NSE endpoints

**How it works:**
```typescript
import { Nse } from "./nse-client";
const nse = new Nse();

// Fetch upcoming IPOs
const upcomingIpos = await nse.getUpcomingIpos();

// Fetch current/active IPOs
const currentIpos = await nse.getCurrentIpos();
```

**Key Files:**
- `server/services/scrapers/nse-client/nse.ts` - Main NSE API client
- `server/services/scrapers/nse-client/session.ts` - HTTP session manager with cookies
- `server/services/scrapers/nse-client/urls.ts` - NSE API endpoint URLs
- `server/services/scrapers/nse-client/utils.ts` - Utility functions for data parsing

#### 2. Chittorgarh Scraper

**Location:** `server/services/scrapers/chittorgarh.ts`

Scrapes data from Chittorgarh.com, a popular IPO information portal.

**What it provides:**
- Live subscription status (QIB, HNI, Retail percentages)
- Grey Market Premium (GMP) data
- IPO listing details and dates

**Endpoints scraped:**
- `/report/ipo-subscription-status-live-bidding-data-bse-nse/` - Live subscription
- `/report/ipo-grey-market-premium-gmp-india/` - GMP data
- `/report/mainboard-ipo-list-in-india-702/` - IPO listings

#### 3. Groww Scraper

**Location:** `server/services/scrapers/groww.ts`

Fetches data from Groww's IPO section (both API and HTML fallback).

**What it provides:**
- IPO calendar and dates
- Price bands
- Issue size and lot size
- IPO status

**Methods:**
1. **API Method** (preferred): `https://groww.in/v1/api/stocks_ipo/v1/ipo`
2. **HTML Fallback**: Scrapes `https://groww.in/ipo` if API fails

#### 4. InvestorGain Scraper

**Location:** `server/services/scrapers/investorgain.ts`

Scrapes live bidding data from InvestorGain.com.

**What it provides:**
- Real-time subscription data
- QIB/NII/Retail category breakdown
- Live bidding statistics

#### 5. Direct NSE Scraper

**Location:** `server/services/scrapers/nse.ts`

Direct scraping of NSE website as an additional source.

#### 6. BSE Scraper

**Location:** `server/services/scrapers/bse.ts`

Scrapes data from BSE (Bombay Stock Exchange) public issues page.

**What it provides:**
- Mainboard, SME, and DEBT IPO listings
- IPO dates (start/end)
- Price ranges and status information

**Data Source:**
- Official BSE Public Issues Page: `https://www.bseindia.com/markets/PublicIssues/IPOIssues_new.aspx`

**Status:** Public beta as of January 2, 2026. Data reliability and availability may vary. All IPO objects sourced from BSE have `source: "bse"` field.

#### 7. IPOAlerts Scraper

**Location:** `server/services/scrapers/ipoalerts.ts`

Aggregates data from the IPOAlerts API service.

**What it provides:**
- Comprehensive IPO master data
- Current and upcoming IPO schedules
- IPO details including prospectus URLs
- Historical data for listed IPOs

**API Integration:**
- Base URL: `https://api.ipoalerts.in`
- Requires API key via `IPOALERTS_API_KEY` environment variable
- Implements daily usage tracking and rate limiting

**Daily Limits:**
- Free plan: 25 requests/day (6 requests/min)
- Max 20 IPOs per request for efficiency

#### 8. IPOWatch Scraper

**Location:** `server/services/scrapers/ipowatch.ts`

Scrapes Grey Market Premium and IPO data from IPOWatch.

**What it provides:**
- Grey Market Premium (GMP) values and trends
- Expected listing gains
- SME vs Mainboard classification

**Data Source:**
- IPOWatch GMP Page: `https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/`

#### 9. NSETools Scraper

**Location:** `server/services/scrapers/nsetools.ts`

Comprehensive data aggregation from NSE using NSETools library.

**What it provides:**
- Complete IPO calendar
- Detailed IPO specifications
- Real-time subscription data
- GMP and listing information

### Data Source Priority & Reliability

**Primary Sources (Most Reliable):**
1. NSE (National Stock Exchange) - Official exchange data
2. BSE (Bombay Stock Exchange) - Official exchange data
3. NSETools - Aggregates official NSE APIs

**Enrichment Sources (Real-time Data):**
1. Chittorgarh - Live subscription updates
2. InvestorGain - Real-time bidding data
3. Groww - Calendar and pricing
4. IPOWatch - GMP trends
5. IPOAlerts - Comprehensive IPO details
6. Zerodha - Data enrichment (secondary source)

### Aggregator System

**Location:** `server/services/scrapers/aggregator.ts`

The aggregator combines data from all sources and provides:

**Features:**
1. **Multi-source merging** - Combines IPO data from all available sources
2. **Confidence scoring** - Assigns high/medium/low confidence based on source count
3. **GMP trend detection** - Identifies rising/falling/stable GMP patterns
4. **Conflict resolution** - Prioritizes more complete data when sources conflict

**Confidence Levels:**
| Level | Criteria |
|-------|----------|
| High | Data confirmed by 2+ sources |
| Medium | Data from 1 source when 2+ sources were queried |
| Low | Single source, limited corroboration |

**Usage:**
```javascript
import { scraperAggregator } from "./scrapers/aggregator";

// Get aggregated IPO data
const ipoResult = await scraperAggregator.getIpos(["nsetools", "groww", "chittorgarh"]);

// Get aggregated subscription data
const subResult = await scraperAggregator.getSubscriptions();

// Get aggregated GMP data
const gmpResult = await scraperAggregator.getGmp();

// Test all connections
const connectionTests = await scraperAggregator.testAllConnections();
```

### Main Scraper Module

**Location:** `server/services/scraper.ts`

The main scraper module provides a unified interface that:

1. **Imports NSETools** - Uses NSETools as the primary data source
2. **Scrapes enrichment sources** - Adds subscription, GMP, and additional data
3. **Merges data** - Consolidates all sources into a single dataset
4. **Applies scoring** - Calculates fundamentals, valuation, and governance scores

**Key Functions:**
- `scrapeMainboardIPOs()` - Fetches and merges IPO data from all sources
- `scrapeGmpData()` - Gets Grey Market Premium data
- `scrapeChittorgarhSubscription()` - Gets live subscription status
- `scrapeInvestorGain()` - Gets bidding data

### Web Scraping Techniques

The scrapers use:

1. **Axios** - HTTP client for fetching pages
2. **Cheerio** - jQuery-like HTML parsing for server-side
3. **Custom parsers** - Date parsing, number extraction, status detection

**Example scraping pattern:**
```javascript
import axios from "axios";
import * as cheerio from "cheerio";

async function scrapePage(url) {
  const html = await axios.get(url, { headers: { "User-Agent": "..." } });
  const $ = cheerio.load(html.data);
  
  $("table tbody tr").each((_, row) => {
    const companyName = $(row).find("td").eq(0).text().trim();
    // ... extract more data
  });
}
```

### Data Synchronization

Data sync is triggered through the Admin panel:

1. **Test Connection** - Verifies all scrapers can reach their sources
2. **Sync Data** - Fetches from all sources, merges, scores, and stores
3. **Upsert Logic** - Updates existing IPOs, inserts new ones

---

## API Reference

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ipos` | Get all IPOs with optional filters |
| GET | `/api/ipos/:id` | Get single IPO by ID |

### Protected Endpoints (Require Authentication)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/watchlist` | Get user's watchlist |
| POST | `/api/watchlist/:ipoId` | Add IPO to watchlist |
| DELETE | `/api/watchlist/:ipoId` | Remove IPO from watchlist |
| GET | `/api/alerts/preferences` | Get alert preferences |
| POST | `/api/alerts/preferences` | Update alert preferences |
| GET | `/api/alerts/logs` | Get alert history |
| POST | `/api/ipos/:id/analyze` | Trigger AI analysis |

### Admin Endpoints (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | Get database statistics |
| GET | `/api/admin/sync/test` | Test scraper connection |
| POST | `/api/admin/sync` | Trigger data synchronization |

### Query Parameters

#### GET /api/ipos

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status: `open`, `upcoming`, `closed` |
| `search` | string | Search by company name or symbol |

### Response Formats

#### IPO Object

```json
{
  "id": 1,
  "companyName": "Example Corp Limited",
  "symbol": "EXAMPLE",
  "status": "open",
  "expectedDate": "2026-01-20",
  "priceRange": "₹100 - ₹105",
  "issueSize": "500 Cr",
  "lotSize": 140,
  "sector": "Technology",
  "gmp": 25,
  "overallScore": 7.5,
  "fundamentalsScore": 8.0,
  "valuationScore": 7.0,
  "governanceScore": 7.5,
  "riskLevel": "conservative",
  "redFlags": ["High OFS ratio"],
  "aiSummary": "AI-generated analysis...",
  "aiRecommendation": "Consider for moderate risk..."
}
```

---

## AI Analysis

### Multi-Provider Support

IPO Analyzer supports multiple AI providers for generating analysis:

| Provider | API Key Variable | Model |
|----------|------------------|-------|
| Google Gemini | `GEMINI_API_KEY` | gemini-1.5-flash |
| Mistral AI | `MISTRAL_API_KEY` | mistral-small-latest |
| OpenAI | Replit Integration | gpt-4o-mini |

The system automatically detects which API key is configured and uses it. Priority order: Gemini > Mistral > OpenAI.

### Analysis Content

When triggered, the AI analyzes the IPO and generates:

1. **Summary** - 2-3 paragraph overview of the IPO
2. **Recommendation** - Investment perspective (not advice)
3. **Risk Assessment** - Conservative, Moderate, or Aggressive
4. **Key Insights** - Bullet points highlighting important factors

### How to Get Free API Keys

#### Google Gemini (Recommended)
1. Visit [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click "Get API Key"
4. Copy the key and add it as `GEMINI_API_KEY` in your Secrets

#### Mistral AI
1. Visit [Mistral Console](https://console.mistral.ai/)
2. Create an account
3. Navigate to API Keys section
4. Generate a new key
5. Add it as `MISTRAL_API_KEY` in your Secrets

---

## Email Alerts

### Setting Up Email Alerts

Email alerts require the Resend email service:

1. **Get Resend API Key**
   - Visit [Resend.com](https://resend.com/)
   - Create an account
   - Generate an API key
   - Add it as `RESEND_API_KEY` in your Secrets

2. **Configure Alert Preferences**
   - Go to Settings page
   - Enable email alerts
   - Enter your email address
   - Select alert types

### Alert Types

| Alert Type | Trigger |
|------------|---------|
| **New IPO** | When a new IPO is announced |
| **GMP Change** | When Grey Market Premium changes significantly |
| **Opening Date** | Reminder when an IPO opens for subscription |

---

## Admin Panel

### Accessing the Admin Panel

1. Sign in to the application
2. Navigate to `/admin` in the URL
3. View statistics and trigger data sync

### Available Functions

#### Database Statistics
Displays counts for:
- Total IPOs in database
- Currently open IPOs
- Upcoming IPOs
- Closed IPOs

#### Test Connection
Verifies that all scrapers can:
- Reach their data sources (NSETools, Chittorgarh, Groww, InvestorGain)
- Parse IPO data successfully
- Return response times for each source

#### Sync Data
Triggers a full data synchronization:
1. Fetches all current IPOs from all sources
2. Aggregates and merges data
3. Fetches GMP data separately
4. Computes scores for all IPOs
5. Upserts data to database (insert or update)

---

## Environment Variables

### Required Variables

| Variable | Description | Set By |
|----------|-------------|--------|
| `SESSION_SECRET` | Secret for session encryption | Replit (automatic) |
| `REPL_ID` | Replit environment identifier | Replit (automatic) |

**Note:** The application uses SQLite stored locally in `./data/local.db`. No external database configuration is required.

### Optional Variables

| Variable | Description | How to Get |
|----------|-------------|------------|
| `GEMINI_API_KEY` | Google Gemini API key | [Google AI Studio](https://aistudio.google.com/) |
| `MISTRAL_API_KEY` | Mistral AI API key | [Mistral Console](https://console.mistral.ai/) |
| `RESEND_API_KEY` | Resend email API key | [Resend.com](https://resend.com/) |

### Adding Secrets in Replit

1. Click on "Secrets" in the Tools panel
2. Click "New Secret"
3. Enter the key name (e.g., `GEMINI_API_KEY`)
4. Enter the value (your API key)
5. Click "Add Secret"

---

## Database Schema

The application uses **SQLite** as its database, stored locally at `./data/local.db`. This provides a simple, file-based storage solution that requires no external database setup.

### Tables

#### users
Stores authenticated user information.

| Column | Type | Description |
|--------|------|-------------|
| id | text | Primary key (Replit user ID) |
| email | text | User's email address |
| firstName | text | First name |
| lastName | text | Last name |
| profileImageUrl | text | Profile picture URL |
| createdAt | integer | Account creation date (timestamp) |
| updatedAt | integer | Last update date (timestamp) |

#### ipos
Stores IPO data and computed scores.

| Column | Type | Description |
|--------|------|-------------|
| id | integer | Primary key (auto-increment) |
| companyName | text | Company name |
| symbol | text | Unique stock symbol |
| status | text | open, upcoming, closed |
| expectedDate | text | Expected IPO date |
| priceRange | text | Price band (e.g., "₹140 - ₹144") |
| issueSize | text | Issue size in crores |
| lotSize | integer | Minimum lot size |
| sector | text | Industry sector |
| gmp | integer | Grey Market Premium |
| subscriptionQib | real | QIB subscription times |
| subscriptionHni | real | HNI subscription times |
| subscriptionRetail | real | Retail subscription times |
| overallScore | real | Computed overall score |
| fundamentalsScore | real | Fundamentals component |
| valuationScore | real | Valuation component |
| governanceScore | real | Governance component |
| riskLevel | text | conservative, moderate, aggressive |
| redFlags | text | JSON array of detected red flags |
| pros | text | JSON array of positive points |
| aiSummary | text | AI-generated summary |
| aiRecommendation | text | AI-generated recommendation |

#### watchlist
Tracks user IPO watchlists.

| Column | Type | Description |
|--------|------|-------------|
| id | integer | Primary key |
| userId | text | Foreign key to users |
| ipoId | integer | Foreign key to ipos |
| createdAt | integer | When added to watchlist |

#### alert_preferences
Stores user alert settings.

| Column | Type | Description |
|--------|------|-------------|
| id | integer | Primary key |
| userId | text | Foreign key to users |
| emailEnabled | integer | Email alerts enabled (boolean) |
| email | text | Email address for alerts |
| alertOnNewIpo | integer | Alert on new IPOs (boolean) |
| alertOnGmpChange | integer | Alert on GMP changes (boolean) |
| alertOnOpenDate | integer | Alert on opening date (boolean) |
| alertOnWatchlistOnly | integer | Limit to watchlist (boolean) |

#### gmp_history
Tracks GMP changes over time for trend analysis.

| Column | Type | Description |
|--------|------|-------------|
| id | integer | Primary key |
| ipoId | integer | Foreign key to ipos |
| gmp | integer | GMP value at that time |
| gmpPercentage | real | GMP as percentage |
| recordedAt | integer | Timestamp of recording |

#### subscription_updates
Tracks live subscription data over time.

| Column | Type | Description |
|--------|------|-------------|
| id | integer | Primary key |
| ipoId | integer | Foreign key to ipos |
| qibSubscription | real | QIB category subscription |
| niiSubscription | real | NII/HNI category subscription |
| retailSubscription | real | Retail category subscription |
| totalSubscription | real | Overall subscription |
| recordedAt | integer | Timestamp of recording |

---

## Deployment

### Deploying on Replit

1. **Development** - The app runs automatically with `npm run dev`
2. **Production** - Click "Deploy" in Replit to publish

### Production Considerations

- Ensure all required environment variables are set
- Test data sync functionality after deployment
- Set up scheduled syncs if needed (currently manual)

### Accessing Deployed App

After deployment, your app will be available at:
- `https://your-repl-name.repl.co` (Replit subdomain)
- Or your custom domain if configured

---

## Troubleshooting

### Common Issues

#### Data not syncing
1. Go to Admin panel
2. Click "Test Connection" to verify all scrapers work
3. Check console for specific source errors
4. Some sources may have rate limiting or temporary outages

#### NSETools 403 errors
The NSE website sometimes blocks automated requests. This is handled gracefully:
- The app falls back to other data sources
- Cached data continues to be served
- Retry later when NSE is accessible

#### AI analysis not working
1. Check if API key is set in Secrets
2. Verify API key is valid and has quota
3. Check server logs for API errors

#### Email alerts not sending
1. Verify `RESEND_API_KEY` is set
2. Check that email address is verified in Resend
3. Review alert logs in Settings

#### Authentication issues
1. Clear browser cookies
2. Try signing out and back in
3. Ensure Replit Auth is properly configured

---

## Recent Changes

- **January 2026**: Migrated project structure from subdirectory to root level
- **January 2026**: Switched from PostgreSQL to SQLite for simpler local development
- **January 2026**: Updated Vite configuration with `allowedHosts: true` for Replit proxy compatibility

---

*Last Updated: January 2026*
