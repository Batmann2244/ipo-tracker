import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useIpo, useAddToWatchlist, useWatchlist } from "@/hooks/use-ipos";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Calendar, 
  PieChart, 
  FileText, 
  Check,
  Plus,
  Layers,
  TrendingUp,
  AlertTriangle,
  Shield,
  Gauge,
  BarChart3,
  Users,
  Target,
  CheckCircle2,
  XCircle,
  Building2,
  Sparkles,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { GmpTrendChart } from "@/components/GmpTrendChart";
import { PeerComparison } from "@/components/PeerComparison";
import { SubscriptionTracker } from "@/components/SubscriptionTracker";
import { FundUtilization } from "@/components/FundUtilization";

function ScoreBar({ label, score, icon: Icon }: { label: string; score: number | null; icon: React.ElementType }) {
  if (score === null || score === undefined) return null;
  
  const percentage = (score / 10) * 100;
  
  const getColor = (s: number) => {
    if (s >= 7.5) return "bg-green-500";
    if (s >= 6) return "bg-blue-500";
    if (s >= 4) return "bg-orange-500";
    return "bg-red-500";
  };
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
        <span className="font-semibold text-foreground">{score.toFixed(1)}/10</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full ${getColor(score)} transition-all duration-700 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function OverallScoreRing({ score }: { score: number | null }) {
  if (score === null || score === undefined) return null;
  
  const percentage = (score / 10) * 100;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  const getScoreColor = (s: number) => {
    if (s >= 7.5) return { stroke: "#22c55e", text: "text-green-600", label: "Strong" };
    if (s >= 6) return { stroke: "#3b82f6", text: "text-blue-600", label: "Good" };
    if (s >= 4) return { stroke: "#f97316", text: "text-orange-600", label: "Fair" };
    return { stroke: "#ef4444", text: "text-red-600", label: "Weak" };
  };
  
  const colors = getScoreColor(score);
  
  return (
    <div className="relative flex flex-col items-center">
      <svg width="140" height="140" className="-rotate-90">
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="8"
        />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-bold text-4xl ${colors.text}`}>{score.toFixed(1)}</span>
        <span className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{colors.label}</span>
      </div>
    </div>
  );
}

function RiskBadge({ riskLevel }: { riskLevel: string | null }) {
  if (!riskLevel) return null;
  
  const config = {
    conservative: { 
      bg: "bg-green-50", 
      border: "border-green-200", 
      text: "text-green-700",
      icon: Shield,
      label: "Conservative Risk"
    },
    moderate: { 
      bg: "bg-orange-50", 
      border: "border-orange-200", 
      text: "text-orange-700",
      icon: Target,
      label: "Moderate Risk"
    },
    aggressive: { 
      bg: "bg-red-50", 
      border: "border-red-200", 
      text: "text-red-700",
      icon: AlertTriangle,
      label: "Aggressive Risk"
    },
  };
  
  const style = config[riskLevel as keyof typeof config] || config.moderate;
  const Icon = style.icon;
  
  return (
    <div className={`${style.bg} ${style.border} border rounded-lg p-4 flex items-center gap-3`}>
      <Icon className={`w-5 h-5 ${style.text}`} />
      <div>
        <div className={`font-semibold ${style.text}`}>{style.label}</div>
        <div className="text-xs text-muted-foreground">Based on fundamentals & valuation</div>
      </div>
    </div>
  );
}

function MetricRow({ label, value, suffix = "", highlight = false }: { 
  label: string; 
  value: number | string | null | undefined; 
  suffix?: string;
  highlight?: boolean;
}) {
  if (value === null || value === undefined) return null;
  
  const displayValue = typeof value === 'number' ? value.toFixed(1) : value;
  const isNegative = typeof value === 'number' && value < 0;
  
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`font-semibold ${
        highlight 
          ? isNegative ? "text-red-600" : "text-green-600"
          : "text-foreground"
      }`}>
        {displayValue}{suffix}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const getStatusStyles = (s: string) => {
    switch(s.toLowerCase()) {
      case 'open': return "bg-green-50 text-green-700 border-green-200";
      case 'upcoming': return "bg-blue-50 text-blue-700 border-blue-200";
      default: return "bg-gray-50 text-gray-600 border-gray-200";
    }
  };

  return (
    <Badge variant="outline" className={`text-xs font-medium capitalize px-2.5 py-0.5 rounded-full border ${getStatusStyles(status)}`}>
      {status}
    </Badge>
  );
}

export default function IpoDetail() {
  const [match, params] = useRoute("/ipos/:id");
  const id = parseInt(params?.id || "0");
  const { data: ipo, isLoading } = useIpo(id);
  const { data: watchlist } = useWatchlist();
  const { mutate: addToWatchlist, isPending } = useAddToWatchlist();
  const { toast } = useToast();

  const isWatching = watchlist?.some(item => item.ipoId === id);

  const handleWatch = () => {
    if (isWatching || !ipo) return;
    addToWatchlist(ipo.id, {
      onSuccess: () => {
        toast({ title: "Added to Watchlist", description: `Tracking ${ipo.symbol}` });
      }
    });
  };

  const analyzeIpo = useMutation({
    mutationFn: async (ipoId: number) => {
      const res = await apiRequest("POST", `/api/ipos/${ipoId}/analyze`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ipos", id] });
      toast({ title: "AI Analysis Complete", description: "Analysis has been generated" });
    },
    onError: () => {
      toast({ title: "Analysis Failed", description: "Could not generate AI analysis", variant: "destructive" });
    },
  });

  if (isLoading) return (
    <div className="h-[60vh] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
  
  if (!ipo) return (
    <div className="h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
        <p className="text-muted-foreground text-lg">IPO not found</p>
      </div>
    </div>
  );

  // Parse JSON fields safely
  const redFlags: string[] = typeof ipo.redFlags === 'string'
    ? JSON.parse(ipo.redFlags)
    : (Array.isArray(ipo.redFlags) ? ipo.redFlags : []);

  const pros: string[] = typeof ipo.pros === 'string'
    ? JSON.parse(ipo.pros)
    : (Array.isArray(ipo.pros) ? ipo.pros : []);

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <Link href="/dashboard">
        <Button 
          variant="ghost" 
          className="mb-6 pl-0 text-muted-foreground hover:text-foreground"
          data-testid="button-back"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </Link>

      <div className="bg-card rounded-lg border border-border mb-6">
        <div className="p-6 border-b border-border">
          <div className="flex flex-col md:flex-row justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-3xl font-bold text-foreground">{ipo.symbol}</h1>
                <StatusBadge status={ipo.status} />
              </div>
              <h2 className="text-lg text-muted-foreground font-medium mb-4">{ipo.companyName}</h2>
              <div className="flex flex-wrap items-center gap-2">
                {ipo.sector && (
                  <Badge variant="outline" className="bg-muted border-border text-muted-foreground">
                    <Layers className="w-3 h-3 mr-1.5" />
                    {ipo.sector}
                  </Badge>
                )}
                {ipo.issueSize && (
                  <Badge variant="outline" className="bg-muted border-border text-muted-foreground">
                    <Building2 className="w-3 h-3 mr-1.5" />
                    {ipo.issueSize}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Button 
                size="lg" 
                className={`rounded-lg transition-all ${
                  isWatching 
                    ? 'bg-primary/10 text-primary border border-primary/30' 
                    : 'bg-primary text-white hover:bg-primary/90'
                }`}
                onClick={handleWatch}
                disabled={isWatching || isPending}
                data-testid="button-add-watchlist"
              >
                {isWatching ? (
                  <><Check className="mr-2 h-5 w-5" /> In Watchlist</>
                ) : (
                  <><Plus className="mr-2 h-5 w-5" /> Add to Watchlist</>
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
          <div className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Price Range</div>
            <div className="font-semibold text-foreground">{ipo.priceRange}</div>
          </div>
          <div className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Expected Date</div>
            <div className="font-medium text-foreground">
              {ipo.expectedDate ? format(new Date(ipo.expectedDate), "dd MMM yyyy") : "TBA"}
            </div>
          </div>
          <div className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Lot Size</div>
            <div className="font-semibold text-foreground">{ipo.lotSize || "TBA"} shares</div>
          </div>
          <div className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Min Investment</div>
            <div className="font-semibold text-foreground">{ipo.minInvestment || "TBA"}</div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Gauge className="w-5 h-5 text-primary" />
                IPO Score Analysis
              </h3>
              <div className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
                Screener Tool Only - Not Investment Advice
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="flex justify-center items-center">
                <OverallScoreRing score={ipo.overallScore} />
              </div>
              <div className="space-y-5">
                <ScoreBar label="Fundamentals" score={ipo.fundamentalsScore} icon={BarChart3} />
                <ScoreBar label="Valuation" score={ipo.valuationScore} icon={Target} />
                <ScoreBar label="Governance" score={ipo.governanceScore} icon={Shield} />
              </div>
            </div>
            
            <div className="mt-6">
              <RiskBadge riskLevel={ipo.riskLevel} />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {redFlags.length > 0 && (
              <div className="bg-card rounded-lg border border-red-200 p-6">
                <h3 className="text-base font-bold text-red-700 mb-4 flex items-center gap-2">
                  <XCircle className="w-5 h-5" />
                  Risk Flags ({redFlags.length})
                </h3>
                <ul className="space-y-3">
                  {redFlags.map((flag, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      {flag}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {pros.length > 0 && (
              <div className="bg-card rounded-lg border border-green-200 p-6">
                <h3 className="text-base font-bold text-green-700 mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Positives ({pros.length})
                </h3>
                <ul className="space-y-3">
                  {pros.map((pro, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {pro}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Company Overview
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              {ipo.description || "Detailed prospectus information will be available closer to the offering date."}
            </p>
          </div>

          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Analysis
              </h3>
              {!ipo.aiSummary && (
                <Button
                  size="sm"
                  onClick={() => analyzeIpo.mutate(ipo.id)}
                  disabled={analyzeIpo.isPending}
                  className="bg-primary text-white hover:bg-primary/90"
                  data-testid="button-generate-ai-analysis"
                >
                  {analyzeIpo.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</>
                  ) : (
                    <><Sparkles className="mr-2 h-4 w-4" /> Generate Analysis</>
                  )}
                </Button>
              )}
            </div>
            
            {ipo.aiSummary ? (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">Summary</h4>
                  <p className="text-foreground leading-relaxed">{ipo.aiSummary}</p>
                </div>
                {ipo.aiRecommendation && (
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-2">Recommendation</h4>
                    <p className="text-foreground leading-relaxed">{ipo.aiRecommendation}</p>
                  </div>
                )}
                <div className="pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground italic">
                    AI-generated analysis for screening purposes only. Not investment advice.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <Sparkles className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  Click "Generate Analysis" to get AI-powered insights about this IPO
                </p>
              </div>
            )}
          </div>

          <PeerComparison ipo={ipo} />
          
          <FundUtilization ipo={ipo} />
        </div>

        <div className="space-y-6">
          <GmpTrendChart ipoId={ipo.id} currentGmp={ipo.gmp} />
          
          <SubscriptionTracker ipo={ipo} />
          
          <div className="bg-card rounded-lg border border-border p-6">
            <h4 className="font-bold text-foreground text-sm mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Financial Metrics
            </h4>
            <div className="space-y-1">
              <MetricRow label="Revenue Growth (CAGR)" value={ipo.revenueGrowth} suffix="%" highlight />
              <MetricRow label="EBITDA Margin" value={ipo.ebitdaMargin} suffix="%" highlight />
              <MetricRow label="PAT Margin" value={ipo.patMargin} suffix="%" highlight />
              <MetricRow label="ROE" value={ipo.roe} suffix="%" highlight />
              <MetricRow label="ROCE" value={ipo.roce} suffix="%" highlight />
              <MetricRow label="Debt/Equity" value={ipo.debtToEquity} />
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-6">
            <h4 className="font-bold text-foreground text-sm mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Valuation
            </h4>
            <div className="space-y-1">
              <MetricRow label="P/E Ratio" value={ipo.peRatio} suffix="x" />
              <MetricRow label="P/B Ratio" value={ipo.pbRatio} suffix="x" />
              <MetricRow label="Sector P/E Median" value={ipo.sectorPeMedian} suffix="x" />
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-6">
            <h4 className="font-bold text-foreground text-sm mb-4 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-primary" />
              Offer Structure
            </h4>
            <div className="space-y-1">
              <MetricRow label="Fresh Issue" value={ipo.freshIssue !== null && ipo.freshIssue !== undefined ? (ipo.freshIssue * 100) : null} suffix="%" />
              <MetricRow label="OFS Ratio" value={ipo.ofsRatio !== null && ipo.ofsRatio !== undefined ? (ipo.ofsRatio * 100) : null} suffix="%" />
              <MetricRow label="Promoter Holding (Pre)" value={ipo.promoterHolding} suffix="%" />
              <MetricRow label="Promoter Holding (Post)" value={ipo.postIpoPromoterHolding} suffix="%" />
            </div>
          </div>

          {(ipo.subscriptionQib || ipo.subscriptionHni || ipo.subscriptionRetail) && (
            <div className="bg-card rounded-lg border border-border p-6">
              <h4 className="font-bold text-foreground text-sm mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Subscription Data
              </h4>
              <div className="space-y-1">
                <MetricRow label="QIB" value={ipo.subscriptionQib} suffix="x" />
                <MetricRow label="HNI" value={ipo.subscriptionHni} suffix="x" />
                <MetricRow label="Retail" value={ipo.subscriptionRetail} suffix="x" />
              </div>
            </div>
          )}

          {ipo.gmp !== null && ipo.gmp !== undefined && (
            <div className={`bg-card rounded-lg border p-6 ${ipo.gmp > 0 ? 'border-green-200' : ipo.gmp < 0 ? 'border-red-200' : 'border-border'}`}>
              <h4 className="font-bold text-foreground text-sm mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Grey Market Premium
              </h4>
              <div className={`text-3xl font-bold ${
                ipo.gmp > 0 ? 'text-green-600' : ipo.gmp < 0 ? 'text-red-600' : 'text-muted-foreground'
              }`}>
                {ipo.gmp > 0 ? '+' : ''}Rs.{ipo.gmp}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Unofficial market sentiment indicator
              </p>
            </div>
          )}

          <div className="bg-orange-50 rounded-lg border border-orange-200 p-5">
            <h4 className="font-bold text-orange-700 mb-2 flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4" />
              Screener Disclaimer
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This is a screening tool only. Scores are computed from available data and should not be considered investment advice. Always review the full DRHP/RHP and consult a SEBI-registered advisor before investing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
