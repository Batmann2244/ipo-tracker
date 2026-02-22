import { Router } from "express";
import { storage } from "../storage";
import { requireAuth } from "../middleware/auth";
import { TIER_LIMITS } from "@shared/schema";
import {
  createApiKey,
  getUserApiKeys,
  revokeApiKey,
  getUserSubscription,
  createOrUpdateSubscription,
  getUsageStats,
  getTodayUsageCount,
  getTierLimits
} from "../services/api-key-service";

const router = Router();

// Helper function for tier features
function getFeatureList(tier: string) {
  const features: Record<string, string[]> = {
    free: [
      'Upcoming IPO list (daily refresh)',
      '10 API calls/day',
      'Email digests',
      'Community support',
    ],
    basic: [
      'Everything in Free +',
      'Live subscription data (30min delay)',
      'GMP data (hourly)',
      '100 API calls/day',
      'Email alerts',
    ],
    pro: [
      'Everything in Basic +',
      'Real-time alerts (Telegram/Email)',
      'Live subscription (15min updates)',
      'GMP tracking + trend analysis',
      '10,000 API calls/day',
      'Webhooks support',
      'Historical data (2 years)',
      'Priority support',
    ],
    enterprise: [
      'Everything in Pro +',
      'Unlimited API calls',
      'Custom webhooks',
      'White-label API',
      'SLA guarantee (99.9% uptime)',
      'Dedicated support',
      'Custom data feeds',
    ],
  };
  return features[tier] || [];
}

// Get current user's subscription
router.get('/subscription', requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const subscription = await getUserSubscription(userId);

    if (!subscription) {
      // Create free tier subscription if none exists
      const newSub = await createOrUpdateSubscription(userId, 'free');
      return res.json({
        ...newSub,
        tierLimits: TIER_LIMITS.free,
      });
    }

    const tierLimits = TIER_LIMITS[subscription.tier as keyof typeof TIER_LIMITS] || TIER_LIMITS.free;
    res.json({
      ...subscription,
      tierLimits,
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// Update subscription tier (admin or Stripe webhook would use this)
router.post('/subscription/upgrade', requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { tier } = req.body;

    if (!['free', 'basic', 'pro', 'enterprise'].includes(tier)) {
      return res.status(400).json({ error: 'Invalid tier' });
    }

    // In production, this would be triggered by Stripe webhook
    const subscription = await createOrUpdateSubscription(userId, tier);
    const tierLimits = TIER_LIMITS[tier as keyof typeof TIER_LIMITS];

    res.json({
      ...subscription,
      tierLimits,
      message: `Upgraded to ${tier} tier successfully`,
    });
  } catch (error) {
    console.error('Error upgrading subscription:', error);
    res.status(500).json({ error: 'Failed to upgrade subscription' });
  }
});

// Get user's API keys
router.get('/keys', requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const keys = await getUserApiKeys(userId);

    // Add usage info for each key
    const keysWithUsage = await Promise.all(keys.map(async (key) => {
      const todayUsage = await getTodayUsageCount(key.id);
      const limits = getTierLimits(key.tier);
      return {
        id: key.id,
        name: key.name,
        keyPrefix: key.keyPrefix,
        tier: key.tier,
        isActive: key.isActive,
        lastUsedAt: key.lastUsedAt,
        createdAt: key.createdAt,
        todayUsage,
        dailyLimit: limits.apiCallsPerDay,
      };
    }));

    res.json(keysWithUsage);
  } catch (error) {
    console.error('Error fetching API keys:', error);
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
});

// Create new API key
router.post('/keys', requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.length < 1) {
      return res.status(400).json({ error: 'Key name is required' });
    }

    // Check if user already has too many keys (max 5 for free, 10 for paid)
    const existingKeys = await getUserApiKeys(userId);
    const subscription = await getUserSubscription(userId);
    const maxKeys = subscription?.tier === 'free' ? 2 : 10;

    if (existingKeys.length >= maxKeys) {
      return res.status(400).json({
        error: `Maximum ${maxKeys} API keys allowed for your tier`,
        upgradeMessage: subscription?.tier === 'free' ? 'Upgrade to create more API keys' : undefined,
      });
    }

    const { apiKey, plainKey } = await createApiKey(userId, name);

    res.json({
      message: 'API key created successfully',
      key: {
        id: apiKey.id,
        name: apiKey.name,
        keyPrefix: apiKey.keyPrefix,
        tier: apiKey.tier,
        createdAt: apiKey.createdAt,
      },
      plainKey, // Only shown once!
      warning: 'Save this key now. You will not be able to see it again.',
    });
  } catch (error) {
    console.error('Error creating API key:', error);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

// Revoke API key
router.delete('/keys/:id', requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const keyId = parseInt(req.params.id);

    if (isNaN(keyId)) {
      return res.status(400).json({ error: 'Invalid key ID' });
    }

    const success = await revokeApiKey(keyId, userId);

    if (!success) {
      return res.status(404).json({ error: 'API key not found or already revoked' });
    }

    res.json({ message: 'API key revoked successfully' });
  } catch (error) {
    console.error('Error revoking API key:', error);
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
});

// Get API usage stats
router.get('/usage', requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const days = Math.min(parseInt(req.query.days as string) || 30, 90);

    const stats = await getUsageStats(userId, days);

    res.json({
      stats,
      summary: {
        totalCalls: stats.reduce((sum, s) => sum + (s.callCount || 0), 0),
        totalErrors: stats.reduce((sum, s) => sum + (s.errorCount || 0), 0),
        avgResponseTime: stats.length > 0
          ? stats.reduce((sum, s) => sum + (s.avgResponseTimeMs || 0), 0) / stats.length
          : 0,
      },
    });
  } catch (error) {
    console.error('Error fetching usage stats:', error);
    res.status(500).json({ error: 'Failed to fetch usage stats' });
  }
});

// Get available tiers info
router.get('/tiers', (req, res) => {
  res.json({
    tiers: Object.entries(TIER_LIMITS).map(([name, limits]) => ({
      name,
      ...limits,
      features: getFeatureList(name),
    })),
  });
});

export default router;
