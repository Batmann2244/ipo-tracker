/**
 * Date management utilities for handling NSE trading days and holidays
 */

import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import isoWeek from 'dayjs/plugin/isoWeek.js';

dayjs.extend(customParseFormat);
dayjs.extend(isoWeek);

/**
 * Indian stock market holidays (fixed dates)
 */
export const FIXED_HOLIDAYS = [
    { month: 1, day: 26 },  // Republic Day
    { month: 5, day: 1 },   // Labour Day
    { month: 8, day: 15 },  // Independence Day
    { month: 10, day: 2 },  // Gandhi Jayanti
    { month: 12, day: 25 }  // Christmas
];

/**
 * Check if a date is a weekend (Saturday or Sunday)
 * @param {Date|dayjs.Dayjs} date - Date to check
 * @returns {boolean} True if weekend
 */
export function isWeekend(date) {
    const day = dayjs(date);
    const weekday = day.day(); // 0 = Sunday, 6 = Saturday
    return weekday === 0 || weekday === 6;
}

/**
 * Check if a date is a known NSE holiday
 * @param {Date|dayjs.Dayjs} date - Date to check
 * @returns {boolean} True if it's a known holiday
 */
export function isKnownHoliday(date) {
    const day = dayjs(date);
    const month = day.month() + 1; // dayjs months are 0-indexed
    const dayOfMonth = day.date();

    return FIXED_HOLIDAYS.some(
        holiday => holiday.month === month && holiday.day === dayOfMonth
    );
}

/**
 * Check if a date is a trading day (not weekend or holiday)
 * @param {Date|dayjs.Dayjs} date - Date to check
 * @returns {boolean} True if it's a trading day
 */
export function isTradingDay(date) {
    return !isWeekend(date) && !isKnownHoliday(date);
}

/**
 * Get the nearest business/trading day
 * @param {Date|dayjs.Dayjs} date - Starting date
 * @returns {dayjs.Dayjs} Nearest trading day (going backwards)
 */
export function getNearestBusinessDay(date) {
    let day = dayjs(date);

    // Keep going back until we find a trading day
    while (!isTradingDay(day)) {
        day = day.subtract(1, 'day');
    }

    return day;
}

/**
 * Parse various date string formats
 * @param {string|Date} dateInput - Date string or Date object
 * @returns {dayjs.Dayjs} Parsed date
 */
export function parseDate(dateInput) {
    if (dayjs.isDayjs(dateInput)) {
        return dateInput;
    }

    if (dateInput instanceof Date) {
        return dayjs(dateInput);
    }

    if (typeof dateInput === 'string') {
        const lower = dateInput.toLowerCase().trim();

        // Handle relative dates
        if (lower === 'today') {
            return dayjs();
        }
        if (lower === 'yesterday') {
            return dayjs().subtract(1, 'day');
        }
        if (lower === 'day before yesterday') {
            return dayjs().subtract(2, 'day');
        }

        // Try various date formats
        const formats = [
            'YYYY-MM-DD',
            'DD-MM-YYYY',
            'DD/MM/YYYY',
            'MM/DD/YYYY',
            'DD-MMM-YYYY',
            'DD MMM YYYY',
            'YYYY-MM-DD HH:mm:ss'
        ];

        for (const format of formats) {
            const parsed = dayjs(dateInput, format);
            if (parsed.isValid()) {
                return parsed;
            }
        }

        // Try default parsing
        const parsed = dayjs(dateInput);
        if (parsed.isValid()) {
            return parsed;
        }
    }

    throw new Error(`Unable to parse date: ${dateInput}`);
}

/**
 * Get a range of dates between two dates
 * @param {string|Date} fromDate - Start date
 * @param {string|Date} toDate - End date
 * @param {Array} skipDates - Array of dates to skip
 * @returns {Array<dayjs.Dayjs>} Array of dates in range
 */
export function getDateRange(fromDate, toDate, skipDates = []) {
    const start = parseDate(fromDate);
    const end = parseDate(toDate);
    const dates = [];
    
    const skipSet = new Set(skipDates.map(d => parseDate(d).format('YYYY-MM-DD')));

    let current = start;
    while (current.isBefore(end) || current.isSame(end, 'day')) {
        const dateStr = current.format('YYYY-MM-DD');
        
        if (!skipSet.has(dateStr) && isTradingDay(current)) {
            dates.push(current);
        }
        
        current = current.add(1, 'day');
    }

    return dates;
}

/**
 * Format date for NSE API calls
 * @param {Date|dayjs.Dayjs} date - Date to format
 * @param {string} format - Format string (default: DD-MMM-YYYY)
 * @returns {string} Formatted date string
 */
export function formatDateForNSE(date, format = 'DD-MMM-YYYY') {
    return dayjs(date).format(format).toUpperCase();
}

/**
 * Get current IST time (India Standard Time)
 * @returns {dayjs.Dayjs} Current IST time
 */
export function getISTTime() {
    // IST is UTC+5:30
    return dayjs().add(5.5, 'hour');
}

/**
 * Check if NSE market is currently open
 * @returns {boolean} True if market is open
 */
export function isMarketOpen() {
    const now = getISTTime();
    const day = now.day();

    // Weekend check
    if (day === 0 || day === 6) {
        return false;
    }

    // Holiday check
    if (isKnownHoliday(now)) {
        return false;
    }

    // Market hours: 9:15 AM to 3:30 PM IST
    const hour = now.hour();
    const minute = now.minute();
    const currentMinutes = hour * 60 + minute;
    
    const marketOpen = 9 * 60 + 15;  // 9:15 AM
    const marketClose = 15 * 60 + 30; // 3:30 PM

    return currentMinutes >= marketOpen && currentMinutes <= marketClose;
}
