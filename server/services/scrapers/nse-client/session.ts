import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { NSE_HOME } from './urls';

interface CacheEntry {
  data: AxiosResponse;
  timestamp: number;
}

export class Session {
  private sessionRefreshInterval: number;
  private cacheTimeout: number;
  private cache: Map<string, CacheEntry>;
  private session: AxiosInstance | null;
  private sessionInitTime: number | null;

  constructor(sessionRefreshInterval = 120000, cacheTimeout = 60000) {
    this.sessionRefreshInterval = sessionRefreshInterval;
    this.cacheTimeout = cacheTimeout;
    this.cache = new Map();
    this.session = null;
    this.sessionInitTime = null;
    
    this.createSession();
  }

  private getNseHeaders(): Record<string, string> {
    return {
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.5',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
      'X-Requested-With': 'XMLHttpRequest'
    };
  }

  async createSession(): Promise<void> {
    this.session = axios.create({
      headers: this.getNseHeaders(),
      timeout: 30000,
      withCredentials: true
    });

    try {
      await this.session.get(NSE_HOME);
      this.sessionInitTime = Date.now();
    } catch (error: any) {
      console.error('Error initializing NSE session:', error.message);
    }
  }

  private shouldRefreshSession(): boolean {
    if (!this.sessionInitTime) {
      return true;
    }

    const timeSinceInit = Date.now() - this.sessionInitTime;
    return timeSinceInit > this.sessionRefreshInterval;
  }

  flush(): void {
    this.cache.clear();
  }

  private getCached(key: string): AxiosResponse | null {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }

    const age = Date.now() - cached.timestamp;
    
    if (age > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: AxiosResponse): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  async fetch(url: string, options: any = {}): Promise<AxiosResponse> {
    if (this.shouldRefreshSession()) {
      await this.createSession();
    }

    const cacheKey = url;
    const cached = this.getCached(cacheKey);
    
    if (cached) {
      return cached;
    }

    if (!this.session) {
      await this.createSession();
    }

    try {
      const response = await this.session!.get(url, options);
      this.setCache(cacheKey, response);
      return response;
    } catch (error: any) {
      if (error.response) {
        throw new Error(`NSE API error: ${error.response.status} - ${error.response.statusText}`);
      } else if (error.request) {
        throw new Error('No response from NSE server. Please check your connection.');
      } else {
        throw new Error(`Request error: ${error.message}`);
      }
    }
  }

  async fetchWithHeaders(url: string, headers: Record<string, string> = {}): Promise<AxiosResponse> {
    return this.fetch(url, { headers });
  }

  async post(url: string, data: any, options: any = {}): Promise<AxiosResponse> {
    if (this.shouldRefreshSession()) {
      await this.createSession();
    }

    if (!this.session) {
      await this.createSession();
    }

    try {
      const response = await this.session!.post(url, data, options);
      return response;
    } catch (error: any) {
      throw new Error(`POST error: ${error.message}`);
    }
  }
}
