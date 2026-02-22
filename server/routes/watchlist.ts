import { Router } from "express";
import { storage } from "../storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { generateTimelineEvents } from "../services/scraper";

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
      const events = generateTimelineEvents(ipoId, ipo.expectedDate);
      for (const event of events) {
        await storage.addTimelineEvent(event);
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
