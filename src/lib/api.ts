import { Capacitor } from "@capacitor/core";

/** where the CTTGS server is: saved on the sign-in screen. In the browser during development it is the same origin. */
const K = { server: "raiden.server", token: "raiden.token", user: "raiden.user" };
const get = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const set = (k: string, v: string | null) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* private mode */ } };

export const native = Capacitor.isNativePlatform();
export const server = {
  get: () => get(K.server) || (native ? "" : ""),
  set: (v: string) => set(K.server, v.trim().replace(/\/+$/, "")),
};
export const session = {
  token: () => get(K.token),
  save: (t: string) => set(K.token, t),
  clear: () => { set(K.token, null); set(K.user, null); },
};

export class ApiError extends Error { constructor(msg: string, public status: number) { super(msg); } }

export async function api<T = any>(path: string, opts: { method?: string; json?: unknown; auth?: boolean; form?: FormData } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const t = session.token();
  if (t && opts.auth !== false) headers.Authorization = `Bearer ${t}`;
  let body: BodyInit | undefined;
  if (opts.json !== undefined) { headers["Content-Type"] = "application/json"; body = JSON.stringify(opts.json); }
  if (opts.form) body = opts.form;
  let r: Response;
  try {
    r = await fetch(server.get() + path, { method: opts.method || (body ? "POST" : "GET"), headers, body });
  } catch {
    throw new ApiError("Can't reach the server. Check the server address and your Wi-Fi.", 0);
  }
  const text = await r.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!r.ok) {
    const msg = typeof data?.detail === "string" ? data.detail : Array.isArray(data?.detail) ? data.detail.map((d: any) => d.msg).join("; ") : `Error ${r.status}`;
    if (r.status === 401 && opts.auth !== false) { session.clear(); window.dispatchEvent(new Event("raiden:logout")); }
    throw new ApiError(msg, r.status);
  }
  return data as T;
}

// ------------------------------------------------------------------ types
export type Role = "student" | "faculty" | "dean" | "admin";
export interface Me {
  username: string; role: Role; name: string; faculty_name?: string | null; division?: string | null; batch?: number | null;
  electives: string[]; must_change_password: boolean; published: boolean; run_id?: number; start_hour?: number; end_hour?: number;
  days?: string[]; published_at?: string | null; division_id?: string | null; division_name?: string | null;
}
export interface Item {
  key: string; date: string; course: string; type: "TH" | "LAB" | "TUT"; kind: "TH" | "LAB" | "TUT" | "EL"; kind_word: string;
  faculty: string; room: string | null; floor?: string | null; start: number; end: number; group: string; class: string;
  elective: string; size?: number; status: "normal" | "cancelled" | "room" | "extra"; note: string; change_id: number | null;
}
export interface Day { date: string; day: string; college_day: boolean; items: Item[]; }
export interface Schedule { who: Record<string, any>; start_hour: number; end_hour: number; days: Day[]; }
export interface Options {
  divisions: { id: string; name: string; programme: string; sem: number; batches: number; size: number }[];
  faculty: string[]; rooms: { code: string; capacity: number; floor: string; lab: boolean }[];
  courses: Record<string, string[]>; electives: Record<string, string[]>; start_hour: number; end_hour: number; days: string[];
}
export interface FeedItem { id: string; type: "announcement" | "change" | "request" | "pending"; title: string; body: string; at: string | null; status?: string; by?: string; audience?: string; ann_id?: number; }
export interface Req { id: number; username: string; faculty: string; kind: string; date: string | null; key: string | null; text: string; status: "pending" | "approved" | "rejected"; response: string; decided_by: string | null; at: string; }
export interface Change { id: number; date: string; kind: "extra" | "cancel" | "room"; course: string | null; group: string; faculty: string | null; hour: number | null; dur: number; room: string | null; note: string; by: string; }
