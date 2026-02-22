import type { Ipo } from "@shared/schema";

interface AIAnalysisResult {
  summary: string;
  recommendation: string;
  riskAssessment: string;
  keyInsights: string[];
}

type AIProvider = "gemini" | "mistral" | "openai";

interface LLMRequestConfig {
  url: string;
  headers: Record<string, string>;
  body: any;
  extractContent: (data: any) => string;
  errorMessagePrefix: string;
}

function getAIProvider(): { provider: AIProvider; apiKey: string; baseUrl?: string } | null {
  if (process.env.GEMINI_API_KEY) {
    return { provider: "gemini", apiKey: process.env.GEMINI_API_KEY };
  }
  if (process.env.MISTRAL_API_KEY) {
    return { provider: "mistral", apiKey: process.env.MISTRAL_API_KEY };
  }
  if (process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    return { 
      provider: "openai", 
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseUrl: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL
    };
  }
  return null;
}

function getGeminiConfig(apiKey: string, prompt: string, systemPrompt: string): LLMRequestConfig {
  return {
    url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    headers: { "Content-Type": "application/json" },
    body: {
      contents: [{
        parts: [{ text: `${systemPrompt}\n\n${prompt}` }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 800,
      }
    },
    extractContent: (data: any) => data.candidates?.[0]?.content?.parts?.[0]?.text || "",
    errorMessagePrefix: "Gemini API error"
  };
}

function getMistralConfig(apiKey: string, prompt: string, systemPrompt: string): LLMRequestConfig {
  return {
    url: "https://api.mistral.ai/v1/chat/completions",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: {
      model: "mistral-small-latest",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 800,
    },
    extractContent: (data: any) => data.choices?.[0]?.message?.content || "",
    errorMessagePrefix: "Mistral API error"
  };
}

function getOpenAIConfig(apiKey: string, prompt: string, systemPrompt: string, baseUrl?: string): LLMRequestConfig {
  const url = baseUrl ? `${baseUrl}/chat/completions` : "https://api.openai.com/v1/chat/completions";
  
  return {
    url,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 800,
    },
    extractContent: (data: any) => data.choices?.[0]?.message?.content || "",
    errorMessagePrefix: "OpenAI API error"
  };
}

async function callLLM(config: LLMRequestConfig): Promise<string> {
  const response = await fetch(config.url, {
    method: "POST",
    headers: config.headers,
    body: JSON.stringify(config.body)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`${config.errorMessagePrefix}: ${error}`);
  }

  const data = await response.json();
  return config.extractContent(data);
}

export async function analyzeIpo(ipo: Ipo): Promise<AIAnalysisResult> {
  const providerConfig = getAIProvider();
  
  if (!providerConfig) {
    return {
      summary: "AI analysis requires an API key. Add GEMINI_API_KEY, MISTRAL_API_KEY, or configure OpenAI to enable this feature.",
      recommendation: "Unable to generate recommendation without API key.",
      riskAssessment: ipo.riskLevel || "unknown",
      keyInsights: [],
    };
  }

  const systemPrompt = `You are an expert IPO analyst for the Indian stock market (NSE/BSE). 
Analyze IPOs objectively based on fundamentals, valuation, and governance metrics.
Provide balanced, factual analysis. This is for screening purposes only, not investment advice.
Always include a disclaimer that users should consult SEBI-registered advisors.
Keep responses concise but informative.`;

  const prompt = buildAnalysisPrompt(ipo);
  
  try {
    let content: string;
    let config: LLMRequestConfig;
    
    switch (providerConfig.provider) {
      case "gemini":
        console.log("Using Gemini for AI analysis");
        config = getGeminiConfig(providerConfig.apiKey, prompt, systemPrompt);
        break;
      case "mistral":
        console.log("Using Mistral for AI analysis");
        config = getMistralConfig(providerConfig.apiKey, prompt, systemPrompt);
        break;
      case "openai":
        console.log("Using OpenAI for AI analysis");
        config = getOpenAIConfig(providerConfig.apiKey, prompt, systemPrompt, providerConfig.baseUrl);
        break;
    }

    content = await callLLM(config);

    return parseAnalysisResponse(content, ipo);
  } catch (error) {
    console.error("AI Analysis error:", error);
    return {
      summary: "AI analysis currently unavailable. Please check your API key configuration.",
      recommendation: "Unable to generate recommendation.",
      riskAssessment: ipo.riskLevel || "unknown",
      keyInsights: [],
    };
  }
}

function parseJsonArray(value: string | null | undefined | unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return [];
    }
  }
  return [];
}

function buildAnalysisPrompt(ipo: Ipo): string {
  const metrics = [];
  
  if (ipo.fundamentalsScore) metrics.push(`Fundamentals Score: ${ipo.fundamentalsScore.toFixed(1)}/10`);
  if (ipo.valuationScore) metrics.push(`Valuation Score: ${ipo.valuationScore.toFixed(1)}/10`);
  if (ipo.governanceScore) metrics.push(`Governance Score: ${ipo.governanceScore.toFixed(1)}/10`);
  if (ipo.overallScore) metrics.push(`Overall Score: ${ipo.overallScore.toFixed(1)}/10`);
  if (ipo.riskLevel) metrics.push(`Risk Level: ${ipo.riskLevel}`);
  
  if (ipo.peRatio) metrics.push(`P/E Ratio: ${ipo.peRatio}`);
  if (ipo.sectorPeMedian) metrics.push(`Sector P/E Median: ${ipo.sectorPeMedian}`);
  if (ipo.roe) metrics.push(`ROE: ${ipo.roe}%`);
  if (ipo.roce) metrics.push(`ROCE: ${ipo.roce}%`);
  if (ipo.revenueGrowth) metrics.push(`Revenue Growth: ${ipo.revenueGrowth}%`);
  if (ipo.debtToEquity) metrics.push(`D/E Ratio: ${ipo.debtToEquity}`);
  if (ipo.ofsRatio) metrics.push(`OFS Ratio: ${(ipo.ofsRatio * 100).toFixed(1)}%`);
  if (ipo.promoterHolding) metrics.push(`Promoter Holding: ${ipo.promoterHolding}%`);
  if (ipo.gmp) metrics.push(`Grey Market Premium: ₹${ipo.gmp}`);
  
  const redFlagsList = parseJsonArray(ipo.redFlags);
  const prosList = parseJsonArray(ipo.pros);

  const redFlags = redFlagsList.length ? `\nRed Flags: ${redFlagsList.join(", ")}` : "";
  const pros = prosList.length ? `\nPositives: ${prosList.join(", ")}` : "";
  
  return `Analyze this IPO for Indian market investors:

Company: ${ipo.companyName}
Symbol: ${ipo.symbol}
Sector: ${ipo.sector || "Unknown"}
Price Range: ${ipo.priceRange}
Issue Size: ${ipo.issueSize || "N/A"}
Status: ${ipo.status}

Metrics:
${metrics.join("\n")}
${redFlags}
${pros}

Provide:
1. A brief 2-3 sentence summary of the IPO
2. Key risk factors and concerns
3. Potential opportunities
4. Overall assessment for different investor profiles (conservative/moderate/aggressive)

Remember: This is for screening purposes only, not investment advice.`;
}

function parseAnalysisResponse(content: string, ipo: Ipo): AIAnalysisResult {
  const lines = content.split("\n").filter(line => line.trim());
  
  let summary = "";
  let recommendation = "";
  const keyInsights: string[] = [];
  
  let currentSection = "";
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    if (lowerLine.includes("summary") || lowerLine.includes("overview")) {
      currentSection = "summary";
      continue;
    } else if (lowerLine.includes("risk") || lowerLine.includes("concern")) {
      currentSection = "risk";
      continue;
    } else if (lowerLine.includes("opportunit") || lowerLine.includes("positive")) {
      currentSection = "opportunity";
      continue;
    } else if (lowerLine.includes("assessment") || lowerLine.includes("recommendation")) {
      currentSection = "recommendation";
      continue;
    }
    
    const cleanLine = line.replace(/^[\d\.\-\*]+\s*/, "").trim();
    if (!cleanLine) continue;
    
    switch (currentSection) {
      case "summary":
        summary += (summary ? " " : "") + cleanLine;
        break;
      case "risk":
      case "opportunity":
        if (cleanLine.length > 10) keyInsights.push(cleanLine);
        break;
      case "recommendation":
        recommendation += (recommendation ? " " : "") + cleanLine;
        break;
      default:
        if (!summary && cleanLine.length > 20) {
          summary = cleanLine;
        }
    }
  }
  
  if (!summary) {
    summary = `${ipo.companyName} is a ${ipo.sector || "company"} IPO with ${ipo.riskLevel || "moderate"} risk profile.`;
  }
  
  if (!recommendation) {
    recommendation = `Based on the computed scores, this IPO appears suitable for ${ipo.riskLevel || "moderate"} risk investors. Always conduct your own research.`;
  }
  
  return {
    summary: summary.slice(0, 500),
    recommendation: recommendation.slice(0, 500),
    riskAssessment: ipo.riskLevel || "moderate",
    keyInsights: keyInsights.slice(0, 5),
  };
}

export async function generateBatchAnalysis(ipos: Ipo[]): Promise<Map<number, AIAnalysisResult>> {
  const results = new Map<number, AIAnalysisResult>();
  
  for (const ipo of ipos) {
    try {
      const analysis = await analyzeIpo(ipo);
      results.set(ipo.id, analysis);
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Failed to analyze IPO ${ipo.symbol}:`, error);
    }
  }
  
  return results;
}
