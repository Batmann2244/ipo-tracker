import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Express } from 'express';

// Mock authStorage to avoid DB connection issues
vi.mock('./storage', () => ({
  authStorage: {
    upsertUser: vi.fn(),
  },
}));

// Mock express-session to avoid "SESSION_SECRET environment variable must be set in production" error
// Actually, we want to test the auth logic, so we can mock session middleware creation or just set the secret
// We will set the secret in the test environment

describe('replitAuth', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should fall back to mock auth in development when REPL_ID is missing', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.REPL_ID;

    // Dynamically import to pick up env vars
    const { setupAuth } = await import('./replitAuth');

    const app = {
      set: vi.fn(),
      use: vi.fn(),
      get: vi.fn(),
    } as unknown as Express;

    await setupAuth(app);

    // Check if mock login route is registered
    expect(app.get).toHaveBeenCalledWith('/api/login', expect.any(Function));

    // Verify console log (optional, but confirms behavior)
    // console.log("⚠️  Replit Auth not configured - running in local mode");
  });

  it('should THROW ERROR in production when REPL_ID is missing (Vulnerability Fix)', async () => {
    process.env.NODE_ENV = 'production';
    process.env.SESSION_SECRET = 'test-secret'; // Required to pass getSession check
    delete process.env.REPL_ID;

    const { setupAuth } = await import('./replitAuth');

    const app = {
      set: vi.fn(),
      use: vi.fn(),
      get: vi.fn(),
    } as unknown as Express;

    // This assertion expects the fix to be implemented.
    // Currently (before fix), it will NOT throw and will register mock routes.
    // So this test should FAIL initially.
    await expect(setupAuth(app)).rejects.toThrow('REPL_ID environment variable is not set');
  });
});
