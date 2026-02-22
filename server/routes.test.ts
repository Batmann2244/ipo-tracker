import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import express, { Express, Request, Response, NextFunction } from 'express';
import { createServer, Server } from 'http';
import { registerRoutes } from './routes';
import { AddressInfo } from 'net';

// === Mock Dependencies ===

// Mock Storage
vi.mock('./storage', () => ({
  storage: {
    getIpos: vi.fn().mockResolvedValue([
      { id: 1, symbol: 'TESTIPO', companyName: 'Test IPO Ltd', status: 'upcoming', expectedDate: '2023-12-01', priceRange: '100-200', issueSize: '100 Cr' },
      { id: 2, symbol: 'OPENIPO', companyName: 'Open IPO Ltd', status: 'open', expectedDate: '2023-11-20', priceRange: '50-60', issueSize: '50 Cr' }
    ]),
    getIpo: vi.fn().mockImplementation((id: number) => {
      if (id === 1) return Promise.resolve({ id: 1, symbol: 'TESTIPO', companyName: 'Test IPO Ltd', status: 'upcoming' });
      return Promise.resolve(undefined);
    }),
    getWatchlist: vi.fn().mockResolvedValue([{ id: 1, userId: 'test-user', ipoId: 1, ipo: { symbol: 'TESTIPO' } }]),
    addToWatchlist: vi.fn().mockResolvedValue({ id: 1, userId: 'test-user', ipoId: 1 }),
    removeFromWatchlist: vi.fn().mockResolvedValue(undefined),
    upsertIpo: vi.fn().mockResolvedValue({ id: 3, symbol: 'NEWIPO', companyName: 'New IPO', status: 'upcoming' }),
    getIpoBySymbol: vi.fn().mockResolvedValue(undefined),
    createIpo: vi.fn().mockResolvedValue({ id: 3, symbol: 'NEWIPO', companyName: 'New IPO' }),
    getPeerCompanies: vi.fn().mockResolvedValue([]),
    addPeerCompany: vi.fn().mockResolvedValue({}),
    addGmpHistory: vi.fn().mockResolvedValue({}),
    getFundUtilization: vi.fn().mockResolvedValue([]),
    addFundUtilization: vi.fn().mockResolvedValue({}),
    getIpoTimeline: vi.fn().mockResolvedValue([]),
    addTimelineEvent: vi.fn().mockResolvedValue({}),
    getIpoCount: vi.fn().mockResolvedValue(10),
    markAllAsListed: vi.fn().mockResolvedValue(0),
    getAlertPreferences: vi.fn().mockResolvedValue({}),
    upsertAlertPreferences: vi.fn().mockResolvedValue({}),
    getAlertLogs: vi.fn().mockResolvedValue([]),
    createAlertLog: vi.fn().mockResolvedValue({}),
    getGmpHistory: vi.fn().mockResolvedValue([]),
    getSubscriptionUpdates: vi.fn().mockResolvedValue([]),
    getLatestSubscription: vi.fn().mockResolvedValue(undefined),
    getAllUpcomingEvents: vi.fn().mockResolvedValue([]),
    updateIpo: vi.fn().mockResolvedValue({}),
  }
}));

// Mock Auth Integrations
vi.mock('./replit_integrations/auth', () => ({
  setupAuth: vi.fn().mockResolvedValue(undefined),
  registerAuthRoutes: vi.fn(),
}));

// Mock Scraper Services
vi.mock('./services/scraper', () => ({
  scrapeAndTransformIPOs: vi.fn().mockResolvedValue([]),
  testScraper: vi.fn().mockResolvedValue(true),
  generatePeerCompanies: vi.fn().mockReturnValue([]),
  generateGmpHistory: vi.fn().mockReturnValue([]),
  generateFundUtilization: vi.fn().mockReturnValue([]),
}));

// Mock AI Analysis
vi.mock('./services/ai-analysis', () => ({
  analyzeIpo: vi.fn().mockResolvedValue({ summary: 'AI Summary', recommendation: 'Buy' }),
}));

// Mock Scheduler
vi.mock('./services/data-scheduler', () => ({
  startScheduler: vi.fn(),
  stopScheduler: vi.fn(),
  getSchedulerStatus: vi.fn().mockReturnValue({ running: true }),
  triggerManualPoll: vi.fn().mockResolvedValue({ success: true }),
  getRecentAlerts: vi.fn().mockReturnValue([]),
  clearAlerts: vi.fn(),
}));

// Mock Multi-Source Scraper
vi.mock('./services/multi-source-scraper', () => ({
  fetchAggregatedSubscription: vi.fn().mockResolvedValue([]),
  scrapeGmpFromMultipleSources: vi.fn().mockResolvedValue([]),
  scrapeGrowwCalendar: vi.fn().mockResolvedValue([]),
  isBiddingHours: vi.fn().mockReturnValue(true),
}));

// Mock IPO Alerts Scraper
vi.mock('./services/scrapers/ipoalerts', () => ({
  ipoAlertsScraper: {
    getUsageStats: vi.fn().mockReturnValue({}),
    canMakeRequest: vi.fn().mockReturnValue(true),
    isWithinMarketHours: vi.fn().mockReturnValue(true),
    getScheduledFetchType: vi.fn().mockReturnValue('none'),
    getIposByStatus: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getOpenIpos: vi.fn().mockResolvedValue({ success: true, data: [] }),
  }
}));

// Mock InvestorGain Scraper
vi.mock('./services/scrapers/investorgain', () => ({
  investorGainScraper: {
    getIpos: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getGmpHistory: vi.fn().mockResolvedValue([]),
    getSubscriptionDetails: vi.fn().mockResolvedValue(null),
  }
}));

// Mock API Key Service
vi.mock('./services/api-key-service', () => ({
  getUserSubscription: vi.fn().mockResolvedValue({ tier: 'free' }),
  createOrUpdateSubscription: vi.fn().mockResolvedValue({ tier: 'free' }),
  getUserApiKeys: vi.fn().mockResolvedValue([]),
  createApiKey: vi.fn().mockResolvedValue({ apiKey: { id: 1 }, plainKey: 'key' }),
  revokeApiKey: vi.fn().mockResolvedValue(true),
  getUsageStats: vi.fn().mockResolvedValue([]),
  getTodayUsageCount: vi.fn().mockResolvedValue(0),
  getTierLimits: vi.fn().mockReturnValue({ apiCallsPerDay: 10 }),
}));

// Mock Scraper Logger
vi.mock('./services/scraper-logger', () => ({
  scraperLogger: {
    getRecentLogs: vi.fn().mockResolvedValue([]),
    getLogsBySource: vi.fn().mockResolvedValue([]),
    getSourceStats: vi.fn().mockResolvedValue({}),
    getHealthStatus: vi.fn().mockResolvedValue({}),
  }
}));

// Mock Email Service
vi.mock('./services/email', () => ({
  sendIpoEmailAlert: vi.fn().mockResolvedValue(true),
}));

// Mock API V1 Router (to prevent DB connection)
vi.mock('./routes/api-v1', () => {
  const express = require('express');
  const router = express.Router();
  router.get('/health', (req: any, res: any) => res.json({ status: 'ok' }));
  return { default: router };
});

// Mock Scraper Debug Routes
vi.mock('./routes/scraper-debug', () => ({
  registerScraperDebugRoutes: vi.fn(),
}));

// Mock Scoring
vi.mock('./services/scoring', () => ({
  calculateIpoScore: vi.fn().mockReturnValue({}),
}));


describe('Routes Integration Tests', () => {
  let app: Express;
  let server: Server;
  let port: number;
  let baseUrl: string;

  beforeAll(async () => {
    app = express();
    app.use(express.json()); // Essential for parsing JSON bodies

    // Middleware to mock authentication based on header
    app.use((req: any, res: Response, next: NextFunction) => {
      const isAuth = req.headers['x-test-auth'] === 'true';
      req.isAuthenticated = () => isAuth;
      if (isAuth) {
        req.user = {
          claims: { sub: 'test-user-id' }
        };
      }
      next();
    });

    server = createServer(app);
    await registerRoutes(server, app);

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const address = server.address() as AddressInfo;
        port = address.port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // === Public Routes ===

  it('GET /api/ipos should return list of IPOs', async () => {
    const res = await fetch(`${baseUrl}/api/ipos`);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(2);
    expect(data[0].symbol).toBe('TESTIPO');
  });

  it('GET /api/ipos/:id should return IPO details if found', async () => {
    const res = await fetch(`${baseUrl}/api/ipos/1`);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.symbol).toBe('TESTIPO');
  });

  it('GET /api/ipos/:id should return 404 if not found', async () => {
    const res = await fetch(`${baseUrl}/api/ipos/999`);

    expect(res.status).toBe(404);
  });

  // === Protected Routes (Watchlist) ===

  it('GET /api/watchlist should return 401 without auth', async () => {
    const res = await fetch(`${baseUrl}/api/watchlist`);

    expect(res.status).toBe(401);
  });

  it('GET /api/watchlist should return 200 with auth', async () => {
    const res = await fetch(`${baseUrl}/api/watchlist`, {
      headers: { 'x-test-auth': 'true' }
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it('POST /api/watchlist should add item when authenticated', async () => {
    const res = await fetch(`${baseUrl}/api/watchlist`, {
      method: 'POST',
      headers: {
        'x-test-auth': 'true',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ipoId: 1 })
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.ipoId).toBe(1);
  });

  // === Admin Routes ===

  it('POST /api/admin/sync should trigger sync when authenticated', async () => {
    const res = await fetch(`${baseUrl}/api/admin/sync`, {
      method: 'POST',
      headers: { 'x-test-auth': 'true' }
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it('POST /api/admin/sync should fail without auth', async () => {
    const res = await fetch(`${baseUrl}/api/admin/sync`, {
      method: 'POST'
    });

    expect(res.status).toBe(401);
  });

  // === Subscription Routes ===

  it('GET /api/subscription should return user subscription', async () => {
    const res = await fetch(`${baseUrl}/api/subscription`, {
      headers: { 'x-test-auth': 'true' }
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.tier).toBe('free');
  });

  // === API Key Management ===

  it('POST /api/keys should create API key', async () => {
    const res = await fetch(`${baseUrl}/api/keys`, {
      method: 'POST',
      headers: {
        'x-test-auth': 'true',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: 'Test Key' })
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toBe('API key created successfully');
  });

  // === Data Routes ===

  it('GET /api/data/subscription/live should return live data', async () => {
    const res = await fetch(`${baseUrl}/api/data/subscription/live`);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

});
