import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Wallet, TrendingUp, Building2, Wrench, Banknote, Package } from "lucide-react";
import type { Ipo } from "@shared/schema";

interface FundUtilizationEntry {
  id: number;
  ipoId: number;
  category: string;
  plannedAmount: number | null;
  plannedPercentage: number | null;
  actualAmount: number | null;
  actualPercentage: number | null;
  status: string | null;
  notes: string | null;
}

interface FundUtilizationProps {
  ipo: Ipo;
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  debt_repayment: { label: "Debt Repayment", color: "#ef4444", icon: Banknote },
  capex: { label: "Capital Expenditure", color: "#3b82f6", icon: Building2 },
  working_capital: { label: "Working Capital", color: "#22c55e", icon: Wallet },
  acquisitions: { label: "Acquisitions", color: "#8b5cf6", icon: Package },
  general_corporate: { label: "General Corporate", color: "#64748b", icon: Wrench },
  technology: { label: "Technology & R&D", color: "#06b6d4", icon: TrendingUp },
};

export function FundUtilization({ ipo }: FundUtilizationProps) {
  const { data: utilization, isLoading } = useQuery<FundUtilizationEntry[]>({
    queryKey: ["/api/ipos", ipo.id, "fund-utilization"],
    queryFn: async () => {
      const res = await fetch(`/api/ipos/${ipo.id}/fund-utilization`);
      return res.json();
    },
  });

  const displayData = utilization || [];

  const pieData = displayData.map(item => ({
    name: CATEGORY_CONFIG[item.category]?.label || item.category,
    value: item.plannedPercentage || 0,
    color: CATEGORY_CONFIG[item.category]?.color || "#64748b",
    amount: item.plannedAmount,
    actual: item.actualPercentage,
  }));

  const hasActualData = displayData.some(d => d.actualPercentage !== null);

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

  if (displayData.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-primary" />
          Fund Utilization
        </h3>
        <div className="text-center py-8 text-muted-foreground text-sm">
          Fund utilization data not available yet. Data will be added during sync.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
        <Wallet className="w-5 h-5 text-primary" />
        Fund Utilization {hasActualData ? "(Planned vs Actual)" : "(Planned)"}
      </h3>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px"
                }}
                formatter={(value: number, name: string, props: any) => [
                  `${value}% (₹${props.payload.amount} Cr)`, 
                  name
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-3">
          {displayData.map((item) => {
            const config = CATEGORY_CONFIG[item.category] || { label: item.category, color: "#64748b", icon: Wallet };
            const Icon = config.icon;
            
            return (
              <div key={item.id} className="flex items-center gap-3">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${config.color}15` }}
                >
                  <Icon className="w-4 h-4" style={{ color: config.color }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{config.label}</span>
                    <span className="text-sm text-muted-foreground">
                      {item.plannedPercentage}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${item.plannedPercentage || 0}%`,
                        backgroundColor: config.color 
                      }}
                    />
                  </div>
                  {item.notes && (
                    <p className="text-xs text-muted-foreground mt-0.5">{item.notes}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-4">
        How the company plans to use IPO proceeds. Track actual utilization post-listing.
      </p>
    </div>
  );
}
