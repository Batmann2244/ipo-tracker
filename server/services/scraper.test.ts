import { test, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateFundUtilization } from './scraper';

describe('Scraper Service', () => {
  describe('generateFundUtilization', () => {
    it('should return an array of 4 items', () => {
      const ipoId = 123;
      const result = generateFundUtilization(ipoId);
      assert.equal(result.length, 4);
    });

    it('should assign correct ipoId to all items', () => {
      const ipoId = 456;
      const result = generateFundUtilization(ipoId);
      result.forEach(item => {
        assert.equal(item.ipoId, ipoId);
      });
    });

    it('should have percentages summing up to 100', () => {
      const ipoId = 789;
      const result = generateFundUtilization(ipoId);
      const sum = result.reduce((acc, item) => acc + item.percentage, 0);
      assert.equal(sum, 100);
    });

    it('should contain expected categories', () => {
      const ipoId = 101;
      const result = generateFundUtilization(ipoId);
      const categories = result.map(item => item.category);
      const expectedCategories = [
        "Working Capital",
        "Capital Expenditure",
        "Debt Repayment",
        "General Corporate"
      ];

      // Check if all expected categories are present
      expectedCategories.forEach(category => {
        assert.ok(categories.includes(category), `Missing category: ${category}`);
      });

      // Check if percentages are correct for each category
      const workingCapital = result.find(r => r.category === "Working Capital");
      assert.equal(workingCapital?.percentage, 35);

      const capex = result.find(r => r.category === "Capital Expenditure");
      assert.equal(capex?.percentage, 30);

      const debt = result.find(r => r.category === "Debt Repayment");
      assert.equal(debt?.percentage, 20);

      const corporate = result.find(r => r.category === "General Corporate");
      assert.equal(corporate?.percentage, 15);
    });
  });
});
