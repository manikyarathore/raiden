import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CalendarX2, RefreshCw } from "lucide-react";
import { DayList, NextCard } from "../components/Schedule";
import { Empty, ErrorNote, Spinner } from "../components/ui";
import type { Me } from "../lib/api";
import { load } from "../lib/local";
import { useFeed, useSchedule } from "../lib/hooks";
import { fmtDay, today } from "../lib/time";

export function greet(me: Me) {
  const h = new Date().getHours();
  const t = me.name.match(/^(Dr|Prof|Mr|Ms|Mrs)\.?\s+/i);
  const rest = me.name.slice(t ? t[0].length : 0).trim().split(/\s+/);
  const who = t && me.role !== "student" ? `${t[1]}. ${rest[rest.length - 1]}` : rest[0];
  return `${h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"}, ${who}`;
}

export function NotPublished() {
  return <Empty title="No timetable yet" icon={<CalendarX2 size={22} />}>The timetable hasn't been published. You'll see your classes here as soon as it is.</Empty>;
}

export default function Home({ me }: { me: Me }) {
  const qc = useQueryClient();
  const s = useSchedule({}, 7, me.published);
  const feed = useFeed();
  const changes = (feed.data || []).filter((f) => f.type === "change" || f.type === "announcement").slice(0, 2);
  const forFaculty = me.role === "faculty";
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="label">{fmtDay(today(), { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="display mt-1 text-[28px] leading-tight">{greet(me)}<em>.</em></h1>
          <p className="mt-0.5 text-sm text-ink-2">{forFaculty ? me.faculty_name : [me.division_name || me.division, me.batch ? `Batch ${me.batch}` : ""].filter(Boolean).join(" · ")}</p>
        </div>
        <button onClick={async () => { if (me.local) await load(true).catch(() => null); qc.invalidateQueries(); }} className="grid size-9 place-items-center rounded-full bg-sheet ring-1 ring-grid" aria-label="Refresh">
          <RefreshCw size={16} className={s.isFetching ? "animate-spin" : ""} /></button>
      </div>
      {!me.published ? <NotPublished /> : s.isLoading ? <Spinner label="Loading your day" /> : s.error ? <ErrorNote error={s.error} /> : s.data && (
        <>
          <NextCard days={s.data.days} forFaculty={forFaculty} />
          {changes.length > 0 && (
            <div className="space-y-2">
              {changes.map((c) => (
                <div key={c.id} className="flex items-start gap-3 rounded-2xl bg-[color-mix(in_srgb,var(--acc)_9%,var(--sheet))] px-4 py-3">
                  <AlertTriangle size={17} className="mt-0.5 shrink-0 text-[var(--acc)]" />
                  <div className="min-w-0 text-sm"><b className="font-semibold">{c.title}</b><div className="text-ink-2">{c.body}</div></div>
                </div>
              ))}
            </div>
          )}
          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="acc-title text-[17px]">Today</h2>
              <span className="label">{s.data.days[0].items.filter((i) => i.status !== "cancelled").length} classes</span>
            </div>
            <DayList day={s.data.days[0]} forFaculty={forFaculty} />
          </section>
        </>
      )}
    </div>
  );
}
