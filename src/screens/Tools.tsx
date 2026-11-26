import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, DoorOpen, Send } from "lucide-react";
import { useState } from "react";
import { Button, Card, Empty, ErrorNote, Field, Select, Sheet, Spinner } from "../components/ui";
import { api, type Me } from "../lib/api";
import { useOptions, useSchedule } from "../lib/hooks";
import { addDays, fmtDay, hh, today } from "../lib/time";
import { Requests } from "./Updates";

export const nextDays = (n = 7) => Array.from({ length: n }, (_, i) => addDays(today(), i));
export const nowHour = (me: Me) => Math.min(Math.max(new Date().getHours(), me.start_hour ?? 8), (me.end_hour ?? 18) - 1);

export function DateSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <Select value={value} onChange={onChange}>{nextDays(14).map((d, i) => <option key={d} value={d}>{i === 0 ? "Today" : i === 1 ? "Tomorrow" : fmtDay(d, { weekday: "long", day: "numeric", month: "short" })}</option>)}</Select>;
}
export function HourSelect({ me, value, onChange, hours }: { me: Me; value: number; onChange: (v: number) => void; hours?: number[] }) {
  const all = hours || Array.from({ length: (me.end_hour ?? 18) - (me.start_hour ?? 8) }, (_, i) => (me.start_hour ?? 8) + i);
  return <Select value={String(value)} onChange={(v) => onChange(Number(v))}>{all.map((h) => <option key={h} value={h}>{hh(h)}</option>)}</Select>;
}

export function FreeRooms({ me, date, hour, dur = 1, minSeats = 0, pick, value }: { me: Me; date: string; hour: number; dur?: number; minSeats?: number; pick?: (c: string) => void; value?: string }) {
  const q = useQuery({ queryKey: ["free-rooms", date, hour, dur, minSeats], queryFn: () => api<{ code: string; capacity: number; floor: string; lab: boolean }[]>(`/api/m/free-rooms?date=${date}&hour=${hour}&dur=${dur}&min_seats=${minSeats}`) });
  if (q.isLoading) return <Spinner />;
  if (q.error) return <ErrorNote error={q.error} />;
  if (!q.data?.length) return <p className="py-4 text-center text-sm text-ink-3">No room is free then{minSeats ? ` for ${minSeats} students` : ""}.</p>;
  return (
    <div className="grid grid-cols-2 gap-2">
      {q.data.map((r) => (
        <button key={r.code} type="button" onClick={pick ? () => pick(r.code) : undefined}
          className={`tap rounded-2xl p-3 text-left ring-1 ${value === r.code ? "bg-ink text-paper ring-ink" : "bg-sheet ring-grid"}`}>
          <div className="display text-[19px] !text-current">{r.code.replace(/^E\./, "")}</div>
          <div className={`text-[12px] ${value === r.code ? "opacity-70" : "text-ink-3"}`}>{r.lab ? "Lab" : "Classroom"} · {r.capacity} seats{r.floor ? ` · ${r.floor}` : ""}</div>
        </button>
      ))}
    </div>
  );
}

export default function Tools({ me }: { me: Me }) {
  const [open, setOpen] = useState<"" | "rooms" | "free" | "request">("");
  const tiles = [
    { id: "rooms" as const, icon: <DoorOpen size={20} />, title: "Find a free room", text: "Any time this week, with seats and floor." },
    { id: "free" as const, icon: <CalendarClock size={20} />, title: "When is a class free?", text: "Plan an extra lecture without a clash." },
    { id: "request" as const, icon: <Send size={20} />, title: "Request a change", text: "Leave, move, swap or an extra class." },
  ].filter((t) => !me.local || t.id !== "request");
  return (
    <div className="space-y-5">
      <div><p className="label">For teachers</p><h1 className="display mt-1 text-[30px]">Tools<em>.</em></h1></div>
      <div className="space-y-2.5">
        {tiles.map((t) => (
          <Card key={t.id} onClick={() => setOpen(t.id)} className="flex items-center gap-4">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-ink text-paper">{t.icon}</div>
            <div><b className="font-semibold">{t.title}</b><p className="text-[13px] text-ink-2">{t.text}</p></div>
          </Card>
        ))}
      </div>
      {!me.local && <section><h2 className="acc-title mb-3 text-[17px]">My requests</h2><Requests mine /></section>}
      <Sheet open={open === "rooms"} onClose={() => setOpen("")} title="Free rooms"><RoomsTool me={me} /></Sheet>
      <Sheet open={open === "free"} onClose={() => setOpen("")} title="When is a class free?"><ClassFree me={me} /></Sheet>
      <Sheet open={open === "request"} onClose={() => setOpen("")} title="Request a change"><RequestForm me={me} done={() => setOpen("")} /></Sheet>
    </div>
  );
}

function RoomsTool({ me }: { me: Me }) {
  const [date, setDate] = useState(today());
  const [hour, setHour] = useState(nowHour(me));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[1.4fr_1fr] gap-3"><Field label="Day"><DateSelect value={date} onChange={setDate} /></Field><Field label="From"><HourSelect me={me} value={hour} onChange={setHour} /></Field></div>
      <FreeRooms me={me} date={date} hour={hour} />
    </div>
  );
}

function ClassFree({ me }: { me: Me }) {
  const o = useOptions();
  const [div, setDiv] = useState("");
  const [date, setDate] = useState(today());
  const d = div || o.data?.divisions[0]?.id || "";
  const q = useQuery({
    queryKey: ["free-hours", d, date, me.faculty_name], enabled: !!d,
    queryFn: () => api<{ hours: number[] }>(`/api/m/free-hours?date=${date}&division=${encodeURIComponent(d)}${me.faculty_name ? `&faculty=${encodeURIComponent(me.faculty_name)}` : ""}`),
  });
  return (
    <div className="space-y-4">
      <Field label="Class"><Select value={d} onChange={setDiv}>{o.data?.divisions.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select></Field>
      <Field label="Day"><DateSelect value={date} onChange={setDate} /></Field>
      <div>
        <p className="label mb-2">Free for the class{me.faculty_name ? " and for you" : ""}</p>
        {q.isLoading ? <Spinner /> : q.error ? <ErrorNote error={q.error} /> : q.data?.hours.length ? (
          <div className="flex flex-wrap gap-2">{q.data.hours.map((h) => <span key={h} className="mono rounded-full bg-[color-mix(in_srgb,var(--ok)_12%,var(--sheet))] px-3 py-1.5 text-[13px] font-semibold text-ok">{hh(h)}–{hh(h + 1)}</span>)}</div>
        ) : <Empty title="No free hour">Try another day.</Empty>}
      </div>
    </div>
  );
}

function RequestForm({ me, done }: { me: Me; done: () => void }) {
  const qc = useQueryClient();
  const [kind, setKind] = useState("leave");
  const [date, setDate] = useState(today());
  const [key, setKey] = useState("");
  const [text, setText] = useState("");
  const s = useSchedule({ start: date }, 1, me.published);
  const items = s.data?.days[0]?.items.filter((i) => i.status !== "cancelled") || [];
  const m = useMutation({
    mutationFn: () => {
      const it = items.find((i) => i.key === key);
      const t = (it ? `${it.course} (${it.group}) ${hh(it.start)} in ${it.room} — ` : "") + text;
      return api("/api/m/requests", { json: { kind, date, key: key || null, text: t } });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["requests"] }); setText(""); done(); },
  });
  return (
    <div className="space-y-4">
      <Field label="What do you need">
        <Select value={kind} onChange={setKind}>
          <option value="leave">I'm on leave</option><option value="move">Move a class</option><option value="swap">Swap with a colleague</option>
          <option value="extra">An extra class</option><option value="room">A different room</option><option value="other">Something else</option>
        </Select>
      </Field>
      <Field label="Day"><DateSelect value={date} onChange={(v) => { setDate(v); setKey(""); }} /></Field>
      {items.length > 0 && (
        <Field label="Which class (optional)">
          <Select value={key} onChange={setKey}><option value="">—</option>{items.map((i) => <option key={i.key} value={i.key}>{hh(i.start)} · {i.course} · {i.room}</option>)}</Select>
        </Field>
      )}
      <Field label="Details"><textarea className="field min-h-[90px]" value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Conference on Friday — can Sem VI's lecture move to Thursday 2 pm?" /></Field>
      <ErrorNote error={m.error} />
      <Button className="w-full" onClick={() => m.mutate()} disabled={m.isPending || text.trim().length < 3}><Send size={16} />Send to the admin</Button>
    </div>
  );
}
