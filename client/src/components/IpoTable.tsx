import { type Ipo } from "@shared/schema";
import { format } from "date-fns";
import { Link } from "wouter";

interface IpoTableProps {
  ipos: Ipo[];
}

function formatPrice(priceRange: string | null): { value: string; percent: string } {
  if (!priceRange || priceRange === "TBA") return { value: "-", percent: "0.00%" };
  const match = priceRange.match(/₹?\s*(\d+)/);
  return { value: match ? `₹${match[1]}` : "-", percent: "0.00%" };
}

function calculateEstListing(ipo: Ipo): { price: string; percent: string } {
  const priceMatch = ipo.priceRange?.match(/₹?\s*(\d+)/);
  const basePrice = priceMatch ? parseInt(priceMatch[1]) : 0;
  const gmp = ipo.gmp || 0;
  const estPrice = basePrice + gmp;
  const percent = basePrice > 0 ? ((gmp / basePrice) * 100).toFixed(2) : "0.00";
  
  return {
    price: basePrice > 0 ? `₹${estPrice}` : "-",
    percent: `(${percent}%)`
  };
}

function formatBiddingDates(ipo: Ipo): { start: string; end: string } {
  if (!ipo.expectedDate) return { start: "TBA", end: "" };
  
  try {
    const openDate = new Date(ipo.expectedDate);
    const closeDate = new Date(openDate);
    closeDate.setDate(closeDate.getDate() + 3);
    
    return {
      start: format(openDate, "d MMM"),
      end: format(closeDate, "d MMM")
    };
  } catch {
    return { start: "TBA", end: "" };
  }
}

function StatusBadge({ status }: { status: string }) {
  const isOpen = status === 'open';
  const isUpcoming = status === 'upcoming';
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
      isOpen 
        ? 'bg-green-50 text-green-700 border-green-200' 
        : isUpcoming 
          ? 'bg-amber-50 text-amber-700 border-amber-200'
          : 'bg-gray-50 text-gray-600 border-gray-200'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${
        isOpen ? 'bg-green-500' : isUpcoming ? 'bg-amber-500' : 'bg-gray-400'
      }`}></span>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export function IpoTable({ ipos }: IpoTableProps) {
  return (
    <div className="bg-card rounded-xl overflow-hidden border border-border">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground text-left border-b border-border text-xs uppercase bg-muted/50">
              <th className="px-4 py-3 font-medium">IPO Details</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">GMP</th>
              <th className="px-4 py-3 font-medium">Est. Listing</th>
              <th className="px-4 py-3 font-medium">Expected Profit</th>
              <th className="px-4 py-3 font-medium">Lot Size</th>
              <th className="px-4 py-3 font-medium">Issue Size</th>
              <th className="px-4 py-3 font-medium">Subscription</th>
              <th className="px-4 py-3 font-medium">Bidding Period</th>
            </tr>
          </thead>
          <tbody>
            {ipos.map((ipo) => {
              const priceInfo = formatPrice(ipo.priceRange);
              const estListing = calculateEstListing(ipo);
              const biddingDates = formatBiddingDates(ipo);
              const gmpValue = ipo.gmp || 0;
              const isSme = ipo.sector?.toLowerCase().includes("sme") || (ipo.issueSize && !ipo.issueSize.includes("Cr"));
              
              const lotSizeNum = typeof ipo.lotSize === 'number' ? ipo.lotSize : parseInt(String(ipo.lotSize)) || 1;
              const expectedProfit = gmpValue * lotSizeNum;
              const gmpPercent = priceInfo.value !== "-" ? ((gmpValue / parseInt(priceInfo.value.replace("₹", ""))) * 100).toFixed(2) : "0.00";
              
              return (
                <tr 
                  key={ipo.id} 
                  className="border-b border-border hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-4">
                    <Link href={`/ipos/${ipo.id}`}>
                      <div className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors">
                        <span className="text-foreground font-medium">{ipo.companyName}</span>
                        {isSme && (
                          <span className="bg-muted text-muted-foreground text-[10px] px-1.5 py-0.5 rounded font-medium border border-border">
                            SME
                          </span>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={ipo.status} />
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-foreground">{priceInfo.value}</div>
                    <div className="text-xs text-muted-foreground">{priceInfo.percent}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-foreground">₹{gmpValue}</div>
                    <div className="text-xs text-muted-foreground">{gmpPercent}%</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-foreground">{estListing.price}</div>
                    <div className="text-xs text-muted-foreground">{estListing.percent}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className={expectedProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                      ₹{expectedProfit}
                    </div>
                    <div className="text-xs text-muted-foreground">Profit</div>
                  </td>
                  <td className="px-4 py-4 text-foreground">{lotSizeNum}</td>
                  <td className="px-4 py-4 text-foreground">{ipo.issueSize || "TBA"}</td>
                  <td className="px-4 py-4 text-muted-foreground">-</td>
                  <td className="px-4 py-4">
                    <div className="bg-green-50 text-green-700 text-xs px-3 py-2 rounded-lg text-center inline-block min-w-[70px] border border-green-200">
                      <div className="font-medium">{biddingDates.start}</div>
                      {biddingDates.end && (
                        <>
                          <div className="text-green-600/70 text-[10px]">to</div>
                          <div className="font-medium">{biddingDates.end}</div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
