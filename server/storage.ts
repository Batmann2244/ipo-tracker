import { db } from "./db";
import {
  ipos,
  watchlist,
  alertPreferences,
  alertLogs,
  gmpHistory,
  peerCompanies,
  subscriptionUpdates,
  fundUtilization,
  ipoTimeline,
  type Ipo,
  type InsertIpo,
  type WatchlistItem,
  type InsertWatchlistItem,
  type WatchlistResponse,
  type AlertPreferences,
  type InsertAlertPreferences,
  type AlertLog,
  type InsertAlertLog,
  type GmpHistoryEntry,
  type InsertGmpHistory,
  type PeerCompany,
  type InsertPeerCompany,
  type SubscriptionUpdate,
  type InsertSubscriptionUpdate,
  type FundUtilizationEntry,
  type InsertFundUtilization,
  type IpoTimelineEvent,
  type InsertIpoTimeline,
} from "@shared/schema";
import { eq, ne, and, desc, gte, sql } from "drizzle-orm";
import { authStorage, IAuthStorage } from "./replit_integrations/auth/storage";

export interface IStorage extends IAuthStorage {
  // IPOs
  getIpos(status?: string, sector?: string): Promise<Ipo[]>;
  getIpo(id: number): Promise<Ipo | undefined>;
  getIpoBySymbol(symbol: string): Promise<Ipo | undefined>;
  createIpo(ipo: InsertIpo): Promise<Ipo>;
  upsertIpo(ipo: InsertIpo): Promise<Ipo>;
  bulkUpsertIpos(ipos: InsertIpo[]): Promise<Ipo[]>;
  updateIpo(id: number, data: Partial<InsertIpo>): Promise<Ipo | undefined>;
  getIpoCount(): Promise<number>;
  markAllAsListed(): Promise<number>;
  deleteIpo(id: number): Promise<void>;

  // Watchlist
  getWatchlist(userId: string): Promise<WatchlistResponse[]>;
  addToWatchlist(userId: string, ipoId: number): Promise<WatchlistItem>;
  removeFromWatchlist(userId: string, watchlistId: number): Promise<void>;
  getWatchlistItem(userId: string, ipoId: number): Promise<WatchlistItem | undefined>;

  // Alert Preferences
  getAlertPreferences(userId: string): Promise<AlertPreferences | undefined>;
  upsertAlertPreferences(userId: string, prefs: Partial<InsertAlertPreferences>): Promise<AlertPreferences>;
  getAllUsersWithAlerts(): Promise<AlertPreferences[]>;

  // Alert Logs
  createAlertLog(log: InsertAlertLog): Promise<AlertLog>;
  getAlertLogs(userId?: string, limit?: number): Promise<AlertLog[]>;

  // GMP History
  addGmpHistory(entry: InsertGmpHistory): Promise<GmpHistoryEntry>;
  getGmpHistory(ipoId: number, days?: number): Promise<GmpHistoryEntry[]>;

  // Peer Companies
  getPeerCompanies(ipoId: number): Promise<PeerCompany[]>;
  addPeerCompany(peer: InsertPeerCompany): Promise<PeerCompany>;
  deletePeerCompanies(ipoId: number): Promise<void>;

  // Subscription Updates
  addSubscriptionUpdate(update: InsertSubscriptionUpdate): Promise<SubscriptionUpdate>;
  getSubscriptionUpdates(ipoId: number): Promise<SubscriptionUpdate[]>;
  getLatestSubscription(ipoId: number): Promise<SubscriptionUpdate | undefined>;

  // Fund Utilization
  getFundUtilization(ipoId: number): Promise<FundUtilizationEntry[]>;
  addFundUtilization(entry: InsertFundUtilization): Promise<FundUtilizationEntry>;
  updateFundUtilization(id: number, data: Partial<InsertFundUtilization>): Promise<FundUtilizationEntry | undefined>;

  // IPO Timeline
  getIpoTimeline(ipoId: number): Promise<IpoTimelineEvent[]>;
  addTimelineEvent(event: InsertIpoTimeline): Promise<IpoTimelineEvent>;
  getAllUpcomingEvents(days?: number): Promise<(IpoTimelineEvent & { ipo: Ipo })[]>;
}

export class DatabaseStorage implements IStorage {
  // Inherit auth methods
  getUser = authStorage.getUser;
  upsertUser = authStorage.upsertUser;

  // IPOs
  async getIpos(status?: string, sector?: string): Promise<Ipo[]> {
    let query = db.select().from(ipos);
    const conditions = [];
    
    if (status) {
      conditions.push(eq(ipos.status, status));
    } else {
      conditions.push(ne(ipos.status, "listed"));
    }
    
    if (sector) conditions.push(eq(ipos.sector, sector));

    if (conditions.length > 0) {
      return await query.where(and(...conditions)).orderBy(desc(ipos.expectedDate));
    }
    return await query.orderBy(desc(ipos.expectedDate));
  }

  async getIpo(id: number): Promise<Ipo | undefined> {
    const [ipo] = await db.select().from(ipos).where(eq(ipos.id, id));
    return ipo;
  }

  async getIpoBySymbol(symbol: string): Promise<Ipo | undefined> {
    const [ipo] = await db.select().from(ipos).where(eq(ipos.symbol, symbol));
    return ipo;
  }

  async createIpo(insertIpo: InsertIpo): Promise<Ipo> {
    const [ipo] = await db.insert(ipos).values(insertIpo).returning();
    return ipo;
  }

  async upsertIpo(insertIpo: InsertIpo): Promise<Ipo> {
    try {
      // Try to insert with onConflictDoUpdate
      const result = await db
        .insert(ipos)
        .values(insertIpo)
        .onConflictDoUpdate({
          target: ipos.symbol,
          set: {
            ...insertIpo,
            updatedAt: new Date(),
          },
        })
        .returning();
      
      return result[0];
    } catch (error) {
      // Fallback to manual check
      const existing = await this.getIpoBySymbol(insertIpo.symbol);
      
      if (existing) {
        const [updated] = await db
          .update(ipos)
          .set({
            ...insertIpo,
            updatedAt: new Date(),
          })
          .where(eq(ipos.id, existing.id))
          .returning();
        return updated;
      }
      
      return this.createIpo(insertIpo);
    }
  }

  async bulkUpsertIpos(insertIpos: InsertIpo[]): Promise<Ipo[]> {
    if (insertIpos.length === 0) return [];

    try {
      // Try to insert with onConflictDoUpdate for bulk
      const result = await db
        .insert(ipos)
        .values(insertIpos)
        .onConflictDoUpdate({
          target: ipos.symbol,
          set: {
            companyName: sql`excluded.company_name`,
            priceRange: sql`excluded.price_range`,
            totalShares: sql`COALESCE(excluded.total_shares, ${ipos.totalShares})`,
            expectedDate: sql`COALESCE(excluded.expected_date, ${ipos.expectedDate})`,
            status: sql`excluded.status`,
            description: sql`COALESCE(excluded.description, ${ipos.description})`,
            sector: sql`COALESCE(excluded.sector, ${ipos.sector})`,
            revenueGrowth: sql`COALESCE(excluded.revenue_growth, ${ipos.revenueGrowth})`,
            ebitdaMargin: sql`COALESCE(excluded.ebitda_margin, ${ipos.ebitdaMargin})`,
            patMargin: sql`COALESCE(excluded.pat_margin, ${ipos.patMargin})`,
            roe: sql`COALESCE(excluded.roe, ${ipos.roe})`,
            roce: sql`COALESCE(excluded.roce, ${ipos.roce})`,
            debtToEquity: sql`COALESCE(excluded.debt_to_equity, ${ipos.debtToEquity})`,
            peRatio: sql`COALESCE(excluded.pe_ratio, ${ipos.peRatio})`,
            pbRatio: sql`COALESCE(excluded.pb_ratio, ${ipos.pbRatio})`,
            sectorPeMedian: sql`COALESCE(excluded.sector_pe_median, ${ipos.sectorPeMedian})`,
            issueSize: sql`COALESCE(excluded.issue_size, ${ipos.issueSize})`,
            freshIssue: sql`COALESCE(excluded.fresh_issue, ${ipos.freshIssue})`,
            ofsRatio: sql`COALESCE(excluded.ofs_ratio, ${ipos.ofsRatio})`,
            lotSize: sql`COALESCE(excluded.lot_size, ${ipos.lotSize})`,
            minInvestment: sql`COALESCE(excluded.min_investment, ${ipos.minInvestment})`,
            gmp: sql`COALESCE(excluded.gmp, ${ipos.gmp})`,
            subscriptionQib: sql`COALESCE(excluded.subscription_qib, ${ipos.subscriptionQib})`,
            subscriptionHni: sql`COALESCE(excluded.subscription_hni, ${ipos.subscriptionHni})`,
            subscriptionRetail: sql`COALESCE(excluded.subscription_retail, ${ipos.subscriptionRetail})`,
            subscriptionNii: sql`COALESCE(excluded.subscription_nii, ${ipos.subscriptionNii})`,
            investorGainId: sql`COALESCE(excluded.investor_gain_id, ${ipos.investorGainId})`,
            basisOfAllotmentDate: sql`COALESCE(excluded.basis_of_allotment_date, ${ipos.basisOfAllotmentDate})`,
            refundsInitiationDate: sql`COALESCE(excluded.refunds_initiation_date, ${ipos.refundsInitiationDate})`,
            creditToDematDate: sql`COALESCE(excluded.credit_to_demat_date, ${ipos.creditToDematDate})`,
            promoterHolding: sql`COALESCE(excluded.promoter_holding, ${ipos.promoterHolding})`,
            postIpoPromoterHolding: sql`COALESCE(excluded.post_ipo_promoter_holding, ${ipos.postIpoPromoterHolding})`,
            fundamentalsScore: sql`COALESCE(excluded.fundamentals_score, ${ipos.fundamentalsScore})`,
            valuationScore: sql`COALESCE(excluded.valuation_score, ${ipos.valuationScore})`,
            governanceScore: sql`COALESCE(excluded.governance_score, ${ipos.governanceScore})`,
            overallScore: sql`COALESCE(excluded.overall_score, ${ipos.overallScore})`,
            riskLevel: sql`COALESCE(excluded.risk_level, ${ipos.riskLevel})`,
            redFlags: sql`COALESCE(excluded.red_flags, ${ipos.redFlags})`,
            pros: sql`COALESCE(excluded.pros, ${ipos.pros})`,
            aiSummary: sql`COALESCE(excluded.ai_summary, ${ipos.aiSummary})`,
            aiRecommendation: sql`COALESCE(excluded.ai_recommendation, ${ipos.aiRecommendation})`,
            updatedAt: new Date(),
          },
        })
        .returning();

      return result;
    } catch (error) {
      console.error("Bulk upsert failed, falling back to individual upserts:", error);
      const results: Ipo[] = [];
      for (const ipo of insertIpos) {
        try {
          results.push(await this.upsertIpo(ipo));
        } catch (e) {
          console.error(`Failed to upsert IPO ${ipo.symbol} individually:`, e);
        }
      }
      return results;
    }
  }

  async updateIpo(id: number, data: Partial<InsertIpo>): Promise<Ipo | undefined> {
    const [updated] = await db
      .update(ipos)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(ipos.id, id))
      .returning();
    return updated;
  }

  async getIpoCount(): Promise<number> {
    const result = await db.select().from(ipos);
    return result.length;
  }

  async markAllAsListed(): Promise<number> {
    const result = await db.update(ipos).set({ status: "listed" }).returning();
    return result.length;
  }

  async deleteIpo(id: number): Promise<void> {
    await db.delete(ipos).where(eq(ipos.id, id));
  }

  // Watchlist
  async getWatchlist(userId: string): Promise<WatchlistResponse[]> {
    const items = await db
      .select({
        watchlist: watchlist,
        ipo: ipos,
      })
      .from(watchlist)
      .innerJoin(ipos, eq(watchlist.ipoId, ipos.id))
      .where(eq(watchlist.userId, userId));

    return items.map((item) => ({
      ...item.watchlist,
      ipo: item.ipo,
    }));
  }

  async getWatchlistItem(userId: string, ipoId: number): Promise<WatchlistItem | undefined> {
    const [item] = await db
        .select()
        .from(watchlist)
        .where(and(eq(watchlist.userId, userId), eq(watchlist.ipoId, ipoId)));
    return item;
  }

  async addToWatchlist(userId: string, ipoId: number): Promise<WatchlistItem> {
    // check if exists
    const existing = await this.getWatchlistItem(userId, ipoId);
    if (existing) return existing;

    const [item] = await db
      .insert(watchlist)
      .values({ userId, ipoId })
      .returning();
    return item;
  }

  async removeFromWatchlist(userId: string, watchlistId: number): Promise<void> {
    await db
      .delete(watchlist)
      .where(and(eq(watchlist.id, watchlistId), eq(watchlist.userId, userId)));
  }

  // Alert Preferences
  async getAlertPreferences(userId: string): Promise<AlertPreferences | undefined> {
    const [prefs] = await db
      .select()
      .from(alertPreferences)
      .where(eq(alertPreferences.userId, userId));
    return prefs;
  }

  async upsertAlertPreferences(userId: string, prefs: Partial<InsertAlertPreferences>): Promise<AlertPreferences> {
    const existing = await this.getAlertPreferences(userId);
    
    if (existing) {
      const [updated] = await db
        .update(alertPreferences)
        .set({
          ...prefs,
          updatedAt: new Date(),
        })
        .where(eq(alertPreferences.userId, userId))
        .returning();
      return updated;
    }
    
    const [created] = await db
      .insert(alertPreferences)
      .values({ userId, ...prefs })
      .returning();
    return created;
  }

  async getAllUsersWithAlerts(): Promise<AlertPreferences[]> {
    return await db
      .select()
      .from(alertPreferences)
      .where(eq(alertPreferences.emailEnabled, true));
  }

  // Alert Logs
  async createAlertLog(log: InsertAlertLog): Promise<AlertLog> {
    const [created] = await db
      .insert(alertLogs)
      .values(log)
      .returning();
    return created;
  }

  async getAlertLogs(userId?: string, limit: number = 50): Promise<AlertLog[]> {
    let query = db.select().from(alertLogs);
    
    if (userId) {
      return await query
        .where(eq(alertLogs.userId, userId))
        .orderBy(desc(alertLogs.createdAt))
        .limit(limit);
    }
    
    return await query
      .orderBy(desc(alertLogs.createdAt))
      .limit(limit);
  }

  // GMP History
  async addGmpHistory(entry: InsertGmpHistory): Promise<GmpHistoryEntry> {
    const [created] = await db.insert(gmpHistory).values(entry).returning();
    return created;
  }

  async getGmpHistory(ipoId: number, days: number = 7): Promise<GmpHistoryEntry[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return await db
      .select()
      .from(gmpHistory)
      .where(and(
        eq(gmpHistory.ipoId, ipoId),
        gte(gmpHistory.recordedAt, startDate)
      ))
      .orderBy(desc(gmpHistory.recordedAt));
  }

  // Peer Companies
  async getPeerCompanies(ipoId: number): Promise<PeerCompany[]> {
    return await db
      .select()
      .from(peerCompanies)
      .where(eq(peerCompanies.ipoId, ipoId));
  }

  async addPeerCompany(peer: InsertPeerCompany): Promise<PeerCompany> {
    const [created] = await db.insert(peerCompanies).values(peer).returning();
    return created;
  }

  async deletePeerCompanies(ipoId: number): Promise<void> {
    await db.delete(peerCompanies).where(eq(peerCompanies.ipoId, ipoId));
  }

  // Subscription Updates
  async addSubscriptionUpdate(update: InsertSubscriptionUpdate): Promise<SubscriptionUpdate> {
    const [created] = await db.insert(subscriptionUpdates).values(update).returning();
    return created;
  }

  async getSubscriptionUpdates(ipoId: number): Promise<SubscriptionUpdate[]> {
    return await db
      .select()
      .from(subscriptionUpdates)
      .where(eq(subscriptionUpdates.ipoId, ipoId))
      .orderBy(desc(subscriptionUpdates.recordedAt));
  }

  async getLatestSubscription(ipoId: number): Promise<SubscriptionUpdate | undefined> {
    const [latest] = await db
      .select()
      .from(subscriptionUpdates)
      .where(eq(subscriptionUpdates.ipoId, ipoId))
      .orderBy(desc(subscriptionUpdates.recordedAt))
      .limit(1);
    return latest;
  }

  // Fund Utilization
  async getFundUtilization(ipoId: number): Promise<FundUtilizationEntry[]> {
    return await db
      .select()
      .from(fundUtilization)
      .where(eq(fundUtilization.ipoId, ipoId));
  }

  async addFundUtilization(entry: InsertFundUtilization): Promise<FundUtilizationEntry> {
    const [created] = await db.insert(fundUtilization).values(entry).returning();
    return created;
  }

  async updateFundUtilization(id: number, data: Partial<InsertFundUtilization>): Promise<FundUtilizationEntry | undefined> {
    const [updated] = await db
      .update(fundUtilization)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(fundUtilization.id, id))
      .returning();
    return updated;
  }

  // IPO Timeline
  async getIpoTimeline(ipoId: number): Promise<IpoTimelineEvent[]> {
    return await db
      .select()
      .from(ipoTimeline)
      .where(eq(ipoTimeline.ipoId, ipoId))
      .orderBy(ipoTimeline.eventDate);
  }

  async addTimelineEvent(event: InsertIpoTimeline): Promise<IpoTimelineEvent> {
    const [created] = await db.insert(ipoTimeline).values(event).returning();
    return created;
  }

  async getAllUpcomingEvents(days: number = 30): Promise<(IpoTimelineEvent & { ipo: Ipo })[]> {
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);
    
    const events = await db
      .select({
        event: ipoTimeline,
        ipo: ipos,
      })
      .from(ipoTimeline)
      .innerJoin(ipos, eq(ipoTimeline.ipoId, ipos.id))
      .where(and(
        gte(ipoTimeline.eventDate, today.toISOString().split('T')[0])
      ))
      .orderBy(ipoTimeline.eventDate);
    
    return events.map(e => ({ ...e.event, ipo: e.ipo }));
  }
}

export const storage = new DatabaseStorage();
