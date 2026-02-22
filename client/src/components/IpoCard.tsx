import { type Ipo } from "@shared/schema";
import { format } from "date-fns";
import { ArrowRight, Calendar, Layers, Plus, Check, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAddToWatchlist, useWatchlist } from "@/hooks/use-ipos";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

interface IpoCardProps {
  ipo: Ipo;
  compact?: boolean;
  onClick?: () => void;
}

// Truncate excessively long text (safety measure)
function truncateText(text: string, maxLength: number = 100): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

function ScoreDisplay({ score, size = "md" }: { score: number | null; size?: "sm" | "md" }) {
  if (score === null || score === undefined) return null;
  
  const getScoreColor = (s: number) => {
    if (s >= 7.5) return "text-green-600 bg-green-50 border-green-200";
    if (s >= 6) return "text-blue-600 bg-blue-50 border-blue-200";
    if (s >= 4) return "text-orange-600 bg-orange-50 border-orange-200";
    return "text-red-600 bg-red-50 border-red-200";
  };
  
  const colorClass = getScoreColor(score);
  
  return (
    <div className={`flex items-center justify-center ${size === "sm" ? "w-10 h-10 text-sm" : "w-12 h-12 text-base"} font-bold rounded-lg border ${colorClass}`}>
      {score.toFixed(1)}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const getStatusStyles = (s: string) => {
    switch(s.toLowerCase()) {
      case 'open': 
        return "bg-green-50 text-green-700 border-green-200";
      case 'upcoming': 
        return "bg-blue-50 text-blue-700 border-blue-200";
      case 'closed':
        return "bg-gray-50 text-gray-600 border-gray-200";
      default: 
        return "bg-gray-50 text-gray-600 border-gray-200";
    }
  };

  return (
    <Badge 
      variant="outline" 
      className={`text-xs font-medium capitalize px-2.5 py-0.5 rounded-full border ${getStatusStyles(status)}`}
    >
      {status}
    </Badge>
  );
}

function GmpBadge({ gmp }: { gmp: number | null }) {
  if (gmp === null || gmp === undefined) return null;
  
  const isPositive = gmp >= 0;
  
  return (
    <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md ${
      isPositive ? "text-green-700 bg-green-50" : "text-red-700 bg-red-50"
    }`}>
      {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      <span>GMP Rs.{gmp}</span>
    </div>
  );
}

export function IpoCard({ ipo, compact = false, onClick }: IpoCardProps) {
  const { mutate: addToWatchlist, isPending } = useAddToWatchlist();
  const { data: watchlist } = useWatchlist();
  const { toast } = useToast();

  const isWatching = watchlist?.some(item => item.ipoId === ipo.id);

  const handleWatch = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isWatching) return;
    
    addToWatchlist(ipo.id, {
      onSuccess: () => {
        toast({
          title: "Added to Watchlist",
          description: `You are now tracking ${ipo.symbol}.`,
        });
      },
      onError: (err) => {
        toast({
          title: "Error",
          description: err.message,
          variant: "destructive",
        });
      }
    });
  };

  const redFlagsCount = ipo.redFlags?.length || 0;

  if (compact) {
    return (
      <Link href={`/ipos/${ipo.id}`}>
        <div 
          className="group cursor-pointer bg-card rounded-lg border border-border p-4 hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
          data-testid={`card-ipo-compact-${ipo.id}`}
        >
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
                {ipo.symbol}
              </h3>
              <p className="text-sm text-muted-foreground truncate max-w-[150px]">{truncateText(ipo.companyName, 60)}</p>
            </div>
            <ScoreDisplay score={ipo.overallScore} size="sm" />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              {ipo.expectedDate ? format(new Date(ipo.expectedDate), "dd MMM yyyy") : "TBA"}
            </div>
            {redFlagsCount > 0 && (
              <div className="flex items-center gap-1 text-xs text-red-600">
                <AlertTriangle className="w-3 h-3" />
                {redFlagsCount}
              </div>
            )}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div 
      className="group bg-card rounded-lg border border-border p-5 flex flex-col hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer"
      data-testid={`card-ipo-${ipo.id}`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start gap-3 mb-4">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
              {ipo.symbol}
            </span>
            <StatusBadge status={ipo.status} />
          </div>
          <h3 className="text-sm text-muted-foreground line-clamp-1">
            {truncateText(ipo.companyName, 80)}
          </h3>
        </div>
        <ScoreDisplay score={ipo.overallScore} size="md" />
      </div>

      <div className="space-y-3 mb-4 flex-1">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Price Range</p>
            <p className="font-semibold text-sm text-foreground">{ipo.priceRange}</p>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Issue Size</p>
            <p className="font-semibold text-sm text-foreground truncate">
              {ipo.issueSize || "TBA"}
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {ipo.sector && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2.5 py-1.5 rounded-md">
              <Layers className="w-3.5 h-3.5" />
              <span>{ipo.sector}</span>
            </div>
          )}
          <GmpBadge gmp={ipo.gmp} />
        </div>

        {redFlagsCount > 0 && (
          <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{redFlagsCount} risk flag{redFlagsCount > 1 ? 's' : ''} detected</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mt-auto">
        <Link href={`/ipos/${ipo.id}`} className="flex-1" onClick={(e) => e.stopPropagation()}>
          <Button 
            className="w-full justify-between bg-foreground text-background hover:bg-foreground/90 font-medium"
            data-testid={`button-analyze-${ipo.id}`}
          >
            <span>View Analysis</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
        <Button
          size="icon"
          variant="outline"
          className={`shrink-0 ${
            isWatching 
              ? 'bg-primary/10 text-primary border-primary/30' 
              : 'text-muted-foreground border-border hover:bg-muted'
          }`}
          onClick={handleWatch}
          disabled={isPending || isWatching}
          data-testid={`button-watch-${ipo.id}`}
        >
          {isWatching ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
