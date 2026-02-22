
import { analyzeIpo } from "./ai-analysis";
import type { Ipo } from "@shared/schema";

// Mock Ipo object
const dummyIpo = {
  id: 1,
  companyName: "Test Company",
  symbol: "TEST",
  sector: "Technology",
  priceRange: "100-200",
  issueSize: "1000 Cr",
  status: "upcoming",
  fundamentalsScore: 8.5,
  valuationScore: 7.0,
  governanceScore: 9.0,
  overallScore: 8.2,
  riskLevel: "moderate",
  peRatio: 20,
  sectorPeMedian: 25,
  roe: 15,
  roce: 18,
  revenueGrowth: 10,
  debtToEquity: 0.5,
  ofsRatio: 0.2,
  promoterHolding: 60,
  gmp: 50,
  redFlags: ["High competition"],
  pros: ["Strong brand"],
} as unknown as Ipo;

// Mock Fetch
let lastRequest: { url: string; options: RequestInit } | null = null;

global.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  lastRequest = {
    url: input.toString(),
    options: init || {},
  };

  // Return dummy response
  const dummyResponse = {
    candidates: [{ content: { parts: [{ text: "Analysis: This is a test analysis." }] } }], // Gemini structure
    choices: [{ message: { content: "Analysis: This is a test analysis." } }], // OpenAI/Mistral structure
  };

  return {
    ok: true,
    json: async () => dummyResponse,
    text: async () => JSON.stringify(dummyResponse),
  } as Response;
};

// Test Runner
async function runTests() {
  console.log("Running Verification Tests...\n");

  const originalEnv = { ...process.env };

  try {
    // Test Gemini
    console.log("--- Testing Gemini ---");
    process.env.GEMINI_API_KEY = "test-gemini-key";
    delete process.env.MISTRAL_API_KEY;
    delete process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

    lastRequest = null;
    const resultGemini = await analyzeIpo(dummyIpo);
    if (!resultGemini.summary) throw new Error("Result summary is missing");

    if (!lastRequest) throw new Error("Fetch was not called");
    if (!lastRequest.url.includes("generativelanguage.googleapis.com")) throw new Error(`Incorrect URL for Gemini: ${lastRequest.url}`);
    if (!lastRequest.url.includes("key=test-gemini-key")) throw new Error("API Key missing in URL for Gemini");

    const geminiBody = JSON.parse(lastRequest.options.body as string);
    if (!geminiBody.contents?.[0]?.parts?.[0]?.text) throw new Error("Incorrect Body structure for Gemini");
    console.log("✅ Gemini Test Passed");


    // Test Mistral
    console.log("\n--- Testing Mistral ---");
    delete process.env.GEMINI_API_KEY;
    process.env.MISTRAL_API_KEY = "test-mistral-key";
    delete process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

    lastRequest = null;
    const resultMistral = await analyzeIpo(dummyIpo);
    if (!resultMistral.summary) throw new Error("Result summary is missing");

    if (!lastRequest) throw new Error("Fetch was not called");
    if (!lastRequest.url.includes("api.mistral.ai")) throw new Error(`Incorrect URL for Mistral: ${lastRequest.url}`);
    if (lastRequest.options.headers?.["Authorization"] !== "Bearer test-mistral-key") throw new Error("Incorrect Authorization header for Mistral");

    const mistralBody = JSON.parse(lastRequest.options.body as string);
    if (mistralBody.model !== "mistral-small-latest") throw new Error("Incorrect Model for Mistral");
    console.log("✅ Mistral Test Passed");


    // Test OpenAI
    console.log("\n--- Testing OpenAI ---");
    delete process.env.GEMINI_API_KEY;
    delete process.env.MISTRAL_API_KEY;
    process.env.AI_INTEGRATIONS_OPENAI_API_KEY = "test-openai-key";

    lastRequest = null;
    const resultOpenAI = await analyzeIpo(dummyIpo);
    if (!resultOpenAI.summary) throw new Error("Result summary is missing");

    if (!lastRequest) throw new Error("Fetch was not called");
    if (!lastRequest.url.includes("api.openai.com")) throw new Error(`Incorrect URL for OpenAI: ${lastRequest.url}`);
    if (lastRequest.options.headers?.["Authorization"] !== "Bearer test-openai-key") throw new Error("Incorrect Authorization header for OpenAI");

    const openaiBody = JSON.parse(lastRequest.options.body as string);
    if (openaiBody.model !== "gpt-4o-mini") throw new Error("Incorrect Model for OpenAI");
    console.log("✅ OpenAI Test Passed");

  } catch (error) {
    console.error("❌ Test Failed:", error);
    process.exit(1);
  } finally {
    process.env = originalEnv;
  }
}

runTests();
