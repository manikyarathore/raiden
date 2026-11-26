import { useState } from "react";
import { DatePills, DayList } from "../components/Schedule";
import { ErrorNote, Segmented, Spinner } from "../components/ui";
import type { Me } from "../lib/api";
import { useSchedule } from "../lib/hooks";
import { addDays, fmtDay, today } from "../lib/time";
import { NotPublished } from "./Home";

/** Monday of the week that holds d */
const monday = (d: string) => { const x = new Date(d + "T00:00:00"); const k = (x.getDay() + 6) % 7; return addDays(d, -k); };

export default function Week({ me }: { me: Me }) {
  const [which, setWhich] = useState<"this" | "next">("this");
  const start = which === "this" ? monday(today()) : addDays(monday(today()), 7);
  const s = useSchedule({ start }, 6, me.published);
  const [pick, setPick] = useState(today());
  const days = s.data?.days || [];
  const sel = days.find((d) => d.date === pick) || days[0];
  const hours = days.reduce((n, d) => n + d.items.filter((i) => i.status !== "cancelled").reduce((a, i) => a + i.end - i.start, 0), 0);
  return (
    <div className="space-y-5">
      <div>
        <p className="label">{me.role === "faculty" ? "Your teaching week" : "Your week"}</p>
        <h1 className="display mt-1 text-[30px]">Timetable<em>.</em></h1>
      </div>
      <Segmented value={which} onChange={(v) => { setWhich(v); setPick(v === "this" ? today() : addDays(monday(today()), 7)); }}
        options={[{ value: "this", label: "This week" }, { value: "next", label: "Next week" }]} />
      {!me.published ? <NotPublished /> : s.isLoading ? <Spinner /> : s.error ? <ErrorNote error={s.error} /> : sel && (
        <>
          <DatePills days={days} value={sel.date} onChange={setPick} />
          <div className="flex items-baseline justify-between">
            <h2 className="acc-title text-[17px]">{fmtDay(sel.date, { weekday: "long", day: "numeric", month: "short" })}</h2>
            <span className="label">{hours} h this week</span>
          </div>
          <DayList day={sel} forFaculty={me.role === "faculty"} />
        </>
      )}
    </div>
  );
}
