
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipoAlertsScraper } from './ipoalerts';

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
    process.env = { ...originalEnv, IPOALERTS_API_KEY: 'test-key' };
    vi.spyOn(global, 'fetch');

    // Reset usage tracker by mocking a future date temporarily
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2099-01-01T00:00:00Z'));
    ipoAlertsScraper.canMakeRequest(); // Triggers reset
    vi.useRealTimers();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('measures scraping performance', async () => {
    const TOTAL_PAGES = 7; // Increase to test batching (limit 5)
    const LATENCY = 50;   // 50ms latency

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
    await ipoAlertsScraper.getIposByStatus('upcoming');
    const end = performance.now();

    const duration = end - start;
    console.log(`Execution time: ${duration.toFixed(2)}ms`);

    // Serial expectation: ~250ms (5 * 50) + overhead
    // Parallel expectation: ~100ms (50 + 50) + overhead

    // Assert significant speedup (e.g. less than 200ms)
    expect(duration).toBeLessThan(200);
  }, 10000); // 10s timeout
});
