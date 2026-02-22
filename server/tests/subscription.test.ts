import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { registerRoutes } from '../routes';
import { createServer } from 'http';

// Mock dependencies
vi.mock('../storage', () => ({
  storage: {
    getIpos: vi.fn().mockResolvedValue([]),
    getIpoCount: vi.fn().mockResolvedValue(0),
    getWatchlist: vi.fn().mockResolvedValue([]),
    getAlertPreferences: vi.fn().mockResolvedValue({}),
    getAlertLogs: vi.fn().mockResolvedValue([]),
    getGmpHistory: vi.fn().mockResolvedValue([]),
    getPeerCompanies: vi.fn().mockResolvedValue([]),
    getSubscriptionUpdates: vi.fn().mockResolvedValue([]),
    getLatestSubscription: vi.fn().mockResolvedValue(null),
    getFundUtilization: vi.fn().mockResolvedValue([]),
    getIpoTimeline: vi.fn().mockResolvedValue([]),
    getAllUpcomingEvents: vi.fn().mockResolvedValue([]),
    createIpo: vi.fn(),
    addPeerCompany: vi.fn(),
    addGmpHistory: vi.fn(),
    addFundUtilization: vi.fn(),
    addTimelineEvent: vi.fn(),
  },
}));

vi.mock('../services/scraper', () => ({
  scrapeAndTransformIPOs: vi.fn().mockResolvedValue([]),
  testScraper: vi.fn(),
  generatePeerCompanies: vi.fn().mockResolvedValue([]),
  generateGmpHistory: vi.fn().mockResolvedValue([]),
  generateFundUtilization: vi.fn().mockResolvedValue([]),
}));

vi.mock('../services/data-scheduler', () => ({
  startScheduler: vi.fn(),
  stopScheduler: vi.fn(),
  getSchedulerStatus: vi.fn(),
  triggerManualPoll: vi.fn(),
  getRecentAlerts: vi.fn(),
  clearAlerts: vi.fn(),
}));

vi.mock('../services/scrapers/investorgain', () => ({
  investorGainScraper: {
    getIpos: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getGmpHistory: vi.fn().mockResolvedValue([]),
    getSubscriptionDetails: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('../services/scrapers/ipoalerts', () => ({
  ipoAlertsScraper: {
    getUsageStats: vi.fn().mockReturnValue({}),
    canMakeRequest: vi.fn().mockReturnValue(true),
    isWithinMarketHours: vi.fn().mockReturnValue(true),
    getScheduledFetchType: vi.fn(),
  }
}));

vi.mock('../services/multi-source-scraper', () => ({
  fetchAggregatedSubscription: vi.fn(),
  scrapeGmpFromMultipleSources: vi.fn(),
  scrapeGrowwCalendar: vi.fn(),
  isBiddingHours: vi.fn(),
}));

vi.mock('../replit_integrations/auth', () => ({
  setupAuth: vi.fn(),
  registerAuthRoutes: vi.fn(),
}));

// Mock api-key-service
const { mockGetUserSubscription, mockCreateOrUpdateSubscription } = vi.hoisted(() => {
  return {
    mockGetUserSubscription: vi.fn(),
    mockCreateOrUpdateSubscription: vi.fn(),
  };
});

vi.mock('../services/api-key-service', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    getUserSubscription: mockGetUserSubscription,
    createOrUpdateSubscription: mockCreateOrUpdateSubscription,
  };
});

describe('GET /api/subscription', () => {
  let app: express.Express;

  beforeEach(async () => {
    vi.clearAllMocks();

    app = express();
    app.use(express.json());

    // Mock auth middleware
    app.use((req: any, res, next) => {
      req.isAuthenticated = () => true;
      req.user = { claims: { sub: 'test-user-id' } };
      next();
    });

    const httpServer = createServer(app);
    await registerRoutes(httpServer, app);
  });

  it('should return existing subscription', async () => {
    const mockSubscription = {
      userId: 'test-user-id',
      tier: 'basic',
      status: 'active',
    };
    mockGetUserSubscription.mockResolvedValue(mockSubscription);

    const res = await request(app).get('/api/subscription');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      userId: 'test-user-id',
      tier: 'basic',
    });
    expect(res.body.tierLimits).toBeDefined();
    // Basic tier has 100 calls per day
    expect(res.body.tierLimits.apiCallsPerDay).toBe(100);
  });

  it('should create free subscription if none exists', async () => {
    mockGetUserSubscription.mockResolvedValue(undefined);
    const mockNewSubscription = {
      userId: 'test-user-id',
      tier: 'free',
      status: 'active',
    };
    mockCreateOrUpdateSubscription.mockResolvedValue(mockNewSubscription);

    const res = await request(app).get('/api/subscription');

    expect(res.status).toBe(200);
    expect(mockCreateOrUpdateSubscription).toHaveBeenCalledWith('test-user-id', 'free');
    expect(res.body).toMatchObject({
      userId: 'test-user-id',
      tier: 'free',
    });
    expect(res.body.tierLimits).toBeDefined();
    // Free tier has 10 calls per day
    expect(res.body.tierLimits.apiCallsPerDay).toBe(10);
  });

  it('should handle errors gracefully', async () => {
    mockGetUserSubscription.mockRejectedValue(new Error('Database error'));

    const res = await request(app).get('/api/subscription');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to fetch subscription' });
  });
});
