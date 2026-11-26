import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { Search } from "lucide-react";
import { useState } from "react";
import { DayList } from "../components/Schedule";
import { ErrorNote, Field, Segmented, Select, Sheet, Spinner } from "../components/ui";
import { api, type Me } from "../lib/api";
import { useSchedule } from "../lib/hooks";
import { hh, today } from "../lib/time";
import { NotPublished } from "./Home";
import { HourSelect, nowHour } from "./Tools";

interface Fac { name: string; designation: string; hod: boolean; status: "free" | "busy" | "unavailable"; now: any; next: any; free_today: number; busy_today: number; week_hours: number; }
const DOT = { free: "var(--ok)", busy: "var(--acc)", unavailable: "var(--ink-3)" };
const WORD = { free: "Free", busy: "In class", unavailable: "Away" };

export default function DeanNow({ me }: { me: Me }) {
  const days = me.days || ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const todayName = new Date().toLocaleDateString("en-US", { weekday: "short" });
  const [day, setDay] = useState(days.includes(todayName) ? todayName : days[0]);
  const [hour, setHour] = useState(nowHour(me));
  const [filter, setFilter] = useState<"all" | "hod" | "free">("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const st = useQuery({
    queryKey: ["faculty-status", day, hour], enabled: me.published,
    queryFn: () => api<{ counts: Record<string, number>; faculty: Fac[] }>(`/api/faculty-status?day=${day}&hour=${hour}`), refetchInterval: 60_000,
  });
  const list = (st.data?.faculty || []).filter((f) => (filter === "hod" ? f.hod : filter === "free" ? f.status === "free" : true) && f.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-5">
      <div><p className="label">Faculty right now</p><h1 className="display mt-1 text-[30px]">Who's free<em>.</em></h1></div>
      <div className="grid grid-cols-[1fr_1fr] gap-3">
        <Field label="Day"><Select value={day} onChange={setDay}>{days.map((d) => <option key={d}>{d}</option>)}</Select></Field>
        <Field label="Time"><HourSelect me={me} value={hour} onChange={setHour} /></Field>
      </div>
      {!me.published ? <NotPublished /> : st.isLoading ? <Spinner /> : st.error ? <ErrorNote error={st.error} /> : st.data && (
        <>
          <div className="grid grid-cols-3 gap-2.5">
            {(["free", "busy", "unavailable"] as const).map((k) => (
              <div key={k} className="lit bg-sheet p-3.5">
                <div className="display text-[30px] leading-none" style={{ color: DOT[k] }}>{st.data.counts[k] || 0}</div>
                <div className="label mt-1.5">{WORD[k]}</div>
              </div>
            ))}
          </div>
          <Segmented value={filter} onChange={setFilter} options={[{ value: "all", label: "All" }, { value: "hod", label: "HODs" }, { value: "free", label: "Free now" }]} />
          <div className="relative"><Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" />
            <input className="field !pl-11" placeholder="Search a teacher" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <div className="space-y-2">
            {list.map((f) => (
              <button key={f.name} onClick={() => setOpen(f.name)} className="tap flex w-full items-center gap-3 rounded-2xl bg-sheet p-3.5 text-left ring-1 ring-grid">
                <span className={clsx("size-2.5 shrink-0 rounded-full", f.status === "busy" && "pulse")} style={{ background: DOT[f.status] }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><b className="truncate font-semibold">{f.name}</b>{f.hod && <span className="mono rounded-full bg-ink px-1.5 py-0.5 text-[9.5px] font-semibold text-paper">HOD</span>}</div>
                  <div className="truncate text-[12.5px] text-ink-2">
                    {f.status === "busy" && f.now ? `${f.now.course} · ${f.now.group} · ${f.now.room} until ${hh(f.now.until)}`
                      : f.status === "unavailable" ? "Not available at this time"
                      : f.next ? `Free · next ${f.next.course} at ${hh(f.next.hour)} in ${f.next.room}` : "Free for the rest of the day"}
                  </div>
                </div>
                <span className="mono shrink-0 text-[11px] text-ink-3">{f.busy_today} h</span>
              </button>
            ))}
          </div>
        </>
      )}
      <Sheet open={!!open} onClose={() => setOpen(null)} title={open || ""}>{open && <FacultyDay name={open} />}</Sheet>
    </div>
  );
}

function FacultyDay({ name }: { name: string }) {
  const s = useSchedule({ faculty: name, start: today() }, 1);
  if (s.isLoading) return <Spinner />;
  if (s.error) return <ErrorNote error={s.error} />;
  return <><p className="label mb-3">Today</p>{s.data && <DayList day={s.data.days[0]} forFaculty />}</>;
}
