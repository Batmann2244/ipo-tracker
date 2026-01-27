# IPO Analyzer - Complete Documentation

## Table of Contents

1. [Introduction](#introduction)
2. [Features Overview](#features-overview)
3. [How IPO Scoring Works](#how-ipo-scoring-works)
4. [User Guide](#user-guide)
5. [Technical Architecture](#technical-architecture)
6. [API Reference](#api-reference)
7. [Data Sources](#data-sources)
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
│       │   ├── ScoreRing.tsx # Score visualization
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
│   ├── services/
│   │   ├── scraper.ts        # Web scraping service
│   │   ├── scoring.ts        # IPO scoring engine
│   │   ├── ai-analysis.ts    # AI analysis service
│   │   └── email.ts          # Email notification service
│   └── replit_integrations/  # Replit auth integration
│
├── shared/                    # Shared types and schemas
│   ├── schema.ts             # Database schema (Drizzle)
│   ├── routes.ts             # API contracts
│   └── models/               # Domain models
│
└── migrations/               # Database migrations
```

### Data Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Chittorgarh   │────▶│    Scraper      │────▶│    Database     │
│   (Data Source) │     │    Service      │     │    (SQLite)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Frontend     │◀────│    Express      │◀────│    Storage      │
│    (React)      │────▶│    API          │────▶│    Layer        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

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
  "openDate": "2026-01-20",
  "closeDate": "2026-01-22",
  "listingDate": "2026-01-27",
  "priceMin": 100,
  "priceMax": 105,
  "issueSize": 500,
  "lotSize": 140,
  "gmp": 25,
  "gmpPercentage": 23.8,
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

## Data Sources

### Primary Source: Chittorgarh IPO Dashboard

The application scrapes data from Chittorgarh.com, a popular IPO information portal in India. Data collected includes:

| Data Point | Description |
|------------|-------------|
| Company Name | Full legal name of the company |
| Symbol | Stock symbol/ticker |
| IPO Dates | Open, close, and listing dates |
| Price Band | Minimum and maximum issue price |
| Issue Size | Total offering amount in crores |
| Lot Size | Minimum shares per application |
| Issue Type | Book Built, Fixed Price, etc. |

### Grey Market Premium (GMP)

GMP data is fetched from the Chittorgarh GMP page and includes:

- Current GMP (in rupees)
- GMP Percentage (relative to upper price band)
- Last updated timestamp

### Data Synchronization

Data is synchronized through the Admin panel:

1. **Test Connection** - Verifies the scraper can reach data sources
2. **Sync Data** - Fetches latest IPO data and updates database
3. **Upsert Logic** - New IPOs are inserted, existing ones are updated by symbol

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

### Email Format

Alerts are sent as formatted HTML emails containing:
- IPO name and symbol
- Current status and dates
- Price band and lot size
- GMP if available
- Overall score and risk level
- Link to view full details

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
Verifies that the scraper can:
- Reach the Chittorgarh website
- Parse IPO data successfully
- Return a sample of found IPOs

#### Sync Data
Triggers a full data synchronization:
1. Fetches all current IPOs from source
2. Fetches GMP data separately
3. Merges GMP with IPO records
4. Computes scores for all IPOs
5. Upserts data to database (insert or update)

### Sync Best Practices

- Run sync at least once daily during active IPO periods
- Run sync after market hours for accurate GMP data
- Check console for any scraping errors

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
| id | serial | Primary key |
| userId | text | Foreign key to users |
| ipoId | integer | Foreign key to ipos |
| createdAt | timestamp | When added to watchlist |

#### alert_preferences
Stores user alert settings.

| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| userId | text | Foreign key to users |
| emailEnabled | boolean | Email alerts enabled |
| email | text | Email address for alerts |
| alertOnNewIpo | boolean | Alert on new IPOs |
| alertOnGmpChange | boolean | Alert on GMP changes |
| alertOnOpenDate | boolean | Alert on opening date |
| alertOnWatchlistOnly | boolean | Limit to watchlist |

#### alert_logs
Records sent alerts for history.

| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| userId | text | Foreign key to users |
| ipoId | integer | Foreign key to ipos |
| alertType | text | Type of alert sent |
| channel | text | Delivery channel (email) |
| sentAt | timestamp | When alert was sent |
| status | text | Delivery status |

---

## Deployment

### Deploying on Replit

1. **Development** - The app runs automatically with `npm run dev`
2. **Production** - Click "Deploy" in Replit to publish

### Production Considerations

- Ensure all required environment variables are set
- Run database migrations before deploying
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
2. Click "Test Connection" to verify scraper works
3. Check browser console for error messages
4. Verify network connectivity

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

## Contributing

This project is open for contributions. Areas for improvement:

1. **Additional data sources** - Support for more IPO data providers
2. **Enhanced scoring** - More sophisticated scoring algorithms
3. **Historical analysis** - Track IPO performance post-listing
4. **Mobile app** - React Native mobile application
5. **Scheduled sync** - Automatic data synchronization

---

## License

This project is provided for educational and informational purposes. It is not financial advice. Use at your own risk.

---

## Contact & Support

For issues or suggestions, please open an issue in the project repository or contact the maintainers.

---

*Last Updated: January 2026*
