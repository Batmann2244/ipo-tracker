import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, ExternalLink, Calendar, BarChart3, Users } from "lucide-react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface Ipo {
  id: number;
  companyName: string;
  symbol: string;
  status: string;
  expectedDate?: string | null;
  priceMin?: number | null;
  priceMax?: number | null;
  priceRange?: string | null;
  lotSize?: number | null;
  gmp?: number | null;
  subscriptionQib?: number | null;
  subscriptionHni?: number | null;
  subscriptionRetail?: number | null;
  subscriptionNii?: number | null;
  ipoType?: string | null;
  issueSize?: string | null;
  investorGainId?: number | null;
  basisOfAllotmentDate?: string | null;
  refundsInitiationDate?: string | null;
  creditToDematDate?: string | null;
}

interface GmpHistoryItem {
  date: string;
  gmp: number;
  gmpPercent: number;
  estimatedListing: number | null;
  estimatedProfit: number | null;
  movement: "up" | "down" | "none";
  lastUpdated: string;
}

interface SubscriptionDetails {
  qib: number;
  nii: number;
  rii: number;
  total: number;
  bidDate: string;
}

interface ActivityDates {
  biddingStartDate: string | null;
  biddingEndDate: string | null;
  basisOfAllotmentDate: string | null;
  refundsInitiationDate: string | null;
  creditToDematDate: string | null;
  listingDate: string | null;
}

interface Props {
  ipo: Ipo;
  open: boolean;
  onClose: () => void;
}

function parsePriceFromRange(priceRange: string | null | undefined): number {
  if (!priceRange) return 0;
  const match = priceRange.match(/₹?\s*(\d+)/g);
  if (!match || match.length === 0) return 0;
  const lastMatch = match[match.length - 1];
  return parseInt(lastMatch.replace(/[₹\s]/g, ''), 10) || 0;
}

export function IpoDetailModal({ ipo, open, onClose }: Props) {
  const price = ipo.priceMax || ipo.priceMin || parsePriceFromRange(ipo.priceRange) || 0;
  const gmpPercent = price > 0 && ipo.gmp ? ((ipo.gmp / price) * 100).toFixed(2) : "0.00";
  const estimatedProfit = ipo.lotSize && ipo.gmp ? ipo.lotSize * ipo.gmp : 0;

  const { data: gmpHistory = [] } = useQuery<GmpHistoryItem[]>({
    queryKey: ["gmp-history-live", ipo.id],
    queryFn: async () => {
      const res = await fetch(`/api/ipos/${ipo.id}/gmp-history/live`);
      return res.json();
    },
    enabled: open && !!ipo.investorGainId,
  });

  const { data: subscription } = useQuery<SubscriptionDetails | null>({
    queryKey: ["subscription-live", ipo.id],
    queryFn: async () => {
      const res = await fetch(`/api/ipos/${ipo.id}/subscription/live`);
      return res.json();
    },
    enabled: open && !!ipo.investorGainId,
  });

  const { data: activityDates } = useQuery<ActivityDates>({
    queryKey: ["activity-dates", ipo.id],
    queryFn: async () => {
      const res = await fetch(`/api/ipos/${ipo.id}/activity-dates`);
      return res.json();
    },
    enabled: open,
  });

  const chartData = {
    labels: gmpHistory.slice().reverse().map(item => {
      const date = new Date(item.date);
      return date.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit" });
    }),
    datasets: [
      {
        label: "GMP Value (₹)",
        data: gmpHistory.slice().reverse().map(item => item.gmp),
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        tension: 0.3,
        fill: true,
        pointRadius: 4,
        pointBackgroundColor: "#10b981",
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: number | string) => `₹${value}`,
        },
      },
    },
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "TBA";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  const getActivityStatus = (dateStr: string | null | undefined) => {
    if (!dateStr) return "pending";
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    if (date < today) return "completed";
    if (date.getTime() === today.getTime()) return "active";
    return "pending";
  };

  const activityItems = [
    { label: "IPO Open", date: activityDates?.biddingStartDate },
    { label: "IPO Close", date: activityDates?.biddingEndDate },
    { label: "Basis of Allotment", date: activityDates?.basisOfAllotmentDate },
    { label: "Refunds Initiation", date: activityDates?.refundsInitiationDate },
    { label: "Credit to Demat", date: activityDates?.creditToDematDate },
    { label: "IPO Listing", date: activityDates?.listingDate },
  ];

  const liveSubscription = subscription || {
    qib: ipo.subscriptionQib || 0,
    nii: ipo.subscriptionNii || ipo.subscriptionHni || 0,
    rii: ipo.subscriptionRetail || 0,
    total: (ipo.subscriptionQib || 0) + (ipo.subscriptionHni || 0) + (ipo.subscriptionRetail || 0),
    bidDate: new Date().toISOString(),
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold text-gray-900">
                {ipo.companyName}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={ipo.ipoType === "sme" ? "secondary" : "default"} className="text-xs">
                  {ipo.ipoType?.toUpperCase() || "MAINBOARD"}
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    ipo.status === "open" ? "border-green-500 text-green-600" :
                    ipo.status === "upcoming" ? "border-blue-500 text-blue-600" :
                    "border-gray-400 text-gray-600"
                  }
                >
                  {ipo.status?.toUpperCase() || "UPCOMING"}
                </Badge>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-1">
              <ExternalLink className="w-4 h-4" /> More Details
            </Button>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-4 gap-4 mt-4">
          <Card className="bg-gray-50 border-0">
            <CardContent className="pt-4">
              <p className="text-sm text-gray-500">Current GMP</p>
              <p className={`text-2xl font-bold ${(ipo.gmp || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                ₹{ipo.gmp || 0}
              </p>
              <p className="text-xs text-gray-400">{gmpPercent}% of issue price</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-50 border-0">
            <CardContent className="pt-4">
              <p className="text-sm text-gray-500">Issue Price</p>
              <p className="text-2xl font-bold text-gray-900">₹{price}</p>
              <p className="text-xs text-gray-400">Lot Size: {ipo.lotSize || "TBA"}</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-50 border-0">
            <CardContent className="pt-4">
              <p className="text-sm text-gray-500">Expected Profit</p>
              <p className={`text-2xl font-bold ${estimatedProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                ₹{estimatedProfit}
              </p>
              <p className="text-xs text-gray-400">Per lot</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-50 border-0">
            <CardContent className="pt-4">
              <p className="text-sm text-gray-500">Total Subscription</p>
              <p className="text-2xl font-bold text-purple-600">{liveSubscription.total.toFixed(2)}x</p>
              <p className="text-xs text-gray-400">Overall demand</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-4">
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" /> Live Subscription Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">QIB</p>
                <p className="text-xl font-bold text-blue-600">{liveSubscription.qib.toFixed(2)}</p>
                <p className="text-xs text-gray-400">Institutional</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">NII</p>
                <p className="text-xl font-bold text-orange-600">{liveSubscription.nii.toFixed(2)}</p>
                <p className="text-xs text-gray-400">Non-Institutional</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">RII</p>
                <p className="text-xl font-bold text-green-600">{liveSubscription.rii.toFixed(2)}</p>
                <p className="text-xs text-gray-400">Retail</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Total</p>
                <p className="text-xl font-bold text-purple-600">{liveSubscription.total.toFixed(2)}</p>
                <p className="text-xs text-gray-400">Overall</p>
              </div>
            </div>
            {subscription && (
              <p className="text-xs text-gray-400 mt-2">
                Last updated: {new Date(subscription.bidDate).toLocaleString("en-IN")}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" /> IPO Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              {activityItems.map((item, index) => {
                const status = getActivityStatus(item.date);
                return (
                  <div key={index} className="flex flex-col items-center flex-1">
                    <div
                      className={`w-3 h-3 rounded-full mb-2 ${
                        status === "completed" ? "bg-green-500" :
                        status === "active" ? "bg-green-500 animate-pulse" :
                        "bg-gray-300"
                      }`}
                    />
                    <p className="text-xs font-medium text-gray-700 text-center">{item.label}</p>
                    <p className="text-xs text-gray-400 text-center">{formatDate(item.date)}</p>
                    {index < activityItems.length - 1 && (
                      <div className="absolute h-0.5 bg-gray-200 w-full -z-10" style={{ top: "6px" }} />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {gmpHistory.length > 0 && (
          <>
            <Card className="mt-4">
              <CardHeader className="py-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" /> GMP Trend Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <Line data={chartData} options={chartOptions} />
                </div>
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader className="py-3">
                <CardTitle className="text-base">GMP History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 font-medium text-gray-500">DATE</th>
                        <th className="text-left py-2 font-medium text-gray-500">IPO PRICE</th>
                        <th className="text-left py-2 font-medium text-gray-500">GMP</th>
                        <th className="text-center py-2 font-medium text-gray-500">MOVEMENT</th>
                        <th className="text-left py-2 font-medium text-gray-500">EST. LISTING</th>
                        <th className="text-left py-2 font-medium text-gray-500">EST. PROFIT</th>
                        <th className="text-right py-2 font-medium text-gray-500">LAST UPDATED</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gmpHistory.slice(0, 10).map((item, index) => (
                        <tr key={index} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="py-2">{formatDate(item.date)}</td>
                          <td className="py-2">₹{price}</td>
                          <td className="py-2 text-green-600">₹{item.gmp}</td>
                          <td className="py-2 text-center">
                            {item.movement === "up" ? (
                              <TrendingUp className="w-4 h-4 text-green-500 inline" />
                            ) : item.movement === "down" ? (
                              <TrendingDown className="w-4 h-4 text-red-500 inline" />
                            ) : (
                              <Minus className="w-4 h-4 text-gray-400 inline" />
                            )}
                          </td>
                          <td className="py-2">
                            ₹{item.estimatedListing || price + item.gmp}
                            <span className="text-gray-400 text-xs ml-1">({item.gmpPercent.toFixed(2)}%)</span>
                          </td>
                          <td className="py-2 text-green-600">₹{item.estimatedProfit || (ipo.lotSize || 0) * item.gmp}</td>
                          <td className="py-2 text-right text-gray-400 text-xs">{item.lastUpdated}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
