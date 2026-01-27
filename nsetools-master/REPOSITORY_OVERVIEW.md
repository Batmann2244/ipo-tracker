# NSETools Repository Overview

## Project Description
**NSETools** is a Python library for extracting real-time and historical data from the National Stock Exchange (NSE) of India. It provides a simple interface to fetch stock quotes, indices information, market movers (top gainers/losers), and derivatives data without requiring authentication or bypassing any security measures.

**Version:** 2.0.1  
**License:** MIT  
**Author:** Vivek Jha  
**Repository Root:** `c:\Users\DELL\Desktop\nsetools-master`

---

## Repository Structure

```
nsetools-master/
├── src/nsetools/              # Main source code
│   ├── __init__.py           # Package initialization, exports Nse class
│   ├── nse.py                # Main Nse class with all APIs (591 lines)
│   ├── bases.py              # AbstractBaseExchange base class
│   ├── urls.py               # URL constants for all NSE endpoints
│   ├── ua.py                 # Session management with caching
│   ├── downloader.py         # Bhavcopy (historical data) downloader
│   ├── datemgr.py            # Date utilities and business day calculations
│   ├── cleaners.py           # Data type conversion utilities
│   ├── utils.py              # General utility functions (374 lines)
│   └── errors.py             # Custom exception classes
├── tests/                     # Test suite
│   ├── test_stocks.py        # Stock API tests
│   ├── test_index.py         # Index API tests
│   ├── test_derivatives.py   # Derivatives API tests
│   ├── test_session.py       # Session management tests
│   ├── test_utils.py         # Utility function tests
│   ├── client.py             # Client implementations
│   ├── client_requests.py    # Requests-based client
│   ├── client_urllib.py      # urllib-based client
│   ├── cj_method.py          # Cookie jar method test
│   ├── commands.md           # Test commands reference
│   └── todo.md               # Test-related TODO items
├── exp/                      # Experimental code
│   ├── ohl.py                # Open-High-Low experimental script
│   ├── solution_1.py         # JSON parsing solution 1
│   └── solution_2.py         # JSON parsing solution 2 (62 lines)
├── pyproject.toml            # Modern Python project config
├── setup.py                  # Legacy setup configuration
├── Makefile                  # Build and test commands
├── README.md                 # Main documentation (539 lines)
└── LICENSE                   # MIT License
```

---

## Key Components

### 1. **NSE Class** ([nse.py](src/nsetools/nse.py))
Main class implementing all functionality. Extends `AbstractBaseExchange`.

#### Stock APIs
- `get_stock_codes()` - List all NSE traded stocks
- `is_valid_code(code)` - Validate if a stock code exists
- `get_quote(code, all_data=False)` - Get real-time stock quote with price, change, VWAP, high/low range
- `get_52_week_high()` - Stocks hitting 52-week highs
- `get_52_week_low()` - Stocks hitting 52-week lows

#### Index APIs
- `get_index_quote(index="NIFTY 50")` - Get quote for specific index
- `get_index_list()` - List all available indices
- `get_all_index_quote()` - Get quotes for all indices in one call
- `get_top_gainers(index="NIFTY")` - Top gaining stocks
- `get_top_losers(index="NIFTY")` - Top losing stocks
- `get_advances_declines(index)` - Advance/decline data
- `get_stocks_in_index(index)` - List stocks in an index
- `get_stock_quote_in_index(index, include_index=False)` - All quotes for stocks in index

#### Derivatives APIs
- `get_future_quote(code, expiry_date=None)` - Futures contract data with open interest, volatility

### 2. **Session Management** ([ua.py](src/nsetools/ua.py))
- `Session` class handles HTTP requests with:
  - Browser-like headers to avoid blocking
  - Session refresh mechanism (default 120 seconds)
  - Response caching with timeout
  - Automatic session initialization

### 3. **Data Utilities** ([utils.py](src/nsetools/utils.py), [cleaners.py](src/nsetools/cleaners.py))
- `cast_intfloat_string_values_to_intfloat()` - Recursively converts string numbers to int/float
- `parse_values()` - Parse JSON with date and numeric conversions
- `byte_adaptor()` - Python 2/3 compatibility for file streams
- `js_adaptor()` - Convert JS literals (true, false, NaN) to Python equivalents

### 4. **Date Management** ([datemgr.py](src/nsetools/datemgr.py))
- `mkdate()` - Parse date strings (supports "today", "yesterday", fuzzy dates)
- `get_nearest_business_day()` - Handle weekends and Indian holidays
- `is_known_holiday()` - Check if date is NSE holiday
- `get_date_range()` - Generate date ranges excluding non-trading days
- Supports holidays: Republic Day, Labor Day, Independence Day, Gandhi Jayanti, Christmas

### 5. **URL Constants** ([urls.py](src/nsetools/urls.py))
Centralized NSE API endpoints:
- Quote URLs: `nseindia.com/api/quote-equity`
- Index URLs: `nseindia.com/api/allIndices`
- Top movers: `/api/live-analysis-variations?index=gainers/loosers`
- 52-week data: `/api/live-analysis-data-52weekhighstock`
- Historical: `nsearchives.nseindia.com/content/equities/EQUITY_L.csv`

### 6. **Error Handling** ([errors.py](src/nsetools/errors.py))
- `BhavcopyNotAvailableError` - Market closed date error
- `DateFormatError` - Invalid date format error

### 7. **Historical Data Downloader** ([downloader.py](src/nsetools/downloader.py))
- `BaseBhavcopyDownloader` - Download historical OHLC data (bhavcopy)
- Supports date ranges with skip_dates parameter
- Auto-handles weekends and market holidays

---

## Dependencies
- **requests** - HTTP library for API calls
- **six** - Python 2/3 compatibility
- **dateutils** - Advanced date parsing (pytz, relativedelta)

Optional (dev):
- **pytest** - Testing framework
- **pytest-cov** - Code coverage
- **ipython** - Interactive shell
- **build**, **setuptools**, **wheel**, **twine** - Packaging

---

## API Response Format

### Stock Quote Response
```python
{
    'lastPrice': 5189.1,
    'change': 70.55,
    'pChange': 1.38,
    'previousClose': 5118.55,
    'open': 5160,
    'close': 5187.65,
    'vwap': 5162.91,
    'lowerCP': 4606.7,
    'upperCP': 5630.4,
    'pPriceBand': 'No Band',
    'basePrice': 5118.55,
    'intraDayHighLow': {'min': 5101, 'max': 5218.45, 'value': 5189.1},
    'weekHighLow': {'min': 4890}
    # ... additional fields
}
```

### Index Quote Response
```python
{
    'key': 'BROAD MARKET INDICES',
    'index': 'NIFTY 50',
    'indexSymbol': 'NIFTY 50',
    'last': 22508.75,
    'variation': 111.55,
    'percentChange': 0.5,
    'open': 22353.15,
    'high': 22577.0,
    'low': 22353.15,
    'previousClose': 22397.2,
    'yearHigh': 26277.35,
    'yearLow': 21281.45,
    'advances': 35,
    'declines': 15
}
```

---

## Testing

### Test Files
- **test_stocks.py** - Tests get_quote, get_stock_codes, is_valid_code, 52-week high/low
- **test_index.py** - Tests index APIs, stocks in index
- **test_derivatives.py** - Tests future quotes
- **test_session.py** - Tests session management and caching
- **test_utils.py** - Tests data type conversions

### Running Tests
```bash
make dev          # Install dependencies
make test         # Run all tests with coverage (terminal report)
make cov          # Run tests with XML coverage report
make clean        # Remove cache files
make build        # Build package distribution
```

---

## Configuration & Build

### pyproject.toml
- Modern Python packaging standard
- Version: 2.0.1
- Build backend: setuptools
- Includes package discovery configuration

### setup.py
- Legacy setup configuration
- Maintains backward compatibility
- Same dependencies and metadata

### Makefile
- **help** - Display available commands
- **dev** - Install dev dependencies
- **test** - Run pytest with coverage
- **cov** - Generate XML coverage
- **clean** - Remove cache and build artifacts
- **pristine** - Remove all installed packages
- **build** - Build distribution package
- **publish** - Upload to PyPI (requires token)

---

## Known Issues & TODOs

From [tests/todo.md](tests/todo.md):
- Docker image for quick setup with Bottle framework
- Pandas integration for data analysis
- Interactive market data terminal
- Rich library integration for better formatting

From code comments:
- Spelling bug in API: 'dailyvolatility' instead of camelCase
- Session refresh mechanism could be optimized
- Cache management independent from session

---

## Design Patterns

1. **Abstract Base Class Pattern** - `AbstractBaseExchange` defines interface
2. **Session Management Pattern** - `Session` handles HTTP with caching
3. **Recursive Data Processing** - Type conversion applied recursively to nested structures
4. **API Aggregation** - Single `Nse` class exposes all endpoints
5. **URL Constants** - Centralized endpoint management

---

## Experimental Code

### [exp/solution_1.py](exp/solution_1.py) & [exp/solution_2.py](exp/solution_2.py)
Two approaches for JSON parsing with type conversion:
- Solution 1: Simple recursive function with int/float conversion
- Solution 2: Enhanced version with datetime parsing and multiple date formats

These experiments likely informed the `cleaners.py` and `utils.py` implementations.

---

## Important Notes

### Security & Disclaimer
- ✅ Educational use only - not for real trading without independent verification
- ✅ Uses only publicly available data from nseindia.com
- ✅ No authentication/login required
- ✅ Does not bypass any security measures
- ✅ Not affiliated with NSE or any financial institution
- ✅ Data accuracy matches NSE website only

### Performance Considerations
- Session refresh prevents connection timeouts
- Response caching with configurable timeout
- CSV parsing for stock codes instead of individual API calls
- Single API call for all indices data

### Data Types
- All numeric values (prices, changes, percentages) returned as int/float
- Dates handled through dateutil (timezone-aware capable)
- String values preserved where not convertible to numbers

---

## Quick Start Example
```python
from nsetools import Nse

nse = Nse()

# Get stock quote
quote = nse.get_quote('INFY')
print(f"Infosys: ₹{quote['lastPrice']} ({quote['pChange']}%)")

# Get index info
nifty = nse.get_index_quote('NIFTY 50')
print(f"Nifty 50: {nifty['last']} ({nifty['percentChange']}%)")

# Get top gainers
gainers = nse.get_top_gainers()
print(f"Top gainer: {gainers[0]['symbol']}")

# Check stock validity
if nse.is_valid_code('TCS'):
    print("TCS is a valid NSE stock")
```

---

## Maintenance Status
- Last version: 2.0.1
- Actively maintained with modern Python practices
- Good test coverage with pytest
- Well-documented with extensive docstrings
- Clean separation of concerns across modules
