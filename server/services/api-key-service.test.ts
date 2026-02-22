import { describe, it, expect, vi } from 'vitest';
import { generateApiKey, hashApiKey } from './api-key-service';
import { createHash } from 'crypto';

// Mock dependencies to avoid side effects
vi.mock('../db', () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
  },
}));

describe('API Key Service', () => {
  describe('generateApiKey', () => {
    it('should generate a key with the correct prefix', () => {
      const { key, prefix } = generateApiKey();
      expect(key.startsWith('ipo_')).toBe(true);
      expect(prefix).toBe(key.substring(0, 12));
    });

    it('should generate a valid hash for the key', () => {
      const { key, hash } = generateApiKey();
      const expectedHash = createHash('sha256').update(key).digest('hex');
      expect(hash).toBe(expectedHash);
    });

    it('should generate unique keys', () => {
      const result1 = generateApiKey();
      const result2 = generateApiKey();
      expect(result1.key).not.toBe(result2.key);
      expect(result1.hash).not.toBe(result2.hash);
    });

    it('should have a reasonable length', () => {
      const { key } = generateApiKey();
      // 'ipo_' (4 chars) + base64url encoded 32 bytes (approx 43 chars)
      expect(key.length).toBeGreaterThan(30);
    });
  });

  describe('hashApiKey', () => {
    it('should correctly hash a given key', () => {
      const testKey = 'ipo_testkey12345';
      const hash = hashApiKey(testKey);
      const expectedHash = createHash('sha256').update(testKey).digest('hex');
      expect(hash).toBe(expectedHash);
    });

    it('should be consistent with generateApiKey hash', () => {
      const { key, hash } = generateApiKey();
      const recalculatedHash = hashApiKey(key);
      expect(recalculatedHash).toBe(hash);
    });
  });
});
