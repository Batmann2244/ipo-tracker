# IPO Data Schema Documentation

This document describes the complete data structure expected by the frontend to fully render an IPO.

## Complete IPO Object

```json
{
  "id": 1,
  "symbol": "EXAMPLE",
  "companyName": "Example Technologies Ltd",
  "priceRange": "₹450 - ₹475",
  "totalShares": "1,50,00,000",
  "expectedDate": "2026-01-25",
  "status": "open",
  "description": "Example Technologies is a leading provider of enterprise software solutions specializing in AI-powered analytics.",
  "sector": "Technology",

  "revenueGrowth": 32.5,
  "ebitdaMargin": 28.4,
  "patMargin": 18.2,
  "roe": 22.5,
  "roce": 26.8,
  "debtToEquity": 0.45,

  "peRatio": 35.2,
  "pbRatio": 4.8,
  "sectorPeMedian": 28.5,

  "issueSize": "₹1,200 Cr",
  "freshIssue": 65.0,
  "ofsRatio": 0.35,
  "lotSize": 31,
  "minInvestment": "₹14,725",

  "gmp": 125,
  "subscriptionQib": 45.2,
  "subscriptionHni": 28.5,
  "subscriptionRetail": 12.8,

  "promoterHolding": 75.0,
  "postIpoPromoterHolding": 62.5,

  "fundamentalsScore": 7.8,
  "valuationScore": 6.2,
  "governanceScore": 8.5,
  "overallScore": 7.4,

  "riskLevel": "moderate",
  "redFlags": [
    "P/E ratio 23% above sector median",
    "OFS ratio above 30%"
  ],
  "pros": [
    "Strong revenue growth (32.5% CAGR)",
    "Healthy ROE (22.5%)",
    "Low debt levels (D/E: 0.45)",
    "Positive GMP indicating market confidence"
  ],

  "aiSummary": "Example Technologies shows strong fundamentals with consistent revenue growth and healthy profitability metrics. The company operates in a high-growth sector with significant market opportunity.",
  "aiRecommendation": "SUBSCRIBE - Suitable for moderate risk investors looking for technology sector exposure.",

  "createdAt": "2026-01-20T10:00:00.000Z",
  "updatedAt": "2026-01-22T14:30:00.000Z"
}
```

## Field Descriptions

### Basic Information

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer | Yes | Auto-generated primary key |
| `symbol` | string | Yes | Unique stock symbol (e.g., "EXAMPLE") |
| `companyName` | string | Yes | Full company name |
| `priceRange` | string | Yes | Price band (e.g., "₹450 - ₹475") |
| `totalShares` | string | No | Total shares offered |
| `expectedDate` | date | No | Expected listing/open date (YYYY-MM-DD) |
| `status` | string | Yes | "upcoming", "open", or "closed" |
| `description` | string | No | Company description |
| `sector` | string | No | Industry sector |

### Financial Metrics

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| `revenueGrowth` | float | % | 3-year revenue CAGR |
| `ebitdaMargin` | float | % | EBITDA margin |
| `patMargin` | float | % | Profit After Tax margin |
| `roe` | float | % | Return on Equity |
| `roce` | float | % | Return on Capital Employed |
| `debtToEquity` | float | ratio | Debt to Equity ratio |

### Valuation Metrics

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| `peRatio` | float | ratio | Price to Earnings ratio |
| `pbRatio` | float | ratio | Price to Book ratio |
| `sectorPeMedian` | float | ratio | Median P/E for the sector |

### Offer Details

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| `issueSize` | string | - | Total issue size (e.g., "₹1,200 Cr") |
| `freshIssue` | float | % | Percentage of fresh issue |
| `ofsRatio` | float | 0-1 | Offer for Sale ratio |
| `lotSize` | integer | shares | Minimum lot size |
| `minInvestment` | string | - | Minimum investment amount |

### Market Sentiment

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| `gmp` | integer | ₹ | Grey Market Premium in Rupees |
| `subscriptionQib` | float | times | QIB subscription ratio |
| `subscriptionHni` | float | times | HNI/NII subscription ratio |
| `subscriptionRetail` | float | times | Retail subscription ratio |

### Promoter Information

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| `promoterHolding` | float | % | Pre-IPO promoter holding |
| `postIpoPromoterHolding` | float | % | Post-IPO promoter holding |

### Computed Scores

| Field | Type | Range | Description |
|-------|------|-------|-------------|
| `fundamentalsScore` | float | 0-10 | Score based on financial health (40% weight) |
| `valuationScore` | float | 0-10 | Score based on valuation metrics (35% weight) |
| `governanceScore` | float | 0-10 | Score based on governance factors (25% weight) |
| `overallScore` | float | 0-10 | Weighted average of all scores |

### Risk Assessment

| Field | Type | Description |
|-------|------|-------------|
| `riskLevel` | string | "conservative", "moderate", or "aggressive" |
| `redFlags` | string[] | Array of risk warning messages |
| `pros` | string[] | Array of positive points |

### AI Analysis

| Field | Type | Description |
|-------|------|-------------|
| `aiSummary` | string | AI-generated analysis summary |
| `aiRecommendation` | string | AI recommendation (SUBSCRIBE/AVOID/NEUTRAL) |

## Related Data Objects

### GMP History Entry

```json
{
  "id": 1,
  "ipoId": 1,
  "gmp": 125,
  "gmpPercentage": 26.3,
  "recordedAt": "2026-01-22T14:30:00.000Z"
}
```

### Subscription Update

```json
{
  "id": 1,
  "ipoId": 1,
  "qibSubscription": 45.2,
  "niiSubscription": 28.5,
  "retailSubscription": 12.8,
  "totalSubscription": 32.5,
  "recordedAt": "2026-01-22T16:00:00.000Z"
}
```

### Peer Company

```json
{
  "id": 1,
  "ipoId": 1,
  "companyName": "TCS Ltd",
  "symbol": "TCS",
  "marketCap": 1250000,
  "peRatio": 28.5,
  "pbRatio": 12.3,
  "roe": 45.2,
  "roce": 52.8,
  "revenueGrowth": 12.5,
  "ebitdaMargin": 26.8,
  "debtToEquity": 0.02,
  "createdAt": "2026-01-20T10:00:00.000Z"
}
```

### Fund Utilization Entry

```json
{
  "id": 1,
  "ipoId": 1,
  "category": "capex",
  "plannedAmount": 450.0,
  "plannedPercentage": 37.5,
  "actualAmount": null,
  "actualPercentage": null,
  "status": "planned",
  "notes": "Expansion of manufacturing facilities",
  "createdAt": "2026-01-20T10:00:00.000Z",
  "updatedAt": "2026-01-20T10:00:00.000Z"
}
```

Fund categories: `debt_repayment`, `capex`, `working_capital`, `acquisitions`, `general_corporate`

### IPO Timeline Event

```json
{
  "id": 1,
  "ipoId": 1,
  "eventType": "open_date",
  "eventDate": "2026-01-25",
  "eventTime": "10:00 AM",
  "description": "IPO opens for subscription",
  "isConfirmed": true,
  "createdAt": "2026-01-20T10:00:00.000Z"
}
```

Event types: `drhp_filing`, `price_band`, `open_date`, `close_date`, `allotment`, `refund`, `listing`

## API Response Examples

### GET /api/ipos

```json
[
  {
    "id": 1,
    "symbol": "EXAMPLE",
    "companyName": "Example Technologies Ltd",
    "priceRange": "₹450 - ₹475",
    "status": "open",
    "sector": "Technology",
    "gmp": 125,
    "overallScore": 7.4,
    "riskLevel": "moderate",
    "subscriptionRetail": 12.8
  }
]
```

### GET /api/ipos/:id

Returns the complete IPO object as shown above.

### GET /api/ipos/:id/gmp-history

```json
[
  { "gmp": 100, "gmpPercentage": 21.0, "recordedAt": "2026-01-20T10:00:00.000Z" },
  { "gmp": 110, "gmpPercentage": 23.1, "recordedAt": "2026-01-21T10:00:00.000Z" },
  { "gmp": 125, "gmpPercentage": 26.3, "recordedAt": "2026-01-22T10:00:00.000Z" }
]
```

### GET /api/ipos/:id/peers

```json
[
  {
    "companyName": "TCS Ltd",
    "symbol": "TCS",
    "peRatio": 28.5,
    "roe": 45.2,
    "roce": 52.8
  },
  {
    "companyName": "Infosys Ltd",
    "symbol": "INFY",
    "peRatio": 24.2,
    "roe": 32.8,
    "roce": 38.5
  }
]
```

### GET /api/ipos/:id/subscriptions

```json
[
  {
    "qibSubscription": 15.2,
    "niiSubscription": 8.5,
    "retailSubscription": 4.2,
    "totalSubscription": 10.5,
    "recordedAt": "2026-01-25T12:00:00.000Z"
  },
  {
    "qibSubscription": 45.2,
    "niiSubscription": 28.5,
    "retailSubscription": 12.8,
    "totalSubscription": 32.5,
    "recordedAt": "2026-01-25T16:00:00.000Z"
  }
]
```

### GET /api/ipos/:id/fund-utilization

```json
[
  { "category": "capex", "plannedPercentage": 37.5, "status": "planned" },
  { "category": "debt_repayment", "plannedPercentage": 25.0, "status": "planned" },
  { "category": "working_capital", "plannedPercentage": 20.0, "status": "planned" },
  { "category": "general_corporate", "plannedPercentage": 17.5, "status": "planned" }
]
```

### GET /api/ipos/:id/timeline

```json
[
  { "eventType": "drhp_filing", "eventDate": "2026-01-10", "isConfirmed": true },
  { "eventType": "price_band", "eventDate": "2026-01-20", "isConfirmed": true },
  { "eventType": "open_date", "eventDate": "2026-01-25", "isConfirmed": true },
  { "eventType": "close_date", "eventDate": "2026-01-28", "isConfirmed": true },
  { "eventType": "allotment", "eventDate": "2026-01-30", "isConfirmed": false },
  { "eventType": "listing", "eventDate": "2026-02-03", "isConfirmed": false }
]
```

## Minimum Required Fields

To display an IPO card on the dashboard, these fields are required:

```json
{
  "id": 1,
  "symbol": "EXAMPLE",
  "companyName": "Example Technologies Ltd",
  "priceRange": "₹450 - ₹475",
  "status": "open"
}
```

## Recommended Fields for Full Experience

For a complete IPO detail page with all visualizations:

| Section | Required Fields |
|---------|-----------------|
| Basic Info | symbol, companyName, priceRange, status, sector, description |
| Score Ring | fundamentalsScore, valuationScore, governanceScore, overallScore |
| Risk Badge | riskLevel, redFlags, pros |
| GMP Display | gmp |
| Subscription | subscriptionQib, subscriptionHni, subscriptionRetail |
| Financials | revenueGrowth, ebitdaMargin, roe, roce, debtToEquity |
| Valuation | peRatio, pbRatio, sectorPeMedian |
| Offer Details | issueSize, lotSize, minInvestment, ofsRatio |
| Promoter | promoterHolding, postIpoPromoterHolding |
| AI Analysis | aiSummary, aiRecommendation |

## Score Calculation Reference

### Fundamentals Score (0-10)
- Revenue Growth > 20%: +2
- EBITDA Margin > 20%: +2
- ROE > 15%: +2
- ROCE > 18%: +2
- D/E < 1: +2

### Valuation Score (0-10)
- P/E below sector median: +4
- P/E within 20% of median: +2
- P/B ratio reasonable: +3
- GMP positive: +3

### Governance Score (0-10)
- OFS ratio < 25%: +3
- Promoter holding > 50%: +3
- Low stake dilution: +2
- Clean corporate history: +2

### Risk Level Determination
- Conservative: overallScore >= 7.0 AND redFlags.length <= 1
- Moderate: overallScore >= 5.0 OR redFlags.length <= 3
- Aggressive: overallScore < 5.0 OR redFlags.length > 3
