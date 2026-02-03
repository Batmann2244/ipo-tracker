Reference for all API endpoints

## [Base URL](https://ipoalerts.in/docs/api-reference/#base-url)

All API requests should be made to:

```
https://api.ipoalerts.in
```

## [Endpoints](https://ipoalerts.in/docs/api-reference/#endpoints)

The API currently exposes the following endpoints:

- [`GET /ipos` (Get All IPOs)](https://ipoalerts.in/docs/api-reference/endpoints/get-all-ipos)
- [`GET /ipos/{identifier}` (Get One IPO)](https://ipoalerts.in/docs/api-reference/endpoints/get-one-ipo)


Learn how to authenticate your requests to the API

The API uses API Keys for authenticating requests. You need to include your API key in every request to access the API endpoints.

## [Getting Your API Key](https://ipoalerts.in/docs/api-reference/#getting-your-api-key)

1. Login or Sign up for an account by going over to the [Dashboard](https://ipoalerts.in/signup).
2. Navigate to the **API Keys** section from the top navigation bar.
3. Create a new API key with a descriptive identifier (this is for you to remember what this key was for).
4. Copy your API key and store it securely.

**Security Best Practices for handling API Keys**:

- Never expose your API Keys in public repositories.
- Store your API Key in environment variables.
- Rotate i.e. create new keys and delete old ones periodically to ensure your account is secure.

## [Using Your API Key](https://ipoalerts.in/docs/api-reference/#using-your-api-key)

Include your API key in the `x-api-key` header of your HTTP requests:

```
x-api-key: YOUR_API_KEY
```

### [Example Request](https://ipoalerts.in/docs/api-reference/#example-request)

```
curl -H "x-api-key: YOUR_API_KEY" \
     https://api.ipoalerts.in/ipos?status=open
```

## [What happens if you don't provide a valid API Key?](https://ipoalerts.in/docs/api-reference/#what-happens-if-you-dont-provide-a-valid-api-key)

If you do not include the key, you may receive a partial or an error response depending on the endpoint you're using. The table below summarizes the responses you should expect:

| Endpoint | Condition | Expected Response |
| --- | --- | --- |
| Get All IPOs | API Key is not provided | **Partial response** limited to 1 IPO Object, along with the `responseBody.meta.info` containing the error message. |
|  | Incorrect API Key provided | 401 Unauthorized Error (ERR:INVLDKEY) |
| Get One IPO | API Key is not provided | 401 Unauthorized Error (ERR:INVLDKEY) |
|  | Incorrect API Key provided | 401 Unauthorized Error (ERR:INVLDKEY) |

## [Limitations](https://ipoalerts.in/docs/api-reference/#limitations)

The Free Plan allows you to create only 1 API Key. To have better organization and enforce security across multiple projects, upgrade to a paid plan which allows you to create unlimited API Keys.


Retrieve a paginated list of IPOs

### [Endpoint](https://ipoalerts.in/docs/api-reference/endpoints/#endpoint)

```
GET /ipos
```

### [Parameters](https://ipoalerts.in/docs/api-reference/endpoints/#parameters)

The `includeGmp` parameter is only available to Pro plan users who have opted-in for the GMP addon.

| Parameter | Required | Description | Examples |
| --- | --- | --- | --- |
| `status` | Yes | (`string`) Filter by IPO status | `open`, `upcoming`, `listed`, `closed`, `announced` |
| `type` | No | (`string`) Filter by IPO type i.e. Mainboard / SME / DEBT etc. This also accepts comma-separated string values. | `EQ`, `SME`, `DEBT`, `EQ,SME` |
| `startDate` | No | (`string: YYYY-MM-DD`) Filter IPOs starting from date | `2024-01-01` |
| `endDate` | No | (`string: YYYY-MM-DD`) Filter IPOs ending before date | `2024-12-31` |
| `year` | No | (`string: YYYY`) Filter IPOs by year | `2024` |
| `page` | No | (`number`) Page number for pagination | `1` |
| `limit` | No | (`number`) Number of results per page | `3` |
| `includeGmp` | No | (`string`) If `true`, GMP data is returned in the response | `true` |

### [Example Request](https://ipoalerts.in/docs/api-reference/endpoints/#example-request)

```
curl -H "x-api-key: YOUR_API_KEY" \
     "https://api.ipoalerts.in/ipos?status=open&limit=3&page=1"
```

### [Example Response](https://ipoalerts.in/docs/api-reference/endpoints/#example-response)

To understand the complete response structure, refer to [IPO Object](https://ipoalerts.in/docs/api-reference/ipo-object).

```
{
  "meta": {
    "count": 1,
    "countOnPage": 1,
    "totalPages": 1,
    "page": 1,
    "limit": 1,
    "info": "To get all IPOs, please provide a valid API key. Contact support for more information."
  },
  "ipos": [
    {
      "id": "ipo-123",
      "name": "TechCorp Limited",
      "symbol": "TECHCORP",
      "slug": "techcorp",
      "type": "EQ",
      <...and other fields>
    }
  ]
}
```


Retrieve detailed information about a specific IPO.

### [Endpoint](https://ipoalerts.in/docs/api-reference/endpoints/#endpoint)

```
GET /ipos/{identifier}
```

### [Parameters](https://ipoalerts.in/docs/api-reference/endpoints/#parameters)

The `includeGmp` parameter is only available to Pro plan users who have opted-in for the GMP addon.

| Parameter | Required | Description | Examples |
| --- | --- | --- | --- |
| `identifier` | Yes | (`string`) IPO ID or symbol | `2023552877`, `ADVANCE` |
| `includeGmp` | No | (`string`) If `true`, GMP data is returned in the response | `true` |

### [Example Request](https://ipoalerts.in/docs/api-reference/endpoints/#example-request)

```
curl -H "x-api-key: YOUR_API_KEY" \
     "https://api.ipoalerts.in/ipos/2023552877"
```

### [Example Response](https://ipoalerts.in/docs/api-reference/endpoints/#example-response)

To understand the complete response structure, refer to [IPO Object](https://ipoalerts.in/docs/api-reference/ipo-object).

```
{
  "ipo": {
    "id": "ipo-123",
    "name": "TechCorp Limited",
    "symbol": "TECHCORP",
    "slug": "techcorp",
    "type": "EQ",
    <... and other fields>
  }
}
```


API Reference

# IPO Object

Complete reference for the IPO data model, type definitions and response structures

The IPO object contains comprehensive information about an Initial Public Offering. This document describes all available fields and their data types.

## [Object Structure](https://ipoalerts.in/docs/api-reference/#object-structure)

```
{
  "id": "string",
  "name": "string",
  "symbol": "string",
  "slug": "string",
  "type": "string",
  "startDate": "string",
  "endDate": "string",
  "listingDate": "string",
  "priceRange": "string",
  "listingGain": "string",
  "minQty": "number",
  "minAmount": "number",
  "issueSize": "string",
  "status": "string",
  "logo": "string",
  "prospectusUrl": "string",
  "schedule": "array",
  "about": "string",
  "strengths": "array",
  "risks": "array",
  "mediaCoverageLinks": "array",
  "nseInfoUrl": "string",
  "infoUrl": "string",
  "gmp": "object",
}
```

## [Field Descriptions](https://ipoalerts.in/docs/api-reference/#field-descriptions)

### [Basic Information](https://ipoalerts.in/docs/api-reference/#basic-information)

| Field | Type | Description | Example |
| --- | --- | --- | --- |
| `id` | string | Unique identifier for the IPO | `"ipo-123"` |
| `name` | string | Full name of the company | `"TechCorp Limited"` |
| `symbol` | string | Stock symbol/ticker | `"TECHCORP"` |
| `slug` | string | URL-friendly identifier | `"techcorp"` |
| `type` | string | Type of IPO | `"EQ"`, `"SME"`, `"DEBT"` |
| `logo` | string | Company logo URL | `"https://example.com/logo.png"` |
| `status` | string | Current IPO status | `"open"`, `"closed"`, `"upcoming"`, `"listed"` or `"announced"` |

### [Dates and Timeline](https://ipoalerts.in/docs/api-reference/#dates-and-timeline)

| Field | Type | Description | Example |
| --- | --- | --- | --- |
| `startDate` | string | IPO subscription start date | `"2024-02-01"` |
| `endDate` | string | IPO subscription end date | `"2024-02-05"` |
| `listingDate` | string | Expected listing date | `"2024-02-12"` |

### [Pricing and Financials](https://ipoalerts.in/docs/api-reference/#pricing-and-financials)

| Field | Type | Description | Example |
| --- | --- | --- | --- |
| `priceRange` | string | Price band for the IPO | `"95-100"` |
| `listingGain` | string | Listing gain/loss (in percentage) | `"15.5"`, `"-2"` |
| `minQty` | number | Minimum quantity of shares i.e. lot size | `150` |
| `minAmount` | number | Minimum investment amount | `15000` |
| `issueSize` | string | Total issue size | `"192cr"` |

### [Grey Market Premium (GMP)](https://ipoalerts.in/docs/api-reference/#grey-market-premium-gmp)

This is available as an addon with the paid plans, at an additional cost over and above the base plan. To know more, refer to the [billing](https://ipoalerts.in/dashboard/billing) page in your dashboard.

| Field | Type | Description | Example |
| --- | --- | --- | --- |
| `gmp` | object | Grey Market Premium data with aggregations and sources | See [GMP Object Structure](https://ipoalerts.in/docs/api-reference/#gmp-object-structure) |

### [Detailed Information](https://ipoalerts.in/docs/api-reference/#detailed-information)

| Field | Type | Description | Example |
| --- | --- | --- | --- |
| `about` | string | Company description | `"TechCorp is a leading technology company..."` |
| `strengths` | string\[\] | List of company strengths | `["Strong market position", "Experienced team"]` |
| `risks` | string\[\] | List of investment risks | `["Market volatility", "Regulatory changes"]` |
| `mediaCoverageLinks` | string\[\] | Links to media coverage | `["https://example.com/news1"]` |

### [External Links](https://ipoalerts.in/docs/api-reference/#external-links)

| Field | Type | Description | Example |
| --- | --- | --- | --- |
| `nseInfoUrl` | string | NSE information page URL | `"https://www.nseindia.com/market-data/issue-information?symbol=TECHCORP"` |
| `infoUrl` | string | Company IPO information URL | `"https://example.com/ipo/techcorp"` |
| `prospectusUrl` | string | Link to IPO prospectus | `"https://example.com/prospectus.pdf"` |

### [Schedule Array](https://ipoalerts.in/docs/api-reference/#schedule-array)

The `schedule` field contains an array of important dates and events. Here is an example:

```
{
  "schedule": [
    {
      "date": "2024-02-01",
      "event": "Issue open date"
    },
    {
      "date": "2024-02-05",
      "event": "Issue close date"
    },
    {
      "date": "2024-02-05",
      "event": "UPI mandate deadline"
    },
    {
      "date": "2024-02-08",
      "event": "Allotment finalization"
    },
    {
      "date": "2024-02-09",
      "event": "Refund initiation"
    },
    {
      "date": "2024-02-09",
      "event": "Share credit"
    },
    {
      "date": "2024-02-12",
      "event": "Listing date"
    }
  ]
}
```

## [GMP Object Structure](https://ipoalerts.in/docs/api-reference/#gmp-object-structure)

The `gmp` object will only be returned in the response when `includeGmp` parameter is passed with a value `true`. However, note that this is only available to Pro plan users who have opted-in for the GMP addon.

The `gmp` field contains Grey Market Premium data, which represents the **latest premium** at which IPO shares are trading in the unofficial market before listing. Here is the detailed structure:

```
{
  "gmp": {
    "lastUpdatedAt": "2025-10-17T20:12:03.393+00:00",
    "aggregations": {
      "min": 120,
      "max": 145,
      "mean": 132.5,
      "median": 132.5,
      "mode": 120
    },
    "sources": [
      {
        "name": "ipowatch",
        "gmpPrice": 145
      },
      {
        "name": "investorgain",
        "gmpPrice": 120
      }
    ]
  }
}
```

### [GMP Aggregations](https://ipoalerts.in/docs/api-reference/#gmp-aggregations)

| Field | Type | Description | Example |
| --- | --- | --- | --- |
| `min` | number | Minimum GMP value across all sources | `120` |
| `max` | number | Maximum GMP value across all sources | `145` |
| `mean` | number | Average GMP value across all sources | `132.5` |
| `median` | number | Median GMP value across all sources | `132.5` |
| `mode` | number | Most frequently occurring GMP value (best used when multiple sources report the same value) | `120` |

### [GMP Sources](https://ipoalerts.in/docs/api-reference/#gmp-sources)

Each source object in the `sources` array contains:

| Field | Type | Description | Example |
| --- | --- | --- | --- |
| `name` | string | Name of the GMP data source | `"ipowatch"`, `"investorgain"` |
| `gmpPrice` | number | GMP value from this specific source | `145` |

## [Status Values](https://ipoalerts.in/docs/api-reference/#status-values)

| Status | Description |
| --- | --- |
| `open` | IPO is currently open for subscription |
| `closed` | IPO subscription period has ended |
| `upcoming` | IPO is scheduled but not yet open for subscription |
| `listed` | IPO has been listed on the exchange in the last 3 days |
| `announced` | IPO has been announced but there is no subscription start or end date known |

## [Type Values](https://ipoalerts.in/docs/api-reference/#type-values)

| Type | Description |
| --- | --- |
| `EQ` | Equity IPO i.e. Mainboard |
| `DEBT` | Debt Offering |
| `SME` | Small and Medium Enterprise (SME) IPO |

## [Example Response](https://ipoalerts.in/docs/api-reference/#example-response)

```
{
  "id": "ipo-123",
  "name": "TechCorp Limited",
  "symbol": "TECHCORP",
  "slug": "techcorp",
  "type": "EQ",
  "startDate": "2024-03-01",
  "endDate": "2024-03-05",
  "listingDate": "2024-03-12",
  "priceRange": "95-100",
  "listingGain": null,
  "minQty": 150,
  "minAmount": 15000,
  "issueSize": "192cr",
  "status": "open",
  "logo": "https://example.com/techcorp-logo.png",
  "prospectusUrl": "https://example.com/techcorp-prospectus.pdf",
  "schedule": [
    {
      "date": "2024-03-01",
      "event": "Issue open date"
    },
    {
      "date": "2024-03-05",
      "event": "Issue close date"
    },
    {
      "date": "2024-03-05",
      "event": "UPI mandate deadline"
    },
    {
      "date": "2024-03-08",
      "event": "Allotment finalization"
    },
    {
      "date": "2024-03-09",
      "event": "Refund initiation"
    },
    {
      "date": "2024-03-09",
      "event": "Share credit"
    },
    {
      "date": "2024-03-12",
      "event": "Listing date"
    }
  ],
  "about": "TechCorp is a leading technology company engaged in the development of innovative software solutions. Founded with a focus on digital transformation, the company provides enterprise-grade applications and cloud services to businesses worldwide. TechCorp operates through both domestic and international markets, serving clients across various industries including finance, healthcare, and manufacturing. The company integrates cutting-edge technology with research and development to deliver scalable and secure solutions. By leveraging its technical expertise and strategic partnerships, TechCorp aims to drive digital innovation while addressing the evolving needs of modern businesses.",
  "strengths": [
    "Strong R&D capabilities with focus on emerging technologies",
    "Experienced management team with proven track record",
    "Growing market presence in key industry verticals",
    "Scalable cloud infrastructure with global reach",
    "Strategic partnerships with leading technology providers"
  ],
  "risks": [
    "Intense competition from established technology players",
    "Technology disruption risks and rapid market changes",
    "Dependence on key personnel and talent retention",
    "Cybersecurity threats and data protection challenges",
    "Regulatory changes affecting technology sector"
  ],
  "mediaCoverageLinks": [
    "https://example.com/techcorp-news1",
    "https://example.com/techcorp-news2"
  ],
  "nseInfoUrl": "https://www.nseindia.com/market-data/issue-information?symbol=TECHCORP&type=Active&series=EQ#ci_info",
  "infoUrl": "https://example.com/ipo/techcorp",
  "gmp": {
    "aggregations": {
      "min": 120,
      "max": 145,
      "mean": 132.5,
      "median": 132.5,
      "mode": 120
    },
    "sources": [
      {
        "name": "ipowatch",
        "gmpPrice": 145
      },
      {
        "name": "investorgain",
        "gmpPrice": 120
      }
    ]
  }
}
```

## [Data Types](https://ipoalerts.in/docs/api-reference/#data-types)

### [String Fields](https://ipoalerts.in/docs/api-reference/#string-fields)

- All text fields are returned as strings
- Date fields are in ISO 8601 format (`YYYY-MM-DD`)
- Timestamps are in ISO 8601 format with timezone (`YYYY-MM-DDTHH:mm:ssZ`)

### [Number Fields](https://ipoalerts.in/docs/api-reference/#number-fields)

- `minQty`: Integer representing minimum quantity
- `minAmount`: Integer representing minimum amount in rupees

### [Array Fields](https://ipoalerts.in/docs/api-reference/#array-fields)

- `schedule`: Array of objects with `date` and `event` properties
- `strengths`: Array of strings
- `risks`: Array of strings
- `mediaCoverageLinks`: Array of URLs

### [GMP Object Fields](https://ipoalerts.in/docs/api-reference/#gmp-object-fields)

- `gmp.aggregations`: Object containing statistical aggregations of GMP values
- `gmp.sources`: Array of objects containing source-specific GMP data

## [TypeScript Interface](https://ipoalerts.in/docs/api-reference/#typescript-interface)

```
interface ScheduleItem {
  event: string;
  date: string;
}

interface GmpAggregations {
  min: number;
  max: number;
  mean: number;
  median: number;
  mode: number;
}

interface GmpSource {
  name: string;
  gmpPrice: number;
}

interface Gmp {
  aggregations: GmpAggregations;
  sources: GmpSource[];
}

interface Ipo {
  id: string;
  name: string;
  symbol: string;
  slug: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  listingDate?: string;
  priceRange?: string;
  listingGain?: string;
  minQty?: number;
  minAmount?: number;
  issueSize?: string;
  status?: string;
  logo?: string;
  prospectusUrl?: string;
  schedule?: ScheduleItem[];
  about?: string;
  strengths?: string[];
  risks?: string[];
  mediaCoverageLinks?: string[];
  nseInfoUrl?: string;
  infoUrl?: string;
  gmp?: Gmp;
}
```

[

Authentication

Learn how to authenticate your requests to the API

](https://ipoalerts.in/docs/api-reference/authentication)[

](https://ipoalerts.in/docs/api-reference/pagination)


Learn how to paginate through IPO data using the API

The IPO API supports pagination to help you efficiently retrieve large datasets. All list endpoints return paginated results with metadata to help you navigate through the data.

## [How Pagination Works](https://ipoalerts.in/docs/api-reference/#how-pagination-works)

The API follows standard pagination conventions using `page` and `limit` query parameters:

- **`page`**: The page number to retrieve (starts from 1)
- **`limit`**: The number of results per page (default: 3)

For free plans, the maximum allowed value for the `limit` parameter is 1. However, you can still make requests (within the plan's limits) to iterate over all the available pages and fetch all the IPOs.

## [Basic Usage](https://ipoalerts.in/docs/api-reference/#basic-usage)

### [Get First Page](https://ipoalerts.in/docs/api-reference/#get-first-page)

```
curl -H "x-api-key: YOUR_API_KEY" \
     "https://api.ipoalerts.in/ipos?status=open&limit=3&page=1"
```

### [Get Subsequent Pages](https://ipoalerts.in/docs/api-reference/#get-subsequent-pages)

```
# Get the next 3 IPOs
curl -H "x-api-key: YOUR_API_KEY" \
     "https://api.ipoalerts.in/ipos?status=open&limit=3&page=2"

# Get the next 3 IPOs after that
curl -H "x-api-key: YOUR_API_KEY" \
     "https://api.ipoalerts.in/ipos?status=open&limit=3&page=3"
```

## [Response Structure](https://ipoalerts.in/docs/api-reference/#response-structure)

Every paginated response includes a `meta` object with pagination information:

```
{
  "meta": {
    "count": 10,
    "countOnPage": 3,
    "totalPages": 4,
    "page": 1,
    "limit": 3
  },
  "ipos": [
    // ... IPO objects
  ]
}
```

### [Meta Fields Explained](https://ipoalerts.in/docs/api-reference/#meta-fields-explained)

| Field | Type | Description |
| --- | --- | --- |
| `count` | number | Total number of IPOs matching your query |
| `countOnPage` | number | Number of IPOs returned in current page |
| `totalPages` | number | Total number of pages available |
| `page` | number | Current page number |
| `limit` | number | Number of results per page requested |

## [Pagination Examples](https://ipoalerts.in/docs/api-reference/#pagination-examples)

### [Example 1: 3 IPOs per page](https://ipoalerts.in/docs/api-reference/#example-1-3-ipos-per-page)

If there are 10 open IPOs and you set `limit=3`:

- `page=1`: Returns IPOs 1-3, `totalPages=4`
- `page=2`: Returns IPOs 4-6
- `page=3`: Returns IPOs 7-9
- `page=4`: Returns IPO 10

### [Example 2: 1 IPO per page](https://ipoalerts.in/docs/api-reference/#example-2-1-ipo-per-page)

If there are 10 open IPOs and you set `limit=1`:

- `page=1`: Returns IPO 1, `totalPages=10`
- `page=2`: Returns IPO 2
- `page=3`: Returns IPO 3
- ...and so on until `page=10`

## [Limitations](https://ipoalerts.in/docs/api-reference/#limitations)

### [Free Plan](https://ipoalerts.in/docs/api-reference/#free-plan)

- **Maximum limit**: 1 IPO per request
- **Workaround**: You can still get all IPOs by iterating through pages, but it will consume more requests

### [Paid Plans](https://ipoalerts.in/docs/api-reference/#paid-plans)

- **Higher limits**: Can request more IPOs per page
- **Efficiency**: Fewer requests needed to get all data

## [Best Practices](https://ipoalerts.in/docs/api-reference/#best-practices)

### [1\. Always Check Total Pages](https://ipoalerts.in/docs/api-reference/#1-always-check-total-pages)

```
const response = await fetch('https://api.ipoalerts.in/ipos?status=open&limit=10&page=1', {
  headers: { 'x-api-key': 'YOUR_API_KEY' }
});
const data = await response.json();

console.log(\`Total pages: ${data.meta.totalPages}\`);
console.log(\`Total IPOs: ${data.meta.count}\`);
```

### [2\. Iterate Through All Pages](https://ipoalerts.in/docs/api-reference/#2-iterate-through-all-pages)

```
async function getAllIPOs(status = 'open', limit = 10) {
  const allIPOs = [];
  let currentPage = 1;
  let totalPages = 1;

  do {
    const response = await fetch(
      \`https://api.ipoalerts.in/ipos?status=${status}&limit=${limit}&page=${currentPage}\`,
      { headers: { 'x-api-key': 'YOUR_API_KEY' } }
    );
    
    const data = await response.json();
    allIPOs.push(...data.ipos);
    
    totalPages = data.meta.totalPages;
    currentPage++;
  } while (currentPage <= totalPages);

  return allIPOs;
}
```

### [3\. Handle Edge Cases](https://ipoalerts.in/docs/api-reference/#3-handle-edge-cases)

```
// Check if there are more pages
if (data.meta.page < data.meta.totalPages) {
  console.log('More pages available');
}

// Check if current page is empty
if (data.meta.countOnPage === 0) {
  console.log('No IPOs found on this page');
}
```


Understanding API rate limits

# [Rate Limits](https://ipoalerts.in/docs/api-reference/#rate-limits)

The API implements rate limiting to ensure fair usage and maintain service quality for all users.

## [Rate Limit Overview](https://ipoalerts.in/docs/api-reference/#rate-limit-overview)

| Plan | Requests per Minute | Requests per Hour | Requests per Day |
| --- | --- | --- | --- |
| Free | 6 | 360 | 8640 |
| Pro | As per plan | As per plan \* 60 | As per plan \* 60 \* 24 |
| Enterprise | Custom | Custom | Custom |

## [Rate Limit Exceeded](https://ipoalerts.in/docs/api-reference/#rate-limit-exceeded)

When you exceed the rate limit, you'll receive a `429 Too Many Requests` response:

```
{
  "status": "429",
  "title": "Too Many Requests",
  "detail": "You are exceeding the permitted number of requests allowed per minute.",
  "meta": {
    "quotaPerMinute": 6,
    "expiresIn": 45
  }
}
```

### [Response Fields](https://ipoalerts.in/docs/api-reference/#response-fields)

| Field | Description |
| --- | --- |
| `status` | HTTP status code (429) |
| `title` | Error title |
| `detail` | Human-readable error message |
| `meta.quotaPerMinute` | Your current rate limit |
| `meta.expiresIn` | Seconds until you can make another request |Quick start examples for integrating with the API using TypeScript

This page provides practical Quick start examples for integrating with the API using TypeScript.

## [Basic Client](https://ipoalerts.in/docs/api-reference/quickstart-examples/#basic-client)

```
interface IPOResponse {
  meta: {
    count: number;
    countOnPage: number;
    totalPages: number;
    page: number;
    limit: number;
  };
  ipos: IPO[];
}

interface IPO {
  id: string;
  name: string;
  symbol: string;
  slug: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  listingDate?: string;
  priceRange?: string;
  listingGain?: string;
  minQty?: number;
  minAmount?: number;
  issueSize?: string;
  status?: string;
  logo?: string;
  prospectusUrl?: string;
  schedule?: ScheduleItem[];
  about?: string;
  strengths?: string[];
  risks?: string[];
  mediaCoverageLinks?: string[];
  nseInfoUrl?: string;
  infoUrl?: string;
}

interface ScheduleItem {
  event: string;
  date: string;
}

interface IPODetailResponse {
  ipo: IPO;
}

class IPOAlertsClient {
  private apiKey: string;
  private baseURL: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.ipoalerts.in';
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(\`${this.baseURL}${endpoint}\`, {
      ...options,
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(\`HTTP error: ${response.status}\`);
    }

    return response.json();
  }

  async getIPOs(
    status?: string,
    type?: string,
    page: number = 1,
    limit: number = 10
  ): Promise<IPOResponse> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (type) params.append('type', type);
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    return this.makeRequest<IPOResponse>(\`/ipos?${params}\`);
  }

  async getIPO(identifier: string): Promise<IPO> {
    const response = await this.makeRequest<IPODetailResponse>(\`/ipos/${identifier}\`);
    return response.ipo;
  }
}

// Usage
async function main() {
  const client = new IPOAlertsClient('YOUR_API_KEY');

  try {
    // Get upcoming IPOs
    const ipos = await client.getIPOs('upcoming', 'EQ', 1, 10);
    console.log(\`Found ${ipos.meta.count} upcoming equity IPOs\`);

    ipos.ipos.forEach(ipo => {
      console.log(\`${ipo.name} (${ipo.symbol}) - ${ipo.priceRange}\`);
    });

    // Get specific IPO
    const ipoDetails = await client.getIPO('example-company-limited');
    console.log(\`IPO Details: ${ipoDetails.name}\`);

  } catch (error) {
    console.error('Error:', error);
  }
}

main();
```

## [React Hook with TypeScript](https://ipoalerts.in/docs/api-reference/quickstart-examples/#react-hook-with-typescript)

```
import { useState, useEffect, useCallback } from 'react';

interface UseIPOAlertsReturn {
  loading: boolean;
  error: string | null;
  data: IPOResponse | null;
  getIPOs: (filters?: IPOFilters) => Promise<IPOResponse>;
  getIPO: (identifier: string) => Promise<IPO>;
}

interface IPOFilters {
  status?: string;
  type?: string;
  page?: number;
  limit?: number;
}

const useIPOAlerts = (apiKey: string): UseIPOAlertsReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<IPOResponse | null>(null);

  const makeRequest = useCallback(async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(\`https://api.ipoalerts.in${endpoint}\`, {
        ...options,
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      if (!response.ok) {
        throw new Error(\`HTTP error! status: ${response.status}\`);
      }

      const result = await response.json();
      setData(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  const getIPOs = useCallback(async (filters: IPOFilters = {}): Promise<IPOResponse> => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.type) params.append('type', filters.type);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    
    return makeRequest<IPOResponse>(\`/ipos?${params}\`);
  }, [makeRequest]);

  const getIPO = useCallback(async (identifier: string): Promise<IPO> => {
    const response = await makeRequest<IPODetailResponse>(\`/ipos/${identifier}\`);
    return response.ipo;
  }, [makeRequest]);

  return {
    loading,
    error,
    data,
    getIPOs,
    getIPO
  };
};

export default useIPOAlerts;
```

[

Swift Examples

Quick start examples for integrating with the API using Swift

](https://ipoalerts.in/docs/api-reference/quickstart-examples/swift)