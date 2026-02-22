import { db } from "../db";
import {
  ipos,
  type Ipo,
  type InsertIpo,
} from "@shared/schema";
import { eq, ne, and, desc, sql } from "drizzle-orm";

export interface IIpoRepository {
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
}

export class IpoRepository implements IIpoRepository {
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
}
