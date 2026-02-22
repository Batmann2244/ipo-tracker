import { db } from "../db";
import {
  gmpHistory,
  type GmpHistoryEntry,
  type InsertGmpHistory,
} from "@shared/schema";
import { eq, and, desc, gte } from "drizzle-orm";

export interface IGmpRepository {
  addGmpHistory(entry: InsertGmpHistory): Promise<GmpHistoryEntry>;
  getGmpHistory(ipoId: number, days?: number): Promise<GmpHistoryEntry[]>;
}

export class GmpRepository implements IGmpRepository {
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
}
