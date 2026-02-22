import { describe, it, expect, vi } from 'vitest';
import { generateApiKey } from './api-key-service';
import { createHash } from 'crypto';

// Mock the database to prevent connection attempts
vi.mock('../db', () => ({
  db: {},
}));

describe('generateApiKey', () => {
  it('should generate a key with correct structure and format', () => {
    const result = generateApiKey();

    expect(result).toHaveProperty('key');
    expect(result).toHaveProperty('prefix');
    expect(result).toHaveProperty('hash');

    expect(result.key).toMatch(/^ipo_/);
    expect(result.prefix).toBe(result.key.substring(0, 12));
    expect(result.prefix.length).toBe(12);
  });

  it('should generate unique keys', () => {
    const result1 = generateApiKey();
    const result2 = generateApiKey();

    expect(result1.key).not.toBe(result2.key);
    expect(result1.hash).not.toBe(result2.hash);
  });

  it('should generate a valid hash for the key', () => {
    const { key, hash } = generateApiKey();
    const expectedHash = createHash('sha256').update(key).digest('hex');
    expect(hash).toBe(expectedHash);
  });
});
