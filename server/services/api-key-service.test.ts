import { describe, it, expect, vi } from 'vitest';

// Mock the db module to prevent side effects
vi.mock('../db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }
}));

import { hashApiKey } from './api-key-service';

describe('hashApiKey', () => {
  it('should return a string', () => {
    const key = 'test-key';
    const result = hashApiKey(key);
    expect(typeof result).toBe('string');
  });

  it('should return a correct SHA-256 hash', () => {
    // SHA-256 of "test"
    const key = 'test';
    const expectedHash = '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08';
    expect(hashApiKey(key)).toBe(expectedHash);
  });

  it('should be deterministic', () => {
    const key = 'my-secret-key';
    const hash1 = hashApiKey(key);
    const hash2 = hashApiKey(key);
    expect(hash1).toBe(hash2);
  });

  it('should produce different hashes for different inputs', () => {
    const hash1 = hashApiKey('key1');
    const hash2 = hashApiKey('key2');
    expect(hash1).not.toBe(hash2);
  });

  it('should handle empty string', () => {
    // SHA-256 of empty string
    const expectedHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    expect(hashApiKey('')).toBe(expectedHash);
  });
});
