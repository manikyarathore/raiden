/** RAIDEN without a server: the published timetable comes as one file (raiden.json on GitHub Pages) and the app
 *  works out everything on the phone — your day, the week, free rooms, free hours, who's free, updates.
 *  Same answers as the CTTGS server's /api/m endpoints, so the screens don't know the difference. */
import type { Day, FeedItem, Item, Me, Options, Schedule } from "./api";
import { addDays, today } from "./time";

export const DATA_URL: string = import.meta.env.VITE_DATA_URL || "https://manikyarathore.github.io/raiden/raiden.json";

interface Sess {
  key: string; course: string; type: "TH" | "LAB" | "TUT"; elective: string; faculty: string; tba: boolean; room: string | null;
  day: number; start: number; dur: number; group: string; class: string; size: number;
  divs: Record<string, number[]>; el_divs: string[]; busy: Record<string, number[]>;
}
interface Chg { id: number; date: string; kind: "extra" | "cancel" | "room"; key: string | null; division: string | null; batch: number | null; course: string | null; type: string; faculty: string | null; hour: number | null; dur: number; room: string | null; note: string; at: string | null; }
export interface Bundle {
  format: number; generated_at: string; run_id: number; published_at: string | null; days: string[]; start_hour: number; end_hour: number;
  divisions: Options["divisions"]; rooms: Options["rooms"]; faculty: { name: string; designation: string; hod: boolean; unavailable: [number, number][] }[];
  sessions: Sess[]; changes: Chg[]; announcements: { id: number; title: string; body: string; audience: string; by: string; at: string }[];
}
export interface Profile { role: "student" | "faculty" | "dean"; name: string; division?: string; batch?: number | null; electives?: string[]; faculty_name?: string; }

const K = { data: "raiden.data", profile: "raiden.profile", mode: "raiden.mode" };
const read = <T,>(k: string): T | null => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) as T : null; } catch { return null; } };
const write = (k: string, v: unknown) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch { /* full or private */ } };

/** "local" (default: timetable file, no sign-in) or "server" (sign in to a CTTGS server for the admin and live features) */
export const mode = {
  get: (): "local" | "server" => (read<string>(K.mode) as "local" | "server") || "local",
  set: (m: "local" | "server") => write(K.mode, m),
};
export const profile = { get: () => read<Profile>(K.profile), set: (p: Profile | null) => write(K.profile, p) };

let mem: Bundle | null = read<Bundle>(K.data);
export const cached = () => mem;

/** fetch the newest file; falls back to the copy saved on the phone when offline */
export async function load(force = false): Promise<Bundle> {
  if (mem && !force && Date.now() - (lastTry || 0) < 60_000) return mem;
  lastTry = Date.now();
  try {
    const r = await fetch(`${DATA_URL}?t=${Math.floor(Date.now() / 60000)}`, { cache: "no-store" });
    if (!r.ok) throw new Error(`timetable file: ${r.status}`);
    const b = (await r.json()) as Bundle;
    if (!b.sessions) throw new Error("not a RAIDEN timetable file");
    mem = b;
    write(K.data, b);
    return b;
  } catch (e) {
    if (mem) return mem;
    throw new Error("Can't download the timetable. Check your internet, then pull to refresh.");
  }
}
let lastTry = 0;

// ------------------------------------------------------------------ helpers
const norm = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const dayIndex = (b: Bundle, date: string) => {
  const n = new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" });
  const i = b.days.indexOf(n);
  return i < 0 ? null : i;
};
const floorOf = (b: Bundle, room: string | null) => b.rooms.find((r) => r.code === room)?.floor || null;
const divName = (b: Bundle, id: string | null) => b.divisions.find((d) => d.id === id)?.name || id || "";
const KW: Record<string, string> = { TH: "Lecture", LAB: "Lab", TUT: "Tutorial" };
const divId = (b: Bundle, d?: string | null) => !d ? null : b.divisions.find((x) => x.id === d || x.name.toLowerCase() === d.toLowerCase())?.id || null;

type Who = { division?: string; batch?: number | null; electives?: string[]; faculty?: string; room?: string };

function mine(s: Sess, who: Who) {
  if (who.division) {
    const direct = s.divs[who.division];
    if (s.elective) {
      if (!s.el_divs.includes(who.division) && !direct) return false;
      const ok = !who.electives?.length || who.electives.some((e) => norm(e) && (norm(s.course) + " " + norm(s.group)).includes(norm(e)));
      return ok && (s.type === "TH" || !who.batch || !direct || direct.includes(who.batch));
    }
    if (!direct) return false;
    return s.type === "TH" || !who.batch || direct.includes(who.batch);
  }
  if (who.faculty) return s.faculty === who.faculty && !s.tba;
  if (who.room) return s.room === who.room;
  return false;
}

function extraFor(c: Chg, who: Who) {
  if (who.division) return c.division === who.division && (!c.batch || !who.batch || c.batch === who.batch);
  if (who.faculty) return c.faculty === who.faculty;
  if (who.room) return c.room === who.room;
  return false;
}

function item(b: Bundle, s: Sess, date: string, status: Item["status"] = "normal", room?: string | null, c?: Chg): Item {
  const r = room || s.room;
  return { key: s.key, date, course: s.course, type: s.type, kind: s.elective ? "EL" : s.type, kind_word: KW[s.type], faculty: s.faculty,
    room: r, floor: floorOf(b, r), start: s.start, end: s.start + s.dur, group: s.group, class: s.class, elective: s.elective,
    size: s.size, status, note: c?.note || "", change_id: c?.id ?? null };
}

export function schedule(b: Bundle, who: Who, start: string, days: number): Day[] {
  const base = b.sessions.filter((s) => mine(s, who));
  const out: Day[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(start, i), di = dayIndex(b, date);
    const todays = b.changes.filter((c) => c.date === date);
    const items: Item[] = [];
    if (di != null) {
      for (const s of base.filter((x) => x.day === di)) {
        const cancel = todays.find((c) => c.key === s.key && c.kind === "cancel");
        const mv = todays.find((c) => c.key === s.key && c.kind === "room");
        items.push(cancel ? item(b, s, date, "cancelled", null, cancel) : mv ? item(b, s, date, "room", mv.room, mv) : item(b, s, date));
      }
    }
    for (const c of todays.filter((c) => c.kind === "extra" && extraFor(c, who))) {
      items.push({ key: `extra:${c.id}`, date, course: c.course || "Extra class", type: (c.type as Item["type"]) || "TH", kind: (c.type as Item["type"]) || "TH",
        kind_word: KW[c.type] || "Lecture", faculty: c.faculty || "TBA", room: c.room, floor: floorOf(b, c.room), start: c.hour!, end: c.hour! + c.dur,
        group: c.batch ? `Batch ${c.batch}` : "", class: divName(b, c.division), elective: "", status: "extra", note: c.note, change_id: c.id, size: 0 });
    }
    items.sort((x, y) => x.start - y.start || x.course.localeCompare(y.course));
    out.push({ date, day: new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" }), college_day: di != null, items });
  }
  return out;
}

/** who and what is busy at each hour on one date, after that day's changes */
function occupancy(b: Bundle, date: string) {
  const di = dayIndex(b, date);
  const div = new Map<string, Set<string>>(), fac = new Map<string, Set<number>>(), room = new Map<string, Set<number>>();
  const add = <T,>(m: Map<string, Set<T>>, k: string, v: T) => { if (!m.has(k)) m.set(k, new Set()); m.get(k)!.add(v); };
  const todays = b.changes.filter((c) => c.date === date);
  const cancelled = new Set(todays.filter((c) => c.kind === "cancel").map((c) => c.key));
  const moved = new Map(todays.filter((c) => c.kind === "room").map((c) => [c.key, c.room]));
  if (di != null) {
    for (const s of b.sessions) {
      if (s.day !== di || cancelled.has(s.key)) continue;
      for (let h = s.start; h < s.start + s.dur; h++) {
        for (const [d, bs] of Object.entries(s.busy)) for (const bt of bs) add(div, d, `${h}|${bt}`);
        if (!s.tba) add(fac, s.faculty, h);
        const r = moved.get(s.key) || s.room;
        if (r) add(room, r, h);
      }
    }
  }
  for (const c of todays.filter((c) => c.kind === "extra")) {
    const nb = b.divisions.find((d) => d.id === c.division)?.batches || 1;
    for (let h = c.hour!; h < c.hour! + c.dur; h++) {
      for (const bt of c.batch ? [c.batch] : Array.from({ length: nb }, (_, k) => k + 1)) add(div, c.division!, `${h}|${bt}`);
      if (c.faculty) add(fac, c.faculty, h);
      if (c.room) add(room, c.room, h);
    }
  }
  return { div, fac, room };
}

const divBusy = (div: Map<string, Set<string>>, d: string, h: number, batch?: number | null) =>
  [...(div.get(d) || [])].some((x) => { const [hh, bt] = x.split("|").map(Number); return hh === h && (!batch || bt === batch); });

// ------------------------------------------------------------------ the fake API
export async function localApi(path: string): Promise<any> {
  const u = new URL(path, "http://raiden.local");
  const q = (k: string) => u.searchParams.get(k);
  const p = profile.get();
  if (u.pathname === "/api/m/me") {
    const b = await load().catch(() => cached());
    if (!p) throw Object.assign(new Error("Pick who you are first"), { status: 401 });
    const did = b ? divId(b, p.division) : null;
    return {
      username: p.role === "student" ? (did ? divName(b!, did) : "student") : p.faculty_name || p.role, role: p.role, name: p.name,
      faculty_name: p.faculty_name || null, division: p.division || null, batch: p.batch ?? null, electives: p.electives || [], must_change_password: false,
      published: !!b, run_id: b?.run_id, start_hour: b?.start_hour, end_hour: b?.end_hour, days: b?.days, published_at: b?.published_at,
      division_id: did, division_name: did ? divName(b!, did) : null, local: true, generated_at: b?.generated_at,
    } satisfies Me & Record<string, unknown>;
  }
  const b = await load();
  switch (u.pathname) {
    case "/api/m/schedule": {
      let who: Who;
      if (q("division")) who = { division: divId(b, q("division")) || "", batch: q("batch") ? Number(q("batch")) : null };
      else if (q("faculty")) who = { faculty: q("faculty")! };
      else if (q("room")) who = { room: q("room")! };
      else if (p?.role === "faculty") who = { faculty: p.faculty_name };
      else who = { division: divId(b, p?.division) || "", batch: p?.batch, electives: p?.electives };
      return { who, start_hour: b.start_hour, end_hour: b.end_hour, days: schedule(b, who, q("start") || today(), Number(q("days") || 7)) } satisfies Schedule;
    }
    case "/api/m/options": {
      const courses: Record<string, Set<string>> = {}, electives: Record<string, Set<string>> = {};
      for (const s of b.sessions) for (const d of Object.keys(s.busy)) {
        (courses[d] ||= new Set()).add(s.course);
        if (s.elective) (electives[d] ||= new Set()).add(s.course);
      }
      const arr = (o: Record<string, Set<string>>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, [...v].sort()]));
      return { divisions: b.divisions, faculty: b.faculty.map((f) => f.name).filter((f) => b.sessions.some((s) => s.faculty === f)),
        rooms: [...b.rooms].sort((x, y) => x.code.localeCompare(y.code)), courses: arr(courses), electives: arr(electives),
        start_hour: b.start_hour, end_hour: b.end_hour, days: b.days } satisfies Options;
    }
    case "/api/m/free-rooms": {
      const { room } = occupancy(b, q("date")!);
      const h = Number(q("hour")), dur = Number(q("dur") || 1), min = Number(q("min_seats") || 0);
      return b.rooms.filter((r) => r.capacity >= min && !Array.from({ length: dur }, (_, k) => h + k).some((x) => room.get(r.code)?.has(x)))
        .sort((x, y) => Number(x.lab) - Number(y.lab) || x.code.localeCompare(y.code));
    }
    case "/api/m/free-hours": {
      const date = q("date")!;
      if (dayIndex(b, date) == null) return { date, hours: [] };
      const { div, fac } = occupancy(b, date);
      const d = divId(b, q("division")), f = q("faculty"), bt = q("batch") ? Number(q("batch")) : null;
      const hours = [];
      for (let h = b.start_hour; h < b.end_hour; h++) if (!(d && divBusy(div, d, h, bt)) && !(f && fac.get(f)?.has(h))) hours.push(h);
      return { date, hours };
    }
    case "/api/faculty-status": {
      const d = Math.max(0, b.days.indexOf(q("day") || b.days[0])), h = Number(q("hour") || b.start_hour);
      const nh = b.end_hour - b.start_hour;
      const out = b.faculty.map((f) => {
        const grid: string[][] = b.days.map(() => Array(nh).fill("free"));
        const at = new Map<string, any>();
        for (const [dd, hh] of f.unavailable) if (grid[dd] && hh - b.start_hour < nh) grid[dd][hh - b.start_hour] = "unavailable";
        for (const s of b.sessions.filter((s) => s.faculty === f.name && !s.tba)) for (let k = s.start; k < s.start + s.dur; k++) {
          grid[s.day][k - b.start_hour] = "busy";
          at.set(`${s.day}|${k}`, { course: s.course, kind: s.type, group: `${s.class} ${s.group}`, room: s.room, from: s.start, until: s.start + s.dur });
        }
        const nk = Array.from({ length: b.end_hour - h - 1 }, (_, i) => h + 1 + i).find((k) => at.has(`${d}|${k}`));
        const row = grid[d];
        return { name: f.name, designation: f.designation, hod: f.hod, status: row[h - b.start_hour], now: at.get(`${d}|${h}`) || null,
          next: nk != null ? { hour: nk, ...at.get(`${d}|${nk}`) } : null, free_today: row.filter((x) => x === "free").length,
          busy_today: row.filter((x) => x === "busy").length, week_hours: grid.flat().filter((x) => x === "busy").length, grid };
      });
      const counts = Object.fromEntries(["free", "busy", "unavailable"].map((k) => [k, out.filter((x) => x.status === k).length]));
      return { run_id: b.run_id, published: true, days: b.days, start_hour: b.start_hour, end_hour: b.end_hour, day: b.days[d], hour: h, counts, faculty: out };
    }
    case "/api/m/feed": {
      const did = divId(b, p?.division);
      const aud = new Set(["all", p?.role === "student" ? "students" : "faculty", ...(did ? [did] : [])]);
      const feed: FeedItem[] = b.announcements.filter((a) => p?.role === "dean" || aud.has(a.audience))
        .map((a) => ({ id: `a${a.id}`, type: "announcement", title: a.title, body: a.body, at: a.at, by: a.by, audience: a.audience }));
      const who: Who | null = p?.role === "faculty" ? { faculty: p.faculty_name } : p?.role === "student" ? { division: did || "", batch: p.batch, electives: p.electives } : null;
      if (who) {
        for (const day of schedule(b, who, addDays(today(), -1), 15)) for (const it of day.items) {
          if (it.status === "normal") continue;
          const c = b.changes.find((x) => x.id === it.change_id);
          const word = it.status === "cancelled" ? "Cancelled" : it.status === "room" ? `Room changed to ${it.room}` : "Extra class";
          const when = new Date(day.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" });
          feed.push({ id: `c${it.change_id}`, type: "change", status: it.status, title: `${word}: ${it.course}`, at: c?.at || null,
            body: `${when} · ${it.start}:00–${it.end}:00${it.room ? ` · ${it.room}` : ""}${it.note ? ` — ${it.note}` : ""}` });
        }
      }
      return feed.sort((x, y) => (y.at || "").localeCompare(x.at || ""));
    }
    case "/api/m/requests": return [];
    case "/api/m/changes": return [];
  }
  throw Object.assign(new Error("Needs the CTTGS server"), { status: 404 });
}
