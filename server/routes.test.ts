import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
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
    getSubscriptionUpdates: vi.fn(),
    getLatestSubscription: vi.fn(),
    getAllUpcomingEvents: vi.fn(),
    createIpo: vi.fn(),
    addPeerCompany: vi.fn(),
    addGmpHistory: vi.fn(),
    addFundUtilization: vi.fn(),
    addTimelineEvent: vi.fn(),
    updateIpo: vi.fn(),
    getIpoBySymbol: vi.fn(),
    upsertIpo: vi.fn(),
    getIpoCount: vi.fn(),
    markAllAsListed: vi.fn(),
    upsertAlertPreferences: vi.fn(),
    getAlertLogs: vi.fn(),
    createAlertLog: vi.fn(),
  },
}));

// Mock Auth
vi.mock('./replit_integrations/auth', () => ({
  setupAuth: vi.fn(),
  registerAuthRoutes: vi.fn(),
}));

// Mock other services
vi.mock('./services/scoring', () => ({
  calculateIpoScore: vi.fn(),
}));

vi.mock('./services/scraper', () => ({
  testScraper: vi.fn(),
  scrapeAndTransformIPOs: vi.fn().mockResolvedValue([]),
  generatePeerCompanies: vi.fn().mockReturnValue([]),
  generateGmpHistory: vi.fn().mockReturnValue([]),
  generateFundUtilization: vi.fn().mockReturnValue([]),
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
    getIposByStatus: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getOpenIpos: vi.fn().mockResolvedValue({ success: true, data: [] }),
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

    // Mock storage.getIpos to return something so autoSyncOnStartup sees DB is not empty
    // preventing scrapeAndTransformIPOs from running
    vi.mocked(storage.getIpos).mockResolvedValue([{ id: 1 }] as any);

    await registerRoutes(httpServer, app);
  });

  it('should return 200 and the IPO data when found', async () => {
    const mockIpo = {
      id: 1,
      companyName: 'Test IPO',
      symbol: 'TEST',
      status: 'upcoming',
      priceRange: '100-200',
      issueSize: '100Cr',
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
