import { db } from "../db";
import {
  watchlist,
  ipos,
  type WatchlistItem,
  type WatchlistResponse,
} from "@shared/schema";
import { eq, and } from "drizzle-orm";

export interface IWatchlistRepository {
  getWatchlist(userId: string): Promise<WatchlistResponse[]>;
  getWatchlistItem(userId: string, ipoId: number): Promise<WatchlistItem | undefined>;
  addToWatchlist(userId: string, ipoId: number): Promise<WatchlistItem>;
  removeFromWatchlist(userId: string, watchlistId: number): Promise<void>;
}

export class WatchlistRepository implements IWatchlistRepository {
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
}
