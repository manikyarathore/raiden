import { useQuery } from "@tanstack/react-query";
import { api, type FeedItem, type Me, type Options, type Schedule } from "./api";
import { today } from "./time";

export const useMe = (enabled = true) => useQuery({ queryKey: ["me"], queryFn: () => api<Me>("/api/m/me"), enabled });
export function useSchedule(q: Record<string, string | number | undefined | null> = {}, days = 7, enabled = true) {
  const p = new URLSearchParams({ start: String(q.start || today()), days: String(days) });
  for (const [k, v] of Object.entries(q)) if (v != null && v !== "" && k !== "start") p.set(k, String(v));
  return useQuery({ queryKey: ["schedule", p.toString()], queryFn: () => api<Schedule>(`/api/m/schedule?${p}`), enabled });
}
export const useOptions = (enabled = true) => useQuery({ queryKey: ["options"], queryFn: () => api<Options>("/api/m/options"), enabled, staleTime: 300_000 });
export const useFeed = () => useQuery({ queryKey: ["feed"], queryFn: () => api<FeedItem[]>("/api/m/feed"), refetchInterval: 120_000 });
