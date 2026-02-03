import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./auth";

export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  BASIC: 'basic',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
} as const;

export type SubscriptionTier = typeof SUBSCRIPTION_TIERS[keyof typeof SUBSCRIPTION_TIERS];

export const TIER_LIMITS = {
  free: {
    apiCallsPerDay: 10,
    dataRefreshDelay: 60, // minutes
    historyDays: 30,
    webhooksEnabled: false,
    alertsEnabled: false,
    priceInr: 0,
  },
  basic: {
    apiCallsPerDay: 100,
    dataRefreshDelay: 30, // minutes
    historyDays: 90,
    webhooksEnabled: false,
    alertsEnabled: true,
    priceInr: 499,
  },
  pro: {
    apiCallsPerDay: 10000,
    dataRefreshDelay: 15, // minutes
    historyDays: 730, // 2 years
    webhooksEnabled: true,
    alertsEnabled: true,
    priceInr: 2999,
  },
  enterprise: {
    apiCallsPerDay: -1, // unlimited
    dataRefreshDelay: 5, // minutes
    historyDays: -1, // unlimited
    webhooksEnabled: true,
    alertsEnabled: true,
    priceInr: 50000, // starting price
  },
} as const;

export const subscriptions = sqliteTable("subscriptions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id).unique(),
  tier: text("tier").notNull().default('free'), // 'free', 'basic', 'pro', 'enterprise'
  status: text("status").notNull().default('active'), // 'active', 'cancelled', 'expired', 'past_due'
  currentPeriodStart: integer("current_period_start", { mode: 'timestamp' }).$defaultFn(() => new Date()),
  currentPeriodEnd: integer("current_period_end", { mode: 'timestamp' }),
  cancelAtPeriodEnd: integer("cancel_at_period_end", { mode: 'boolean' }).default(false),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: integer("created_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const apiKeys = sqliteTable("api_keys", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id),
  name: text("name").notNull(), // e.g., "Production API Key", "Development Key"
  keyPrefix: text("key_prefix").notNull(), // First 8 chars of the key (for display)
  keyHash: text("key_hash").notNull().unique(), // SHA-256 hash of the full key
  tier: text("tier").notNull().default('free'), // Inherited from subscription at creation
  isActive: integer("is_active", { mode: 'boolean' }).default(true),
  lastUsedAt: integer("last_used_at", { mode: 'timestamp' }),
  expiresAt: integer("expires_at", { mode: 'timestamp' }),
  createdAt: integer("created_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
  revokedAt: integer("revoked_at", { mode: 'timestamp' }),
}, (table) => ({
  userIdx: index("idx_api_keys_user").on(table.userId),
  hashIdx: index("idx_api_keys_hash").on(table.keyHash),
}));

export const apiUsageLogs = sqliteTable("api_usage_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  apiKeyId: integer("api_key_id").references(() => apiKeys.id),
  userId: text("user_id").references(() => users.id),
  endpoint: text("endpoint").notNull(),
  method: text("method").notNull(),
  statusCode: integer("status_code"),
  responseTimeMs: integer("response_time_ms"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  requestBody: text("request_body"), // Truncated/sanitized
  errorMessage: text("error_message"),
  createdAt: integer("created_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, (table) => ({
  keyIdx: index("idx_usage_key").on(table.apiKeyId),
  userIdx: index("idx_usage_user").on(table.userId),
  createdIdx: index("idx_usage_created").on(table.createdAt),
}));

export const dailyUsageStats = sqliteTable("daily_usage_stats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id),
  apiKeyId: integer("api_key_id").references(() => apiKeys.id),
  date: integer("date", { mode: 'timestamp' }).notNull(),
  callCount: integer("call_count").default(0),
  successCount: integer("success_count").default(0),
  errorCount: integer("error_count").default(0),
  avgResponseTimeMs: real("avg_response_time_ms"),
  createdAt: integer("created_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, (table) => ({
  userDateIdx: index("idx_daily_user_date").on(table.userId, table.date),
}));

export const webhooks = sqliteTable("webhooks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id),
  url: text("url").notNull(),
  secret: text("secret").notNull(), // For HMAC signature verification
  events: text("events").notNull(), // JSON array ['ipo.new', 'gmp.change', 'subscription.update']
  isActive: integer("is_active", { mode: 'boolean' }).default(true),
  lastTriggeredAt: integer("last_triggered_at", { mode: 'timestamp' }),
  failureCount: integer("failure_count").default(0),
  createdAt: integer("created_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const webhookLogs = sqliteTable("webhook_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  webhookId: integer("webhook_id").notNull().references(() => webhooks.id),
  event: text("event").notNull(),
  payload: text("payload"),
  statusCode: integer("status_code"),
  responseBody: text("response_body"),
  deliveredAt: integer("delivered_at", { mode: 'timestamp' }),
  error: text("error"),
  createdAt: integer("created_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertApiKeySchema = createInsertSchema(apiKeys).omit({ id: true, createdAt: true });
export const insertApiUsageLogSchema = createInsertSchema(apiUsageLogs).omit({ id: true, createdAt: true });
export const insertDailyUsageStatsSchema = createInsertSchema(dailyUsageStats).omit({ id: true, createdAt: true });
export const insertWebhookSchema = createInsertSchema(webhooks).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWebhookLogSchema = createInsertSchema(webhookLogs).omit({ id: true, createdAt: true });

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiUsageLog = typeof apiUsageLogs.$inferSelect;
export type InsertApiUsageLog = z.infer<typeof insertApiUsageLogSchema>;
export type DailyUsageStats = typeof dailyUsageStats.$inferSelect;
export type InsertDailyUsageStats = z.infer<typeof insertDailyUsageStatsSchema>;
export type Webhook = typeof webhooks.$inferSelect;
export type InsertWebhook = z.infer<typeof insertWebhookSchema>;
export type WebhookLog = typeof webhookLogs.$inferSelect;
export type InsertWebhookLog = z.infer<typeof insertWebhookLogSchema>;

export type ApiKeyWithUsage = ApiKey & {
  todayUsage: number;
  dailyLimit: number;
};

export type SubscriptionWithTierInfo = Subscription & {
  tierLimits: typeof TIER_LIMITS[keyof typeof TIER_LIMITS];
};
