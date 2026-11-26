import { LocalNotifications } from "@capacitor/local-notifications";
import { native, type FeedItem, type Item } from "./api";
import { at } from "./time";

const K = { on: "raiden.remind", min: "raiden.remind.min", seen: "raiden.feed.seen" };
export const reminders = {
  on: () => { try { return localStorage.getItem(K.on) !== "off"; } catch { return true; } },
  minutes: () => { try { return Number(localStorage.getItem(K.min)) || 10; } catch { return 10; } },
  set(on: boolean, min?: number) { try { localStorage.setItem(K.on, on ? "on" : "off"); if (min) localStorage.setItem(K.min, String(min)); } catch { /* */ } },
};

async function allowed() {
  if (!native) return false;
  const p = await LocalNotifications.checkPermissions();
  if (p.display === "granted") return true;
  return (await LocalNotifications.requestPermissions()).display === "granted";
}

/** a reminder before each class of the coming week (ids 1000+); replaces the old set */
export async function scheduleReminders(items: Item[]) {
  if (!native) return;
  try {
    const pending = await LocalNotifications.getPending();
    const old = pending.notifications.filter((n) => n.id >= 1000 && n.id < 5000);
    if (old.length) await LocalNotifications.cancel({ notifications: old.map((n) => ({ id: n.id })) });
    if (!reminders.on() || !(await allowed())) return;
    const min = reminders.minutes(), now = Date.now();
    const list = items.filter((i) => i.status !== "cancelled")
      .map((i, k) => ({ i, k, when: at(i.date, i.start).getTime() - min * 60000 }))
      .filter((x) => x.when > now).slice(0, 60);
    if (!list.length) return;
    await LocalNotifications.schedule({
      notifications: list.map(({ i, k, when }) => ({
        id: 1000 + k, title: `${i.course} in ${min} min`,
        body: `${i.room ? i.room + (i.floor ? ` · ${i.floor}` : "") : "Room TBA"} · ${i.kind_word}${i.status === "extra" ? " (extra class)" : i.status === "room" ? " (room changed)" : ""}`,
        schedule: { at: new Date(when), allowWhileIdle: true }, smallIcon: "ic_stat_raiden", iconColor: "#ff4d1a",
      })),
    });
  } catch { /* notifications are a nicety */ }
}

/** pop a notification for feed items not seen before (checked whenever the app opens or comes back) */
export async function notifyNew(feed: FeedItem[]) {
  let seen: string[] = [];
  try { seen = JSON.parse(localStorage.getItem(K.seen) || "[]"); } catch { /* */ }
  const first = !seen.length;
  const fresh = feed.filter((f) => !seen.includes(f.id) && f.type !== "pending");
  try { localStorage.setItem(K.seen, JSON.stringify(feed.map((f) => f.id).slice(0, 200))); } catch { /* */ }
  if (first || !fresh.length || !native || !(await allowed())) return;
  try {
    await LocalNotifications.schedule({
      notifications: fresh.slice(0, 5).map((f, k) => ({ id: 5000 + ((Date.now() / 1000 + k) % 4000 | 0), title: f.title, body: f.body.slice(0, 180), smallIcon: "ic_stat_raiden", iconColor: "#ff4d1a" })),
    });
  } catch { /* */ }
}
