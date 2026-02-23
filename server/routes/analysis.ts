import { Router } from "express";
import { analyzeIpo } from "../services/ai-analysis";
import { storage } from "../storage";
import { requireAdmin } from "../middleware/auth";
import { adminRateLimiter } from "../middleware/login-rate-limiter";

const router = Router();

router.post("/api/ipos/:id/analyze", adminRateLimiter, requireAdmin, async (req, res) => {
  try {
    const ipo = await storage.getIpo(Number(req.params.id));
    if (!ipo) {
      return res.status(404).json({ message: "IPO not found" });
    }

    const analysis = await analyzeIpo(ipo);

    // Update IPO with AI analysis
    const updated = await storage.updateIpo(ipo.id, {
      aiSummary: analysis.summary,
      aiRecommendation: analysis.recommendation,
    });

    res.json({
      success: true,
      analysis,
      ipo: updated,
    });
  } catch (error) {
    console.error("AI analysis error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Analysis failed"
    });
  }
});

export default router;
