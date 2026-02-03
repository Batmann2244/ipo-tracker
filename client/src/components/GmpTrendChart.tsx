import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";

interface GmpHistoryEntry {
  id: number;
  ipoId: number;
  gmp: number;
  gmpPercentage: number | null;
  recordedAt: string;
}

interface GmpTrendChartProps {
  ipoId: number;
  currentGmp: number | null;
}

export function GmpTrendChart({ ipoId, currentGmp }: GmpTrendChartProps) {
  const { data: history, isLoading } = useQuery<GmpHistoryEntry[]>({
    queryKey: ["/api/ipos", ipoId, "gmp-history"],
    queryFn: async () => {
      const res = await fetch(`/api/ipos/${ipoId}/gmp-history?days=7`);
      return res.json();
    },
  });

  const chartData = history?.map(entry => ({
    date: format(new Date(entry.recordedAt), "MMM dd"),
    gmp: entry.gmp,
    fullDate: format(new Date(entry.recordedAt), "MMM dd, yyyy"),
  })).reverse() || [];

  const hasData = chartData.length >= 2;
  const trend = hasData && chartData.length > 1 
    ? chartData[chartData.length - 1].gmp - chartData[0].gmp 
    : 0;

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-40 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          GMP Trend (7 Days)
        </h4>
        {trend !== 0 && (
          <div className={`flex items-center gap-1 text-sm font-medium ${
            trend > 0 ? "text-green-600" : "text-red-600"
          }`}>
            {trend > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {trend > 0 ? "+" : ""}{trend.toFixed(0)}
          </div>
        )}
      </div>

      {hasData ? (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={{ stroke: "hsl(var(--border))" }}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickFormatter={(value) => `₹${value}`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px"
                }}
                formatter={(value: number) => [`₹${value}`, "GMP"]}
                labelFormatter={(label) => label}
              />
              <Line 
                type="monotone" 
                dataKey="gmp" 
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
          No GMP history available yet
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-3">
        Grey Market Premium trend over the last 7 days
      </p>
    </div>
  );
}
