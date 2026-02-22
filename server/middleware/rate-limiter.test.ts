import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { globalRateLimiter, resetStore } from './rate-limiter';

describe('Global Rate Limiter Middleware', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.useFakeTimers();
    resetStore(); // Reset store before each test
    app = express();
    // Middleware needs to be used before routes
    app.use(globalRateLimiter);

    app.get('/api/test', (req, res) => res.status(200).json({ message: 'ok' }));
    app.get('/other/test', (req, res) => res.status(200).json({ message: 'ok' }));
    app.get('/api/v1/test', (req, res) => res.status(200).json({ message: 'ok' }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should allow requests under the limit', async () => {
    for (let i = 0; i < 5; i++) {
      const response = await request(app).get('/api/test');
      expect(response.status).toBe(200);
      expect(response.header['x-ratelimit-remaining']).toBeDefined();
    }
  });

  it('should block requests over the limit', async () => {
    // Limit is 100. Make 100 requests.
    for (let i = 0; i < 100; i++) {
      await request(app).get('/api/test');
    }

    // 101st request should be blocked
    const response = await request(app).get('/api/test');
    expect(response.status).toBe(429);
    expect(response.body.message).toContain('Too many requests');
  });

  it('should handle case-insensitive paths (e.g., /API/test)', async () => {
    // Limit is 100. Make 100 requests to uppercase path.
    for (let i = 0; i < 100; i++) {
      await request(app).get('/API/test');
    }

    // 101st request should be blocked
    const response = await request(app).get('/API/test');
    expect(response.status).toBe(429);
    expect(response.body.message).toContain('Too many requests');
  });

  it('should skip rate limiting for non-api routes', async () => {
    for (let i = 0; i < 150; i++) {
      const response = await request(app).get('/other/test');
      expect(response.status).toBe(200);
    }
  });

  it('should skip rate limiting for /api/v1 routes', async () => {
    for (let i = 0; i < 150; i++) {
      const response = await request(app).get('/api/v1/test');
      expect(response.status).toBe(200);
    }
  });

  it('should reset limit after window expires', async () => {
    // Exhaust limit
    for (let i = 0; i < 100; i++) {
      await request(app).get('/api/test');
    }

    let response = await request(app).get('/api/test');
    expect(response.status).toBe(429);

    // Advance time by 15 minutes + 1 second
    vi.advanceTimersByTime(15 * 60 * 1000 + 1000);

    response = await request(app).get('/api/test');
    expect(response.status).toBe(200);
  });
});
