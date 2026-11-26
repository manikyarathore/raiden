import { App as CapApp } from "@capacitor/app";
import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Bell, CalendarDays, Compass, House, LayoutGrid, Search, UserRound, Users, Wrench } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Spinner } from "./components/ui";
import { Clock } from "./components/Logo";
import { native, session, type Me, type Role } from "./lib/api";
import { useFeed, useMe, useSchedule } from "./lib/hooks";
import { notifyNew, scheduleReminders } from "./lib/notify";
import AdminHome from "./screens/AdminHome";
import DeanNow from "./screens/DeanNow";
import Home from "./screens/Home";
import Login, { ChangePassword } from "./screens/Login";
import Lookup from "./screens/Lookup";
import Manage from "./screens/Manage";
import MeScreen from "./screens/Me";
import Tools from "./screens/Tools";
import Updates from "./screens/Updates";
import Week from "./screens/Week";

type Tab = { id: string; label: string; icon: ReactNode; el: (me: Me, go: (t: string) => void) => ReactNode };
const T = {
  home: { id: "home", label: "Today", icon: <House size={21} />, el: (me: Me) => <Home me={me} /> },
  week: { id: "week", label: "Week", icon: <CalendarDays size={21} />, el: (me: Me) => <Week me={me} /> },
  tools: { id: "tools", label: "Tools", icon: <Wrench size={21} />, el: (me: Me) => <Tools me={me} /> },
  updates: { id: "updates", label: "Updates", icon: <Bell size={21} />, el: (me: Me) => <Updates me={me} /> },
  me: { id: "me", label: "Me", icon: <UserRound size={21} />, el: (me: Me) => <MeScreen me={me} /> },
  now: { id: "now", label: "Who's free", icon: <Users size={21} />, el: (me: Me) => <DeanNow me={me} /> },
  lookup: { id: "lookup", label: "Look up", icon: <Search size={21} />, el: (me: Me) => <Lookup me={me} /> },
  admin: { id: "admin", label: "Today", icon: <LayoutGrid size={21} />, el: (me: Me, go: (t: string) => void) => <AdminHome me={me} go={go} /> },
  manage: { id: "manage", label: "Manage", icon: <Compass size={21} />, el: (me: Me) => <Manage me={me} /> },
} satisfies Record<string, Tab>;
const TABS: Record<Role, Tab[]> = {
  student: [T.home, T.week, T.updates, T.me],
  faculty: [T.home, T.week, T.tools, T.updates, T.me],
  dean: [T.now, T.lookup, T.updates, T.me],
  admin: [T.admin, T.manage, T.lookup, T.updates, T.me],
};

export default function App() {
  const [authed, setAuthed] = useState(!!session.token());
  const qc = useQueryClient();
  useEffect(() => {
    const f = () => { setAuthed(false); qc.clear(); };
    window.addEventListener("raiden:logout", f);
    return () => window.removeEventListener("raiden:logout", f);
  }, [qc]);
  if (!authed) return <Login onDone={() => setAuthed(true)} />;
  return <Signed />;
}

function Signed() {
  const me = useMe();
  const qc = useQueryClient();
  const [tab, setTab] = useState<string>("");
  const tabs = useMemo(() => (me.data ? TABS[me.data.role] || TABS.student : []), [me.data]);
  const cur = tabs.find((t) => t.id === tab) || tabs[0];

  // Android back: close sheets first (they listen for raiden:back), then go to the first tab, then leave
  useEffect(() => {
    if (!native) return;
    const h = CapApp.addListener("backButton", () => {
      const ev = new Event("raiden:back", { cancelable: true });
      if (!window.dispatchEvent(ev)) return;
      if (cur && tabs[0] && cur.id !== tabs[0].id) setTab(tabs[0].id); else CapApp.exitApp();
    });
    const r = CapApp.addListener("resume", () => qc.invalidateQueries());
    return () => { h.then((x) => x.remove()); r.then((x) => x.remove()); };
  }, [cur, tabs, qc]);

  if (me.isLoading) return <div className="grid h-full place-items-center"><Spinner label="Opening Raiden" /></div>;
  if (me.error || !me.data) {
    return (
      <div className="grid h-full place-items-center p-8 text-center">
        <div><p className="display text-xl">Can't load your account</p><p className="mt-2 text-sm text-ink-2">{(me.error as Error)?.message}</p>
          <button className="shine mt-5 px-5 py-3 font-semibold" onClick={() => { session.clear(); window.dispatchEvent(new Event("raiden:logout")); }}>Sign in again</button></div>
      </div>
    );
  }
  if (me.data.must_change_password) return <ChangePassword me={me.data} />;
  return (
    <div className="flex h-full flex-col">
      <Background me={me.data} />
      <main key={cur.id} className="safe-top no-scrollbar flex-1 overflow-y-auto px-5 pb-28">
        <header className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5"><Clock size={30} /><span className="display text-[21px]">Raiden</span></div>
          <button onClick={() => setTab("me")} className="grid size-9 place-items-center rounded-full bg-ink text-[14px] font-semibold text-paper" aria-label="Me">
            {me.data.name.replace(/^(Dr|Prof|Mr|Ms|Mrs)\.?\s+/i, "").slice(0, 1).toUpperCase()}
          </button>
        </header>
        {cur.el(me.data, setTab)}
      </main>
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-grid bg-[var(--nav)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg justify-around px-2 pt-1.5">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} aria-current={t.id === cur.id}
              className={clsx("flex min-w-[60px] flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10.5px] font-semibold", t.id === cur.id ? "text-ink" : "text-ink-3")}>
              <span className="relative">{t.icon}{t.id === cur.id && <i className="absolute -right-1.5 -top-0.5 size-1.5 rounded-full bg-[var(--acc)]" />}</span>{t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

/** keeps class reminders and new-update notifications in sync while the app is open */
function Background({ me }: { me: Me }) {
  const mine = me.role === "student" || me.role === "faculty";
  const s = useSchedule({}, 7, mine && me.published);
  const feed = useFeed();
  useEffect(() => { if (s.data) scheduleReminders(s.data.days.flatMap((d) => d.items)); }, [s.data]);
  useEffect(() => { if (feed.data) notifyNew(feed.data); }, [feed.data]);
  return null;
}
