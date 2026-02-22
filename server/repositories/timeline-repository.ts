import { db } from "../db";
import {
  ipoTimeline,
  ipos,
  type IpoTimelineEvent,
  type InsertIpoTimeline,
  type Ipo,
} from "@shared/schema";
import { eq, and, gte } from "drizzle-orm";

export interface ITimelineRepository {
  getIpoTimeline(ipoId: number): Promise<IpoTimelineEvent[]>;
  addTimelineEvent(event: InsertIpoTimeline): Promise<IpoTimelineEvent>;
  getAllUpcomingEvents(days?: number): Promise<(IpoTimelineEvent & { ipo: Ipo })[]>;
}

export class TimelineRepository implements ITimelineRepository {
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
    // Note: days parameter was unused in original implementation as well, seemingly intending to filter by date range but only filtering by start date

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
