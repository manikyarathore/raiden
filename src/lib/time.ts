import type { Item } from "./api";

export const pad = (n: number) => String(n).padStart(2, "0");
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => ymd(new Date());
export const addDays = (s: string, n: number) => { const d = new Date(s + "T00:00:00"); d.setDate(d.getDate() + n); return ymd(d); };
export const hh = (h: number) => `${pad(h)}:00`;
export const h12 = (h: number) => `${((h + 11) % 12) + 1}${h < 12 ? "am" : "pm"}`;
export const at = (date: string, hour: number) => new Date(`${date}T${pad(hour)}:00:00`);
export const fmtDay = (s: string, o: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) =>
  new Date(s + "T00:00:00").toLocaleDateString("en-IN", o);

export function rel(ms: number) {
  const m = Math.round(ms / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

export function ago(iso: string | null) {
  if (!iso) return "";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/** the class happening now and the next one, from a list of dated items (cancelled ones skipped) */
export function nowNext(items: Item[], now = new Date()) {
  const live = items.filter((i) => i.status !== "cancelled").sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start);
  const current = live.find((i) => at(i.date, i.start) <= now && now < at(i.date, i.end)) || null;
  const next = live.find((i) => at(i.date, i.start) > now) || null;
  return { current, next };
}
