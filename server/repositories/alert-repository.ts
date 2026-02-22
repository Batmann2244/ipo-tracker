import { db } from "../db";
import {
  alertPreferences,
  alertLogs,
  type AlertPreferences,
  type InsertAlertPreferences,
  type AlertLog,
  type InsertAlertLog,
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IAlertRepository {
  getAlertPreferences(userId: string): Promise<AlertPreferences | undefined>;
  upsertAlertPreferences(userId: string, prefs: Partial<InsertAlertPreferences>): Promise<AlertPreferences>;
  getAllUsersWithAlerts(): Promise<AlertPreferences[]>;
  createAlertLog(log: InsertAlertLog): Promise<AlertLog>;
  getAlertLogs(userId?: string, limit?: number): Promise<AlertLog[]>;
}

export class AlertRepository implements IAlertRepository {
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
}
