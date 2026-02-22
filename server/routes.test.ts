import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from './routes';
import { storage } from './storage';
import { api } from '@shared/routes';

// Mock storage
vi.mock('./storage', () => ({
  storage: {
    getIpo: vi.fn(),
    addToWatchlist: vi.fn(),
    getIpoTimeline: vi.fn(),
    getWatchlistItem: vi.fn(),
    getUserSubscription: vi.fn(),
    getUsageStats: vi.fn(),
    getTierLimits: vi.fn(),
    getIpos: vi.fn().mockResolvedValue([]),
    getIpoCount: vi.fn(),
    getAlertPreferences: vi.fn(),
    getAlertLogs: vi.fn(),
    getGmpHistory: vi.fn(),
    getPeerCompanies: vi.fn(),
    getSubscriptionUpdates: vi.fn(),
    getLatestSubscription: vi.fn(),
    getFundUtilization: vi.fn(),
    getAllUpcomingEvents: vi.fn(),
    createIpo: vi.fn(),
    addPeerCompany: vi.fn(),
    addGmpHistory: vi.fn(),
    addFundUtilization: vi.fn(),
    addTimelineEvent: vi.fn(),
    removeFromWatchlist: vi.fn(),
    upsertIpo: vi.fn(),
    getIpoBySymbol: vi.fn(),
    markAllAsListed: vi.fn(),
  },
}));

// Mock services to prevent side effects
vi.mock('./services/scoring', () => ({ calculateIpoScore: vi.fn() }));
vi.mock('./services/scraper', () => ({
  scrapeAndTransformIPOs: vi.fn().mockResolvedValue([]),
  testScraper: vi.fn(),
  generatePeerCompanies: vi.fn(),
  generateGmpHistory: vi.fn(),
  generateFundUtilization: vi.fn(),
}));
vi.mock('./services/ai-analysis', () => ({ analyzeIpo: vi.fn() }));
vi.mock('./services/email', () => ({ sendIpoEmailAlert: vi.fn() }));
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
vi.mock('./routes/api-v1', () => ({ default: (req: any, res: any, next: any) => next() }));
vi.mock('./routes/scraper-debug', () => ({ registerScraperDebugRoutes: vi.fn() }));
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
    getGmpHistory: vi.fn(),
    getSubscriptionDetails: vi.fn(),
  },
}));

// Mock Auth
vi.mock('./replit_integrations/auth', () => ({
  setupAuth: async (app: express.Express) => {
    // Middleware to mock authentication state
    app.use((req: any, _res, next) => {
      req.isAuthenticated = () => {
        return !!req.headers['x-test-auth'];
      };
      if (req.headers['x-test-auth']) {
        try {
            req.user = JSON.parse(req.headers['x-test-auth'] as string);
        } catch (e) {
            req.user = {};
        }
      }
      next();
    });
  },
  registerAuthRoutes: vi.fn(),
}));

describe(`POST ${api.watchlist.add.path}`, () => {
  let app: express.Express;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    // Create a mock httpServer
    const httpServer = {
        listen: vi.fn(),
    } as any;
    await registerRoutes(httpServer, app);
  });

  it('should return 401 if not authenticated', async () => {
    const res = await request(app)
      .post(api.watchlist.add.path)
      .send({ ipoId: 1 });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: "Unauthorized" });
  });

  it('should return 400 if ipoId is missing', async () => {
    const user = { claims: { sub: 'user123' } };
    const res = await request(app)
      .post(api.watchlist.add.path)
      .set('x-test-auth', JSON.stringify(user))
      .send({}); // Missing ipoId

    expect(res.status).toBe(400);
  });

   it('should return 400 if ipoId is invalid type', async () => {
    const user = { claims: { sub: 'user123' } };
    const res = await request(app)
      .post(api.watchlist.add.path)
      .set('x-test-auth', JSON.stringify(user))
      .send({ ipoId: "string" });

    expect(res.status).toBe(400);
  });

  it('should return 404 if IPO does not exist', async () => {
    const user = { claims: { sub: 'user123' } };
    vi.mocked(storage.getIpo).mockResolvedValue(undefined);

    const res = await request(app)
      .post(api.watchlist.add.path)
      .set('x-test-auth', JSON.stringify(user))
      .send({ ipoId: 999 });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "IPO not found" });
    expect(storage.getIpo).toHaveBeenCalledWith(999);
  });

  it('should add to watchlist and return 201 on success', async () => {
    const user = { claims: { sub: 'user123' } };
    const mockIpo = { id: 1, companyName: 'Test IPO', expectedDate: '2023-01-01' } as any;
    const mockWatchlistItem = { id: 101, userId: 'user123', ipoId: 1 };

    vi.mocked(storage.getIpo).mockResolvedValue(mockIpo);
    vi.mocked(storage.addToWatchlist).mockResolvedValue(mockWatchlistItem as any);
    vi.mocked(storage.getIpoTimeline).mockResolvedValue([]); // No existing timeline

    const res = await request(app)
      .post(api.watchlist.add.path)
      .set('x-test-auth', JSON.stringify(user))
      .send({ ipoId: 1 });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(mockWatchlistItem);
    expect(storage.getIpo).toHaveBeenCalledWith(1);
    expect(storage.addToWatchlist).toHaveBeenCalledWith('user123', 1);
  });
});
