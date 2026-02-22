import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkRateLimit } from './api-key-service';
import { db } from '../db';

// Mock the db module
vi.mock('../db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

describe('checkRateLimit', () => {
  const apiKeyId = 123;

  beforeEach(() => {
    vi.useFakeTimers();
    // Set a fixed time: Jan 1, 2024, 10:00 AM UTC
    vi.setSystemTime(new Date('2024-01-01T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  const setupDbMock = (count: number) => {
    const mockWhere = vi.fn().mockResolvedValue([{ count }]);
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    (db.select as any).mockReturnValue({ from: mockFrom });
    return { mockWhere, mockFrom };
  };

  it('should allow request for unlimited tier (enterprise)', async () => {
    const result = await checkRateLimit(apiKeyId, 'enterprise');

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(-1);
    expect(db.select).not.toHaveBeenCalled();
  });

  it('should allow request for free tier when under limit', async () => {
    setupDbMock(5);

    const result = await checkRateLimit(apiKeyId, 'free');

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(5);
    expect(db.select).toHaveBeenCalled();
  });

  it('should deny request for free tier when limit reached', async () => {
    setupDbMock(10);

    const result = await checkRateLimit(apiKeyId, 'free');

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should deny request for free tier when over limit', async () => {
    setupDbMock(11);

    const result = await checkRateLimit(apiKeyId, 'free');

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should return correct resetAt date', async () => {
    // Enterprise: resetAt is current time (mocked)
    const resultEnt = await checkRateLimit(apiKeyId, 'enterprise');
    expect(resultEnt.resetAt).toEqual(new Date('2024-01-01T10:00:00Z'));

    // Free: resetAt is next midnight
    setupDbMock(5);
    const resultFree = await checkRateLimit(apiKeyId, 'free');

    const resetDate = resultFree.resetAt;

    // Check if it is the next day
    expect(resetDate.getDate()).toBe(2); // Jan 2
    expect(resetDate.getMonth()).toBe(0); // Jan
    expect(resetDate.getFullYear()).toBe(2024);

    // Check time is midnight
    expect(resetDate.getHours()).toBe(0);
    expect(resetDate.getMinutes()).toBe(0);
    expect(resetDate.getSeconds()).toBe(0);
    expect(resetDate.getMilliseconds()).toBe(0);
  });
});
