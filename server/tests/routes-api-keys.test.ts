
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { registerRoutes } from '../routes';
import * as apiKeyService from '../services/api-key-service';

// Mock API Key Service
vi.mock('../services/api-key-service', async () => {
  const actual = await vi.importActual('../services/api-key-service');
  return {
    ...actual,
    getUserApiKeys: vi.fn(),
    getTodayUsageCountsForKeys: vi.fn(),
    getTierLimits: vi.fn(),
    getUserSubscription: vi.fn(),
    createOrUpdateSubscription: vi.fn(),
    getUsageStats: vi.fn(),
    createApiKey: vi.fn(),
    revokeApiKey: vi.fn(),
  };
});

// Mock Auth
vi.mock('../replit_integrations/auth', () => ({
  setupAuth: vi.fn(),
  registerAuthRoutes: vi.fn(),
}));

// Mock Scheduler (to avoid starting it)
vi.mock('../services/data-scheduler', () => ({
  startScheduler: vi.fn(),
  stopScheduler: vi.fn(),
  getSchedulerStatus: vi.fn(),
  triggerManualPoll: vi.fn(),
  getRecentAlerts: vi.fn(),
  clearAlerts: vi.fn(),
}));

// Mock Storage (for ipos/list etc)
vi.mock('../storage', () => ({
  storage: {
    getIpos: vi.fn().mockResolvedValue([]),
    getIpo: vi.fn(),
    getWatchlist: vi.fn(),
    addToWatchlist: vi.fn(),
    removeFromWatchlist: vi.fn(),
    getAlertPreferences: vi.fn(),
    upsertAlertPreferences: vi.fn(),
    getAlertLogs: vi.fn(),
    getGmpHistory: vi.fn(),
    getPeerCompanies: vi.fn(),
    getSubscriptionUpdates: vi.fn(),
    getLatestSubscription: vi.fn(),
    getFundUtilization: vi.fn(),
    getIpoTimeline: vi.fn(),
    getAllUpcomingEvents: vi.fn(),
    createAlertLog: vi.fn(),
    updateIpo: vi.fn(),
    createIpo: vi.fn(),
    addPeerCompany: vi.fn(),
    addGmpHistory: vi.fn(),
    addFundUtilization: vi.fn(),
    addTimelineEvent: vi.fn(),
    getIpoCount: vi.fn().mockResolvedValue(0),
    markAllAsListed: vi.fn(),
    upsertIpo: vi.fn(),
    getIpoBySymbol: vi.fn(),
  },
}));

// Mock Scrapers
vi.mock('../services/scraper', () => ({
  scrapeAndTransformIPOs: vi.fn().mockResolvedValue([]),
  testScraper: vi.fn(),
  generatePeerCompanies: vi.fn(),
  generateGmpHistory: vi.fn(),
  generateFundUtilization: vi.fn(),
}));

vi.mock('../services/multi-source-scraper', () => ({
  fetchAggregatedSubscription: vi.fn(),
  scrapeGmpFromMultipleSources: vi.fn(),
  scrapeGrowwCalendar: vi.fn(),
  isBiddingHours: vi.fn(),
}));

vi.mock('../services/scrapers/ipoalerts', () => ({
  ipoAlertsScraper: {
    getUsageStats: vi.fn(),
    canMakeRequest: vi.fn(),
    isWithinMarketHours: vi.fn(),
    getScheduledFetchType: vi.fn(),
    getIposByStatus: vi.fn(),
    getOpenIpos: vi.fn(),
  },
}));

vi.mock('../services/scrapers/investorgain', () => ({
  investorGainScraper: {
    getIpos: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getGmpHistory: vi.fn(),
    getSubscriptionDetails: vi.fn(),
  },
}));

vi.mock('../services/scraper-logger', () => ({
  scraperLogger: {
    getRecentLogs: vi.fn(),
    getLogsBySource: vi.fn(),
    getSourceStats: vi.fn(),
    getHealthStatus: vi.fn(),
  },
}));

describe('API Keys Routes', () => {
  let app: express.Express;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());

    // Mock authentication middleware
    app.use((req: any, res, next) => {
      req.isAuthenticated = () => true;
      req.user = { claims: { sub: 'test-user-id' } };
      next();
    });

    await registerRoutes(app as any, app);
  });

  it('should fetch API keys with usage counts optimized', async () => {
    const mockKeys = [
      { id: 1, name: 'Key 1', keyPrefix: 'k1', tier: 'free', isActive: true, createdAt: new Date() },
      { id: 2, name: 'Key 2', keyPrefix: 'k2', tier: 'pro', isActive: true, createdAt: new Date() },
    ];

    const mockUsage = {
      1: 5,
      2: 10,
    };

    vi.mocked(apiKeyService.getUserApiKeys).mockResolvedValue(mockKeys as any);
    vi.mocked(apiKeyService.getTodayUsageCountsForKeys).mockResolvedValue(mockUsage);
    vi.mocked(apiKeyService.getTierLimits).mockImplementation((tier) => {
        if (tier === 'free') return { apiCallsPerDay: 100 } as any;
        if (tier === 'pro') return { apiCallsPerDay: 1000 } as any;
        return { apiCallsPerDay: 0 } as any;
    });

    const res = await request(app).get('/api/keys');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);

    // Verify optimization function was called
    expect(apiKeyService.getTodayUsageCountsForKeys).toHaveBeenCalledTimes(1);
    expect(apiKeyService.getTodayUsageCountsForKeys).toHaveBeenCalledWith([1, 2]);

    // Verify response data
    expect(res.body[0].id).toBe(1);
    expect(res.body[0].todayUsage).toBe(5);
    expect(res.body[0].dailyLimit).toBe(100);

    expect(res.body[1].id).toBe(2);
    expect(res.body[1].todayUsage).toBe(10);
    expect(res.body[1].dailyLimit).toBe(1000);
  });
});
