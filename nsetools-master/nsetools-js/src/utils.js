/**
 * Utility functions for data processing and type conversion
 */

/**
 * Recursively converts string representations of numbers to actual numbers in nested data structures
 * @param {Object|Array} data - The data to process
 * @param {number} roundDigits - Number of decimal places to round floats to
 * @returns {Object|Array} Processed data with numbers converted
 */
export function castIntFloatStringValuesToIntFloat(data, roundDigits = 2) {
    if (data === null || data === undefined) {
        return data;
    }

    // Handle arrays
    if (Array.isArray(data)) {
        return data.map(item => castIntFloatStringValuesToIntFloat(item, roundDigits));
    }

    // Handle objects
    if (typeof data === 'object') {
        const result = {};
        for (const [key, value] of Object.entries(data)) {
            result[key] = castIntFloatStringValuesToIntFloat(value, roundDigits);
        }
        return result;
    }

    // Handle strings that might be numbers
    if (typeof data === 'string') {
        const trimmed = data.trim();
        
        // Try to parse as number
        if (trimmed !== '' && !isNaN(trimmed)) {
            const num = Number(trimmed);
            
            // Check if it's an integer
            if (Number.isInteger(num)) {
                return num;
            }
            
            // It's a float, round it
            return Math.round(num * Math.pow(10, roundDigits)) / Math.pow(10, roundDigits);
        }
    }

    // Return as-is if not a string or not convertible
    return data;
}

/**
 * Parse values in JSON objects, converting strings to appropriate types
 * @param {Object} obj - Object to parse
 * @returns {Object} Parsed object
 */
export function parseValues(obj) {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => parseValues(item));
    }

    if (typeof obj !== 'object') {
        return obj;
    }

    const result = {};
    
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            // Try to convert to number
            const trimmed = value.trim();
            if (trimmed !== '' && !isNaN(trimmed)) {
                result[key] = Number(trimmed);
            } else {
                result[key] = value;
            }
        } else if (typeof value === 'object') {
            result[key] = parseValues(value);
        } else {
            result[key] = value;
        }
    }

    return result;
}

/**
 * Format URL by replacing placeholders with actual values
 * @param {string} url - URL template with %s placeholders
 * @param  {...any} args - Values to replace placeholders with
 * @returns {string} Formatted URL
 */
export function formatUrl(url, ...args) {
    let result = url;
    for (const arg of args) {
        result = result.replace('%s', encodeURIComponent(arg));
    }
    return result;
}

/**
 * Safely get nested property from object
 * @param {Object} obj - Object to traverse
 * @param {string} path - Dot-separated path (e.g., 'data.priceInfo.lastPrice')
 * @param {*} defaultValue - Default value if path not found
 * @returns {*} Value at path or default value
 */
export function getNestedValue(obj, path, defaultValue = null) {
    const keys = path.split('.');
    let result = obj;

    for (const key of keys) {
        if (result === null || result === undefined || typeof result !== 'object') {
            return defaultValue;
        }
        result = result[key];
    }

    return result !== undefined ? result : defaultValue;
}

/**
 * Deep clone an object or array
 * @param {*} obj - Object to clone
 * @returns {*} Cloned object
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => deepClone(item));
    }

    const cloned = {};
    for (const [key, value] of Object.entries(obj)) {
        cloned[key] = deepClone(value);
    }

    return cloned;
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after specified time
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} initialDelay - Initial delay in ms
 * @returns {Promise} Result of function or throws last error
 */
export async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (i < maxRetries - 1) {
                const delay = initialDelay * Math.pow(2, i);
                await sleep(delay);
            }
        }
    }
    
    throw lastError;
}
