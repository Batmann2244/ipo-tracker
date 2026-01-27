/**
 * NSE (National Stock Exchange) API Client
 * Main class for accessing NSE data
 */

import { parse } from 'csv-parse/sync';
import { Session } from './session.js';
import * as urls from './urls.js';
import { castIntFloatStringValuesToIntFloat, formatUrl } from './utils.js';
import { InvalidStockCodeError, InvalidIndexError } from './errors.js';

export class Nse {
    constructor(sessionRefreshInterval = 120000) {
        this.sessionRefreshInterval = sessionRefreshInterval;
        this.session = new Session(sessionRefreshInterval);
        this.stockCodeCache = null;
    }

    // ========================================
    // STOCK APIS
    // ========================================

    /**
     * Get list of all stock codes traded on NSE
     * @returns {Promise<Array<string>>} Array of stock symbols
     */
    async getStockCodes() {
        if (this.stockCodeCache) {
            return this.stockCodeCache;
        }

        const response = await this.session.fetch(urls.STOCKS_CSV_URL);
        const csvContent = response.data;
        
        const records = parse(csvContent, {
            columns: true,
            skip_empty_lines: true
        });

        const symbols = records.map(row => row.SYMBOL);
        this.stockCodeCache = symbols;
        
        return symbols;
    }

    /**
     * Check if a stock code is valid
     * @param {string} code - Stock code to validate
     * @returns {Promise<boolean>} True if valid
     */
    async isValidCode(code) {
        const stockCodes = await this.getStockCodes();
        return stockCodes.includes(code.toUpperCase());
    }

    /**
     * Get real-time quote for a stock
     * @param {string} code - Stock symbol
     * @param {boolean} allData - If true, returns complete data; if false, returns only price info
     * @returns {Promise<Object>} Stock quote data
     */
    async getQuote(code, allData = false) {
        const symbol = code.toUpperCase();
        const url = formatUrl(urls.QUOTE_API_URL, symbol);
        
        const response = await this.session.fetch(url);
        const data = allData ? response.data : response.data.priceInfo;
        
        return castIntFloatStringValuesToIntFloat(data);
    }

    /**
     * Get stocks that hit 52-week high
     * @returns {Promise<Array<Object>>} Array of stock data
     */
    async get52WeekHigh() {
        const response = await this.session.fetch(urls.FIFTYTWO_WEEK_HIGH_URL);
        return castIntFloatStringValuesToIntFloat(response.data.data);
    }

    /**
     * Get stocks that hit 52-week low
     * @returns {Promise<Array<Object>>} Array of stock data
     */
    async get52WeekLow() {
        const response = await this.session.fetch(urls.FIFTYTWO_WEEK_LOW_URL);
        return castIntFloatStringValuesToIntFloat(response.data.data);
    }

    // ========================================
    // INDEX APIS
    // ========================================

    /**
     * Get quote for a specific index
     * @param {string} index - Index name (e.g., "NIFTY 50")
     * @returns {Promise<Object>} Index quote data
     */
    async getIndexQuote(index = "NIFTY 50") {
        const allIndexQuotes = await this.getAllIndexQuote();
        const indexList = allIndexQuotes.map(i => i.indexSymbol);
        
        const normalizedIndex = index.toUpperCase().trim();
        
        if (!indexList.includes(normalizedIndex)) {
            throw new InvalidIndexError(index);
        }

        const quote = allIndexQuotes.find(i => i.indexSymbol === normalizedIndex);
        return castIntFloatStringValuesToIntFloat(quote);
    }

    /**
     * Get list of all index symbols
     * @returns {Promise<Array<string>>} Array of index symbols
     */
    async getIndexList() {
        const allQuotes = await this.getAllIndexQuote();
        return allQuotes.map(i => i.indexSymbol);
    }

    /**
     * Get quotes for all indices
     * @returns {Promise<Array<Object>>} Array of index quotes
     */
    async getAllIndexQuote() {
        const response = await this.session.fetch(urls.ALL_INDICES_URL);
        return response.data.data;
    }

    /**
     * Get top gaining stocks
     * @param {string} index - Index name (NIFTY, BANKNIFTY, etc.)
     * @returns {Promise<Array<Object>>} Array of top gainer stocks
     */
    async getTopGainers(index = "NIFTY") {
        return this._getTopGainersLosers('gainers', index);
    }

    /**
     * Get top losing stocks
     * @param {string} index - Index name (NIFTY, BANKNIFTY, etc.)
     * @returns {Promise<Array<Object>>} Array of top loser stocks
     */
    async getTopLosers(index = "NIFTY") {
        return this._getTopGainersLosers('losers', index);
    }

    /**
     * Internal method to fetch top gainers or losers
     * @private
     */
    async _getTopGainersLosers(direction, index) {
        const normalizedIndex = (index || 'NIFTY').toUpperCase();
        
        const indexMap = {
            'NIFTY': 'NIFTY',
            'NIFTY 50': 'NIFTY',
            'NIFTY BANK': 'BANKNIFTY',
            'BANKNIFTY': 'BANKNIFTY',
            'NIFTYNEXT50': 'NIFTYNEXT50',
            'NIFTY NEXT 50': 'NIFTYNEXT50',
            'SECGTR20': 'SecGtr20',
            'SECLWR20': 'SecLwr20',
            'FNO': 'FOSec',
            'ALL': 'allSec'
        };

        const mappedIndex = indexMap[normalizedIndex];
        
        if (!mappedIndex) {
            throw new InvalidIndexError(index);
        }

        const url = direction === 'gainers' ? urls.TOP_GAINERS_URL : urls.TOP_LOSERS_URL;
        const response = await this.session.fetch(url);
        
        return castIntFloatStringValuesToIntFloat(response.data[mappedIndex].data);
    }

    /**
     * Get advances and declines for an index
     * @param {string} index - Index name
     * @returns {Promise<Object>} Object with advances and declines count
     */
    async getAdvancesDeclines(index = 'NIFTY 50') {
        const indexQuote = await this.getIndexQuote(index.toUpperCase());
        return {
            advances: indexQuote.advances,
            declines: indexQuote.declines
        };
    }

    /**
     * Get list of stock symbols in an index
     * @param {string} index - Index name
     * @returns {Promise<Array<string>>} Array of stock symbols
     */
    async getStocksInIndex(index = "NIFTY 50") {
        const normalizedIndex = index.toUpperCase();
        const url = formatUrl(urls.STOCKS_IN_INDEX_URL, normalizedIndex);
        
        const response = await this.session.fetch(url);
        const stocks = response.data.data;
        
        // Skip first element (index itself) and return only symbols
        return stocks.slice(1).map(stock => stock.symbol);
    }

    /**
     * Get stock quotes for all stocks in an index
     * @param {string} index - Index name
     * @param {boolean} includeIndex - If true, includes index data in results
     * @returns {Promise<Array<Object>>} Array of stock quotes
     */
    async getStockQuoteInIndex(index = "NIFTY 50", includeIndex = false) {
        const normalizedIndex = index.toUpperCase();
        const url = formatUrl(urls.STOCKS_IN_INDEX_URL, normalizedIndex);
        
        const response = await this.session.fetch(url);
        const data = castIntFloatStringValuesToIntFloat(response.data);
        
        if (includeIndex) {
            return data.data;
        } else {
            // Filter out index (priority !== 0), return only stocks
            return data.data.filter(record => record.priority === 0);
        }
    }

    // ========================================
    // DERIVATIVE APIS
    // ========================================

    /**
     * Get futures quote for a stock
     * @param {string} code - Stock symbol
     * @param {string} expiryDate - Expiry date (optional, format: DD-MMM-YYYY)
     * @returns {Promise<Object|Array>} Future quote(s)
     */
    async getFutureQuote(code, expiryDate = null) {
        const symbol = code.toUpperCase();
        const url = formatUrl(urls.QUOTE_DERIVATIVE_URL, symbol);
        
        const response = await this.session.fetch(url);
        const data = response.data;
        
        // Filter only futures data
        const futureData = data.stocks.filter(
            s => s.metadata.instrumentType === "Stock Futures"
        );

        // Flatten and format the data
        const filteredData = futureData.map(record => ({
            expiryDate: record.metadata.expiryDate,
            lastPrice: record.metadata.lastPrice,
            premium: record.metadata.lastPrice - record.underlyingValue,
            openPrice: record.metadata.openPrice,
            highPrice: record.metadata.highPrice,
            lowPrice: record.metadata.lowPrice,
            closePrice: record.metadata.closePrice,
            prevClose: record.metadata.prevClose,
            change: record.metadata.change,
            pChange: record.metadata.pChange,
            numberOfContractsTraded: record.metadata.numberOfContractsTraded,
            totalTurnover: record.metadata.totalTurnover,
            underlyingValue: record.underlyingValue,
            tradedVolume: record.marketDeptOrderBook.tradeInfo.tradedVolume,
            openInterest: record.marketDeptOrderBook.tradeInfo.openInterest,
            changeInOpenInterest: record.marketDeptOrderBook.tradeInfo.changeinOpenInterest,
            pchangeinOpenInterest: record.marketDeptOrderBook.tradeInfo.pchangeinOpenInterest,
            marketLot: record.marketDeptOrderBook.tradeInfo.marketLot,
            dailyVolatility: record.marketDeptOrderBook.otherInfo.dailyvolatility,
            annualisedVolatility: record.marketDeptOrderBook.otherInfo.annualisedVolatility
        }));

        // If expiry date is specified, return only that expiry
        if (expiryDate) {
            const filtered = filteredData.find(record => record.expiryDate === expiryDate);
            return castIntFloatStringValuesToIntFloat(filtered || null);
        }

        return castIntFloatStringValuesToIntFloat(filteredData);
    }

    // ========================================
    // IPO APIS
    // ========================================

    /**
     * Get list of all IPOs (upcoming and closed)
     * @returns {Promise<Array<Object>>} IPO list with details
     */
    async getIpoList() {
        try {
            const response = await this.session.fetch(urls.IPO_LIST_URL);
            const data = response.data;
            return castIntFloatStringValuesToIntFloat(data);
        } catch (error) {
            throw new Error(`Failed to fetch IPO list: ${error.message}`);
        }
    }

    /**
     * Get IPO application status and statistics
     * @returns {Promise<Object>} IPO statistics
     */
    async getIpoApplicationStatus() {
        try {
            const response = await this.session.fetch(urls.IPO_STATUS_URL);
            const data = response.data;
            return castIntFloatStringValuesToIntFloat(data);
        } catch (error) {
            throw new Error(`Failed to fetch IPO application status: ${error.message}`);
        }
    }

    /**
     * Get upcoming IPO calendar
     * @returns {Promise<Array<Object>>} Upcoming IPOs with dates and details
     */
    async getUpcomingIpos() {
        try {
            const response = await this.session.fetch(urls.IPO_CALENDAR_URL);
            const data = response.data;
            return castIntFloatStringValuesToIntFloat(data);
        } catch (error) {
            throw new Error(`Failed to fetch upcoming IPOs: ${error.message}`);
        }
    }

    /**
     * Get current IPO applications and subscriptions
     * @returns {Promise<Object>} Current IPO subscription data
     */
    async getCurrentIpos() {
        try {
            const response = await this.session.fetch(urls.IPO_ACTIVE_URL);
            const data = response.data;
            
            // Filter for current/active IPOs
            if (Array.isArray(data)) {
                return data.filter(ipo => {
                    const status = ipo.status?.toLowerCase() || '';
                    return status.includes('open') || status.includes('active');
                });
            }
            
            return castIntFloatStringValuesToIntFloat(data);
        } catch (error) {
            throw new Error(`Failed to fetch current IPOs: ${error.message}`);
        }
    }

    /**
     * Get GMP (Grey Market Premium) data
     * @returns {Promise<Array<Object>>} GMP data for IPOs
     */
    async getGmpData() {
        try {
            // GMP data is typically available from market data pages
            const response = await this.session.fetch(`${urls.NSE_MAIN}/market-data/grey-market-premium`);
            const data = response.data;
            return Array.isArray(data) ? data : [];
        } catch (error) {
            // Return empty array if GMP endpoint unavailable
            return [];
        }
    }

    /**
     * Get IPO calendar with dates and details
     * @returns {Promise<Array<Object>>} IPO calendar data
     */
    async getIpoCalendar() {
        try {
            const response = await this.session.fetch(urls.IPO_UPCOMING_URL);
            const data = response.data;
            return Array.isArray(data) ? data : [];
        } catch (error) {
            throw new Error(`Failed to fetch IPO calendar: ${error.message}`);
        }
    }

    /**
     * Get IPO statistics
     * @returns {Promise<Object>} IPO statistics and summary
     */
    async getIpoStats() {
        try {
            const [upcoming, current, recent] = await Promise.all([
                this.getUpcomingIpos().catch(() => []),
                this.getCurrentIpos().catch(() => []),
                this.getIpoList().catch(() => [])
            ]);

            return {
                upcoming: upcoming.length,
                current: current.length,
                recent: recent.length,
                total: upcoming.length + current.length + recent.length,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(`Failed to fetch IPO stats: ${error.message}`);
        }
    }

    /**
     * String representation of NSE client
     * @returns {string} Description
     */
    toString() {
        return 'NSE (National Stock Exchange) JavaScript Client';
    }
}
