import { randomBytes, createHash } from 'crypto';
import { db } from '../db';
import { apiKeys, subscriptions, apiUsageLogs, dailyUsageStats, TIER_LIMITS, type ApiKey, type Subscription } from '@shared/schema';
import { eq, and, gte, sql, inArray } from 'drizzle-orm';

const API_KEY_PREFIX = 'ipo_';
const API_KEY_LENGTH = 32;

export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const randomPart = randomBytes(API_KEY_LENGTH).toString('base64url');
  const fullKey = `${API_KEY_PREFIX}${randomPart}`;
  const prefix = fullKey.substring(0, 12);
  const hash = createHash('sha256').update(fullKey).digest('hex');
  
  return { key: fullKey, prefix, hash };
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export async function createApiKey(userId: string, name: string): Promise<{ apiKey: ApiKey; plainKey: string }> {
  const subscription = await getUserSubscription(userId);
  const tier = subscription?.tier || 'free';
  
  const { key, prefix, hash } = generateApiKey();
  
  const [apiKey] = await db.insert(apiKeys).values({
    userId,
    name,
    keyPrefix: prefix,
    keyHash: hash,
    tier,
    isActive: true,
  }).returning();
  
  return { apiKey, plainKey: key };
}

export async function validateApiKey(key: string): Promise<{ valid: boolean; apiKey?: ApiKey; subscription?: Subscription; error?: string }> {
  if (!key || !key.startsWith(API_KEY_PREFIX)) {
    return { valid: false, error: 'Invalid API key format' };
  }
  
  const hash = hashApiKey(key);
  
  const [apiKey] = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, hash));
  
  if (!apiKey) {
    return { valid: false, error: 'API key not found' };
  }
  
  if (!apiKey.isActive) {
    return { valid: false, error: 'API key is inactive' };
  }
  
  if (apiKey.revokedAt) {
    return { valid: false, error: 'API key has been revoked' };
  }
  
  if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
    return { valid: false, error: 'API key has expired' };
  }
  
  await db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, apiKey.id));
  
  const subscription = await getUserSubscription(apiKey.userId);
  
  return { valid: true, apiKey, subscription };
}

export async function revokeApiKey(keyId: number, userId: string): Promise<boolean> {
  const result = await db.update(apiKeys)
    .set({ isActive: false, revokedAt: new Date() })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId)))
    .returning();
  
  return result.length > 0;
}

export async function getUserApiKeys(userId: string): Promise<ApiKey[]> {
  return db.select()
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, userId), eq(apiKeys.isActive, true)));
}

export async function getUserSubscription(userId: string): Promise<Subscription | undefined> {
  const [subscription] = await db.select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId));
  
  return subscription;
}

export async function createOrUpdateSubscription(
  userId: string,
  tier: string,
  stripeCustomerId?: string,
  stripeSubscriptionId?: string
): Promise<Subscription> {
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  
  const [existing] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
  
  if (existing) {
    const [updated] = await db.update(subscriptions)
      .set({
        tier,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        stripeCustomerId,
        stripeSubscriptionId,
        updatedAt: now,
      })
      .where(eq(subscriptions.userId, userId))
      .returning();
    
    await db.update(apiKeys)
      .set({ tier })
      .where(eq(apiKeys.userId, userId));
    
    return updated;
  }
  
  const [subscription] = await db.insert(subscriptions).values({
    userId,
    tier,
    status: 'active',
    currentPeriodStart: now,
    currentPeriodEnd: periodEnd,
    stripeCustomerId,
    stripeSubscriptionId,
  }).returning();
  
  return subscription;
}

export async function getTodayUsageCount(apiKeyId: number): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(apiUsageLogs)
    .where(and(
      eq(apiUsageLogs.apiKeyId, apiKeyId),
      gte(apiUsageLogs.createdAt, today)
    ));
  
  return Number(result[0]?.count || 0);
}

export async function getTodayUsageCountsForKeys(apiKeyIds: number[]): Promise<Record<number, number>> {
  if (apiKeyIds.length === 0) return {};

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const results = await db.select({
      apiKeyId: apiUsageLogs.apiKeyId,
      count: sql<number>`count(*)`
    })
    .from(apiUsageLogs)
    .where(and(
      inArray(apiUsageLogs.apiKeyId, apiKeyIds),
      gte(apiUsageLogs.createdAt, today)
    ))
    .groupBy(apiUsageLogs.apiKeyId);

  const usageMap: Record<number, number> = {};
  // Initialize all to 0 so keys with no usage are included
  apiKeyIds.forEach(id => usageMap[id] = 0);

  results.forEach(row => {
    if (row.apiKeyId !== null) {
      usageMap[row.apiKeyId] = Number(row.count);
    }
  });

  return usageMap;
}

export async function logApiUsage(
  apiKeyId: number | null,
  userId: string | null,
  endpoint: string,
  method: string,
  statusCode: number,
  responseTimeMs: number,
  ipAddress?: string,
  userAgent?: string,
  errorMessage?: string
): Promise<void> {
  await db.insert(apiUsageLogs).values({
    apiKeyId,
    userId,
    endpoint,
    method,
    statusCode,
    responseTimeMs,
    ipAddress,
    userAgent,
    errorMessage,
  });
  
  if (apiKeyId && userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [existing] = await db.select()
      .from(dailyUsageStats)
      .where(and(
        eq(dailyUsageStats.apiKeyId, apiKeyId),
        eq(dailyUsageStats.date, today)
      ));
    
    if (existing) {
      const isError = statusCode >= 400;
      await db.update(dailyUsageStats)
        .set({
          callCount: sql`${dailyUsageStats.callCount} + 1`,
          successCount: isError ? existing.successCount : sql`${dailyUsageStats.successCount} + 1`,
          errorCount: isError ? sql`${dailyUsageStats.errorCount} + 1` : existing.errorCount,
          avgResponseTimeMs: sql`(${dailyUsageStats.avgResponseTimeMs} * ${dailyUsageStats.callCount} + ${responseTimeMs}) / (${dailyUsageStats.callCount} + 1)`,
        })
        .where(eq(dailyUsageStats.id, existing.id));
    } else {
      await db.insert(dailyUsageStats).values({
        userId,
        apiKeyId,
        date: today,
        callCount: 1,
        successCount: statusCode < 400 ? 1 : 0,
        errorCount: statusCode >= 400 ? 1 : 0,
        avgResponseTimeMs: responseTimeMs,
      });
    }
  }
}

export function getTierLimits(tier: string) {
  return TIER_LIMITS[tier as keyof typeof TIER_LIMITS] || TIER_LIMITS.free;
}

export async function checkRateLimit(apiKeyId: number, tier: string): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const limits = getTierLimits(tier);
  const dailyLimit = limits.apiCallsPerDay;
  
  if (dailyLimit === -1) {
    return { allowed: true, remaining: -1, resetAt: new Date() };
  }
  
  const todayUsage = await getTodayUsageCount(apiKeyId);
  const remaining = Math.max(0, dailyLimit - todayUsage);
  
  const resetAt = new Date();
  resetAt.setHours(24, 0, 0, 0);
  
  return {
    allowed: todayUsage < dailyLimit,
    remaining,
    resetAt,
  };
}

export async function getUsageStats(userId: string, days: number = 30): Promise<DailyUsageStats[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return db.select()
    .from(dailyUsageStats)
    .where(and(
      eq(dailyUsageStats.userId, userId),
      gte(dailyUsageStats.date, startDate)
    ))
    .orderBy(dailyUsageStats.date);
}

type DailyUsageStats = typeof dailyUsageStats.$inferSelect;
