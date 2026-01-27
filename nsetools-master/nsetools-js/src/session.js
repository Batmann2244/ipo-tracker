/**
 * Session management for NSE API requests
 * Handles headers, cookies, caching, and session refresh
 */

import axios from 'axios';
import { NSE_HOME } from './urls.js';

export class Session {
    constructor(sessionRefreshInterval = 120000, cacheTimeout = 60000) {
        this.sessionRefreshInterval = sessionRefreshInterval; // milliseconds
        this.cacheTimeout = cacheTimeout; // milliseconds
        this.cache = new Map();
        this.session = null;
        this.sessionInitTime = null;
        
        this.createSession();
    }

    /**
     * Get headers for NSE API requests
     * @returns {Object} Headers object
     */
    getNseHeaders() {
        return {
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.5',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
            'X-Requested-With': 'XMLHttpRequest'
        };
    }

    /**
     * Create a new session with proper headers and cookies
     */
    async createSession() {
        this.session = axios.create({
            headers: this.getNseHeaders(),
            timeout: 30000,
            withCredentials: true
        });

        // Initialize session by visiting NSE home page to get cookies
        try {
            await this.session.get(NSE_HOME);
            this.sessionInitTime = Date.now();
        } catch (error) {
            console.error('Error initializing session:', error.message);
        }
    }

    /**
     * Check if session needs refresh
     * @returns {boolean} True if session should be refreshed
     */
    shouldRefreshSession() {
        if (!this.sessionInitTime) {
            return true;
        }

        const timeSinceInit = Date.now() - this.sessionInitTime;
        return timeSinceInit > this.sessionRefreshInterval;
    }

    /**
     * Flush the cache
     */
    flush() {
        this.cache.clear();
    }

    /**
     * Get item from cache
     * @param {string} key - Cache key
     * @returns {*} Cached value or null
     */
    getCached(key) {
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

    /**
     * Set item in cache
     * @param {string} key - Cache key
     * @param {*} data - Data to cache
     */
    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Fetch data from URL with caching and session management
     * @param {string} url - URL to fetch
     * @param {Object} options - Additional axios options
     * @returns {Promise<Object>} Response object
     */
    async fetch(url, options = {}) {
        // Check if session needs refresh
        if (this.shouldRefreshSession()) {
            await this.createSession();
        }

        // Check cache first
        const cacheKey = url;
        const cached = this.getCached(cacheKey);
        
        if (cached) {
            return cached;
        }

        try {
            const response = await this.session.get(url, options);
            
            // Cache the response
            this.setCache(cacheKey, response);
            
            return response;
        } catch (error) {
            if (error.response) {
                throw new Error(`NSE API error: ${error.response.status} - ${error.response.statusText}`);
            } else if (error.request) {
                throw new Error('No response from NSE server. Please check your connection.');
            } else {
                throw new Error(`Request error: ${error.message}`);
            }
        }
    }

    /**
     * Fetch data with custom headers
     * @param {string} url - URL to fetch
     * @param {Object} headers - Custom headers
     * @returns {Promise<Object>} Response object
     */
    async fetchWithHeaders(url, headers = {}) {
        return this.fetch(url, { headers });
    }

    /**
     * POST request to NSE API
     * @param {string} url - URL to post to
     * @param {Object} data - Data to send
     * @param {Object} options - Additional axios options
     * @returns {Promise<Object>} Response object
     */
    async post(url, data, options = {}) {
        if (this.shouldRefreshSession()) {
            await this.createSession();
        }

        try {
            const response = await this.session.post(url, data, options);
            return response;
        } catch (error) {
            throw new Error(`POST error: ${error.message}`);
        }
    }
}
