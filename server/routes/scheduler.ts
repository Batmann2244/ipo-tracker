import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  startScheduler,
  stopScheduler,
  getSchedulerStatus,
  triggerManualPoll,
  getRecentAlerts,
  clearAlerts
} from "../services/data-scheduler";

const router = Router();

router.get("/status", async (req, res) => {
  const status = getSchedulerStatus();
  res.json(status);
});

router.post("/start", requireAuth, async (req, res) => {
  startScheduler();
  res.json({ success: true, message: "Scheduler started" });
});

router.post("/stop", requireAuth, async (req, res) => {
  stopScheduler();
  res.json({ success: true, message: "Scheduler stopped" });
});

router.post("/poll", requireAuth, async (req, res) => {
  try {
    const result = await triggerManualPoll();
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Poll failed"
    });
  }
});

router.get("/alerts", async (req, res) => {
  const limit = Number(req.query.limit) || 20;
  const alerts = getRecentAlerts(limit);
  res.json(alerts);
});

router.delete("/alerts", requireAuth, async (req, res) => {
  clearAlerts();
  res.json({ success: true, message: "Alerts cleared" });
});

export default router;
