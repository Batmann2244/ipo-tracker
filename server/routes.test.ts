import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';
import type { Server } from 'http';

// --- MOCKS ---

// 1. Mock DB (must be first)
vi.mock('./db', () => ({
  db: {
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => []) })) })),
    insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn(() => []) })) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => ({ returning: vi.fn(() => []) })) })) })),
    delete: vi.fn(() => ({ where: vi.fn() })),
  },
}));

// 2. Mock Storage
vi.mock('./storage', () => ({
  storage: {
    getIpos: vi.fn().mockResolvedValue([{ id: 1, symbol: 'MOCK' }]), // Return non-empty to skip auto-sync
    getIpo: vi.fn(),
    getIpoBySymbol: vi.fn(),
    upsertIpo: vi.fn(),
    getWatchlist: vi.fn(),
    addToWatchlist: vi.fn(),
    removeFromWatchlist: vi.fn(),
    getAlertPreferences: vi.fn(),
    upsertAlertPreferences: vi.fn(),
    createAlertLog: vi.fn(),
    getAlertLogs: vi.fn(),
    getPeerCompanies: vi.fn().mockResolvedValue([]),
    getGmpHistory: vi.fn().mockResolvedValue([]),
    getSubscriptionUpdates: vi.fn().mockResolvedValue([]),
    getLatestSubscription: vi.fn(),
    getFundUtilization: vi.fn().mockResolvedValue([]),
    getIpoTimeline: vi.fn().mockResolvedValue([]),
    getAllUpcomingEvents: vi.fn().mockResolvedValue([]),
    getIpoCount: vi.fn().mockResolvedValue(0),
    markAllAsListed: vi.fn(),
    deleteIpo: vi.fn(),
    getWatchlistItem: vi.fn(),
    getAllUsersWithAlerts: vi.fn().mockResolvedValue([]),
    addGmpHistory: vi.fn(),
    addPeerCompany: vi.fn(),
    deletePeerCompanies: vi.fn(),
    addSubscriptionUpdate: vi.fn(),
    addFundUtilization: vi.fn(),
    updateFundUtilization: vi.fn(),
    addTimelineEvent: vi.fn(),
    getUser: vi.fn(),
    upsertUser: vi.fn(),
  },
}));

// 3. Mock Scraper Services
vi.mock('./services/scrapers/nse-client/index', () => ({
  Nse: class {
    constructor() {}
    getUpcomingIpos() { return Promise.resolve([]); }
    getCurrentIpos() { return Promise.resolve([]); }
    getIpoList() { return Promise.resolve([]); }
  },
}));

vi.mock('./services/scrapers/investorgain', () => ({
  investorGainScraper: {
    getIpos: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getGmpHistory: vi.fn().mockResolvedValue([]),
    getSubscriptionDetails: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('./services/scraper', () => ({
  scrapeAndTransformIPOs: vi.fn().mockResolvedValue([]),
  testScraper: vi.fn(),
  generatePeerCompanies: vi.fn().mockReturnValue([]),
  generateGmpHistory: vi.fn().mockReturnValue([]),
  generateFundUtilization: vi.fn().mockReturnValue([]),
}));

vi.mock('./services/data-scheduler', () => ({
  startScheduler: vi.fn(),
  stopScheduler: vi.fn(),
  getSchedulerStatus: vi.fn(),
  triggerManualPoll: vi.fn(),
  getRecentAlerts: vi.fn().mockReturnValue([]),
  clearAlerts: vi.fn(),
}));

vi.mock('./services/scrapers/ipoalerts', () => ({
  ipoAlertsScraper: {
    getUsageStats: vi.fn().mockReturnValue({}),
    canMakeRequest: vi.fn().mockReturnValue(true),
    isWithinMarketHours: vi.fn().mockReturnValue(true),
    getScheduledFetchType: vi.fn(),
  },
}));

vi.mock('./services/multi-source-scraper', () => ({
  fetchAggregatedSubscription: vi.fn().mockResolvedValue([]),
  scrapeGmpFromMultipleSources: vi.fn().mockResolvedValue([]),
  scrapeGrowwCalendar: vi.fn().mockResolvedValue([]),
  isBiddingHours: vi.fn().mockReturnValue(true),
}));

vi.mock('./services/scraper-logger', () => ({
  scraperLogger: {
    getRecentLogs: vi.fn().mockResolvedValue([]),
    getLogsBySource: vi.fn().mockResolvedValue([]),
    getSourceStats: vi.fn().mockResolvedValue([]),
    getHealthStatus: vi.fn().mockResolvedValue({}),
  },
}));

// 4. Mock API Key Service
vi.mock('./services/api-key-service', () => ({
  createApiKey: vi.fn(),
  getUserApiKeys: vi.fn(),
  getUserSubscription: vi.fn(),
  revokeApiKey: vi.fn(),
  createOrUpdateSubscription: vi.fn(),
  getUsageStats: vi.fn().mockResolvedValue([]),
  getTodayUsageCount: vi.fn().mockResolvedValue(0),
  getTierLimits: vi.fn().mockReturnValue({ apiCallsPerDay: 10 }),
}));

// 5. Mock Auth
vi.mock('./replit_integrations/auth', () => ({
  setupAuth: vi.fn(), // No-op
  registerAuthRoutes: vi.fn(),
}));

vi.mock('./routes/api-v1', () => ({
  default: (req: any, res: any, next: any) => next(),
}));

vi.mock('./routes/scraper-debug', () => ({
  registerScraperDebugRoutes: vi.fn(),
}));


import { registerRoutes } from './routes';
import { createApiKey, getUserApiKeys, getUserSubscription } from './services/api-key-service';
import { createServer } from 'http';

describe('API Key Routes', () => {
  let app: Express;
  let server: Server;

  const mockUser = {
    claims: { sub: 'user-123' },
  };

  // Helper to setup app with auth mock
  const setupApp = async (isAuthenticated = true, user = mockUser) => {
    app = express();
    app.use(express.json());

    // Mock Auth Middleware
    app.use((req: any, res, next) => {
      req.isAuthenticated = () => isAuthenticated;
      req.user = user;
      next();
    });

    server = createServer(app);
    await registerRoutes(server, app);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/keys', () => {
    it('should return 401 if not authenticated', async () => {
      await setupApp(false);

      const res = await request(app)
        .post('/api/keys')
        .send({ name: 'Test Key' });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('message', 'Unauthorized - Please sign in');
    });

    it('should create a new API key successfully', async () => {
      await setupApp(true);

      // Mock services
      vi.mocked(getUserApiKeys).mockResolvedValue([]);
      vi.mocked(getUserSubscription).mockResolvedValue({ tier: 'free' } as any);
      vi.mocked(createApiKey).mockResolvedValue({
        apiKey: {
          id: 1,
          userId: 'user-123',
          name: 'Test Key',
          keyPrefix: 'prefix',
          keyHash: 'hash',
          tier: 'free',
          isActive: true,
          createdAt: new Date(),
        } as any,
        plainKey: 'prefix-plain-key-secret',
      });

      const res = await request(app)
        .post('/api/keys')
        .send({ name: 'Test Key' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'API key created successfully');
      expect(res.body.key).toHaveProperty('name', 'Test Key');
      expect(res.body).toHaveProperty('plainKey', 'prefix-plain-key-secret');
    });

    it('should return 400 if name is missing', async () => {
      await setupApp(true);

      const res = await request(app)
        .post('/api/keys')
        .send({}); // Missing name

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Key name is required');
    });

    it('should return 400 if maximum keys reached for free tier', async () => {
      await setupApp(true);

      vi.mocked(getUserSubscription).mockResolvedValue({ tier: 'free' } as any);
      // Free tier allows 2 keys. Mock return 2 existing keys.
      vi.mocked(getUserApiKeys).mockResolvedValue([
        { id: 1 }, { id: 2 }
      ] as any[]);

      const res = await request(app)
        .post('/api/keys')
        .send({ name: 'Test Key' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Maximum 2 API keys allowed/);
    });

    it('should return 400 if maximum keys reached for pro tier', async () => {
      await setupApp(true);

      vi.mocked(getUserSubscription).mockResolvedValue({ tier: 'pro' } as any);
      // Pro tier allows 10 keys. Mock return 10 existing keys.
      const existingKeys = Array(10).fill({ id: 1 });
      vi.mocked(getUserApiKeys).mockResolvedValue(existingKeys as any[]);

      const res = await request(app)
        .post('/api/keys')
        .send({ name: 'Test Key' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Maximum 10 API keys allowed/);
    });
  });
});
