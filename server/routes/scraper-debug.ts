/**
 * Scraper Testing Routes
 * 
 * These routes allow you to test all scrapers individually and aggregated
 * 
 * Usage:
 * GET /api/debug/scrapers/test-all           - Test all scrapers
 * GET /api/debug/scrapers/test/:source       - Test single source (nsetools, groww, chittorgarh, investorgain, nse)
 * GET /api/debug/scrapers/ipos               - Fetch aggregated IPOs
 * GET /api/debug/scrapers/subscriptions      - Fetch aggregated subscriptions
 * GET /api/debug/scrapers/gmp                - Fetch aggregated GMP data
 * GET /api/debug/scrapers/stats              - Scraper statistics
 */

import type { Express } from "express";
import {
  fetchAllIpos,
  fetchAllSubscriptions,
  fetchAllGmp,
  testScraperConnection,
  testAllScrapers,
  nseToolsScraper,
  chittorgarhScraper,
  growwScraper,
  investorGainScraper,
  nseScraper,
  scraperAggregator,
} from "../services/scrapers";
import { ipoAlertsScraper } from "../services/scrapers/ipoalerts";

export function registerScraperDebugRoutes(app: Express) {
  /**
   * Test all scrapers simultaneously
   * Returns connection status for each source
   */
  app.get("/api/debug/scrapers/test-all", async (req, res) => {
    try {
      console.log("🧪 Testing all scrapers...");
      const startTime = Date.now();

      const results = await testAllScrapers();

      const summary = {
        timestamp: new Date(),
        totalTime: Date.now() - startTime,
        sources: results,
        summary: {
          total: results.length,
          success: results.filter((r) => r.success).length,
          failed: results.filter((r) => !r.success).length,
          successRate: `${(
            (results.filter((r) => r.success).length / results.length) *
            100
          ).toFixed(1)}%`,
        },
      };

      console.log("✅ Scraper test results:", summary.summary);
      res.json(summary);
    } catch (error) {
      console.error("❌ Scraper test failed:", error);
      res.status(500).json({
        error: "Failed to test scrapers",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * Test individual scraper
   * GET /api/debug/scrapers/test/:source
   */
  app.get("/api/debug/scrapers/test/:source", async (req, res) => {
    try {
      const { source } = req.params;
      console.log(`🧪 Testing scraper: ${source}`);
      const startTime = Date.now();

      const result = await testScraperConnection(source);

      const response = {
        timestamp: new Date(),
        source: result.source,
        success: result.success,
        responseTimeMs: result.responseTimeMs,
        totalTime: Date.now() - startTime,
        error: result.error || null,
      };

      if (result.success) {
        console.log(`✅ ${source} scraper OK (${result.responseTimeMs}ms)`);
      } else {
        console.log(`❌ ${source} scraper FAILED: ${result.error}`);
      }

      res.json(response);
    } catch (error) {
      console.error("❌ Test failed:", error);
      res.status(500).json({
        error: "Failed to test scraper",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * Fetch aggregated IPOs from all sources
   */
  app.get("/api/debug/scrapers/ipos", async (req, res) => {
    try {
      const sources = (req.query.sources as string)
        ?.split(",")
        .map((s) => s.trim()) || ["nsetools", "groww", "chittorgarh"];

      console.log(`📊 Fetching IPOs from sources:`, sources);
      const startTime = Date.now();

      const result = await scraperAggregator.getIpos(sources);

      const response = {
        ...result,
        totalTime: Date.now() - startTime,
        dataPoints: {
          totalIpos: result.data.length,
          byStatus: {
            upcoming: result.data.filter((i) => i.status === "upcoming").length,
            open: result.data.filter((i) => i.status === "open").length,
            closed: result.data.filter((i) => i.status === "closed").length,
            listed: result.data.filter((i) => i.status === "listed").length,
          },
          byConfidence: {
            high: result.data.filter((i) => i.confidence === "high").length,
            medium: result.data.filter((i) => i.confidence === "medium").length,
            low: result.data.filter((i) => i.confidence === "low").length,
          },
          avgSourcesPerIpo:
            result.data.length > 0
              ? (
                result.data.reduce((sum, i) => sum + i.sources.length, 0) /
                result.data.length
              ).toFixed(2)
              : 0,
        },
      };

      console.log(`✅ Fetched ${result.data.length} IPOs in ${Date.now() - startTime}ms`);
      res.json(response);
    } catch (error) {
      console.error("❌ Failed to fetch IPOs:", error);
      res.status(500).json({
        error: "Failed to fetch IPOs",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * Fetch aggregated subscriptions from all sources
   */
  app.get("/api/debug/scrapers/subscriptions", async (req, res) => {
    try {
      const sources = (req.query.sources as string)
        ?.split(",")
        .map((s) => s.trim()) || [
          "nsetools",
          "chittorgarh",
          "groww",
          "investorgain",
        ];

      console.log(`📊 Fetching subscriptions from sources:`, sources);
      const startTime = Date.now();

      const result = await scraperAggregator.getSubscriptions(sources);

      const response = {
        ...result,
        totalTime: Date.now() - startTime,
        dataPoints: {
          totalRecords: result.data.length,
          byConfidence: {
            high: result.data.filter((s) => s.confidence === "high").length,
            medium: result.data.filter((s) => s.confidence === "medium").length,
            low: result.data.filter((s) => s.confidence === "low").length,
          },
          avgSourcesPerRecord:
            result.data.length > 0
              ? (
                result.data.reduce((sum, s) => sum + s.sources.length, 0) /
                result.data.length
              ).toFixed(2)
              : 0,
        },
      };

      console.log(
        `✅ Fetched ${result.data.length} subscription records in ${Date.now() - startTime}ms`
      );
      res.json(response);
    } catch (error) {
      console.error("❌ Failed to fetch subscriptions:", error);
      res.status(500).json({
        error: "Failed to fetch subscriptions",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * Fetch aggregated GMP data from all sources
   */
  app.get("/api/debug/scrapers/gmp", async (req, res) => {
    try {
      const sources = (req.query.sources as string)
        ?.split(",")
        .map((s) => s.trim()) || ["groww", "chittorgarh"];

      console.log(`📊 Fetching GMP data from sources:`, sources);
      const startTime = Date.now();

      const result = await scraperAggregator.getGmp(sources);

      const response = {
        ...result,
        totalTime: Date.now() - startTime,
        dataPoints: {
          totalRecords: result.data.length,
          byTrend: {
            rising: result.data.filter((g) => g.trend === "rising").length,
            falling: result.data.filter((g) => g.trend === "falling").length,
            stable: result.data.filter((g) => g.trend === "stable").length,
          },
          byConfidence: {
            high: result.data.filter((g) => g.sources.length >= 2).length,
            medium: result.data.filter((g) => g.sources.length === 1).length,
          },
        },
      };

      console.log(`✅ Fetched ${result.data.length} GMP records in ${Date.now() - startTime}ms`);
      res.json(response);
    } catch (error) {
      console.error("❌ Failed to fetch GMP data:", error);
      res.status(500).json({
        error: "Failed to fetch GMP data",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * Get detailed stats on all scrapers
   */
  app.get("/api/debug/scrapers/stats", async (req, res) => {
    try {
      console.log("📈 Generating scraper statistics...");

      const testResults = await testAllScrapers();

      const stats = {
        timestamp: new Date(),
        scrapers: testResults.map((t) => ({
          name: t.source,
          online: t.success,
          responseTime: t.responseTimeMs,
          error: t.error || null,
        })),
        summary: {
          totalScrapers: testResults.length,
          onlineScrapers: testResults.filter((t) => t.success).length,
          avgResponseTime: (
            testResults.reduce((sum, t) => sum + t.responseTimeMs, 0) /
            testResults.length
          ).toFixed(0),
          allOnline: testResults.every((t) => t.success),
        },
      };

      console.log("✅ Scraper statistics generated");
      res.json(stats);
    } catch (error) {
      console.error("❌ Failed to generate statistics:", error);
      res.status(500).json({
        error: "Failed to generate statistics",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * Detailed debugging - fetch from single source
   * GET /api/debug/scrapers/source/:name/ipos
   * GET /api/debug/scrapers/source/:name/subscriptions
   */
  app.get("/api/debug/scrapers/source/:name/ipos", async (req, res) => {
    try {
      const { name } = req.params;
      console.log(`📊 Fetching IPOs from source: ${name}`);
      const startTime = Date.now();

      let result: any;

      switch (name.toLowerCase()) {
        case "nsetools":
          result = await nseToolsScraper.fetchIpos();
          break;
        case "groww":
          result = await growwScraper.getIpos();
          break;
        case "chittorgarh":
          result = await chittorgarhScraper.getIpos();
          break;
        case "investorgain":
          result = await investorGainScraper.getIpos?.() || {
            success: false,
            data: [],
            error: "No getIpos method",
          };
          break;
        case "nse":
          result = await nseScraper.getIpos();
          break;
        default:
          return res.status(400).json({
            error: "Invalid source",
            validSources: [
              "nsetools",
              "groww",
              "chittorgarh",
              "investorgain",
              "nse",
            ],
          });
      }

      const response = {
        ...result,
        totalTime: Date.now() - startTime,
      };

      console.log(
        `✅ ${name}: ${result.data?.length || 0} IPOs (${Date.now() - startTime}ms)`
      );
      res.json(response);
    } catch (error) {
      console.error("❌ Failed to fetch from source:", error);
      res.status(500).json({
        error: "Failed to fetch from source",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.get("/api/debug/scrapers/source/:name/subscriptions", async (req, res) => {
    try {
      const { name } = req.params;
      console.log(`📊 Fetching subscriptions from source: ${name}`);
      const startTime = Date.now();

      let result: any;

      switch (name.toLowerCase()) {
        case "nsetools":
          result = await nseToolsScraper.fetchSubscriptions();
          break;
        case "groww":
          result = await growwScraper.getSubscriptions();
          break;
        case "chittorgarh":
          result = await chittorgarhScraper.getSubscriptions();
          break;
        case "investorgain":
          result = await investorGainScraper.getSubscriptions();
          break;
        case "nse":
          result = await nseScraper.getSubscriptions();
          break;
        default:
          return res.status(400).json({
            error: "Invalid source",
            validSources: [
              "nsetools",
              "groww",
              "chittorgarh",
              "investorgain",
              "nse",
            ],
          });
      }

      const response = {
        ...result,
        totalTime: Date.now() - startTime,
      };

      console.log(
        `✅ ${name}: ${result.data?.length || 0} subscription records (${Date.now() - startTime}ms)`
      );
      res.json(response);
    } catch (error) {
      console.error("❌ Failed to fetch from source:", error);
      res.status(500).json({
        error: "Failed to fetch from source",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * Test IPO Alerts API
   * GET /api/debug/scrapers/ipoalerts/test
   */
  app.get("/api/debug/scrapers/ipoalerts/test", async (req, res) => {
    try {
      console.log("🧪 Testing IPO Alerts API...");
      const startTime = Date.now();

      // Check if API key is configured
      if (!process.env.IPOALERTS_API_KEY) {
        return res.status(400).json({
          success: false,
          error: "IPOALERTS_API_KEY not configured in .env file"
        });
      }

      // Get usage stats
      const usage = ipoAlertsScraper.getUsageStats();
      console.log(`📊 IPO Alerts Usage: ${usage.used}/${usage.limit} (${usage.remaining} remaining)`);

      // Test fetching open IPOs
      const result = await ipoAlertsScraper.getOpenIpos();

      const response = {
        timestamp: new Date(),
        success: result.success,
        apiKey: "Configured ✅",
        usage: {
          used: usage.used,
          remaining: usage.remaining,
          limit: usage.limit,
          date: usage.date
        },
        data: {
          count: result.data?.length || 0,
          sampleIPO: result.data?.[0]?.companyName || null
        },
        responseTimeMs: result.responseTimeMs,
        totalTime: Date.now() - startTime,
        error: result.error || null
      };

      if (result.success) {
        console.log(`✅ IPO Alerts API working! Found ${result.data.length} open IPOs`);
      } else {
        console.log(`❌ IPO Alerts API failed: ${result.error}`);
      }

      res.json(response);
    } catch (error) {
      console.error("❌ IPO Alerts test failed:", error);
      res.status(500).json({
        error: "Failed to test IPO Alerts API",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  console.log("✅ Scraper debug routes registered");
}
