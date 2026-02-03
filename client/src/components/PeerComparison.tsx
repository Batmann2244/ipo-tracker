import { useQuery } from "@tanstack/react-query";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend } from "recharts";
import { Users, TrendingUp, Target, BarChart3 } from "lucide-react";
import type { Ipo } from "@shared/schema";

interface PeerCompany {
  id: number;
  ipoId: number;
  companyName: string;
  symbol: string;
  marketCap: number | null;
  peRatio: number | null;
  pbRatio: number | null;
  roe: number | null;
  roce: number | null;
  revenueGrowth: number | null;
  ebitdaMargin: number | null;
  debtToEquity: number | null;
}

interface PeerComparisonProps {
  ipo: Ipo;
}

function normalizeValue(value: number | null, min: number, max: number): number {
  if (value === null) return 0;
  const normalized = ((value - min) / (max - min)) * 100;
  return Math.max(0, Math.min(100, normalized));
}

export function PeerComparison({ ipo }: PeerComparisonProps) {
  const { data: peers, isLoading } = useQuery<PeerCompany[]>({
    queryKey: ["/api/ipos", ipo.id, "peers"],
    queryFn: async () => {
      const res = await fetch(`/api/ipos/${ipo.id}/peers`);
      return res.json();
    },
  });

  const displayPeers = peers || [];

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (displayPeers.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Peer Comparison
        </h3>
        <div className="text-center py-8 text-muted-foreground text-sm">
          No peer comparison data available yet. Peer data will be added during data sync.
        </div>
      </div>
    );
  }

  const radarData = [
    { metric: "Revenue Growth", ipo: normalizeValue(ipo.revenueGrowth, -20, 80), peer: displayPeers.reduce((sum, p) => sum + (p.revenueGrowth || 0), 0) / displayPeers.length },
    { metric: "EBITDA Margin", ipo: normalizeValue(ipo.ebitdaMargin, -30, 40), peer: normalizeValue(displayPeers.reduce((sum, p) => sum + (p.ebitdaMargin || 0), 0) / displayPeers.length, -30, 40) },
    { metric: "ROE", ipo: normalizeValue(ipo.roe, -20, 50), peer: normalizeValue(displayPeers.reduce((sum, p) => sum + (p.roe || 0), 0) / displayPeers.length, -20, 50) },
    { metric: "ROCE", ipo: normalizeValue(ipo.roce, -20, 50), peer: normalizeValue(displayPeers.reduce((sum, p) => sum + (p.roce || 0), 0) / displayPeers.length, -20, 50) },
    { metric: "P/E Ratio", ipo: normalizeValue(100 - (ipo.peRatio || 50), 0, 100), peer: normalizeValue(100 - (displayPeers.reduce((sum, p) => sum + (p.peRatio || 50), 0) / displayPeers.length), 0, 100) },
  ];

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
        <Users className="w-5 h-5 text-primary" />
        Peer Comparison
      </h3>

      <div className="mb-6">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis 
                dataKey="metric" 
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              />
              <PolarRadiusAxis 
                angle={30} 
                domain={[0, 100]} 
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              />
              <Radar
                name={ipo.symbol}
                dataKey="ipo"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.3}
              />
              <Radar
                name="Peer Average"
                dataKey="peer"
                stroke="#64748b"
                fill="#64748b"
                fillOpacity={0.2}
              />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 font-semibold text-foreground">Company</th>
              <th className="text-right py-2 font-semibold text-foreground">P/E</th>
              <th className="text-right py-2 font-semibold text-foreground">ROE</th>
              <th className="text-right py-2 font-semibold text-foreground">Growth</th>
              <th className="text-right py-2 font-semibold text-foreground">Margin</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border bg-primary/5">
              <td className="py-2 font-medium text-primary">{ipo.symbol} (IPO)</td>
              <td className="py-2 text-right">{ipo.peRatio?.toFixed(1) || "-"}x</td>
              <td className="py-2 text-right">{ipo.roe?.toFixed(1) || "-"}%</td>
              <td className="py-2 text-right">{ipo.revenueGrowth?.toFixed(1) || "-"}%</td>
              <td className="py-2 text-right">{ipo.ebitdaMargin?.toFixed(1) || "-"}%</td>
            </tr>
            {displayPeers.map((peer) => (
              <tr key={peer.id} className="border-b border-border last:border-0">
                <td className="py-2 text-muted-foreground">{peer.symbol}</td>
                <td className="py-2 text-right text-muted-foreground">{peer.peRatio?.toFixed(1) || "-"}x</td>
                <td className="py-2 text-right text-muted-foreground">{peer.roe?.toFixed(1) || "-"}%</td>
                <td className="py-2 text-right text-muted-foreground">{peer.revenueGrowth?.toFixed(1) || "-"}%</td>
                <td className="py-2 text-right text-muted-foreground">{peer.ebitdaMargin?.toFixed(1) || "-"}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground mt-4">
        Compare key metrics vs listed peers in the same sector
      </p>
    </div>
  );
}
