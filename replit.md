# IPO Analyzer

## Overview

IPO Analyzer is a full-stack web application for tracking and analyzing Initial Public Offerings (IPOs) in the Indian market. It functions as an IPO screener and risk flagging tool, analyzing IPOs based on fundamentals, valuation, and governance. Users can browse upcoming, open, and closed IPOs, view computed scores and red flags, and add offerings to a personal watchlist. The project aims to provide a comprehensive B2C IPO analysis service via premium subscriptions and a B2B data API service for developers and fintech applications.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI Design

The application features a clean, light design inspired by IPOAlerts, using white/light backgrounds, orange (`#F26522`) as the primary accent color, and the Inter font. Key UI elements include clean white cards, subtle borders, shadows, and color-coded status badges for IPOs. Core pages include a dynamic Landing page with a scrolling ticker and API preview, a Dashboard for IPO screening, detailed IPO pages with score visualizations and AI analysis, a Calendar, Watchlist, API Keys management, and Settings. An Admin interface provides data sync controls and database statistics.

### Frontend Architecture

The frontend is built with React 18 and TypeScript, utilizing Wouter for routing, TanStack React Query for server state management, and Tailwind CSS with shadcn/ui for styling. Framer Motion is used for animations, and Vite serves as the build tool.

### Backend Architecture

The backend is developed with Node.js and Express.js in TypeScript (ESM modules). It follows a RESTful API design with shared route contracts and Zod schemas for request/response validation.

### Data Layer

Drizzle ORM is used with **SQLite** for database interactions. The database is stored locally at `./data/local.db`. Database models are defined in `shared/schema.ts`, and Drizzle Kit manages migrations.

### Authentication

Replit Auth (OpenID Connect) handles authentication, with user data automatically upserted and synchronized upon login.

### Project Structure

The project maintains a clear separation between `client/` (React frontend), `server/` (Express backend), and `shared/` (shared types and schemas).

### Key Design Patterns

The architecture emphasizes shared types for database schemas and API contracts, ensuring type-safe communication between frontend and backend. It leverages a component library (shadcn/ui) for accessible UI elements and implements protected routes for secure access control.

### Modular Scraper Architecture

The scraper system is designed with a modular approach, where individual modules in `server/services/scrapers/` handle data fetching from specific sources (e.g., Chittorgarh, Groww, InvestorGain, NSE). A base scraper provides common interfaces and utilities, while an aggregator merges data from multiple sources, assigns confidence levels, and detects GMP trends.

### Public API (B2B Data Service)

The public API enforces bearer token authentication with SHA-256 hashed API keys and implements tier-based rate limiting (Free, Basic, Pro, Enterprise). It provides endpoints for IPO data, GMP data, Subscription data, and an IPO Calendar.

### API Key Management

The `api-key-service.ts` manages API key generation, hashing, validation, rate limiting, and usage logging. Users can manage their API keys, view usage, and manage subscription tiers through dedicated API endpoints.

### Data Scraping & Sync

The system utilizes multiple data sources (Chittorgarh, InvestorGain, NSE, Groww) for comprehensive IPO data. A `data-scheduler.ts` automatically polls these sources, updates the database, and generates alerts based on predefined thresholds (e.g., subscription ratios, GMP changes).

### AI Analysis

A multi-provider AI analysis service (`ai-analysis.ts`) supports Gemini, Mistral, and OpenAI. It analyzes IPO fundamentals, valuation, and governance to generate summaries, recommendations, and key insights, storing the analysis in the database.

### Alert Notifications

Email alerts are managed by `server/services/email.ts` using the Resend API, sending formatted HTML emails based on user preferences and alert triggers.

### Advanced Analytics Features

The application includes GMP trend tracking, peer comparison engine, live subscription tracker, fund utilization tracking, and a comprehensive IPO calendar, offering detailed insights for each IPO.

### Database Schema

The database schema includes core tables for `users`, `sessions`, `ipos`, `watchlist`, alongside analytics tables (`gmp_history`, `peer_companies`, `subscription_updates`, `fund_utilization`, `ipo_timeline`), alert tables, and API infrastructure tables (`api_keys`, `subscriptions`, `api_usage_logs`, `webhooks`).

## External Dependencies

- **Database**: SQLite (local file at `./data/local.db`)
- **Authentication**: Replit Auth (OpenID Connect, `REPL_ID`, `SESSION_SECRET`)
- **UI Components**: Radix UI primitives
- **Date Handling**: date-fns
- **HTTP Client**: Native fetch with TanStack Query
- **Scraping**: axios, cheerio
- **AI Providers**: Google Gemini (`GEMINI_API_KEY`), Mistral (`MISTRAL_API_KEY`), OpenAI (`OPENAI_API_KEY`)
- **Email Service**: Resend (`RESEND_API_KEY`)
- **Development Tools**: Vite Plugins (cartographer, dev-banner, error overlay), esbuild

## Recent Changes

- **January 2026**: Migrated project structure from subdirectory to root level
- **January 2026**: Switched from PostgreSQL to SQLite for simpler local development
- **January 2026**: Updated Vite configuration with `allowedHosts: true` for Replit proxy compatibility
- **January 2026**: Integrated NSETools library into `server/services/scrapers/nse-client/` (removed separate `nsetools-master/` folder)
- **January 2026**: Enhanced InvestorGain scraper to use JSON API endpoints for IPO data, GMP history, and live subscription details
- **January 2026**: Added IPO detail modal with live subscription status (QIB, NII, RII, Total), IPO activity timeline, and GMP trend chart
- **January 2026**: Added database fields for investorGainId, subscriptionNii, basisOfAllotmentDate, refundsInitiationDate, creditToDematDate
- **January 2026**: Added API endpoints for live InvestorGain data: /api/ipos/:id/gmp-history/live, /api/ipos/:id/subscription/live, /api/ipos/:id/activity-dates