import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { storage } from "../storage";
import { insertAlertPreferencesSchema } from "@shared/schema";
import { z } from "zod";

const router = Router();

router.get("/preferences", requireAuth, async (req: any, res) => {
  const userId = req.user.claims.sub;
  const prefs = await storage.getAlertPreferences(userId);
  res.json(prefs || {
    emailEnabled: false,
    alertOnNewIpo: true,
    alertOnGmpChange: true,
    alertOnOpenDate: true,
    alertOnWatchlistOnly: false,
  });
});

router.post("/preferences", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
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

router.get("/logs", requireAuth, async (req: any, res) => {
  const userId = req.user.claims.sub;
  const logs = await storage.getAlertLogs(userId, 50);
  res.json(logs);
});

export default router;
