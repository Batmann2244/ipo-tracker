import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateApiKey } from './api-key-service';
import { apiKeys, subscriptions } from '@shared/schema';

// Hoist mock functions
const mocks = vi.hoisted(() => {
  return {
    select: vi.fn(),
    update: vi.fn(),
    from: vi.fn(),
    whereSelect: vi.fn(),
    set: vi.fn(),
    whereUpdate: vi.fn(),
  };
});

// Mock the db module
vi.mock('../db', () => ({
  db: {
    select: mocks.select,
    update: mocks.update,
  },
}));

describe('validateApiKey', () => {
  const API_KEY_PREFIX = 'ipo_';
  const VALID_KEY = API_KEY_PREFIX + 'validkey1234567890';

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock chains
    mocks.select.mockReturnValue({ from: mocks.from });
    mocks.from.mockReturnValue({ where: mocks.whereSelect });

    mocks.update.mockReturnValue({ set: mocks.set });
    mocks.set.mockReturnValue({ where: mocks.whereUpdate });

    // Default mock implementation
    mocks.whereSelect.mockResolvedValue([]);
    mocks.whereUpdate.mockResolvedValue({ changes: 1 });
  });

  it('should return invalid for empty key', async () => {
    const result = await validateApiKey('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid API key format');
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it('should return invalid for key with wrong prefix', async () => {
    const result = await validateApiKey('wrong_prefix_key');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid API key format');
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it('should return invalid when key is not found in database', async () => {
    mocks.whereSelect.mockResolvedValueOnce([]); // No api key found

    const result = await validateApiKey(VALID_KEY);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('API key not found');
    expect(mocks.select).toHaveBeenCalled();
  });

  it('should return invalid when key is inactive', async () => {
    mocks.whereSelect.mockResolvedValueOnce([{
      id: 1,
      isActive: false,
    }]);

    const result = await validateApiKey(VALID_KEY);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('API key is inactive');
  });

  it('should return invalid when key is revoked', async () => {
    mocks.whereSelect.mockResolvedValueOnce([{
      id: 1,
      isActive: true,
      revokedAt: new Date(),
    }]);

    const result = await validateApiKey(VALID_KEY);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('API key has been revoked');
  });

  it('should return invalid when key is expired', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);

    mocks.whereSelect.mockResolvedValueOnce([{
      id: 1,
      isActive: true,
      expiresAt: pastDate,
    }]);

    const result = await validateApiKey(VALID_KEY);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('API key has expired');
  });

  it('should return valid and update usage stats for valid key', async () => {
    const mockApiKey = {
      id: 123,
      userId: 'user_123',
      isActive: true,
      expiresAt: null,
      revokedAt: null,
    };

    const mockSubscription = {
      userId: 'user_123',
      tier: 'pro',
    };

    // First select call: find API key
    mocks.whereSelect.mockResolvedValueOnce([mockApiKey]);
    // Second select call: getUserSubscription
    mocks.whereSelect.mockResolvedValueOnce([mockSubscription]);

    const result = await validateApiKey(VALID_KEY);

    expect(result.valid).toBe(true);
    expect(result.apiKey).toEqual(mockApiKey);
    expect(result.subscription).toEqual(mockSubscription);
    expect(result.error).toBeUndefined();

    // Verify usage update
    expect(mocks.update).toHaveBeenCalled();
    // Verify arguments to set() contain lastUsedAt as Date
    expect(mocks.set).toHaveBeenCalledWith(expect.objectContaining({
      lastUsedAt: expect.any(Date)
    }));
    expect(mocks.whereUpdate).toHaveBeenCalled();
  });
});
