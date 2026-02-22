import { Router } from "express";
import { storage } from "../storage";
import { api } from "@shared/routes";
import { investorGainScraper } from "../services/scrapers/investorgain";

const router = Router();

router.get(api.ipos.list.path, async (req, res) => {
  const status = req.query.status as string | undefined;
  const sector = req.query.sector as string | undefined;
  const ipos = await storage.getIpos(status, sector);
  res.json(ipos);
});

router.get(api.ipos.get.path, async (req, res) => {
  const ipo = await storage.getIpo(Number(req.params.id));
  if (!ipo) {
    return res.status(404).json({ message: "IPO not found" });
  }
  res.json(ipo);
});

router.get("/api/ipos/:id/gmp-history", async (req, res) => {
  const ipoId = Number(req.params.id);
  const days = Number(req.query.days) || 7;
  const history = await storage.getGmpHistory(ipoId, days);
  res.json(history);
});

router.get("/api/ipos/:id/gmp-history/live", async (req, res) => {
  try {
    const ipoId = Number(req.params.id);
    const ipo = await storage.getIpo(ipoId);

    if (!ipo || !ipo.investorGainId) {
      return res.json([]);
    }

    const history = await investorGainScraper.getGmpHistory(ipo.investorGainId);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch GMP history" });
  }
});

router.get("/api/ipos/:id/subscription/live", async (req, res) => {
  try {
    const ipoId = Number(req.params.id);
    const ipo = await storage.getIpo(ipoId);

    if (!ipo || !ipo.investorGainId) {
      return res.json(null);
    }

    const subscription = await investorGainScraper.getSubscriptionDetails(ipo.investorGainId);
    res.json(subscription);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch subscription data" });
  }
});

router.get("/api/ipos/:id/activity-dates", async (req, res) => {
  try {
    const ipoId = Number(req.params.id);
    const ipo = await storage.getIpo(ipoId);

    if (!ipo) {
      return res.status(404).json({ error: "IPO not found" });
    }

    res.json({
      biddingStartDate: ipo.expectedDate,
      biddingEndDate: null,
      basisOfAllotmentDate: ipo.basisOfAllotmentDate,
      refundsInitiationDate: ipo.refundsInitiationDate,
      creditToDematDate: ipo.creditToDematDate,
      listingDate: null,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch activity dates" });
  }
});

router.get("/api/ipos/:id/peers", async (req, res) => {
  const ipoId = Number(req.params.id);
  const peers = await storage.getPeerCompanies(ipoId);
  res.json(peers);
});

router.get("/api/ipos/:id/subscriptions", async (req, res) => {
  const ipoId = Number(req.params.id);
  const updates = await storage.getSubscriptionUpdates(ipoId);
  res.json(updates);
});

router.get("/api/ipos/:id/subscription/latest", async (req, res) => {
  const ipoId = Number(req.params.id);
  const latest = await storage.getLatestSubscription(ipoId);
  res.json(latest || null);
});

router.get("/api/ipos/:id/fund-utilization", async (req, res) => {
  const ipoId = Number(req.params.id);
  const utilization = await storage.getFundUtilization(ipoId);
  res.json(utilization);
});

router.get("/api/ipos/:id/timeline", async (req, res) => {
  const ipoId = Number(req.params.id);
  const timeline = await storage.getIpoTimeline(ipoId);
  res.json(timeline);
});

export default router;
