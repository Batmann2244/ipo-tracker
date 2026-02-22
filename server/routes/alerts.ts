import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { storage } from "../storage";
import { insertAlertPreferencesSchema } from "@shared/schema";
import { sendIpoEmailAlert } from "../services/email";

const router = Router();

// Alert Preferences Routes
router.get("/api/alerts/preferences", requireAuth, async (req: any, res) => {
  const userId = (req.user as any).claims.sub;
  const prefs = await storage.getAlertPreferences(userId);
  res.json(prefs || {
    emailEnabled: false,
    alertOnNewIpo: true,
    alertOnGmpChange: true,
    alertOnOpenDate: true,
    alertOnWatchlistOnly: false,
  });
});

router.post("/api/alerts/preferences", requireAuth, async (req: any, res) => {
  try {
    const userId = (req.user as any).claims.sub;
    const validatedData = insertAlertPreferencesSchema.partial().parse(req.body);
    const prefs = await storage.upsertAlertPreferences(userId, validatedData);
    res.json(prefs);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors[0].message });
    }
    throw err;
  }
});

router.get("/api/alerts/logs", requireAuth, async (req: any, res) => {
  const userId = (req.user as any).claims.sub;
  const logs = await storage.getAlertLogs(userId, 50);
  res.json(logs);
});

// Test alert sending (admin only)
router.post("/api/admin/test-alert/:id", requireAuth, async (req: any, res) => {
  try {
    const userId = (req.user as any).claims.sub;
    const ipo = await storage.getIpo(Number(req.params.id));
    if (!ipo) {
      return res.status(404).json({ message: "IPO not found" });
    }

    const prefs = await storage.getAlertPreferences(userId);
    const results = { email: false };

    if (prefs?.emailEnabled && prefs.email) {
      results.email = await sendIpoEmailAlert(prefs.email, ipo, "new_ipo");
      await storage.createAlertLog({
        userId,
        ipoId: ipo.id,
        alertType: "new_ipo",
        channel: "email",
        status: results.email ? "sent" : "failed",
        message: `Test alert for ${ipo.companyName}`,
      });
    }

    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Alert failed"
    });
  }
});

export const alertsRouter = router;
