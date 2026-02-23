import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { Express } from 'express';
import { setupAuth, isAuthenticated } from './replitAuth';

vi.mock('./storage', () => ({
  authStorage: {
    upsertUser: vi.fn()
  }
}));

describe('replitAuth - setupAuth (Mock Auth)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers middleware that sets a mock user on req', async () => {
    const middlewareFns: Function[] = [];
    const app = {
      use: vi.fn((fn) => middlewareFns.push(fn)),
    } as unknown as Express;

    await setupAuth(app);

    expect(app.use).toHaveBeenCalled();

    // Simulate a request through the middleware
    const req: any = {};
    const res: any = {};
    const next = vi.fn();
    middlewareFns[0](req, res, next);

    expect(req.user).toBeDefined();
    expect(req.user.claims.sub).toBe('default-user');
    expect(req.isAuthenticated()).toBe(true);
    expect(next).toHaveBeenCalled();
  });

  it('sets up mock auth in production mode', async () => {
    const savedEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const app = {
      use: vi.fn(),
    } as unknown as Express;

    await expect(setupAuth(app)).resolves.not.toThrow();

    process.env.NODE_ENV = savedEnv;
  });

  it('isAuthenticated calls next immediately', async () => {
    const req: any = {};
    const res: any = {};
    const next = vi.fn();

    await isAuthenticated(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
