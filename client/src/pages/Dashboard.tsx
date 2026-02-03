import { useState, useMemo } from "react";
import { useIpos } from "@/hooks/use-ipos";
import { IpoCard } from "@/components/IpoCard";
import { IpoTable } from "@/components/IpoTable";
import { IpoDetailModal } from "@/components/IpoDetailModal";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Search, Loader2, LayoutGrid, Table, TrendingUp, Clock, CheckCircle2, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import type { Ipo } from "@shared/schema";

type ViewMode = "cards" | "table";

export default function Dashboard() {
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [search, setSearch] = useState("");
  const [showSme, setShowSme] = useState(true);
  const [selectedIpo, setSelectedIpo] = useState<Ipo | null>(null);
  const [upcomingPage, setUpcomingPage] = useState(0);
  const [listedPage, setListedPage] = useState(0);
  const ITEMS_PER_PAGE = 9;

  const { data: ipos, isLoading } = useIpos();

  const filteredIpos = useMemo(() => {
    if (!ipos) return [];
    
    return ipos.filter(ipo => {
      const matchesSearch = 
        ipo.symbol.toLowerCase().includes(search.toLowerCase()) || 
        ipo.companyName.toLowerCase().includes(search.toLowerCase());
      
      if (!showSme) {
        const isSme = ipo.sector?.toLowerCase().includes("sme") || 
                      (ipo.issueSize && !ipo.issueSize.includes("Cr"));
        if (isSme) return false;
      }
      
      return matchesSearch;
    });
  }, [ipos, search, showSme]);

  const stats = useMemo(() => {
    if (!ipos) return { open: 0, upcoming: 0, pending: 0, listed: 0 };
    
    return {
      open: ipos.filter(i => i.status === "open").length,
      upcoming: ipos.filter(i => i.status === "upcoming").length,
      pending: ipos.filter(i => i.status === "pending").length,
      listed: ipos.filter(i => i.status === "closed" || i.status === "listed").length,
    };
  }, [ipos]);

  const openIpos = filteredIpos.filter(i => i.status === "open");
  const upcomingIpos = filteredIpos.filter(i => i.status === "upcoming");
  const listedIpos = filteredIpos.filter(i => i.status === "closed" || i.status === "listed");

  const statCards = [
    { label: "Open IPOs", value: stats.open, icon: ArrowUpRight, color: "text-green-600", bgColor: "bg-green-50" },
    { label: "Upcoming", value: stats.upcoming, icon: Clock, color: "text-blue-600", bgColor: "bg-blue-50" },
    { label: "Pending", value: stats.pending, icon: TrendingUp, color: "text-amber-600", bgColor: "bg-amber-50" },
    { label: "Listed", value: stats.listed, icon: CheckCircle2, color: "text-gray-600", bgColor: "bg-gray-50" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">IPO Dashboard</h1>
        <p className="text-muted-foreground">
          Track live IPO GMPs, subscription status, and investment opportunities.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="bg-card rounded-lg border border-border p-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              </div>
              <div className={`p-2 rounded-lg ${stat.bgColor} ${stat.color}`}>
                <stat.icon className="w-4 h-4" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-card p-4 rounded-lg border border-border">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("cards")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === "cards" 
                ? "bg-primary text-white" 
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Cards
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === "table" 
                ? "bg-primary text-white" 
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <Table className="w-4 h-4" />
            Table
          </button>
        </div>

        <div className="flex items-center gap-4 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search IPOs..." 
              className="pl-10 bg-background border-border"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2 text-sm whitespace-nowrap">
            <span className="text-muted-foreground">Show SME:</span>
            <Switch 
              checked={showSme} 
              onCheckedChange={setShowSme}
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : viewMode === "table" ? (
        <IpoTable ipos={filteredIpos} />
      ) : (
        <div className="space-y-8">
          {openIpos.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-6 bg-green-500 rounded-full"></div>
                <h2 className="text-lg font-semibold text-foreground">
                  Open for Bidding
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({openIpos.length} IPOs)
                  </span>
                </h2>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {openIpos.map((ipo) => (
                  <IpoCard key={ipo.id} ipo={ipo} onClick={() => setSelectedIpo(ipo)} />
                ))}
              </div>
            </section>
          )}

          {upcomingIpos.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
                <h2 className="text-lg font-semibold text-foreground">
                  Upcoming IPOs
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({upcomingIpos.length} IPOs)
                  </span>
                </h2>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingIpos.slice(upcomingPage * ITEMS_PER_PAGE, (upcomingPage + 1) * ITEMS_PER_PAGE).map((ipo) => (
                  <IpoCard key={ipo.id} ipo={ipo} onClick={() => setSelectedIpo(ipo)} />
                ))}
              </div>
              {Math.ceil(upcomingIpos.length / ITEMS_PER_PAGE) > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUpcomingPage(Math.max(0, upcomingPage - 1))}
                    disabled={upcomingPage === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {upcomingPage + 1} of {Math.ceil(upcomingIpos.length / ITEMS_PER_PAGE)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUpcomingPage(Math.min(Math.ceil(upcomingIpos.length / ITEMS_PER_PAGE) - 1, upcomingPage + 1))}
                    disabled={upcomingPage === Math.ceil(upcomingIpos.length / ITEMS_PER_PAGE) - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </section>
          )}

          {listedIpos.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-6 bg-gray-400 rounded-full"></div>
                <h2 className="text-lg font-semibold text-foreground">
                  Recently Listed
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({listedIpos.length} IPOs)
                  </span>
                </h2>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {listedIpos.slice(listedPage * ITEMS_PER_PAGE, (listedPage + 1) * ITEMS_PER_PAGE).map((ipo) => (
                  <IpoCard key={ipo.id} ipo={ipo} onClick={() => setSelectedIpo(ipo)} />
                ))}
              </div>
              {Math.ceil(listedIpos.length / ITEMS_PER_PAGE) > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setListedPage(Math.max(0, listedPage - 1))}
                    disabled={listedPage === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {listedPage + 1} of {Math.ceil(listedIpos.length / ITEMS_PER_PAGE)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setListedPage(Math.min(Math.ceil(listedIpos.length / ITEMS_PER_PAGE) - 1, listedPage + 1))}
                    disabled={listedPage === Math.ceil(listedIpos.length / ITEMS_PER_PAGE) - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </section>
          )}

          {filteredIpos.length === 0 && (
            <div className="text-center py-16 bg-muted/50 rounded-lg border border-dashed border-border">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Search className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-foreground font-medium">No IPOs found</p>
              <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or filters.</p>
            </div>
          )}
        </div>
      )}

      {selectedIpo && (
        <IpoDetailModal
          ipo={selectedIpo}
          open={!!selectedIpo}
          onClose={() => setSelectedIpo(null)}
        />
      )}
    </div>
  );
}
