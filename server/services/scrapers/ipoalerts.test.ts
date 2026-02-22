
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mocks
vi.mock('../scraper-logger', () => ({
  scraperLogger: {
    logSuccess: vi.fn(),
    logError: vi.fn(),
  },
}));

vi.mock('../../logger', () => ({
  getSourceLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('IPO Alerts Scraper Performance', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv, IPOALERTS_API_KEY: 'test-key' };
    vi.spyOn(global, 'fetch');
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('measures scraping performance and respects rate limit', async () => {
    const { ipoAlertsScraper } = await import('./ipoalerts');

    // Reset usage tracker by mocking a future date temporarily
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2099-01-01T00:00:00Z'));
    ipoAlertsScraper.canMakeRequest(); // Triggers reset
    vi.useRealTimers();

    const TOTAL_PAGES = 30; // Exceeds limit of 25
    const LATENCY = 10;

    // Mock fetch implementation
    (global.fetch as any).mockImplementation(async (url: string) => {
      await new Promise(resolve => setTimeout(resolve, LATENCY));
      return {
        ok: true,
        text: async () => "",
        json: async () => ({
          meta: { totalPages: TOTAL_PAGES },
          ipos: [],
        }),
      };
    });

    const start = performance.now();
    const result = await ipoAlertsScraper.getIposByStatus('upcoming');
    const end = performance.now();

    const duration = end - start;
    console.log(`Execution time: ${duration.toFixed(2)}ms`);
    console.log(`Result success: ${result.success}`);
    if (!result.success) {
        console.log(`Error: ${result.error}`);
    }

    const stats = ipoAlertsScraper.getUsageStats();
    console.log(`Usage: ${stats.used}/${stats.limit}`);

    // Expect usage to be exactly 25 (limit)
    expect(stats.used).toBe(25);
    expect(result.success).toBe(true);

  }, 10000);
});
