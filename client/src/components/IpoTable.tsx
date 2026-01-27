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
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
      isOpen 
        ? 'bg-green-500/20 text-green-400' 
        : isUpcoming 
          ? 'bg-amber-500/20 text-amber-400'
          : 'bg-zinc-600/20 text-zinc-400'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${
        isOpen ? 'bg-green-400' : isUpcoming ? 'bg-amber-400' : 'bg-zinc-400'
      }`}></span>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export function IpoTable({ ipos }: IpoTableProps) {
  return (
    <div className="bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-zinc-500 text-left border-b border-zinc-800 text-xs uppercase">
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
                  className="border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors"
                >
                  <td className="px-4 py-4">
                    <Link href={`/ipos/${ipo.id}`}>
                      <div className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors">
                        <span className="text-white font-medium">{ipo.companyName}</span>
                        {isSme && (
                          <span className="bg-zinc-700 text-zinc-300 text-[10px] px-1.5 py-0.5 rounded font-medium">
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
                    <div className="text-white">{priceInfo.value}</div>
                    <div className="text-xs text-zinc-500">{priceInfo.percent}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-white">₹{gmpValue}</div>
                    <div className="text-xs text-zinc-500">{gmpPercent}%</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-white">{estListing.price}</div>
                    <div className="text-xs text-zinc-500">{estListing.percent}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className={expectedProfit >= 0 ? 'text-green-400' : 'text-red-400'}>
                      ₹{expectedProfit}
                    </div>
                    <div className="text-xs text-zinc-500">Profit</div>
                  </td>
                  <td className="px-4 py-4 text-white">{lotSizeNum}</td>
                  <td className="px-4 py-4 text-white">{ipo.issueSize || "TBA"}</td>
                  <td className="px-4 py-4 text-white">-</td>
                  <td className="px-4 py-4">
                    <div className="bg-green-500/20 text-green-400 text-xs px-3 py-2 rounded-lg text-center inline-block min-w-[70px]">
                      <div className="font-medium">{biddingDates.start}</div>
                      {biddingDates.end && (
                        <>
                          <div className="text-zinc-500 text-[10px]">to</div>
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
