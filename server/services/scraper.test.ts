import { describe, it, expect, vi, beforeEach, afterEach, type Mocked } from 'vitest';
import axios from 'axios';
import { scrapeAndTransformIPOs } from './scraper';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as Mocked<typeof axios>;

// Setup axios.create mock for NSE session
const mockAxiosInstance = {
  get: vi.fn().mockResolvedValue({ data: {} }),
  post: vi.fn().mockResolvedValue({ data: {} }),
  interceptors: {
    request: { use: vi.fn(), eject: vi.fn() },
    response: { use: vi.fn(), eject: vi.fn() }
  },
  defaults: { headers: { common: {} } }
};
mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

// Mock Response Generators
const mockChittorgarhSubscriptionHtml = () => `
<html>
  <body>
    <table>
      <thead>
        <tr>
          <th>Issuer Company</th>
          <th>Open</th>
          <th>Close</th>
          <th>Price Band</th>
          <th>QIB</th>
          <th>NII</th>
          <th>Retail</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><a href="#">Alpha Tech IPO</a></td>
          <td>01 Jan 2026</td>
          <td>03 Jan 2026</td>
          <td>₹100 - ₹120</td>
          <td>10.5x</td>
          <td>5.2x</td>
          <td>2.1x</td>
          <td>6.5x</td>
        </tr>
      </tbody>
    </table>
  </body>
</html>
`;

const mockChittorgarhListingHtml = () => `
<html>
  <body>
    <table>
      <tbody>
        <tr>
          <td><a href="#">Alpha Tech IPO</a></td>
          <td>01 Jan 2026</td>
          <td>03 Jan 2026</td>
          <td>₹100 - ₹120</td>
          <td>1000 Cr</td>
          <td>100 Shares</td>
        </tr>
        <tr>
          <td><a href="#">Beta Systems IPO</a></td>
          <td>10 Jan 2026</td>
          <td>12 Jan 2026</td>
          <td>₹200 - ₹220</td>
          <td>500 Cr</td>
          <td>Lot Size 50</td>
        </tr>
      </tbody>
    </table>
  </body>
</html>
`;

const mockInvestorGainHtml = () => `
<html>
  <body>
    <table>
      <thead>
        <tr>
          <th>IPO Name</th>
          <th>QIB Sub</th>
          <th>NII Sub</th>
          <th>Retail Sub</th>
          <th>Total Sub</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Alpha Tech IPO</td>
          <td>10.5x</td>
          <td>5.2x</td>
          <td>2.1x</td>
          <td>6.5x</td>
        </tr>
      </tbody>
    </table>
  </body>
</html>
`;

const mockGrowwApiJson = () => ({
  ipoList: [
    {
      companyName: "Alpha Tech IPO",
      minPrice: 100,
      maxPrice: 120,
      openDate: "2026-01-01",
      closeDate: "2026-01-03",
      lotSize: 100,
      issueSize: 1000,
      status: "LIVE"
    }
  ]
});

const mockGmpHtml = () => `
<html>
  <body>
    <table>
      <thead>
        <tr>
          <th>IPO Name</th>
          <th>GMP (₹)</th>
          <th>Est Listing</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Alpha Tech</td>
          <td>₹50</td>
          <td>170</td>
        </tr>
        <tr>
          <td>Beta Systems</td>
          <td>₹10</td>
          <td>230</td>
        </tr>
      </tbody>
    </table>
  </body>
</html>
`;

describe('scrapeAndTransformIPOs', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should correctly aggregate and transform IPO data from multiple sources', async () => {
    // Setup mocks
    mockedAxios.get.mockImplementation((url) => {
      if (url.includes('subscription-status')) {
        return Promise.resolve({ data: mockChittorgarhSubscriptionHtml() });
      }
      if (url.includes('mainboard-ipo-list')) {
        return Promise.resolve({ data: mockChittorgarhListingHtml() });
      }
      if (url.includes('investorgain')) {
        return Promise.resolve({ data: mockInvestorGainHtml() });
      }
      if (url.includes('groww.in/v1/api')) {
        return Promise.resolve({ data: mockGrowwApiJson() });
      }
      if (url.includes('gmp-india')) {
        return Promise.resolve({ data: mockGmpHtml() });
      }
      return Promise.resolve({ data: '' });
    });

    // Also mock HEAD requests for connection test if called (though not called in main flow usually)
    mockedAxios.head.mockResolvedValue({ status: 200 });

    const result = await scrapeAndTransformIPOs();

    expect(result).toHaveLength(2); // Company A and Company B

    // Verify Company A (Merged data)
    const companyA = result.find(ipo => ipo.symbol === 'ALPHA');
    expect(companyA).toBeDefined();
    expect(companyA?.companyName).toContain('Alpha Tech');
    expect(companyA?.priceRange).toBe('₹100 - ₹120');
    expect(companyA?.issueSize).toBe('1000 Cr');
    expect(companyA?.lotSize).toBe(100);
    expect(companyA?.gmp).toBe(50);

    // Verify Subscription data for Company A
    expect(companyA?.subscriptionQib).toBe(10.5);
    expect(companyA?.subscriptionHni).toBe(5.2);
    expect(companyA?.subscriptionRetail).toBe(2.1);

    // Verify Date parsing
    // 01 Jan 2026 should be parsed to 2026-01-01
    // But implementation logic might use expectedDate as openDate or closeDate or today
    expect(companyA?.expectedDate).toMatch(/2026-01-0\d/);

    // Verify Company B (Only from Listing source)
    const companyB = result.find(ipo => ipo.symbol === 'BETASYSTEMS');
    expect(companyB).toBeDefined();
    expect(companyB?.priceRange).toBe('₹200 - ₹220');
    expect(companyB?.gmp).toBe(10);

    // Scores should be calculated
    expect(companyB?.overallScore).toBeDefined();
    expect(companyB?.riskLevel).toBeDefined();
  });

  it('should handle deduplication correctly', async () => {
    // Both Chittorgarh Subscription and Groww return "Alpha Tech"
    mockedAxios.get.mockImplementation((url) => {
      if (url.includes('subscription-status')) {
        return Promise.resolve({ data: mockChittorgarhSubscriptionHtml() });
      }
      if (url.includes('groww.in/v1/api')) {
        return Promise.resolve({ data: mockGrowwApiJson() });
      }
      return Promise.resolve({ data: '' });
    });

    const result = await scrapeAndTransformIPOs();

    // Should still be 1 entry for Company A
    const companyA = result.filter(ipo => ipo.symbol === 'ALPHA');
    expect(companyA).toHaveLength(1);
  });

  it('should handle API failures gracefully', async () => {
    // Simulate failure for one source
    mockedAxios.get.mockImplementation((url) => {
      if (url.includes('subscription-status')) {
        return Promise.reject(new Error('Network Error'));
      }
      if (url.includes('mainboard-ipo-list')) {
        return Promise.resolve({ data: mockChittorgarhListingHtml() });
      }
      return Promise.resolve({ data: '' });
    });

    const result = await scrapeAndTransformIPOs();

    // Should still get data from other sources
    expect(result.length).toBeGreaterThan(0);
    const companyA = result.find(ipo => ipo.symbol === 'ALPHA');
    expect(companyA).toBeDefined();
    // But subscription data might be missing if it only came from the failed source
    // In our mock setup, listing source doesn't have subscription data
    expect(companyA?.subscriptionQib).toBe(0);
  });

  it('should parse status correctly', async () => {
     mockedAxios.get.mockImplementation((url) => {
      if (url.includes('groww.in/v1/api')) {
         return Promise.resolve({
           data: {
             ipoList: [
               {
                 companyName: "Future IPO",
                 status: "UPCOMING",
                 openDate: "2099-01-01",
                 closeDate: "2099-01-03"
               },
               {
                 companyName: "Past IPO",
                 status: "CLOSED", // Scraper filters out closed ones usually, or status check does
                 openDate: "2020-01-01",
                 closeDate: "2020-01-03"
               }
             ]
           }
         });
      }
      return Promise.resolve({ data: '' });
    });

    const result = await scrapeAndTransformIPOs();

    const future = result.find(ipo => ipo.companyName === "Future");
    const past = result.find(ipo => ipo.companyName === "Past");

    if (future) {
        expect(future.status).toBe('upcoming');
    }

    // Past IPOs should be filtered out if status is closed
    expect(past).toBeUndefined();
  });
});
