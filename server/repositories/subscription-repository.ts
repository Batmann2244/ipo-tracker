import { db } from "../db";
import {
  subscriptionUpdates,
  type SubscriptionUpdate,
  type InsertSubscriptionUpdate,
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface ISubscriptionRepository {
  addSubscriptionUpdate(update: InsertSubscriptionUpdate): Promise<SubscriptionUpdate>;
  getSubscriptionUpdates(ipoId: number): Promise<SubscriptionUpdate[]>;
  getLatestSubscription(ipoId: number): Promise<SubscriptionUpdate | undefined>;
}

export class SubscriptionRepository implements ISubscriptionRepository {
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
}
