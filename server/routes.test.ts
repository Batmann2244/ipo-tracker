import { vi, describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// 1. Mock internal dependencies
vi.mock('./storage', () => ({
  storage: {
    getIpos: vi.fn().mockResolvedValue([]),
    getIpo: vi.fn(),
    getWatchlist: vi.fn(),
    addToWatchlist: vi.fn(),
    removeFromWatchlist: vi.fn(),
    getIpoTimeline: vi.fn().mockResolvedValue([]),
    getPeerCompanies: vi.fn().mockResolvedValue([]),
    getGmpHistory: vi.fn().mockResolvedValue([]),
    getSubscriptionUpdates: vi.fn().mockResolvedValue([]),
    getLatestSubscription: vi.fn().mockResolvedValue(undefined),
    getFundUtilization: vi.fn().mockResolvedValue([]),
    getAllUpcomingEvents: vi.fn().mockResolvedValue([]),
    createIpo: vi.fn(),
    upsertIpo: vi.fn(),
    updateIpo: vi.fn(),
    getIpoCount: vi.fn(),
    markAllAsListed: vi.fn(),
    deleteIpo: vi.fn(),
    getWatchlistItem: vi.fn(),
    getAlertPreferences: vi.fn(),
    upsertAlertPreferences: vi.fn(),
    getAllUsersWithAlerts: vi.fn(),
    createAlertLog: vi.fn(),
    getAlertLogs: vi.fn(),
    addGmpHistory: vi.fn(),
    addPeerCompany: vi.fn(),
    deletePeerCompanies: vi.fn(),
    addSubscriptionUpdate: vi.fn(),
    addFundUtilization: vi.fn(),
    updateFundUtilization: vi.fn(),
    addTimelineEvent: vi.fn(),
  }
}));

vi.mock('./services/scraper', () => ({
  scrapeAndTransformIPOs: vi.fn().mockResolvedValue([]),
  testScraper: vi.fn(),
  generatePeerCompanies: vi.fn(),
  generateGmpHistory: vi.fn(),
  generateFundUtilization: vi.fn(),
  calculateIpoScore: vi.fn(),
}));

vi.mock('./replit_integrations/auth', () => ({
  setupAuth: vi.fn().mockResolvedValue(undefined),
  registerAuthRoutes: vi.fn(),
}));

vi.mock('./services/data-scheduler', () => ({
  startScheduler: vi.fn(),
  stopScheduler: vi.fn(),
  getSchedulerStatus: vi.fn(),
  triggerManualPoll: vi.fn(),
  getRecentAlerts: vi.fn(),
  clearAlerts: vi.fn(),
}));

vi.mock('./services/email', () => ({
  sendIpoEmailAlert: vi.fn(),
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

vi.mock('./services/ai-analysis', () => ({
  analyzeIpo: vi.fn(),
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
    getIposByStatus: vi.fn(),
    getOpenIpos: vi.fn(),
  }
}));

vi.mock('./services/scrapers/investorgain', () => ({
  investorGainScraper: {
    getIpos: vi.fn().mockResolvedValue({ success: false, data: [] }),
    getGmpHistory: vi.fn().mockResolvedValue([]),
    getSubscriptionDetails: vi.fn().mockResolvedValue(null),
  }
}));

vi.mock('./services/scraper-logger', () => ({
  scraperLogger: {
    getRecentLogs: vi.fn(),
    getLogsBySource: vi.fn(),
    getSourceStats: vi.fn(),
    getHealthStatus: vi.fn(),
  }
}));

// Import after mocks
import { registerRoutes } from './routes';
import { storage } from './storage';

describe('IPO Routes', () => {
  let app: express.Express;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    // We pass the app to registerRoutes
    await registerRoutes(app as any, app);
    vi.clearAllMocks();
  });

  describe('GET /api/ipos', () => {
    it('should return a list of IPOs', async () => {
      const mockIpos = [
        { id: 1, symbol: 'IPO1', companyName: 'Company 1', status: 'upcoming' },
        { id: 2, symbol: 'IPO2', companyName: 'Company 2', status: 'open' },
      ];

      (storage.getIpos as any).mockResolvedValue(mockIpos);

      const response = await request(app).get('/api/ipos');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockIpos);
      expect(storage.getIpos).toHaveBeenCalledWith(undefined, undefined);
    });

    it('should filter by status', async () => {
      const mockIpos = [
        { id: 1, symbol: 'IPO1', companyName: 'Company 1', status: 'upcoming' },
      ];
      (storage.getIpos as any).mockResolvedValue(mockIpos);

      const response = await request(app).get('/api/ipos?status=upcoming');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockIpos);
      expect(storage.getIpos).toHaveBeenCalledWith('upcoming', undefined);
    });

    it('should filter by sector', async () => {
      const mockIpos = [
        { id: 3, symbol: 'IPO3', companyName: 'Company 3', status: 'upcoming', sector: 'Tech' },
      ];
      (storage.getIpos as any).mockResolvedValue(mockIpos);

      const response = await request(app).get('/api/ipos?sector=Tech');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockIpos);
      expect(storage.getIpos).toHaveBeenCalledWith(undefined, 'Tech');
    });

    it('should filter by status and sector', async () => {
      const mockIpos = [
        { id: 3, symbol: 'IPO3', companyName: 'Company 3', status: 'upcoming', sector: 'Tech' },
      ];
      (storage.getIpos as any).mockResolvedValue(mockIpos);

      const response = await request(app).get('/api/ipos?status=upcoming&sector=Tech');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockIpos);
      expect(storage.getIpos).toHaveBeenCalledWith('upcoming', 'Tech');
    });

    it('should handle empty result', async () => {
      (storage.getIpos as any).mockResolvedValue([]);

      const response = await request(app).get('/api/ipos');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should handle storage errors gracefully', async () => {
       (storage.getIpos as any).mockRejectedValue(new Error('Database error'));

       const response = await request(app).get('/api/ipos');

       expect(response.status).toBe(500);
    });
  });
});
