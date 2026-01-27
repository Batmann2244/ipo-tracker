# NSETools (Node.js)

Node.js toolkit for extracting public data from National Stock Exchange of India (NSE). This repository now focuses solely on the JavaScript implementation.

## Highlights

- Real-time quotes for equities and indices
- Market breadth, top gainers/losers, and index summaries
- IPO views (upcoming/current) with enhanced details
- Console dashboards and example scripts

## Requirements

- Node.js >= 18 (tested on v22)
- Windows, macOS, or Linux

## Quick Start

```bash
# From repo root
cd nsetools-js
npm install

# Run a basic example
node examples/advanced-usage.js

# Live subscription tracker (IPO)
node examples/live-subscription-tracker.js
```

## Usage (Programmatic)

```javascript
// examples/basic.js
import Nse from "./src/nse.js";

const nse = new Nse();

// Stock quote
const quote = await nse.getQuote("RELIANCE");
console.log(quote.priceInfo.lastPrice);

// Index summary
const indices = await nse.getAllIndices();
console.log(indices[0]);

// Top gainers
const gainers = await nse.getTopGainers();
console.table(gainers.slice(0, 5));
```

## Project Structure

- nsetools-js/
  - src/nse.js: main client
  - src/urls.js: endpoints
  - examples/: ready-to-run scripts
  - README files for IPO and usage guides

## Notes on Data Sources

- Data is retrieved from publicly accessible NSE endpoints.
- Some pages (e.g., IPO upcoming issues) are dynamically rendered. Examples include approaches and limitations.
- Respect NSE terms of use; avoid excessive automation.

## Disclaimer

- For educational and informational use only; not investment advice.
- Not affiliated with NSE or any financial institution.
- Use responsibly and comply with applicable terms and laws.

## License

MIT License. See LICENSE.
