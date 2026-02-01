# Project Status Summary

## Goals
- Ensure all IPO scrapers are functioning correctly.
- Optimize scrapers for speed and reliability.
- Fix broken scrapers (Zerodha, BSE).

## Running History

### [2026-02-01] Scraper Analysis & Repairs
1.  **Status Check**: Identified 9 scrapers. ran `check-all-scrapers.ts`.
    - **Failures Found**: `zerodha` (404/Empty), `bse` (Timeout), `ipoalerts` (Missing API Key).
    - **Success**: `ipowatch` (Parsed correctly).
2.  **Repairs**:
    - **Zerodha**: Updated URL to `https://zerodha.com/ipo` and implemented table parsing. **Fixed**.
    - **BSE**: Initially optimized Puppeteer strategy (`domcontentloaded`). Improved speed from >30s to ~3s, but still relied on DOM scraping.
3.    - **Optimization**:
    - **BSE API Discovery**: Identified hidden API `https://api.bseindia.com/BseIndiaAPI/api/GetPipoData`.
    - **Resolution**: Implemented hybrid Puppeteer extraction. Node.js direct API fetch failed due to server header violations (`HPE_INVALID_HEADER_TOKEN`). Switched to loading the page in Puppeteer and extracting clean data from AngularJS scope (`ng-repeat` variable), which effectively bypasses the issue while maintaining data structure integrity.
4.  **Performance Optimization**:
    - **Resource Blocking**: Implemented request interception in `zerodha.ts` and `bse.ts` to block images, fonts, and media.
    - **Result**: Reduced bandwidth usage and improved page load stability.
