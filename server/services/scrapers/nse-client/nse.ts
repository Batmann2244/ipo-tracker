import { parse } from 'csv-parse/sync';
import { Session } from './session';
import * as urls from './urls';
import { castIntFloatStringValuesToIntFloat, formatUrl } from './utils';
import { InvalidStockCodeError, InvalidIndexError } from './errors';

export class Nse {
  private sessionRefreshInterval: number;
  private session: Session;
  private stockCodeCache: string[] | null;

  constructor(sessionRefreshInterval = 120000) {
    this.sessionRefreshInterval = sessionRefreshInterval;
    this.session = new Session(sessionRefreshInterval);
    this.stockCodeCache = null;
  }

  async getStockCodes(): Promise<string[]> {
    if (this.stockCodeCache) {
      return this.stockCodeCache;
    }

    const response = await this.session.fetch(urls.STOCKS_CSV_URL);
    const csvContent = response.data;
    
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true
    });

    const symbols = records.map((row: any) => row.SYMBOL);
    this.stockCodeCache = symbols;
    
    return symbols;
  }

  async isValidCode(code: string): Promise<boolean> {
    const stockCodes = await this.getStockCodes();
    return stockCodes.includes(code.toUpperCase());
  }

  async getQuote(code: string, allData = false): Promise<any> {
    const symbol = code.toUpperCase();
    const url = formatUrl(urls.QUOTE_API_URL, symbol);
    
    const response = await this.session.fetch(url);
    const data = allData ? response.data : response.data.priceInfo;
    
    return castIntFloatStringValuesToIntFloat(data);
  }

  async get52WeekHigh(): Promise<any[]> {
    const response = await this.session.fetch(urls.FIFTYTWO_WEEK_HIGH_URL);
    return castIntFloatStringValuesToIntFloat(response.data.data);
  }

  async get52WeekLow(): Promise<any[]> {
    const response = await this.session.fetch(urls.FIFTYTWO_WEEK_LOW_URL);
    return castIntFloatStringValuesToIntFloat(response.data.data);
  }

  async getIndexQuote(index = "NIFTY 50"): Promise<any> {
    const allIndexQuotes = await this.getAllIndexQuote();
    const indexList = allIndexQuotes.map((i: any) => i.indexSymbol);
    
    const normalizedIndex = index.toUpperCase().trim();
    
    if (!indexList.includes(normalizedIndex)) {
      throw new InvalidIndexError(index);
    }

    const quote = allIndexQuotes.find((i: any) => i.indexSymbol === normalizedIndex);
    return castIntFloatStringValuesToIntFloat(quote);
  }

  async getIndexList(): Promise<string[]> {
    const allQuotes = await this.getAllIndexQuote();
    return allQuotes.map((i: any) => i.indexSymbol);
  }

  async getAllIndexQuote(): Promise<any[]> {
    const response = await this.session.fetch(urls.ALL_INDICES_URL);
    return response.data.data;
  }

  async getTopGainers(index = "NIFTY"): Promise<any[]> {
    return this._getTopGainersLosers('gainers', index);
  }

  async getTopLosers(index = "NIFTY"): Promise<any[]> {
    return this._getTopGainersLosers('losers', index);
  }

  private async _getTopGainersLosers(direction: 'gainers' | 'losers', index: string): Promise<any[]> {
    const normalizedIndex = (index || 'NIFTY').toUpperCase();
    
    const indexMap: Record<string, string> = {
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

  async getAdvancesDeclines(index = 'NIFTY 50'): Promise<{ advances: number; declines: number }> {
    const indexQuote = await this.getIndexQuote(index.toUpperCase());
    return {
      advances: indexQuote.advances,
      declines: indexQuote.declines
    };
  }

  async getStocksInIndex(index = "NIFTY 50"): Promise<string[]> {
    const normalizedIndex = index.toUpperCase();
    const url = formatUrl(urls.STOCKS_IN_INDEX_URL, normalizedIndex);
    
    const response = await this.session.fetch(url);
    const stocks = response.data.data;
    
    return stocks.slice(1).map((stock: any) => stock.symbol);
  }

  async getStockQuoteInIndex(index = "NIFTY 50", includeIndex = false): Promise<any[]> {
    const normalizedIndex = index.toUpperCase();
    const url = formatUrl(urls.STOCKS_IN_INDEX_URL, normalizedIndex);
    
    const response = await this.session.fetch(url);
    const data = castIntFloatStringValuesToIntFloat(response.data);
    
    if (includeIndex) {
      return data.data;
    } else {
      return data.data.filter((record: any) => record.priority === 0);
    }
  }

  async getFutureQuote(code: string, expiryDate: string | null = null): Promise<any> {
    const symbol = code.toUpperCase();
    const url = formatUrl(urls.QUOTE_DERIVATIVE_URL, symbol);
    
    const response = await this.session.fetch(url);
    const data = response.data;
    
    const futureData = data.stocks.filter(
      (s: any) => s.metadata.instrumentType === "Stock Futures"
    );

    const filteredData = futureData.map((record: any) => ({
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

    if (expiryDate) {
      const filtered = filteredData.find((record: any) => record.expiryDate === expiryDate);
      return castIntFloatStringValuesToIntFloat(filtered || null);
    }

    return castIntFloatStringValuesToIntFloat(filteredData);
  }

  async getIpoList(): Promise<any> {
    try {
      const response = await this.session.fetch(urls.IPO_LIST_URL);
      const data = response.data;
      return castIntFloatStringValuesToIntFloat(data);
    } catch (error: any) {
      throw new Error(`Failed to fetch IPO list: ${error.message}`);
    }
  }

  async getIpoApplicationStatus(): Promise<any> {
    try {
      const response = await this.session.fetch(urls.IPO_STATUS_URL);
      const data = response.data;
      return castIntFloatStringValuesToIntFloat(data);
    } catch (error: any) {
      throw new Error(`Failed to fetch IPO application status: ${error.message}`);
    }
  }

  async getUpcomingIpos(): Promise<any> {
    try {
      const response = await this.session.fetch(urls.IPO_CALENDAR_URL);
      const data = response.data;
      return castIntFloatStringValuesToIntFloat(data);
    } catch (error: any) {
      throw new Error(`Failed to fetch upcoming IPOs: ${error.message}`);
    }
  }

  async getCurrentIpos(): Promise<any> {
    try {
      const response = await this.session.fetch(urls.IPO_ACTIVE_URL);
      const data = response.data;
      
      if (Array.isArray(data)) {
        return data.filter((ipo: any) => {
          const status = ipo.status?.toLowerCase() || '';
          return status.includes('open') || status.includes('active');
        });
      }
      
      return castIntFloatStringValuesToIntFloat(data);
    } catch (error: any) {
      throw new Error(`Failed to fetch current IPOs: ${error.message}`);
    }
  }

  async getGmpData(): Promise<any[]> {
    try {
      const response = await this.session.fetch(`${urls.NSE_MAIN}/market-data/grey-market-premium`);
      const data = response.data;
      return Array.isArray(data) ? data : [];
    } catch (error) {
      return [];
    }
  }

  async getIpoCalendar(): Promise<any[]> {
    try {
      const response = await this.session.fetch(urls.IPO_UPCOMING_URL);
      const data = response.data;
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      throw new Error(`Failed to fetch IPO calendar: ${error.message}`);
    }
  }

  async getIpoStats(): Promise<{
    upcoming: number;
    current: number;
    recent: number;
    total: number;
    timestamp: string;
  }> {
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
    } catch (error: any) {
      throw new Error(`Failed to fetch IPO stats: ${error.message}`);
    }
  }

  toString(): string {
    return 'NSE (National Stock Exchange) TypeScript Client';
  }
}
