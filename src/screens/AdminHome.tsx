import { useQuery } from "@tanstack/react-query";
import { ArrowRightLeft, CalendarPlus, Inbox, Megaphone, XCircle } from "lucide-react";
import { Clock } from "../components/Logo";
import { Card } from "../components/ui";
import { api, type Change, type Me, type Req } from "../lib/api";
import { fmtDay, today } from "../lib/time";
import { greet, NotPublished } from "./Home";
import { Upcoming } from "./Manage";

export default function AdminHome({ me, go }: { me: Me; go: (t: string) => void }) {
  const reqs = useQuery({ queryKey: ["requests"], queryFn: () => api<Req[]>("/api/m/requests") });
  const ch = useQuery({ queryKey: ["changes"], queryFn: () => api<Change[]>(`/api/m/changes?start=${today()}&days=60`), enabled: me.published });
  const pending = (reqs.data || []).filter((r) => r.status === "pending").length;
  const todays = (ch.data || []).filter((c) => c.date === today()).length;
  const actions = [
    { icon: <CalendarPlus size={19} />, label: "Extra class", tab: "manage" }, { icon: <XCircle size={19} />, label: "Cancel a class", tab: "manage" },
    { icon: <ArrowRightLeft size={19} />, label: "Change room", tab: "manage" }, { icon: <Megaphone size={19} />, label: "Announce", tab: "updates" },
  ];
  return (
    <div className="space-y-6">
      <div>
        <p className="label">{fmtDay(today(), { weekday: "long", day: "numeric", month: "long" })} · Admin</p>
        <h1 className="display mt-1 text-[28px] leading-tight">{greet(me)}<em>.</em></h1>
      </div>
      {!me.published ? <NotPublished /> : (
        <div className="lit relative overflow-hidden bg-ink p-5 text-paper">
          <Clock size={92} ink="var(--paper)" current={new Date().getHours() % 12} className="absolute -right-4 -top-4 opacity-25" />
          <div className="mono text-[11px] uppercase tracking-[.14em] opacity-60">Published timetable</div>
          <div className="display mt-1 text-[22px] !text-paper">Run {me.run_id}</div>
          <p className="text-[13px] opacity-70">{me.published_at ? `since ${new Date(me.published_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : ""}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button onClick={() => go("updates")} className="rounded-2xl bg-white/10 p-3 text-left"><div className="display text-[30px] !text-[var(--acc)]">{pending}</div><div className="text-[12px] opacity-75">requests waiting</div></button>
            <div className="rounded-2xl bg-white/10 p-3"><div className="display text-[30px] !text-paper">{todays}</div><div className="text-[12px] opacity-75">changes today</div></div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2.5">
        {actions.map((a) => (
          <Card key={a.label} onClick={() => go(a.tab)} className="flex items-center gap-3 !p-3.5">
            <span className="grid size-9 place-items-center rounded-xl bg-sheet-2 text-ink">{a.icon}</span><b className="text-[14px] font-semibold leading-tight">{a.label}</b>
          </Card>
        ))}
      </div>
      {pending > 0 && (
        <Card onClick={() => go("updates")} className="flex items-center gap-3 !p-3.5">
          <Inbox size={18} className="text-warn" /><span className="flex-1 text-sm"><b className="font-semibold">{pending} change request{pending > 1 ? "s" : ""}</b> from teachers</span><span className="label">Open</span>
        </Card>
      )}
      {me.published && <Upcoming limit={6} />}
    </div>
  );
}
