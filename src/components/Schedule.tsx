import clsx from "clsx";
import { Coffee, MapPin, User, Users } from "lucide-react";
import { useEffect, useState } from "react";
import type { Day, Item } from "../lib/api";
import { addDays, at, fmtDay, hh, nowNext, rel, today } from "../lib/time";
import { Clock } from "./Logo";
import { Empty, KindChip, StatusChip, kindColor } from "./ui";

export function useNow(ms = 30000) {
  const [n, setN] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setN(new Date()), ms); return () => clearInterval(t); }, [ms]);
  return n;
}

/** who to show under the course: students see the teacher, teachers see the class */
const sub = (i: Item, forFaculty: boolean) => !forFaculty ? i.faculty
  : i.elective ? `${i.class} · ${i.elective}${/lab grp|batch/i.test(i.group) ? " lab" : ""}` : (i.group || i.class).replace(/-B(\d)$/, " · Batch $1");

export function NextCard({ days, forFaculty }: { days: Day[]; forFaculty: boolean }) {
  const now = useNow(15000);
  const all = days.flatMap((d) => d.items);
  const { current, next } = nowNext(all, now);
  const it = current || next;
  if (!it) {
    return (
      <div className="lit graph overflow-hidden p-5">
        <div className="label">Next class</div>
        <p className="display mt-3 text-[28px] leading-tight">Nothing coming up<em>.</em></p>
        <p className="mt-1 text-sm text-ink-2">No classes in the next week.</p>
      </div>
    );
  }
  const s = at(it.date, it.start).getTime(), e = at(it.date, it.end).getTime(), t = now.getTime();
  const isNow = !!current && it === current;
  // the clock: during a class the orange dot walks round as it goes; before one it counts the last hour down
  const step = isNow ? Math.min(11, Math.floor(((t - s) / (e - s)) * 12)) : Math.max(0, 11 - Math.min(11, Math.floor((s - t) / 300000)));
  const when = it.date === today() ? "" : it.date === addDays(today(), 1) ? "Tomorrow · " : fmtDay(it.date, { weekday: "long" }) + " · ";
  return (
    <div className="rise lit relative overflow-hidden bg-ink p-5 text-paper">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mono flex items-center gap-2 text-[11px] uppercase tracking-[.14em] text-[color-mix(in_srgb,var(--paper)_60%,transparent)]">
            {isNow ? <><span className="pulse size-2 rounded-full bg-[var(--acc)]" />Now · ends in {rel(e - t)}</> : <>Next · {when}in {rel(s - t)}</>}
          </div>
          <h2 className={`display mt-2 leading-[1.08] !text-paper ${it.course.length > 34 ? "text-[22px]" : "text-[27px]"}`}>{it.course}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2"><KindChip kind={it.kind} word={it.kind_word} /><StatusChip status={it.status} /></div>
        </div>
        <Clock size={58} current={step} ink="var(--paper)" className="shrink-0" />
      </div>
      <div className="mt-5 grid grid-cols-[auto_1fr] items-end gap-x-5">
        <div>
          <div className="mono text-[10.5px] uppercase tracking-[.14em] text-[color-mix(in_srgb,var(--paper)_55%,transparent)]">Room</div>
          <div className="display text-[40px] leading-none !text-[var(--acc)]">{it.room?.replace(/^E\./, "") || "TBA"}</div>
        </div>
        <div className="min-w-0 pb-1 text-right text-[13px] leading-snug text-[color-mix(in_srgb,var(--paper)_75%,transparent)]">
          <div className="mono">{hh(it.start)}–{hh(it.end)}</div>
          {it.floor && <div>{it.room} · {it.floor}</div>}
          <div className="truncate">{sub(it, forFaculty)}</div>
        </div>
      </div>
      {it.note && <p className="mt-3 rounded-xl bg-white/10 px-3 py-2 text-[13px]">{it.note}</p>}
    </div>
  );
}

export function ClassRow({ it, forFaculty, live }: { it: Item; forFaculty: boolean; live?: boolean }) {
  const off = it.status === "cancelled";
  return (
    <div className={clsx("relative flex gap-3 rounded-2xl bg-sheet p-3.5 ring-1", live ? "ring-2 ring-[var(--acc)]" : "ring-grid", off && "opacity-60")}>
      <div className="w-[52px] shrink-0 pt-0.5 text-right">
        <div className="mono text-[13px] font-semibold">{hh(it.start)}</div>
        <div className="mono text-[11px] text-ink-3">{hh(it.end)}</div>
      </div>
      <div className="w-[3px] shrink-0 rounded-full" style={{ background: kindColor(it.kind) }} />
      <div className="min-w-0 flex-1">
        <div className={clsx("font-semibold leading-snug", off && "line-through")}>{it.course}</div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-2">
          <span className="flex items-center gap-1"><MapPin size={13} className="text-ink-3" /><b className="font-semibold text-ink">{it.room || "TBA"}</b>{it.floor && <span className="text-ink-3">· {it.floor}</span>}</span>
          <span className="flex min-w-0 items-center gap-1 truncate">{forFaculty ? <Users size={13} className="text-ink-3" /> : <User size={13} className="text-ink-3" />}{sub(it, forFaculty)}</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5"><KindChip kind={it.kind} word={it.kind_word} /><StatusChip status={it.status} />
          {it.elective && !forFaculty && <span className="mono text-[10.5px] text-ink-3">{it.elective}</span>}</div>
        {it.note && <p className="mt-2 text-[13px] text-ink-2">“{it.note}”</p>}
      </div>
    </div>
  );
}

export function DayList({ day, forFaculty, onPick }: { day: Day; forFaculty: boolean; onPick?: (i: Item) => void }) {
  const now = useNow();
  if (!day.college_day) return <Empty title="No college today" icon={<Coffee size={22} />}>Enjoy the day off.</Empty>;
  if (!day.items.length) return <Empty title="No classes" icon={<Coffee size={22} />}>Nothing on this day.</Empty>;
  const rows: React.ReactNode[] = [];
  let last: number | null = null;
  for (const it of day.items) {
    if (last != null && it.start > last) {
      rows.push(<div key={`gap${it.key}`} className="mono flex items-center gap-2 py-0.5 pl-[66px] text-[11px] uppercase tracking-wider text-ink-3"><Coffee size={12} />Free · {it.start - last} h</div>);
    }
    const live = at(it.date, it.start) <= now && now < at(it.date, it.end) && it.status !== "cancelled";
    rows.push(<div key={it.key + it.start} onClick={onPick ? () => onPick(it) : undefined} className={onPick ? "tap cursor-pointer" : ""}><ClassRow it={it} forFaculty={forFaculty} live={live} /></div>);
    if (it.status !== "cancelled") last = Math.max(last ?? 0, it.end);
  }
  return <div className="space-y-2.5">{rows}</div>;
}

export function DatePills({ days, value, onChange }: { days: Day[]; value: string; onChange: (d: string) => void }) {
  return (
    <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
      {days.map((d) => {
        const on = d.date === value, n = d.items.filter((i) => i.status !== "cancelled").length;
        return (
          <button key={d.date} onClick={() => onChange(d.date)}
            className={clsx("tap flex min-w-[58px] flex-col items-center rounded-2xl px-2 py-2.5 ring-1", on ? "bg-ink text-paper ring-ink" : "bg-sheet ring-grid", !d.college_day && !on && "opacity-50")}>
            <span className={clsx("mono text-[10px] uppercase tracking-wider", on ? "text-[color-mix(in_srgb,var(--paper)_65%,transparent)]" : "text-ink-3")}>{d.day}</span>
            <span className="display text-[20px] leading-tight !text-current">{Number(d.date.slice(8))}</span>
            <span className="mt-0.5 flex h-1.5 gap-0.5">{Array.from({ length: Math.min(n, 6) }, (_, k) => <i key={k} className="size-1 rounded-full" style={{ background: on ? "var(--acc)" : "var(--ink-3)" }} />)}</span>
          </button>
        );
      })}
    </div>
  );
}
