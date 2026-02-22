import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth";

export * from "./models/auth";
export * from "./models/chat";
export * from "./models/api";

// === TABLE DEFINITIONS ===
export const ipos = sqliteTable("ipos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  symbol: text("symbol").notNull().unique(),
  companyName: text("company_name").notNull(),
  priceRange: text("price_range").notNull(),
  totalShares: text("total_shares"),
  expectedDate: text("expected_date"),
  status: text("status").notNull(), // 'upcoming', 'open', 'closed'
  description: text("description"),
  sector: text("sector"),
  
  // Financial Metrics
  revenueGrowth: real("revenue_growth"), // 3-year CAGR %
  ebitdaMargin: real("ebitda_margin"), // %
  patMargin: real("pat_margin"), // Profit After Tax margin %
  roe: real("roe"), // Return on Equity %
  roce: real("roce"), // Return on Capital Employed %
  debtToEquity: real("debt_to_equity"), // Debt/Equity ratio
  
  // Valuation Metrics
  peRatio: real("pe_ratio"), // Price to Earnings
  pbRatio: real("pb_ratio"), // Price to Book
  sectorPeMedian: real("sector_pe_median"), // Median P/E for sector
  
  // Offer Details
  issueSize: text("issue_size"), // Total issue size in Cr
  freshIssue: real("fresh_issue"), // % of fresh issue
  ofsRatio: real("ofs_ratio"), // Offer for Sale ratio (0-1)
  lotSize: integer("lot_size"),
  minInvestment: text("min_investment"),
  
  // Market Sentiment
  gmp: integer("gmp"), // Grey Market Premium in Rs
  subscriptionQib: real("subscription_qib"), // QIB subscription times
  subscriptionHni: real("subscription_hni"), // HNI subscription times
  subscriptionRetail: real("subscription_retail"), // Retail subscription times
  subscriptionNii: real("subscription_nii"), // NII subscription times
  
  // External IDs for data sources
  investorGainId: integer("investor_gain_id"), // InvestorGain IPO ID for fetching details
  
  // IPO Activity Dates
  basisOfAllotmentDate: text("basis_of_allotment_date"),
  refundsInitiationDate: text("refunds_initiation_date"),
  creditToDematDate: text("credit_to_demat_date"),
  
  // Promoter Info
  promoterHolding: real("promoter_holding"), // Pre-IPO promoter holding %
  postIpoPromoterHolding: real("post_ipo_promoter_holding"), // Post-IPO %
  
  // Computed Scores (0-10 scale)
  fundamentalsScore: real("fundamentals_score"),
  valuationScore: real("valuation_score"),
  governanceScore: real("governance_score"),
  overallScore: real("overall_score"),
  
  // Risk Assessment
  riskLevel: text("risk_level"), // 'conservative', 'moderate', 'aggressive'
  redFlags: text("red_flags"), // JSON array of red flag strings
  pros: text("pros"), // JSON array of positive points
  
  // AI Analysis
  aiSummary: text("ai_summary"),
  aiRecommendation: text("ai_recommendation"),
  
  createdAt: integer("created_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const watchlist = sqliteTable("watchlist", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id),
  ipoId: integer("ipo_id").notNull().references(() => ipos.id),
  createdAt: integer("created_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const alertPreferences = sqliteTable("alert_preferences", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id).unique(),
  emailEnabled: integer("email_enabled", { mode: 'boolean' }).default(false),
  email: text("email"),
  telegramEnabled: integer("telegram_enabled", { mode: 'boolean' }).default(false),
  telegramChatId: text("telegram_chat_id"),
  alertOnNewIpo: integer("alert_on_new_ipo", { mode: 'boolean' }).default(true),
  alertOnGmpChange: integer("alert_on_gmp_change", { mode: 'boolean' }).default(true),
  alertOnOpenDate: integer("alert_on_open_date", { mode: 'boolean' }).default(true),
  alertOnWatchlistOnly: integer("alert_on_watchlist_only", { mode: 'boolean' }).default(false),
  createdAt: integer("created_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const alertLogs = sqliteTable("alert_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").references(() => users.id),
  ipoId: integer("ipo_id").references(() => ipos.id),
  alertType: text("alert_type").notNull(), // 'new_ipo', 'gmp_change', 'open_date', 'ai_analysis'
  channel: text("channel").notNull(), // 'email'
  status: text("status").notNull(), // 'sent', 'failed', 'pending'
  message: text("message"),
  error: text("error"),
  createdAt: integer("created_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// GMP History for trend tracking
export const gmpHistory = sqliteTable("gmp_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ipoId: integer("ipo_id").notNull().references(() => ipos.id),
  gmp: integer("gmp").notNull(),
  gmpPercentage: real("gmp_percentage"),
  recordedAt: integer("recorded_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, (table) => ({
  ipoIdRecordedAtIdx: index("gmp_history_ipo_recorded_at_idx").on(table.ipoId, table.recordedAt),
}));

// Peer companies for comparison
export const peerCompanies = sqliteTable("peer_companies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ipoId: integer("ipo_id").notNull().references(() => ipos.id),
  companyName: text("company_name").notNull(),
  symbol: text("symbol").notNull(),
  marketCap: real("market_cap"), // in Cr
  peRatio: real("pe_ratio"),
  pbRatio: real("pb_ratio"),
  roe: real("roe"),
  roce: real("roce"),
  revenueGrowth: real("revenue_growth"),
  ebitdaMargin: real("ebitda_margin"),
  debtToEquity: real("debt_to_equity"),
  createdAt: integer("created_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Subscription updates (live tracking)
export const subscriptionUpdates = sqliteTable("subscription_updates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ipoId: integer("ipo_id").notNull().references(() => ipos.id),
  qibSubscription: real("qib_subscription"),
  niiSubscription: real("nii_subscription"), // HNI/NII
  retailSubscription: real("retail_subscription"),
  totalSubscription: real("total_subscription"),
  recordedAt: integer("recorded_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Fund utilization tracking
export const fundUtilization = sqliteTable("fund_utilization", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ipoId: integer("ipo_id").notNull().references(() => ipos.id),
  category: text("category").notNull(), // 'debt_repayment', 'capex', 'working_capital', 'acquisitions', 'general_corporate'
  plannedAmount: real("planned_amount"), // in Cr
  plannedPercentage: real("planned_percentage"),
  actualAmount: real("actual_amount"), // in Cr (tracked post-listing)
  actualPercentage: real("actual_percentage"),
  status: text("status"), // 'planned', 'in_progress', 'completed'
  notes: text("notes"),
  createdAt: integer("created_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Scraper Logs for monitoring data sources
export const scraperLogs = sqliteTable("scraper_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  source: text("source").notNull(), // 'chittorgarh', 'groww', 'nse', 'nsetools', 'investorgain'
  operation: text("operation").notNull(), // 'ipos', 'gmp', 'subscription'
  status: text("status").notNull(), // 'success', 'error', 'timeout'
  recordsCount: integer("records_count").default(0),
  responseTimeMs: integer("response_time_ms"),
  errorMessage: text("error_message"),
  metadata: text("metadata"), // JSON string for additional info
  createdAt: integer("created_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// IPO Timeline/Calendar events
export const ipoTimeline = sqliteTable("ipo_timeline", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ipoId: integer("ipo_id").notNull().references(() => ipos.id),
  eventType: text("event_type").notNull(), // 'drhp_filing', 'price_band', 'open_date', 'close_date', 'allotment', 'refund', 'listing'
  eventDate: text("event_date"),
  eventTime: text("event_time"), // e.g., "10:00 AM"
  description: text("description"),
  isConfirmed: integer("is_confirmed", { mode: 'boolean' }).default(false),
  createdAt: integer("created_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// === RELATIONS ===
export const iposRelations = relations(ipos, ({ many }) => ({
  watchlistItems: many(watchlist),
}));

export const watchlistRelations = relations(watchlist, ({ one }) => ({
  user: one(users, {
    fields: [watchlist.userId],
    references: [users.id],
  }),
  ipo: one(ipos, {
    fields: [watchlist.ipoId],
    references: [ipos.id],
  }),
}));

// === BASE SCHEMAS ===
export const insertIpoSchema = createInsertSchema(ipos).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWatchlistSchema = createInsertSchema(watchlist).omit({ id: true, createdAt: true });
export const insertAlertPreferencesSchema = createInsertSchema(alertPreferences).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAlertLogSchema = createInsertSchema(alertLogs).omit({ id: true, createdAt: true });
export const insertGmpHistorySchema = createInsertSchema(gmpHistory).omit({ id: true, recordedAt: true });
export const insertPeerCompanySchema = createInsertSchema(peerCompanies).omit({ id: true, createdAt: true });
export const insertSubscriptionUpdateSchema = createInsertSchema(subscriptionUpdates).omit({ id: true, recordedAt: true });
export const insertFundUtilizationSchema = createInsertSchema(fundUtilization).omit({ id: true, createdAt: true, updatedAt: true });
export const insertIpoTimelineSchema = createInsertSchema(ipoTimeline).omit({ id: true, createdAt: true });
export const insertScraperLogSchema = createInsertSchema(scraperLogs).omit({ id: true, createdAt: true });

// === EXPLICIT API CONTRACT TYPES ===
export type Ipo = typeof ipos.$inferSelect;
export type InsertIpo = z.infer<typeof insertIpoSchema>;
export type WatchlistItem = typeof watchlist.$inferSelect;
export type InsertWatchlistItem = z.infer<typeof insertWatchlistSchema>;
export type AlertPreferences = typeof alertPreferences.$inferSelect;
export type InsertAlertPreferences = z.infer<typeof insertAlertPreferencesSchema>;
export type AlertLog = typeof alertLogs.$inferSelect;
export type InsertAlertLog = z.infer<typeof insertAlertLogSchema>;
export type GmpHistoryEntry = typeof gmpHistory.$inferSelect;
export type InsertGmpHistory = z.infer<typeof insertGmpHistorySchema>;
export type PeerCompany = typeof peerCompanies.$inferSelect;
export type InsertPeerCompany = z.infer<typeof insertPeerCompanySchema>;
export type SubscriptionUpdate = typeof subscriptionUpdates.$inferSelect;
export type InsertSubscriptionUpdate = z.infer<typeof insertSubscriptionUpdateSchema>;
export type FundUtilizationEntry = typeof fundUtilization.$inferSelect;
export type InsertFundUtilization = z.infer<typeof insertFundUtilizationSchema>;
export type IpoTimelineEvent = typeof ipoTimeline.$inferSelect;
export type InsertIpoTimeline = z.infer<typeof insertIpoTimelineSchema>;
export type ScraperLog = typeof scraperLogs.$inferSelect;
export type InsertScraperLog = z.infer<typeof insertScraperLogSchema>;

// API Responses
export type IpoResponse = Ipo;
export type WatchlistResponse = WatchlistItem & { ipo: Ipo };

// Score Summary Type for frontend
export type IpoScoreSummary = {
  fundamentals: number;
  valuation: number;
  governance: number;
  overall: number;
  riskLevel: 'conservative' | 'moderate' | 'aggressive';
  redFlags: string[];
  pros: string[];
};
