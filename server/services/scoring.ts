import type { Ipo, InsertIpo } from "@shared/schema";

export interface ScoreResult {
  fundamentalsScore: number;
  valuationScore: number;
  governanceScore: number;
  overallScore: number;
  riskLevel: 'conservative' | 'moderate' | 'aggressive';
  redFlags: string[];
  pros: string[];
}

export function calculateIpoScore(ipo: Partial<InsertIpo>): ScoreResult {
  const redFlags: string[] = [];
  const pros: string[] = [];
  
  // === FUNDAMENTALS SCORE (0-10) ===
  let fundamentalsScore = 5; // Base score
  
  // Revenue Growth (3-year CAGR)
  if (ipo.revenueGrowth !== undefined && ipo.revenueGrowth !== null) {
    if (ipo.revenueGrowth > 30) {
      fundamentalsScore += 2;
      pros.push("Strong revenue growth (>30% CAGR)");
    } else if (ipo.revenueGrowth > 15) {
      fundamentalsScore += 1;
      pros.push("Healthy revenue growth (15-30% CAGR)");
    } else if (ipo.revenueGrowth < 5) {
      fundamentalsScore -= 1;
      redFlags.push("Weak revenue growth (<5% CAGR)");
    }
  }
  
  // ROE (Return on Equity)
  if (ipo.roe !== undefined && ipo.roe !== null) {
    if (ipo.roe > 20) {
      fundamentalsScore += 1.5;
      pros.push("Excellent ROE (>20%)");
    } else if (ipo.roe > 15) {
      fundamentalsScore += 1;
    } else if (ipo.roe < 10) {
      fundamentalsScore -= 0.5;
      redFlags.push("Below-average ROE (<10%)");
    }
  }
  
  // EBITDA Margin
  if (ipo.ebitdaMargin !== undefined && ipo.ebitdaMargin !== null) {
    if (ipo.ebitdaMargin > 25) {
      fundamentalsScore += 1;
      pros.push("Strong operating margins (>25%)");
    } else if (ipo.ebitdaMargin < 10) {
      fundamentalsScore -= 1;
      redFlags.push("Thin operating margins (<10%)");
    }
  }
  
  // Debt to Equity
  if (ipo.debtToEquity !== undefined && ipo.debtToEquity !== null) {
    if (ipo.debtToEquity < 0.3) {
      fundamentalsScore += 1;
      pros.push("Low debt levels (D/E < 0.3)");
    } else if (ipo.debtToEquity > 1.5) {
      fundamentalsScore -= 1.5;
      redFlags.push("High debt burden (D/E > 1.5)");
    } else if (ipo.debtToEquity > 1) {
      fundamentalsScore -= 0.5;
    }
  }
  
  // === VALUATION SCORE (0-10) ===
  let valuationScore = 5; // Base score
  
  if (ipo.peRatio !== undefined && ipo.peRatio !== null && ipo.sectorPeMedian !== undefined && ipo.sectorPeMedian !== null) {
    const peVsSector = ipo.peRatio / ipo.sectorPeMedian;
    
    if (peVsSector < 0.8) {
      valuationScore += 3;
      pros.push("Attractively priced vs peers");
    } else if (peVsSector < 1.0) {
      valuationScore += 1.5;
      pros.push("Fairly valued vs sector");
    } else if (peVsSector > 1.5) {
      valuationScore -= 2.5;
      redFlags.push("Expensive valuation vs listed peers");
    } else if (peVsSector > 1.2) {
      valuationScore -= 1;
      redFlags.push("Premium valuation to sector");
    }
  } else if (ipo.peRatio !== undefined && ipo.peRatio !== null) {
    // Absolute P/E check if no sector median
    if (ipo.peRatio > 50) {
      valuationScore -= 2;
      redFlags.push("Very high P/E ratio (>50x)");
    } else if (ipo.peRatio > 35) {
      valuationScore -= 1;
    } else if (ipo.peRatio < 15 && ipo.peRatio > 0) {
      valuationScore += 2;
      pros.push("Reasonable P/E ratio");
    }
  }
  
  // GMP as sentiment indicator (don't overweight)
  if (ipo.gmp !== undefined && ipo.gmp !== null) {
    if (ipo.gmp > 100) {
      pros.push("Strong grey market sentiment");
    } else if (ipo.gmp < 0) {
      redFlags.push("Negative grey market premium");
      valuationScore -= 1;
    }
  }
  
  // === GOVERNANCE SCORE (0-10) ===
  let governanceScore = 6; // Base score (assume decent governance)
  
  // OFS Ratio (Offer for Sale)
  if (ipo.ofsRatio !== undefined && ipo.ofsRatio !== null) {
    if (ipo.ofsRatio > 0.7) {
      governanceScore -= 2;
      redFlags.push("High OFS ratio - promoters aggressively exiting");
    } else if (ipo.ofsRatio > 0.5) {
      governanceScore -= 1;
      redFlags.push("Significant OFS component (>50%)");
    } else if (ipo.ofsRatio < 0.2 && ipo.freshIssue && ipo.freshIssue > 0.8) {
      governanceScore += 1.5;
      pros.push("Primarily fresh issue - funds for growth");
    }
  }
  
  // Promoter Holding
  if (ipo.promoterHolding !== undefined && ipo.promoterHolding !== null) {
    if (ipo.promoterHolding > 70) {
      governanceScore += 1;
      pros.push("Strong promoter skin in the game");
    } else if (ipo.promoterHolding < 25) {
      governanceScore -= 1;
      redFlags.push("Low promoter holding (<25%)");
    }
  }
  
  // Post-IPO promoter dilution
  if (ipo.promoterHolding !== undefined && ipo.postIpoPromoterHolding !== undefined && 
      ipo.promoterHolding !== null && ipo.postIpoPromoterHolding !== null) {
    const dilution = ipo.promoterHolding - ipo.postIpoPromoterHolding;
    if (dilution > 30) {
      governanceScore -= 1;
      redFlags.push("Large promoter stake dilution (>30%)");
    }
  }
  
  // === CLAMP SCORES ===
  fundamentalsScore = Math.max(0, Math.min(10, fundamentalsScore));
  valuationScore = Math.max(0, Math.min(10, valuationScore));
  governanceScore = Math.max(0, Math.min(10, governanceScore));
  
  // === OVERALL SCORE ===
  // Weighted average: Fundamentals 40%, Valuation 35%, Governance 25%
  const overallScore = Math.round(
    (fundamentalsScore * 0.4 + valuationScore * 0.35 + governanceScore * 0.25) * 10
  ) / 10;
  
  // === RISK LEVEL ===
  let riskLevel: 'conservative' | 'moderate' | 'aggressive';
  
  if (overallScore >= 7 && redFlags.length <= 1) {
    riskLevel = 'conservative';
  } else if (overallScore >= 5 || redFlags.length <= 2) {
    riskLevel = 'moderate';
  } else {
    riskLevel = 'aggressive';
  }
  
  // Adjust for specific high-risk factors
  if (redFlags.some(f => f.includes('promoters aggressively exiting') || f.includes('Expensive valuation'))) {
    if (riskLevel === 'conservative') riskLevel = 'moderate';
    else if (riskLevel === 'moderate') riskLevel = 'aggressive';
  }
  
  return {
    fundamentalsScore: Math.round(fundamentalsScore * 10) / 10,
    valuationScore: Math.round(valuationScore * 10) / 10,
    governanceScore: Math.round(governanceScore * 10) / 10,
    overallScore,
    riskLevel,
    redFlags,
    pros,
  };
}

export function getScoreBadgeColor(score: number): string {
  if (score >= 7.5) return 'emerald';
  if (score >= 6) return 'blue';
  if (score >= 4) return 'amber';
  return 'red';
}

export function getRiskBadgeColor(risk: string): string {
  switch (risk) {
    case 'conservative': return 'emerald';
    case 'moderate': return 'amber';
    case 'aggressive': return 'red';
    default: return 'gray';
  }
}
