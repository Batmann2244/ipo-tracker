import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LoginRateLimiter } from '../middleware/login-rate-limiter';
import { Request, Response } from 'express';

describe('LoginRateLimiter', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: any;

  beforeEach(() => {
    vi.useFakeTimers();
    req = {
      ip: '127.0.0.1',
      headers: {},
      socket: { remoteAddress: '127.0.0.1' } as any,
    };
    res = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    next = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should allow requests under the limit', () => {
    const limit = 5;
    const windowMs = 60000; // 1 minute
    const limiter = new LoginRateLimiter(windowMs, limit).middleware;

    for (let i = 0; i < limit; i++) {
      limiter(req as Request, res as Response, next);
    }

    expect(next).toHaveBeenCalledTimes(limit);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should block requests over the limit', () => {
    const limit = 5;
    const windowMs = 60000;
    const limiter = new LoginRateLimiter(windowMs, limit).middleware;

    for (let i = 0; i < limit; i++) {
      limiter(req as Request, res as Response, next);
    }

    // Next request should fail
    limiter(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledTimes(limit);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Too many login attempts, please try again later.'
    }));
  });

  it('should reset after window expires', () => {
    const limit = 2;
    const windowMs = 1000;
    const limiter = new LoginRateLimiter(windowMs, limit).middleware;

    // Use limit
    limiter(req as Request, res as Response, next);
    limiter(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledTimes(2);

    // Exceed limit
    limiter(req as Request, res as Response, next);
    expect(res.status).toHaveBeenCalledWith(429);

    // Advance time past window
    vi.advanceTimersByTime(windowMs + 100);

    // Should work again
    (next as any).mockClear();
    (res.status as any).mockClear();

    limiter(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should handle different IPs separately', () => {
    const limit = 1;
    const windowMs = 60000;
    const limiter = new LoginRateLimiter(windowMs, limit).middleware;

    const req1 = { ...req, ip: '1.1.1.1' };
    const req2 = { ...req, ip: '2.2.2.2' };

    limiter(req1 as Request, res as Response, next);
    expect(next).toHaveBeenCalledTimes(1);

    limiter(req2 as Request, res as Response, next);
    expect(next).toHaveBeenCalledTimes(2); // Called again for second IP
  });
});
