import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type Ipo, type WatchlistItem } from "@shared/schema";

export function useIpos(filters?: { status?: 'upcoming' | 'open' | 'closed'; sector?: string }) {
  return useQuery({
    queryKey: [api.ipos.list.path, filters],
    queryFn: async () => {
      const url = filters 
        ? buildUrl(api.ipos.list.path) + '?' + new URLSearchParams(filters as any).toString()
        : api.ipos.list.path;
        
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch IPOs");
      return api.ipos.list.responses[200].parse(await res.json());
    },
  });
}

export function useIpo(id: number) {
  return useQuery({
    queryKey: [api.ipos.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.ipos.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch IPO");
      return api.ipos.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useWatchlist() {
  return useQuery({
    queryKey: [api.watchlist.list.path],
    queryFn: async () => {
      const res = await fetch(api.watchlist.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch watchlist");
      return api.watchlist.list.responses[200].parse(await res.json());
    },
  });
}

export function useAddToWatchlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ipoId: number) => {
      const validated = api.watchlist.add.input.parse({ ipoId });
      const res = await fetch(api.watchlist.add.path, {
        method: api.watchlist.add.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 400) {
           const error = api.watchlist.add.responses[400].parse(await res.json());
           throw new Error(error.message);
        }
        throw new Error("Failed to add to watchlist");
      }
      return api.watchlist.add.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.watchlist.list.path] });
    },
  });
}

export function useRemoveFromWatchlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.watchlist.remove.path, { id });
      const res = await fetch(url, { 
        method: api.watchlist.remove.method,
        credentials: "include" 
      });
      
      if (!res.ok) throw new Error("Failed to remove from watchlist");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.watchlist.list.path] });
    },
  });
}
