import { Router } from "express";
import {
  fetchAggregatedSubscription,
  scrapeGmpFromMultipleSources,
  scrapeGrowwCalendar,
  isBiddingHours
} from "../services/multi-source-scraper";
import { storage } from "../storage";

const router = Router();

router.get("/api/data/subscription/live", async (req, res) => {
  try {
    const data = await fetchAggregatedSubscription();
    res.json({
      success: true,
      isBiddingHours: isBiddingHours(),
      timestamp: new Date(),
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch subscription data"
    });
  }
});

router.get("/api/data/gmp/live", async (req, res) => {
  try {
    const data = await scrapeGmpFromMultipleSources();
    res.json({
      success: true,
      timestamp: new Date(),
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch GMP data"
    });
  }
});

router.get("/api/data/calendar", async (req, res) => {
  try {
    const data = await scrapeGrowwCalendar();
    res.json({
      success: true,
      timestamp: new Date(),
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch calendar data"
    });
  }
});

router.get("/api/calendar/events", async (req, res) => {
  const days = Number(req.query.days) || 30;
  const events = await storage.getAllUpcomingEvents(days);
  res.json(events);
});

export default router;
