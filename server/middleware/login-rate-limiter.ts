import { Request, Response, NextFunction } from 'express';

interface RateLimitData {
  count: number;
  resetTime: number;
}

export class LoginRateLimiter {
  private hits = new Map<string, RateLimitData>();
  private windowMs: number;
  private max: number;
  private cleanupInterval: NodeJS.Timeout;

  constructor(windowMs: number = 15 * 60 * 1000, max: number = 10) {
    this.windowMs = windowMs;
    this.max = max;

    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000);

    // Ensure cleanup doesn't prevent process exit
    this.cleanupInterval.unref();
  }

  private cleanup() {
    const now = Date.now();
    this.hits.forEach((data, key) => {
      if (now > data.resetTime) {
        this.hits.delete(key);
      }
    });
  }

  public middleware = (req: Request, res: Response, next: NextFunction) => {
    // In Express with trust proxy enabled (which is done in setupAuth), req.ip is reliable
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    let data = this.hits.get(ip);

    if (!data) {
      data = {
        count: 0,
        resetTime: now + this.windowMs,
      };
      this.hits.set(ip, data);
    }

    if (now > data.resetTime) {
      // Reset window
      data.count = 0;
      data.resetTime = now + this.windowMs;
    }

    if (data.count >= this.max) {
      const retryAfter = Math.ceil((data.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        message: 'Too many login attempts, please try again later.',
        retryAfter: `${retryAfter} seconds`
      });
    }

    data.count++;
    next();
  };
}

// Default instance: 10 requests per 15 minutes
export const loginRateLimiter = new LoginRateLimiter(15 * 60 * 1000, 10).middleware;
