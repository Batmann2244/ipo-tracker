import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
// @ts-ignore
import { registerRoutes } from './routes';
import { storage } from './storage';

// Mock storage
vi.mock('./storage', () => ({
  storage: {
    getIpo: vi.fn(),
    getIpos: vi.fn(),
    getWatchlist: vi.fn(),
    getAlertPreferences: vi.fn(),
    getIpoTimeline: vi.fn(),
    getGmpHistory: vi.fn(),
    getPeerCompanies: vi.fn(),
    getFundUtilization: vi.fn(),
    getUserSubscription: vi.fn(),
    upsertUser: vi.fn(),
    getIpoCount: vi.fn(),
    getAllUpcomingEvents: vi.fn(),
  },
}));

// Mock Auth
vi.mock('./replit_integrations/auth', () => ({
  setupAuth: vi.fn(),
  registerAuthRoutes: vi.fn(),
}));

// Mock NSE Client to prevent side effects
vi.mock('./services/scrapers/nse-client', () => ({
  Nse: class MockNse {
    constructor() {}
  },
  default: class MockNse {
      constructor() {}
  }
}));

// Mock other services to avoid side effects
vi.mock('./services/scoring', () => ({
  calculateIpoScore: vi.fn(),
}));

vi.mock('./services/scraper', () => ({
  testScraper: vi.fn(),
  scrapeAndTransformIPOs: vi.fn(),
  generatePeerCompanies: vi.fn(),
  generateGmpHistory: vi.fn(),
  generateFundUtilization: vi.fn(),
}));

vi.mock('./services/ai-analysis', () => ({
  analyzeIpo: vi.fn(),
}));

vi.mock('./services/email', () => ({
  sendIpoEmailAlert: vi.fn(),
}));

vi.mock('./services/data-scheduler', () => ({
  startScheduler: vi.fn(),
  stopScheduler: vi.fn(),
  getSchedulerStatus: vi.fn(),
  triggerManualPoll: vi.fn(),
  getRecentAlerts: vi.fn(),
  clearAlerts: vi.fn(),
}));

vi.mock('./services/multi-source-scraper', () => ({
  fetchAggregatedSubscription: vi.fn(),
  scrapeGmpFromMultipleSources: vi.fn(),
  scrapeGrowwCalendar: vi.fn(),
  isBiddingHours: vi.fn(),
}));

vi.mock('./services/scrapers/ipoalerts', () => ({
  ipoAlertsScraper: {
    getUsageStats: vi.fn(),
    canMakeRequest: vi.fn(),
    isWithinMarketHours: vi.fn(),
    getScheduledFetchType: vi.fn(),
  },
}));

vi.mock('./routes/api-v1', () => ({
  default: (req: any, res: any, next: any) => next(),
}));

vi.mock('./routes/scraper-debug', () => ({
  registerScraperDebugRoutes: vi.fn(),
}));

vi.mock('./services/api-key-service', () => ({
  createApiKey: vi.fn(),
  getUserApiKeys: vi.fn(),
  revokeApiKey: vi.fn(),
  getUserSubscription: vi.fn(),
  createOrUpdateSubscription: vi.fn(),
  getUsageStats: vi.fn(),
  getTodayUsageCount: vi.fn(),
  getTierLimits: vi.fn(),
}));

vi.mock('./services/scraper-logger', () => ({
  scraperLogger: {
    getRecentLogs: vi.fn(),
    getLogsBySource: vi.fn(),
    getSourceStats: vi.fn(),
    getHealthStatus: vi.fn(),
  },
}));

vi.mock('./services/scrapers/investorgain', () => ({
  investorGainScraper: {
    getIpos: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getGmpHistory: vi.fn().mockResolvedValue([]),
    getSubscriptionDetails: vi.fn().mockResolvedValue(null),
  },
}));

describe('GET /api/ipos/:id', () => {
  let app: express.Express;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    // Create a mock httpServer
    const httpServer = {
      listen: vi.fn(),
    } as any;

    // Mock getIpos to return something to avoid auto-sync logic if needed,
    // though mocking scrapeAndTransformIPOs should be enough.
    vi.mocked(storage.getIpos).mockResolvedValue([{ id: 1 } as any]);

    await registerRoutes(httpServer, app);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return 200 and the IPO data when found', async () => {
    const mockIpo = {
        id: 1,
        companyName: 'Test IPO',
        symbol: 'TEST',
        priceRange: '100-200',
        status: 'upcoming',
        expectedDate: '2023-01-01'
    };
    vi.mocked(storage.getIpo).mockResolvedValue(mockIpo as any);

    const response = await request(app).get('/api/ipos/1');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockIpo);
    expect(storage.getIpo).toHaveBeenCalledWith(1);
  });

  it('should return 404 when IPO is not found', async () => {
    vi.mocked(storage.getIpo).mockResolvedValue(undefined);

    const response = await request(app).get('/api/ipos/999');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: 'IPO not found' });
    expect(storage.getIpo).toHaveBeenCalledWith(999);
  });
});
