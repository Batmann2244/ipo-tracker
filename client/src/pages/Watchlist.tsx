import { useWatchlist, useRemoveFromWatchlist } from "@/hooks/use-ipos";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, Bookmark } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function Watchlist() {
  const { data: watchlist, isLoading } = useWatchlist();
  const { mutate: removeFromWatchlist } = useRemoveFromWatchlist();
  const { toast } = useToast();

  const handleRemove = (id: number, symbol: string) => {
    removeFromWatchlist(id, {
      onSuccess: () => {
        toast({
          title: "Removed",
          description: `${symbol} removed from watchlist.`,
        });
      }
    });
  };

  const getStatusStyles = (status: string) => {
    switch(status.toLowerCase()) {
      case 'open': return "bg-green-50 text-green-700 border-green-200";
      case 'upcoming': return "bg-blue-50 text-blue-700 border-blue-200";
      default: return "bg-gray-50 text-gray-600 border-gray-200";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">My Watchlist</h1>
        <p className="text-muted-foreground">Monitor your tracked IPOs and potential investments.</p>
      </div>

      {watchlist?.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-lg border border-border">
          <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <Bookmark className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Your watchlist is empty</h2>
          <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
            Start tracking companies by browsing the dashboard and adding them to your list.
          </p>
          <Link href="/dashboard">
            <Button 
              size="lg" 
              className="bg-primary text-white hover:bg-primary/90"
              data-testid="button-browse-ipos"
            >
              Browse IPOs
            </Button>
          </Link>
        </div>
      ) : (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-border bg-muted text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <div className="col-span-4 sm:col-span-3">Company</div>
            <div className="col-span-3 sm:col-span-2">Status</div>
            <div className="col-span-3 sm:col-span-2 hidden sm:block">Date</div>
            <div className="col-span-2 sm:col-span-2 hidden sm:block">Price Range</div>
            <div className="col-span-2 sm:col-span-2 hidden sm:block">Sector</div>
            <div className="col-span-5 sm:col-span-1 text-right">Actions</div>
          </div>
          
          <div className="divide-y divide-border">
            {watchlist?.map((item) => (
              <div 
                key={item.id}
                className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-muted/50 transition-colors"
                data-testid={`watchlist-row-${item.ipo.id}`}
              >
                <div className="col-span-4 sm:col-span-3">
                  <Link href={`/ipos/${item.ipo.id}`}>
                    <div className="cursor-pointer group">
                      <div className="font-bold text-foreground group-hover:text-primary transition-colors">
                        {item.ipo.symbol}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">{item.ipo.companyName}</div>
                    </div>
                  </Link>
                </div>
                
                <div className="col-span-3 sm:col-span-2">
                  <Badge 
                    variant="outline" 
                    className={`text-xs font-medium capitalize px-2.5 py-0.5 rounded-full border ${getStatusStyles(item.ipo.status)}`}
                  >
                    {item.ipo.status}
                  </Badge>
                </div>
                
                <div className="col-span-3 sm:col-span-2 hidden sm:block text-sm text-muted-foreground">
                  {item.ipo.expectedDate ? format(new Date(item.ipo.expectedDate), "dd MMM yyyy") : "TBA"}
                </div>
                
                <div className="col-span-2 sm:col-span-2 hidden sm:block text-sm font-medium text-foreground">
                  {item.ipo.priceRange}
                </div>
                
                <div className="col-span-2 sm:col-span-2 hidden sm:block text-sm text-muted-foreground truncate">
                  {item.ipo.sector || '-'}
                </div>
                
                <div className="col-span-5 sm:col-span-1 flex justify-end">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                    onClick={() => handleRemove(item.id, item.ipo.symbol)}
                    data-testid={`button-remove-${item.ipo.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
