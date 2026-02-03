import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Users, Clock, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import type { Ipo } from "@shared/schema";

interface SubscriptionUpdate {
  id: number;
  ipoId: number;
  qibSubscription: number | null;
  niiSubscription: number | null;
  retailSubscription: number | null;
  totalSubscription: number | null;
  recordedAt: string;
}

interface SubscriptionTrackerProps {
  ipo: Ipo;
}

export function SubscriptionTracker({ ipo }: SubscriptionTrackerProps) {
  const { data: updates } = useQuery<SubscriptionUpdate[]>({
    queryKey: ["/api/ipos", ipo.id, "subscriptions"],
    queryFn: async () => {
      const res = await fetch(`/api/ipos/${ipo.id}/subscriptions`);
      return res.json();
    },
  });

  const latestUpdate = updates?.[0];
  
  const displayData = latestUpdate || {
    qibSubscription: ipo.subscriptionQib || 0,
    niiSubscription: ipo.subscriptionHni || 0,
    retailSubscription: ipo.subscriptionRetail || 0,
    totalSubscription: ((ipo.subscriptionQib || 0) + (ipo.subscriptionHni || 0) + (ipo.subscriptionRetail || 0)) / 3,
    recordedAt: new Date().toISOString(),
  };

  const chartData = [
    { name: "QIB", value: displayData.qibSubscription || 0, color: "#3b82f6" },
    { name: "NII/HNI", value: displayData.niiSubscription || 0, color: "#8b5cf6" },
    { name: "Retail", value: displayData.retailSubscription || 0, color: "#22c55e" },
  ];

  const total = displayData.totalSubscription || 
    (chartData.reduce((sum, d) => sum + d.value, 0) / 3);

  const getDemandLevel = (total: number): { label: string; color: string } => {
    if (total >= 50) return { label: "Exceptional Demand", color: "text-green-600" };
    if (total >= 20) return { label: "Very Strong Demand", color: "text-green-600" };
    if (total >= 5) return { label: "Strong Demand", color: "text-blue-600" };
    if (total >= 1) return { label: "Moderate Demand", color: "text-orange-600" };
    return { label: "Weak Demand", color: "text-red-600" };
  };

  const demand = getDemandLevel(total);

  const hasData = chartData.some(d => d.value > 0);

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Live Subscription Status
        </h4>
        {latestUpdate && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {format(new Date(latestUpdate.recordedAt), "h:mm a")}
          </div>
        )}
      </div>

      {hasData ? (
        <>
          <div className="text-center mb-4">
            <div className="text-3xl font-bold text-foreground">
              {total.toFixed(2)}x
            </div>
            <div className={`text-sm font-medium ${demand.color} flex items-center justify-center gap-1`}>
              <TrendingUp className="w-4 h-4" />
              {demand.label}
            </div>
          </div>

          <div className="h-40 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis 
                  type="number" 
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(value) => `${value}x`}
                />
                <YAxis 
                  type="category" 
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  width={50}
                />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px"
                  }}
                  formatter={(value: number) => [`${value.toFixed(2)}x`, "Subscription"]}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-blue-50 rounded-lg p-2">
              <div className="text-lg font-bold text-blue-600">{chartData[0].value.toFixed(2)}x</div>
              <div className="text-xs text-muted-foreground">QIB</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-2">
              <div className="text-lg font-bold text-purple-600">{chartData[1].value.toFixed(2)}x</div>
              <div className="text-xs text-muted-foreground">NII/HNI</div>
            </div>
            <div className="bg-green-50 rounded-lg p-2">
              <div className="text-lg font-bold text-green-600">{chartData[2].value.toFixed(2)}x</div>
              <div className="text-xs text-muted-foreground">Retail</div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Subscription data will be available when IPO opens
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-3 text-center">
        {ipo.status === "open" ? "Updated every hour during subscription period" : "Final subscription numbers"}
      </p>
    </div>
  );
}
