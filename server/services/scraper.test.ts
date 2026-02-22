
// Mock dependencies before importing the module under test
jest.mock('./scrapers/nse-client', () => {
  return {
    Nse: jest.fn().mockImplementation(() => ({})),
  };
});

jest.mock('axios');

import { generateGmpHistory } from './scraper';

describe('generateGmpHistory', () => {
  it('should return an array of 7 items', () => {
    const ipoId = 123;
    const history = generateGmpHistory(ipoId);
    expect(history).toHaveLength(7);
  });

  it('should have correct structure for each item', () => {
    const ipoId = 456;
    const history = generateGmpHistory(ipoId);

    history.forEach(item => {
      expect(item).toEqual(expect.objectContaining({
        ipoId: 456,
        recordDate: expect.any(String),
        gmpValue: expect.any(Number),
      }));
    });
  });

  it('should have consecutive dates ending today', () => {
    const ipoId = 789;
    const history = generateGmpHistory(ipoId);

    // Sort by date just in case, though implementation pushes in order
    // The implementation pushes from i=6 to 0. i=0 is today.
    // So history[6] should be today, history[0] should be 6 days ago.

    const today = new Date().toISOString().split('T')[0];
    expect(history[6].recordDate).toBe(today);

    // Check consecutive days
    for (let i = 0; i < history.length - 1; i++) {
      const current = new Date(history[i].recordDate);
      const next = new Date(history[i+1].recordDate);

      const diffTime = Math.abs(next.getTime() - current.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      expect(diffDays).toBe(1);
    }
  });

  it('should generate gmpValue within expected range (10-59)', () => {
    // Run multiple times to be sure
    for (let i = 0; i < 10; i++) {
      const history = generateGmpHistory(1);
      history.forEach(item => {
        expect(item.gmpValue).toBeGreaterThanOrEqual(10);
        expect(item.gmpValue).toBeLessThan(60);
      });
    }
  });
});
