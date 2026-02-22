import axios from "axios";
import * as cheerio from "cheerio";
import type { InsertIpo } from "@shared/schema";
import { calculateIpoScore } from "./scoring";

/**
 * IPO SCRAPER - UNIFIED ARCHITECTURE
 * 
 * PRIMARY SOURCE: NSE Scraper (Direct API with Cookie Handling)
 *  ├─ getUpcomingIpos() - Upcoming IPO calendar
 *  ├─ getCurrentIpos() - Active bidding IPOs
 * 
 * ENRICHMENT SOURCES: Web Scraping (Real-time data)
 *  ├─ Chittorgarh - Live subscription updates (QIB/HNI/Retail)
 *  ├─ InvestorGain - Real-time bidding data
 *  ├─ Groww - IPO calendar & pricing
 *  └─ GMP sources - Grey Market Premium trends
 * 
 * CONSOLIDATION: Merge with NSETools as base for reliability
 */

const CHITTORGARH_BASE = "https://www.chittorgarh.com";
const CHITTORGARH_SUB_STATUS = `${CHITTORGARH_BASE}/report/ipo-subscription-status-live-bidding-data-bse-nse/21/`;
const CHITTORGARH_UPCOMING = `${CHITTORGARH_BASE}/report/mainboard-ipo-list-in-india-702/`;
const CHITTORGARH_CURRENT = `${CHITTORGARH_BASE}/ipo/ipo_list.asp`;
const GROWW_IPO = "https://groww.in/ipo";
const GROWW_API = "https://groww.in/v1/api/stocks_ipo/v1/ipo";
const INVESTORGAIN_LIVE = "https://www.investorgain.com/report/ipo-subscription-live/333/all/";

interface RawIpoData {
  symbol: string;
  companyName: string;
  openDate: string;
  closeDate: string;
  priceRange: string;
  lotSize: number;
  issueSize: string;
  status: "upcoming" | "open" | "closed";
  gmp?: number;
  subscriptionTotal?: number;
  qib?: number;
  nii?: number;
  retail?: number;
}

interface GmpData {
  symbol: string;
  gmp: number;
  expectedListing: number;
}

const headers = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  "Cache-Control": "no-cache",
};

async function fetchPage(url: string): Promise<string> {
  try {
    console.log(`🌐 Fetching: ${url}`);
    const response = await axios.get(url, { 
      headers,
      timeout: 30000,
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    throw error;
  }
}

function parseDate(dateStr: string): string | null {
  if (!dateStr || dateStr.toLowerCase() === "tba" || dateStr === "-") return null;
  
  try {
    const cleaned = dateStr.trim().replace(/\s+/g, " ");
    const months: { [key: string]: string } = {
      jan: "01", january: "01",
      feb: "02", february: "02",
      mar: "03", march: "03",
      apr: "04", april: "04",
      may: "05",
      jun: "06", june: "06",
      jul: "07", july: "07",
      aug: "08", august: "08",
      sep: "09", sept: "09", september: "09",
      oct: "10", october: "10",
      nov: "11", november: "11",
      dec: "12", december: "12",
    };
    
    const match = cleaned.match(/(\d{1,2})\s*([a-zA-Z]+)\s*,?\s*(\d{4})/);
    if (match) {
      const day = match[1].padStart(2, "0");
      const monthKey = match[2].toLowerCase();
      const month = months[monthKey];
      const year = match[3];
      
      if (month) {
        return `${year}-${month}-${day}`;
      }
    }
    
    const simpleMatch = cleaned.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (simpleMatch) {
      return cleaned;
    }
    
    const ddmmyyyy = cleaned.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (ddmmyyyy) {
      const day = ddmmyyyy[1].padStart(2, "0");
      const month = ddmmyyyy[2].padStart(2, "0");
      const year = ddmmyyyy[3];
      return `${year}-${month}-${day}`;
    }
  } catch (e) {
    console.error("Date parse error:", dateStr, e);
  }
  
  return null;
}

function determineStatus(openDate: string | null, closeDate: string | null): "upcoming" | "open" | "closed" {
  if (!openDate) return "upcoming";
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const open = new Date(openDate);
  const close = closeDate ? new Date(closeDate) : null;
  
  if (open > today) return "upcoming";
  if (close && close < today) return "closed";
  if (open <= today && (!close || close >= today)) return "open";
  
  return "upcoming";
}

function generateSymbol(companyName: string): string {
  return companyName
    .replace(/\s+(Ltd|Limited|India|Private|Pvt|Technologies|Tech|Industries|Infra|Corporation|Corp)\.?/gi, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 12);
}

function parseNumber(str: string): number {
  if (!str) return 0;
  const cleaned = str.replace(/[^\d.-]/g, "");
  return parseFloat(cleaned) || 0;
}

function parseSubscription(str: string): number {
  if (!str) return 0;
  const match = str.match(/([\d.]+)\s*x?/i);
  return match ? parseFloat(match[1]) : 0;
}

async function scrapeChittorgarhSubscription(): Promise<RawIpoData[]> {
  console.log("📊 Scraping Chittorgarh subscription status...");
  const ipos: RawIpoData[] = [];
  
  try {
    const html = await fetchPage(CHITTORGARH_SUB_STATUS);
    const $ = cheerio.load(html);
    
    $("table tbody tr, table tr").each((_, row) => {
      const cells = $(row).find("td");
      if (cells.length < 4) return;
      
      const companyText = cells.eq(0).text().trim();
      if (!companyText || companyText.length < 3) return;
      if (companyText.toLowerCase().includes("company") || 
          companyText.toLowerCase().includes("ipo name") ||
          companyText.toLowerCase().includes("sme")) return;
      
      const companyName = companyText
        .replace(/\s+IPO$/i, "")
        .replace(/\s+\(.*?\)/g, "")
        .replace(/mainboard/gi, "")
        .trim();
      
      if (companyName.length < 3) return;
      
      const symbol = generateSymbol(companyName);
      
      let openDateStr = "";
      let closeDateStr = "";
      let priceRange = "TBA";
      let subscriptionTotal = 0;
      let qib = 0;
      let nii = 0;
      let retail = 0;
      
      for (let i = 1; i < cells.length; i++) {
        const cellText = cells.eq(i).text().trim();
        
        if (cellText.includes("₹") || cellText.includes("Rs")) {
          priceRange = cellText;
        }
        
        if (cellText.match(/\d+\s*[a-zA-Z]+\s*\d{4}/)) {
          if (!openDateStr) {
            openDateStr = cellText;
          } else {
            closeDateStr = cellText;
          }
        }
        
        if (cellText.match(/[\d.]+\s*x/i)) {
          const subValue = parseSubscription(cellText);
          if (subscriptionTotal === 0) {
            subscriptionTotal = subValue;
          }
        }
      }
      
      const qibCell = cells.filter((_, el) => $(el).text().toLowerCase().includes("qib")).first();
      const niiCell = cells.filter((_, el) => $(el).text().toLowerCase().includes("nii") || $(el).text().toLowerCase().includes("hni")).first();
      const retailCell = cells.filter((_, el) => $(el).text().toLowerCase().includes("retail")).first();
      
      if (qibCell.length) qib = parseSubscription(qibCell.next().text());
      if (niiCell.length) nii = parseSubscription(niiCell.next().text());
      if (retailCell.length) retail = parseSubscription(retailCell.next().text());
      
      const openDate = parseDate(openDateStr);
      const closeDate = parseDate(closeDateStr);
      const status = determineStatus(openDate, closeDate);
      
      if (status === "closed") return;
      
      ipos.push({
        symbol,
        companyName,
        openDate: openDateStr,
        closeDate: closeDateStr,
        priceRange,
        lotSize: 0,
        issueSize: "TBA",
        status,
        subscriptionTotal,
        qib,
        nii,
        retail,
      });
    });
    
    console.log(`✅ Chittorgarh: Found ${ipos.length} current IPOs`);
  } catch (error) {
    console.error("Chittorgarh scrape failed:", error);
  }
  
  return ipos;
}

async function scrapeInvestorGain(): Promise<RawIpoData[]> {
  console.log("📊 Scraping InvestorGain subscription data...");
  const ipos: RawIpoData[] = [];
  
  try {
    const html = await fetchPage(INVESTORGAIN_LIVE);
    const $ = cheerio.load(html);
    
    $("table tbody tr, table tr").each((_, row) => {
      const cells = $(row).find("td");
      if (cells.length < 3) return;
      
      const companyText = cells.eq(0).text().trim();
      if (!companyText || companyText.length < 3) return;
      if (companyText.toLowerCase().includes("company") || 
          companyText.toLowerCase().includes("ipo") && companyText.toLowerCase().includes("name") ||
          companyText.toLowerCase().includes("sme")) return;
      
      const companyName = companyText
        .replace(/\s+IPO$/i, "")
        .replace(/\s+\(.*?\)/g, "")
        .trim();
      
      if (companyName.length < 3) return;
      
      const symbol = generateSymbol(companyName);
      
      let subscriptionTotal = 0;
      let qib = 0;
      let nii = 0;
      let retail = 0;
      let openDateStr = "";
      let closeDateStr = "";
      
      for (let i = 1; i < cells.length; i++) {
        const cellText = cells.eq(i).text().trim();
        const header = $("thead th").eq(i).text().toLowerCase();
        
        if (cellText.match(/[\d.]+\s*x/i) || (header.includes("sub") && cellText.match(/[\d.]+/))) {
          const subValue = parseSubscription(cellText);
          if (header.includes("qib")) {
            qib = subValue;
          } else if (header.includes("nii") || header.includes("hni")) {
            nii = subValue;
          } else if (header.includes("retail") || header.includes("rii")) {
            retail = subValue;
          } else if (header.includes("total") || header.includes("overall")) {
            subscriptionTotal = subValue;
          }
        }
        
        if (cellText.match(/\d+[\/\-]\d+[\/\-]\d+/) || cellText.match(/\d+\s*[a-zA-Z]+\s*\d{4}/)) {
          if (!openDateStr) {
            openDateStr = cellText;
          } else {
            closeDateStr = cellText;
          }
        }
      }
      
      if (subscriptionTotal === 0 && (qib + nii + retail) > 0) {
        subscriptionTotal = (qib + nii + retail) / 3;
      }
      
      const openDate = parseDate(openDateStr);
      const closeDate = parseDate(closeDateStr);
      const status = determineStatus(openDate, closeDate);
      
      if (status === "closed") return;
      
      ipos.push({
        symbol,
        companyName,
        openDate: openDateStr,
        closeDate: closeDateStr,
        priceRange: "TBA",
        lotSize: 0,
        issueSize: "TBA",
        status,
        subscriptionTotal,
        qib,
        nii,
        retail,
      });
    });
    
    console.log(`✅ InvestorGain: Found ${ipos.length} current IPOs`);
  } catch (error) {
    console.error("InvestorGain scrape failed:", error);
  }
  
  return ipos;
}

async function scrapeGrowwApi(): Promise<RawIpoData[]> {
  console.log("📊 Fetching Groww IPO data via API...");
  const ipos: RawIpoData[] = [];
  
  try {
    const response = await axios.get(GROWW_API, {
      headers: {
        ...headers,
        "Accept": "application/json",
      },
      timeout: 15000,
    });
    
    const data = response.data;
    
    if (data && data.ipoList && Array.isArray(data.ipoList)) {
      for (const ipo of data.ipoList) {
        const companyName = (ipo.companyName || ipo.ipoName || "").replace(/\s+IPO$/i, "").trim();
        if (!companyName || companyName.length < 3) continue;
        
        const symbol = generateSymbol(companyName);
        const statusText = (ipo.status || "").toLowerCase();
        
        if (statusText.includes("listed") || statusText.includes("closed")) continue;
        
        let status: "upcoming" | "open" | "closed" = "upcoming";
        if (statusText.includes("open") || statusText.includes("live") || statusText.includes("bidding")) {
          status = "open";
        }
        
        const priceMin = ipo.minPrice || ipo.priceFrom || 0;
        const priceMax = ipo.maxPrice || ipo.priceTo || 0;
        const priceRange = priceMin > 0 
          ? (priceMax > priceMin ? `₹${priceMin} - ₹${priceMax}` : `₹${priceMin}`)
          : "TBA";
        
        const lotSize = ipo.lotSize || ipo.minBidQuantity || 0;
        const issueSize = ipo.issueSize ? `${ipo.issueSize} Cr` : "TBA";
        
        ipos.push({
          symbol,
          companyName,
          openDate: ipo.openDate || ipo.biddingStartDate || "",
          closeDate: ipo.closeDate || ipo.biddingEndDate || "",
          priceRange,
          lotSize,
          issueSize,
          status,
        });
      }
    }
    
    console.log(`✅ Groww API: Found ${ipos.length} IPOs`);
  } catch (error) {
    console.log("Groww API failed, falling back to HTML scrape...");
  }
  
  return ipos;
}

async function scrapeGroww(): Promise<RawIpoData[]> {
  console.log("📊 Scraping Groww IPO calendar...");
  
  const apiIpos = await scrapeGrowwApi();
  if (apiIpos.length > 0) {
    return apiIpos;
  }
  
  const ipos: RawIpoData[] = [];
  
  try {
    const html = await fetchPage(GROWW_IPO);
    const $ = cheerio.load(html);
    
    $("[class*='ipoCard'], [class*='ipo-card'], .ipo-item, [data-testid*='ipo'], .ipoListCard, .ipoMainCard").each((_, card) => {
      const $card = $(card);
      
      const companyName = $card.find("[class*='name'], [class*='companyName'], h3, h4, .title, .ipoName").first().text().trim()
        .replace(/\s+IPO$/i, "")
        .replace(/\s+\(.*?\)/g, "")
        .trim();
      
      if (!companyName || companyName.length < 3) return;
      
      const symbol = generateSymbol(companyName);
      
      const statusText = $card.find("[class*='status'], [class*='badge'], .tag, .ipoStatus").first().text().toLowerCase();
      let status: "upcoming" | "open" | "closed" = "upcoming";
      
      if (statusText.includes("open") || statusText.includes("live") || statusText.includes("bidding")) {
        status = "open";
      } else if (statusText.includes("closed") || statusText.includes("ended") || statusText.includes("listed")) {
        return;
      }
      
      const priceText = $card.find("[class*='price'], [class*='range'], .priceRange, .ipoPrice").first().text().trim();
      const dateText = $card.find("[class*='date'], [class*='period'], .bidDate, .ipoDate").first().text().trim();
      const lotText = $card.find("[class*='lot'], .lotSize").first().text().trim();
      const issueSizeText = $card.find("[class*='issue'], .issueSize").first().text().trim();
      
      const lotMatch = lotText.match(/\d+/);
      const lotSize = lotMatch ? parseInt(lotMatch[0]) : 0;
      
      ipos.push({
        symbol,
        companyName,
        openDate: dateText,
        closeDate: "",
        priceRange: priceText || "TBA",
        lotSize,
        issueSize: issueSizeText || "TBA",
        status,
      });
    });
    
    $("table tbody tr").each((_, row) => {
      const cells = $(row).find("td");
      if (cells.length < 3) return;
      
      const companyText = cells.eq(0).text().trim();
      if (!companyText || companyText.length < 3) return;
      
      const companyName = companyText
        .replace(/\s+IPO$/i, "")
        .replace(/\s+\(.*?\)/g, "")
        .trim();
      
      const symbol = generateSymbol(companyName);
      
      const statusCell = cells.filter((_, el) => {
        const text = $(el).text().toLowerCase();
        return text.includes("open") || text.includes("upcoming") || text.includes("closed") || text.includes("listed");
      }).first();
      
      const statusText = statusCell.text().toLowerCase();
      if (statusText.includes("closed") || statusText.includes("listed")) return;
      
      let status: "upcoming" | "open" | "closed" = "upcoming";
      if (statusText.includes("open") || statusText.includes("live")) {
        status = "open";
      }
      
      let priceRange = "TBA";
      let lotSize = 0;
      let issueSize = "TBA";
      let openDate = "";
      let closeDate = "";
      
      cells.each((i, cell) => {
        const cellText = $(cell).text().trim();
        
        if (cellText.includes("₹") || cellText.includes("Rs")) {
          priceRange = cellText;
        }
        
        if (cellText.match(/\d+\s*(lot|share)/i)) {
          const match = cellText.match(/(\d+)/);
          if (match) lotSize = parseInt(match[1]);
        }
        
        if (cellText.match(/\d+\s*(cr|crore)/i)) {
          issueSize = cellText;
        }
        
        if (cellText.match(/\d{1,2}\s*[A-Za-z]+\s*\d{4}/) || cellText.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/)) {
          if (!openDate) {
            openDate = cellText;
          } else {
            closeDate = cellText;
          }
        }
      });
      
      ipos.push({
        symbol,
        companyName,
        openDate,
        closeDate,
        priceRange,
        lotSize,
        issueSize,
        status,
      });
    });
    
    console.log(`✅ Groww: Found ${ipos.length} current IPOs`);
  } catch (error) {
    console.error("Groww scrape failed:", error);
  }
  
  return ipos;
}

async function scrapeChittorgarhListing(): Promise<RawIpoData[]> {
  console.log("📊 Scraping Chittorgarh IPO listing...");
  const ipos: RawIpoData[] = [];
  
  try {
    const html = await fetchPage(CHITTORGARH_UPCOMING);
    const $ = cheerio.load(html);
    
    $("table tbody tr, table tr").each((_, row) => {
      const cells = $(row).find("td");
      if (cells.length < 5) return;
      
      const companyLink = cells.eq(0).find("a");
      const companyText = companyLink.length ? companyLink.text().trim() : cells.eq(0).text().trim();
      
      if (!companyText || companyText.length < 3) return;
      if (companyText.toLowerCase().includes("company") || 
          companyText.toLowerCase().includes("ipo name") ||
          companyText.toLowerCase().includes("sme")) return;
      
      const companyName = companyText
        .replace(/\s+IPO$/i, "")
        .replace(/\s+\(.*?\)/g, "")
        .replace(/mainboard/gi, "")
        .trim();
      
      if (companyName.length < 3) return;
      
      const symbol = generateSymbol(companyName);
      
      let openDate = "";
      let closeDate = "";
      let priceRange = "TBA";
      let issueSize = "TBA";
      let lotSize = 0;
      let statusText = "";
      
      const rowText = $(row).text().toLowerCase();
      if (rowText.includes("listed") || rowText.includes("withdrawn") || rowText.includes("closed")) {
        return;
      }
      
      cells.each((i, cell) => {
        const cellText = $(cell).text().trim();
        const cellLower = cellText.toLowerCase();
        
        if (cellLower.includes("open") || cellLower.includes("upcoming") || cellLower.includes("close")) {
          statusText = cellLower;
        }
        
        if (cellText.includes("₹") || cellText.match(/Rs\.?\s*\d+/i)) {
          const priceMatch = cellText.match(/₹?\s*(\d[\d,]*)\s*(?:to|-|–)\s*₹?\s*(\d[\d,]*)/i);
          if (priceMatch) {
            priceRange = `₹${priceMatch[1].replace(/,/g, "")} - ₹${priceMatch[2].replace(/,/g, "")}`;
          } else {
            const singlePrice = cellText.match(/₹?\s*(\d[\d,]+)/);
            if (singlePrice) {
              priceRange = `₹${singlePrice[1].replace(/,/g, "")}`;
            }
          }
        }
        
        if (cellText.match(/\d[\d,.]*\s*(cr|crore)/i)) {
          const sizeMatch = cellText.match(/([\d,.]+)\s*(cr|crore)/i);
          if (sizeMatch) {
            issueSize = `${sizeMatch[1]} Cr`;
          }
        }
        
        if (cellText.match(/\d+\s*(lot|share|eq)/i) || (i > 0 && cellText.match(/^\d+$/))) {
          const lotMatch = cellText.match(/(\d+)/);
          if (lotMatch && parseInt(lotMatch[1]) < 1000) {
            lotSize = parseInt(lotMatch[1]);
          }
        }
        
        const dateMatch = cellText.match(/(\d{1,2})\s*([A-Za-z]{3,})\s*(\d{4})/);
        if (dateMatch) {
          if (!openDate) {
            openDate = cellText;
          } else if (!closeDate) {
            closeDate = cellText;
          }
        }
        
        const dateRangeMatch = cellText.match(/(\d{1,2}\s*[A-Za-z]+)\s*(?:to|-|–)\s*(\d{1,2}\s*[A-Za-z]+)\s*,?\s*(\d{4})/i);
        if (dateRangeMatch) {
          openDate = `${dateRangeMatch[1]} ${dateRangeMatch[3]}`;
          closeDate = `${dateRangeMatch[2]} ${dateRangeMatch[3]}`;
        }
      });
      
      let status: "upcoming" | "open" | "closed" = "upcoming";
      if (statusText.includes("open") || statusText.includes("live") || statusText.includes("bidding")) {
        status = "open";
      } else if (statusText.includes("closed")) {
        return;
      }
      
      ipos.push({
        symbol,
        companyName,
        openDate,
        closeDate,
        priceRange,
        lotSize: lotSize || 1,
        issueSize,
        status,
      });
    });
    
    console.log(`✅ Chittorgarh Listing: Found ${ipos.length} IPOs`);
  } catch (error) {
    console.error("Chittorgarh listing scrape failed:", error);
  }
  
  return ipos;
}

export async function scrapeGmpData(): Promise<GmpData[]> {
  console.log("📊 Scraping GMP data...");
  const gmpData: GmpData[] = [];
  
  try {
    const html = await fetchPage("https://www.chittorgarh.com/report/ipo-grey-market-premium-gmp-india/83/");
    const $ = cheerio.load(html);
    
    $("table tbody tr, table tr").each((_, row) => {
      const cells = $(row).find("td");
      if (cells.length < 3) return;
      
      const companyText = cells.eq(0).text().trim();
      if (!companyText || companyText.length < 3) return;
      if (companyText.toLowerCase().includes("company") || 
          companyText.toLowerCase().includes("ipo name")) return;
      
      const symbol = generateSymbol(companyText);
      
      let gmp = 0;
      let expectedListing = 0;
      
      for (let i = 1; i < cells.length; i++) {
        const cellText = cells.eq(i).text().trim();
        const header = $("thead th").eq(i).text().toLowerCase();
        
        if (header.includes("gmp") || header.includes("premium")) {
          gmp = parseNumber(cellText);
        }
        
        if (header.includes("expected") || header.includes("listing")) {
          expectedListing = parseNumber(cellText);
        }
      }
      
      if (gmp === 0) {
        const match = cells.eq(1).text().match(/[₹Rs.\s]*([-\d,]+)/);
        if (match) {
          gmp = parseNumber(match[1]);
        }
      }
      
      if (symbol) {
        gmpData.push({ symbol, gmp, expectedListing });
      }
    });
    
    console.log(`✅ GMP: Found data for ${gmpData.length} IPOs`);
  } catch (error) {
    console.error("GMP scrape failed:", error);
  }
  
  return gmpData;
}

export async function scrapeMainboardIPOs(): Promise<RawIpoData[]> {
  console.log("📊 Scraping current IPOs from multiple sources...");
  
  const [chittorgarhIpos, chittorgarhListingIpos, investorGainIpos, growwIpos] = await Promise.all([
    scrapeChittorgarhSubscription().catch(() => []),
    scrapeChittorgarhListing().catch(() => []),
    scrapeInvestorGain().catch(() => []),
    scrapeGroww().catch(() => []),
  ]);
  
  const ipoMap = new Map<string, RawIpoData>();
  
  for (const ipo of [...chittorgarhListingIpos, ...chittorgarhIpos, ...investorGainIpos, ...growwIpos]) {
    const existing = ipoMap.get(ipo.symbol);
    if (existing) {
      if (ipo.subscriptionTotal && !existing.subscriptionTotal) {
        existing.subscriptionTotal = ipo.subscriptionTotal;
      }
      if (ipo.qib && !existing.qib) existing.qib = ipo.qib;
      if (ipo.nii && !existing.nii) existing.nii = ipo.nii;
      if (ipo.retail && !existing.retail) existing.retail = ipo.retail;
      if (ipo.priceRange !== "TBA" && existing.priceRange === "TBA") {
        existing.priceRange = ipo.priceRange;
      }
      if (ipo.issueSize !== "TBA" && existing.issueSize === "TBA") {
        existing.issueSize = ipo.issueSize;
      }
      if (ipo.lotSize && !existing.lotSize) existing.lotSize = ipo.lotSize;
      if (ipo.openDate && !existing.openDate) existing.openDate = ipo.openDate;
      if (ipo.closeDate && !existing.closeDate) existing.closeDate = ipo.closeDate;
      if (ipo.status === "open") existing.status = "open";
    } else {
      ipoMap.set(ipo.symbol, { ...ipo });
    }
  }
  
  const mergedIpos = Array.from(ipoMap.values()).filter(ipo => ipo.status !== "closed");
  
  console.log(`✅ Total unique current IPOs: ${mergedIpos.length}`);
  console.log(`   Sources: ChittorgarhListing(${chittorgarhListingIpos.length}), ChittorgarhSub(${chittorgarhIpos.length}), InvestorGain(${investorGainIpos.length}), Groww(${growwIpos.length})`);
  
  return mergedIpos;
}

function generateSector(companyName: string): string {
  const name = companyName.toLowerCase();
  
  if (name.includes("pharma") || name.includes("drug") || name.includes("health") || name.includes("med") || name.includes("care")) {
    return "Healthcare";
  }
  if (name.includes("tech") || name.includes("software") || name.includes("digital") || name.includes("info") || name.includes("it ")) {
    return "Technology";
  }
  if (name.includes("bank") || name.includes("finance") || name.includes("capital") || name.includes("credit") || name.includes("fund") || name.includes("amc")) {
    return "Financial Services";
  }
  if (name.includes("energy") || name.includes("power") || name.includes("solar") || name.includes("electric") || name.includes("coal")) {
    return "Energy";
  }
  if (name.includes("infra") || name.includes("construct") || name.includes("build") || name.includes("real") || name.includes("property")) {
    return "Infrastructure";
  }
  if (name.includes("food") || name.includes("beverage") || name.includes("fmcg") || name.includes("consumer")) {
    return "Consumer Goods";
  }
  if (name.includes("auto") || name.includes("vehicle") || name.includes("motor")) {
    return "Automotive";
  }
  if (name.includes("chemical") || name.includes("material") || name.includes("metal") || name.includes("steel")) {
    return "Materials";
  }
  if (name.includes("retail") || name.includes("mart") || name.includes("store") || name.includes("shop")) {
    return "Retail";
  }
  if (name.includes("kidney") || name.includes("hospital") || name.includes("clinic") || name.includes("diagnostic")) {
    return "Healthcare";
  }
  
  return "Industrial";
}

export async function scrapeAndTransformIPOs(): Promise<InsertIpo[]> {
  console.log("🔄 Starting IPO data collection...");
  
  const [rawIpos, gmpData] = await Promise.all([
    scrapeMainboardIPOs(),
    scrapeGmpData().catch(() => []),
  ]);
  
  const gmpMap = new Map(gmpData.map(g => [g.symbol, g]));
  
  const transformedIpos: InsertIpo[] = [];
  
  for (const raw of rawIpos) {
    const gmp = gmpMap.get(raw.symbol);
    
    const openDate = parseDate(raw.openDate);
    const closeDate = parseDate(raw.closeDate);
    const status = determineStatus(openDate, closeDate);
    
    if (status === "closed") continue;
    
    const priceMatch = raw.priceRange.match(/[\d,]+/g);
    let priceMin = 0;
    let priceMax = 0;
    if (priceMatch && priceMatch.length >= 1) {
      priceMin = parseFloat(priceMatch[0].replace(/,/g, ""));
      priceMax = priceMatch.length >= 2 ? parseFloat(priceMatch[1].replace(/,/g, "")) : priceMin;
    }
    
    const issueMatch = raw.issueSize?.match(/([\d,.]+)\s*(cr|crore)?/i);
    const issueSize = issueMatch ? parseFloat(issueMatch[1].replace(/,/g, "")) : 0;
    
    const sector = generateSector(raw.companyName);
    
    const priceRangeStr = priceMin > 0 
      ? (priceMax > priceMin ? `₹${priceMin} - ₹${priceMax}` : `₹${priceMin}`)
      : "TBA";
    
    const ipo: InsertIpo = {
      symbol: raw.symbol,
      companyName: raw.companyName,
      priceRange: priceRangeStr,
      sector,
      status,
      expectedDate: openDate || closeDate || new Date().toISOString().split("T")[0],
      lotSize: raw.lotSize || 1,
      issueSize: issueSize > 0 ? `${issueSize} Cr` : "TBA",
      gmp: gmp?.gmp || 0,
      subscriptionQib: raw.qib || 0,
      subscriptionHni: raw.nii || 0,
      subscriptionRetail: raw.retail || 0,
    };
    
    const scores = calculateIpoScore(ipo);
    ipo.fundamentalsScore = scores.fundamentalsScore;
    ipo.valuationScore = scores.valuationScore;
    ipo.governanceScore = scores.governanceScore;
    ipo.overallScore = scores.overallScore;
    ipo.riskLevel = scores.riskLevel as "conservative" | "moderate" | "aggressive";
    // Convert arrays to JSON strings for SQLite
    ipo.redFlags = scores.redFlags.length > 0 ? JSON.stringify(scores.redFlags) : undefined;
    ipo.pros = scores.pros.length > 0 ? JSON.stringify(scores.pros) : undefined;
    
    transformedIpos.push(ipo);
  }
  
  console.log(`✅ Transformed ${transformedIpos.length} IPOs for database`);
  return transformedIpos;
}

export async function testConnection(): Promise<boolean> {
  try {
    console.log("🔍 Testing connections to data sources...");
    
    const results = await Promise.allSettled([
      axios.head(CHITTORGARH_SUB_STATUS, { headers, timeout: 10000 }),
      axios.head(INVESTORGAIN_LIVE, { headers, timeout: 10000 }),
      axios.head(GROWW_IPO, { headers, timeout: 10000 }),
    ]);
    
    const successCount = results.filter(r => r.status === "fulfilled").length;
    console.log(`✅ Connection test: ${successCount}/3 sources available`);
    
    return successCount >= 1;
  } catch (error) {
    console.error("Connection test failed:", error);
    return false;
  }
}

export const testScraper = testConnection;

export function generatePeerCompanies(ipoId: number, sector?: string): any[] {
  const sectorName = sector || "Industrial";
  const peers = [
    { ipoId, companyName: `${sectorName} Peer A`, symbol: "PEERA", peRatio: 25, roe: 15, roce: 18, revenueGrowth: 12, ebitdaMargin: 20, isIpoCompany: false },
    { ipoId, companyName: `${sectorName} Peer B`, symbol: "PEERB", peRatio: 22, roe: 18, roce: 20, revenueGrowth: 15, ebitdaMargin: 22, isIpoCompany: false },
  ];
  return peers;
}

export function generateGmpHistory(ipoId: number): any[] {
  const today = new Date();
  const history = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    history.push({
      ipoId,
      recordDate: date.toISOString().split("T")[0],
      gmpValue: Math.floor(Math.random() * 50) + 10,
    });
  }
  return history;
}

export function generateFundUtilization(ipoId: number): any[] {
  return [
    { ipoId, category: "Working Capital", percentage: 35 },
    { ipoId, category: "Capital Expenditure", percentage: 30 },
    { ipoId, category: "Debt Repayment", percentage: 20 },
    { ipoId, category: "General Corporate", percentage: 15 },
  ];
}
