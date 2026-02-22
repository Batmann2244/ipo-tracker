import { db } from "../db";
import {
  fundUtilization,
  type FundUtilizationEntry,
  type InsertFundUtilization,
} from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IFundUtilizationRepository {
  getFundUtilization(ipoId: number): Promise<FundUtilizationEntry[]>;
  addFundUtilization(entry: InsertFundUtilization): Promise<FundUtilizationEntry>;
  updateFundUtilization(id: number, data: Partial<InsertFundUtilization>): Promise<FundUtilizationEntry | undefined>;
  getAllFundUtilization(): Promise<FundUtilizationEntry[]>;
}

export class FundUtilizationRepository implements IFundUtilizationRepository {
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

  async getAllFundUtilization(): Promise<FundUtilizationEntry[]> {
    return await db.select().from(fundUtilization);
  }
}
