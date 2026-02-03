import { Request, Response, NextFunction } from 'express';
import { validateApiKey, checkRateLimit, logApiUsage, getTierLimits } from '../services/api-key-service';
import { ApiKey, Subscription } from '@shared/schema';

export interface AuthenticatedApiRequest extends Request {
  apiKey?: ApiKey;
  subscription?: Subscription;
  apiUserId?: string;
  tierLimits?: ReturnType<typeof getTierLimits>;
  effectiveTier?: string;
}

function safeLogUsage(
  apiKeyId: number | null,
  userId: string | null,
  endpoint: string,
  method: string,
  statusCode: number,
  responseTimeMs: number,
  ipAddress?: string,
  userAgent?: string,
  errorMessage?: string
): void {
  logApiUsage(apiKeyId, userId, endpoint, method, statusCode, responseTimeMs, ipAddress, userAgent, errorMessage)
    .catch(err => console.error('Failed to log API usage:', err));
}

export function apiKeyAuth(required: boolean = true) {
  return async (req: AuthenticatedApiRequest, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      if (required) {
        safeLogUsage(null, null, req.path, req.method, 401, Date.now() - startTime, req.ip, req.headers['user-agent'] as string, 'Missing Authorization header');
        return res.status(401).json({ 
          error: 'Unauthorized', 
          message: 'Missing Authorization header. Use: Authorization: Bearer <api_key>' 
        });
      }
      return next();
    }
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      safeLogUsage(null, null, req.path, req.method, 401, Date.now() - startTime, req.ip, req.headers['user-agent'] as string, 'Invalid Authorization format');
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Invalid Authorization format. Use: Authorization: Bearer <api_key>' 
      });
    }
    
    const apiKey = parts[1];
    const validation = await validateApiKey(apiKey);
    
    if (!validation.valid) {
      safeLogUsage(null, null, req.path, req.method, 401, Date.now() - startTime, req.ip, req.headers['user-agent'] as string, validation.error);
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: validation.error 
      });
    }
    
    if (validation.subscription) {
      const { status, currentPeriodEnd } = validation.subscription;
      
      if (status !== 'active') {
        safeLogUsage(validation.apiKey!.id, validation.apiKey!.userId, req.path, req.method, 403, Date.now() - startTime, req.ip, req.headers['user-agent'] as string, `Subscription status: ${status}`);
        return res.status(403).json({
          error: 'Forbidden',
          message: `Your subscription is ${status}. Please renew to continue using the API.`,
          subscriptionStatus: status,
        });
      }
      
      if (currentPeriodEnd && new Date(currentPeriodEnd) < new Date()) {
        safeLogUsage(validation.apiKey!.id, validation.apiKey!.userId, req.path, req.method, 403, Date.now() - startTime, req.ip, req.headers['user-agent'] as string, 'Subscription expired');
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Your subscription has expired. Please renew to continue using the API.',
          subscriptionStatus: 'expired',
        });
      }
    }
    
    const effectiveTier = validation.subscription?.tier || 'free';
    
    req.apiKey = validation.apiKey;
    req.subscription = validation.subscription;
    req.apiUserId = validation.apiKey!.userId;
    req.effectiveTier = effectiveTier;
    req.tierLimits = getTierLimits(effectiveTier);
    
    next();
  };
}

export function rateLimiter() {
  return async (req: AuthenticatedApiRequest, res: Response, next: NextFunction) => {
    if (!req.apiKey) {
      return next();
    }
    
    const startTime = Date.now();
    const effectiveTier = req.effectiveTier || req.apiKey.tier;
    const rateLimit = await checkRateLimit(req.apiKey.id, effectiveTier);
    
    res.setHeader('X-RateLimit-Limit', rateLimit.remaining === -1 ? 'unlimited' : getTierLimits(effectiveTier).apiCallsPerDay);
    res.setHeader('X-RateLimit-Remaining', rateLimit.remaining === -1 ? 'unlimited' : rateLimit.remaining);
    res.setHeader('X-RateLimit-Reset', rateLimit.resetAt.toISOString());
    
    if (!rateLimit.allowed) {
      safeLogUsage(
        req.apiKey.id, 
        req.apiUserId || null, 
        req.path, 
        req.method, 
        429, 
        Date.now() - startTime, 
        req.ip, 
        req.headers['user-agent'] as string, 
        'Rate limit exceeded'
      );
      
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Upgrade your plan for more API calls.',
        limit: getTierLimits(effectiveTier).apiCallsPerDay,
        resetAt: rateLimit.resetAt.toISOString(),
      });
    }
    
    next();
  };
}

export function tierRequired(minTier: 'free' | 'basic' | 'pro' | 'enterprise') {
  const tierOrder = ['free', 'basic', 'pro', 'enterprise'];
  
  return (req: AuthenticatedApiRequest, res: Response, next: NextFunction) => {
    if (!req.apiKey) {
      return res.status(401).json({ error: 'Unauthorized', message: 'API key required' });
    }
    
    const effectiveTier = req.effectiveTier || req.apiKey.tier;
    const userTierIndex = tierOrder.indexOf(effectiveTier);
    const requiredTierIndex = tierOrder.indexOf(minTier);
    
    if (userTierIndex < requiredTierIndex) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `This endpoint requires ${minTier} tier or higher. Your tier: ${effectiveTier}`,
        requiredTier: minTier,
        currentTier: effectiveTier,
        upgradeUrl: '/api-keys',
      });
    }
    
    next();
  };
}

export function logRequest() {
  return async (req: AuthenticatedApiRequest, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    res.on('finish', () => {
      if (req.apiKey) {
        safeLogUsage(
          req.apiKey.id,
          req.apiUserId || null,
          req.path,
          req.method,
          res.statusCode,
          Date.now() - startTime,
          req.ip,
          req.headers['user-agent'] as string,
          res.statusCode >= 400 ? res.statusMessage : undefined
        );
      }
    });
    
    next();
  };
}
