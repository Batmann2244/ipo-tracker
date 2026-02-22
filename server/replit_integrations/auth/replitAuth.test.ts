import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Express } from 'express';
import { setupAuth } from './replitAuth';

// Mock dependencies
vi.mock('express-session', () => {
  const EventEmitter = require('events').EventEmitter;
  const session = vi.fn(() => (req, res, next) => next());

  function Store() {
    EventEmitter.call(this);
  }
  // Inherit from EventEmitter
  Store.prototype = Object.create(EventEmitter.prototype);
  Store.prototype.constructor = Store;

  (session as any).Store = Store;

  return {
    default: session
  };
});

vi.mock('passport', () => ({
  default: {
    initialize: vi.fn(() => (req, res, next) => next()),
    session: vi.fn(() => (req, res, next) => next()),
    serializeUser: vi.fn(),
    deserializeUser: vi.fn(),
    use: vi.fn(),
    authenticate: vi.fn(() => (req, res, next) => next()),
  }
}));

vi.mock('./storage', () => ({
  authStorage: {
    upsertUser: vi.fn()
  }
}));

// We don't need to mock openid-client deeply because we are targeting the path where REPL_ID is missing
vi.mock('openid-client', () => ({
  discovery: vi.fn(),
}));

describe('replitAuth - setupAuth (Local Mode)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.REPL_ID; // Ensure local mode
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('registers /api/login with generated mock credentials when REPL_ID is not set', async () => {
    const app = {
      set: vi.fn(),
      use: vi.fn(),
      get: vi.fn(),
    } as unknown as Express;

    await setupAuth(app);

    // Verify /api/login route is registered
    expect(app.get).toHaveBeenCalledWith('/api/login', expect.any(Function));
  });
});
