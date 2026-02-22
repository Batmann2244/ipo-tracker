import { Request, Response, NextFunction } from "express";

interface RateLimitInfo {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitInfo>();

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 100; // 100 requests per window

// Clean up expired entries every minute to prevent memory leaks
// We use a weak reference to the timer so it doesn't prevent the process from exiting if needed,
// though for a long-running server this is less critical.
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  store.forEach((info, ip) => {
    if (now > info.resetTime) {
      store.delete(ip);
    }
  });
}, 60 * 1000);

// Unref the timer so it doesn't block process exit in tests or scripts
if (cleanupInterval.unref) {
  cleanupInterval.unref();
}

export function globalRateLimiter(req: Request, res: Response, next: NextFunction) {
  const path = req.path.toLowerCase();

  // Skip if not an API route (e.g. static assets, frontend routes)
  if (!path.startsWith("/api")) {
    return next();
  }

  // Skip if it's an API v1 route (handled by its own rate limiter in server/routes/api-v1.ts)
  if (path.startsWith("/api/v1")) {
    return next();
  }

  // Use req.ip or fallback to remoteAddress
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();

  let info = store.get(ip);

  // If no record exists or the window has expired, start a new window
  if (!info || now > info.resetTime) {
    info = {
      count: 1,
      resetTime: now + WINDOW_MS,
    };
    store.set(ip, info);
  } else {
    // Increment the counter for the current window
    info.count++;
  }

  // Set standard RateLimit headers
  res.setHeader("X-RateLimit-Limit", MAX_REQUESTS);
  res.setHeader("X-RateLimit-Remaining", Math.max(0, MAX_REQUESTS - info.count));
  res.setHeader("X-RateLimit-Reset", new Date(info.resetTime).toISOString());

  // Check if limit exceeded
  if (info.count > MAX_REQUESTS) {
    const retryAfter = Math.ceil((info.resetTime - now) / 1000);
    res.setHeader("Retry-After", retryAfter);
    return res.status(429).json({
      message: "Too many requests, please try again later.",
    });
  }

  next();
}

// Export for testing
export function resetStore() {
  store.clear();
}
