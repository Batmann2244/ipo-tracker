/**
 * IPO Endpoint Discovery - Find working NSE IPO API endpoints
 */

import axios from 'axios';

const baseUrl = 'https://www.nseindia.com';

// Common potential IPO endpoint patterns
const potentialEndpoints = [
    '/api/live-analysis-ipos',
    '/live_market/dynaContent/live_analysis/upcoming_ipo.json',
    '/content/equities/ipos.json',
    '/api/ipo',
    '/api/ipos',
    '/api/market-status/current-ipos',
    '/live_market/ipo/ipo_current.json',
    '/live_market/ipo/ipo_list.json',
    '/live_market/ipo/upcoming.json',
];

async function findIpoEndpoints() {
    console.log('🔍 Discovering NSE IPO API Endpoints\n');
    
    for (const endpoint of potentialEndpoints) {
        try {
            const url = baseUrl + endpoint;
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json',
                    'Referer': 'https://www.nseindia.com/'
                },
                timeout: 5000
            });
            
            if (response.status === 200 && response.data) {
                console.log(`✅ FOUND: ${endpoint}`);
                console.log(`   Status: ${response.status}`);
                console.log(`   Data Type: ${Array.isArray(response.data) ? 'Array' : typeof response.data}`);
                if (Array.isArray(response.data)) {
                    console.log(`   Items: ${response.data.length}`);
                    if (response.data.length > 0) {
                        console.log(`   First item keys: ${Object.keys(response.data[0]).join(', ')}`);
                    }
                } else if (typeof response.data === 'object') {
                    console.log(`   Keys: ${Object.keys(response.data).slice(0, 5).join(', ')}`);
                }
                console.log('');
            }
        } catch (error) {
            if (error.response?.status !== 404) {
                console.log(`⚠️  ${endpoint}: ${error.message}`);
            }
        }
    }
    
    console.log('\n🔍 Alternative: Checking main API endpoints for IPO data...\n');
    
    // Try to fetch from market status and parse for IPO data
    try {
        const response = await axios.get(baseUrl + '/api/marketStatus', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.nseindia.com/'
            }
        });
        
        console.log('📊 Market Status Data Available:');
        console.log(JSON.stringify(response.data, null, 2).slice(0, 500));
    } catch (error) {
        console.log(`Error fetching market status: ${error.message}`);
    }
}

findIpoEndpoints();
