import { describe, it, expect, vi } from 'vitest';

// Mock Nse client before import to prevent side effects
vi.mock('./scrapers/nse-client', () => {
  return {
    Nse: class {
      constructor() {}
    }
  };
});

// Mock axios and cheerio to prevent any network calls during import
vi.mock('axios');
vi.mock('cheerio');

import { generatePeerCompanies } from './scraper';

describe('generatePeerCompanies', () => {
  it('should generate peer companies with default sector when none is provided', () => {
    const ipoId = 123;
    const peers = generatePeerCompanies(ipoId);

    expect(peers).toBeDefined();
    expect(peers.length).toBeGreaterThan(0);
    expect(peers[0].companyName).toContain('Industrial');
    expect(peers[0].ipoId).toBe(ipoId);
    expect(peers[0].isIpoCompany).toBe(false);
  });

  it('should generate peer companies with the specified sector', () => {
    const ipoId = 456;
    const sector = 'Technology';
    const peers = generatePeerCompanies(ipoId, sector);

    expect(peers).toBeDefined();
    expect(peers.length).toBeGreaterThan(0);
    expect(peers[0].companyName).toContain('Technology');
    expect(peers[1].companyName).toContain('Technology');
    expect(peers[0].ipoId).toBe(ipoId);
  });

  it('should return valid peer objects with required fields', () => {
    const ipoId = 789;
    const peers = generatePeerCompanies(ipoId);

    peers.forEach(peer => {
      expect(peer).toHaveProperty('symbol');
      expect(peer).toHaveProperty('peRatio');
      expect(peer).toHaveProperty('roe');
      expect(peer).toHaveProperty('roce');
      expect(peer).toHaveProperty('revenueGrowth');
      expect(peer).toHaveProperty('ebitdaMargin');
      expect(peer.isIpoCompany).toBe(false);
    });
  });
});
