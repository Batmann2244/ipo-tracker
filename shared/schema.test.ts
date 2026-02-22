import { describe, it, expect } from 'vitest';
import { insertIpoSchema } from './schema';

describe('insertIpoSchema', () => {
  it('should validate a valid IPO object', () => {
    const validIpo = {
      symbol: 'TESTIPO',
      companyName: 'Test Company Ltd',
      priceRange: '100-120',
      status: 'upcoming',
      issueSize: '500 Cr',
      lotSize: 100,
      gmp: 50,
      // Optional fields
      sector: 'Technology',
      description: 'A test IPO',
      minInvestment: '15000'
    };

    const result = insertIpoSchema.safeParse(validIpo);
    expect(result.success).toBe(true);
  });

  it('should fail when required fields are missing', () => {
    const invalidIpo = {
      companyName: 'Test Company Ltd'
      // missing symbol, priceRange, status
    };

    const result = insertIpoSchema.safeParse(invalidIpo);
    expect(result.success).toBe(false);
    if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        expect(errors.symbol).toBeDefined();
        expect(errors.priceRange).toBeDefined();
        expect(errors.status).toBeDefined();
    }
  });

  it('should fail with invalid data types', () => {
    const invalidIpo = {
      symbol: 123, // should be string
      companyName: 'Test Company Ltd',
      priceRange: '100-120',
      status: 'upcoming'
    };

    const result = insertIpoSchema.safeParse(invalidIpo);
    expect(result.success).toBe(false);
     if (!result.success) {
        expect(result.error.flatten().fieldErrors.symbol).toBeDefined();
    }
  });

  it('should allow optional fields to be omitted', () => {
      const minimalIpo = {
      symbol: 'MINIPO',
      companyName: 'Minimal Company',
      priceRange: '50-60',
      status: 'open'
    };

    const result = insertIpoSchema.safeParse(minimalIpo);
    expect(result.success).toBe(true);
  });
});
