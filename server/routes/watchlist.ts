import { Router } from "express";
import { storage } from "../storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get(api.watchlist.list.path, requireAuth, async (req: any, res) => {
  const userId = req.user.claims.sub;
  const watchlist = await storage.getWatchlist(userId);
  res.json(watchlist);
});

router.post(api.watchlist.add.path, requireAuth, async (req: any, res) => {
  try {
    const { ipoId } = api.watchlist.add.input.parse(req.body);
    const userId = req.user.claims.sub;

    const ipo = await storage.getIpo(ipoId);
    if (!ipo) {
      return res.status(404).json({ message: "IPO not found" });
    }

    const item = await storage.addToWatchlist(userId, ipoId);

    // Generate timeline events for the watchlisted IPO
    const existingTimeline = await storage.getIpoTimeline(ipoId);
    if (existingTimeline.length === 0 && ipo.expectedDate) {
      const baseDate = new Date(ipo.expectedDate);
      const events = [
        { type: "drhp_filing", offsetDays: -30, description: "DRHP filed with SEBI" },
        { type: "price_band", offsetDays: -2, description: "Price band announced" },
        { type: "open_date", offsetDays: 0, description: "IPO opens for subscription" },
        { type: "close_date", offsetDays: 3, description: "IPO closes for subscription" },
        { type: "allotment", offsetDays: 7, description: "Share allotment finalized" },
        { type: "refund", offsetDays: 9, description: "Refund initiated for unallotted" },
        { type: "listing", offsetDays: 10, description: "Shares listed on exchange" },
      ];

      for (const event of events) {
        const eventDate = new Date(baseDate);
        eventDate.setDate(eventDate.getDate() + event.offsetDays);
        await storage.addTimelineEvent({
          ipoId,
          eventType: event.type,
          eventDate: eventDate.toISOString().split('T')[0],
          description: event.description,
          isConfirmed: event.offsetDays <= 0,
        });
      }
    }

    res.status(201).json(item);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        message: err.errors[0].message,
        field: err.errors[0].path.join('.')
      });
    }
    throw err;
  }
});

router.delete(api.watchlist.remove.path, requireAuth, async (req: any, res) => {
  const userId = req.user.claims.sub;
  await storage.removeFromWatchlist(userId, Number(req.params.id));
  res.status(204).send();
});

export default router;
