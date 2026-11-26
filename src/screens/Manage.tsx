import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRightLeft, CalendarPlus, Trash2, XCircle } from "lucide-react";
import { useState } from "react";
import { DayList } from "../components/Schedule";
import { Button, Card, Empty, ErrorNote, Field, Segmented, Select, Sheet, Spinner } from "../components/ui";
import { api, type Change, type Item, type Me } from "../lib/api";
import { useOptions, useSchedule } from "../lib/hooks";
import { fmtDay, hh, today } from "../lib/time";
import { NotPublished } from "./Home";
import { DateSelect, FreeRooms } from "./Tools";

const refreshAll = (qc: ReturnType<typeof useQueryClient>) => ["changes", "schedule", "feed", "free-rooms", "free-hours"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

export default function Manage({ me }: { me: Me }) {
  const [mode, setMode] = useState<"extra" | "cancel" | "room">("extra");
  if (!me.published) return <NotPublished />;
  return (
    <div className="space-y-5">
      <div><p className="label">One-day changes</p><h1 className="display mt-1 text-[30px]">Manage<em>.</em></h1>
        <p className="mt-1 text-sm text-ink-2">Students and teachers see these at once, with a notification.</p></div>
      <Segmented value={mode} onChange={setMode} options={[{ value: "extra", label: "Extra class" }, { value: "cancel", label: "Cancel" }, { value: "room", label: "Room" }]} />
      {mode === "extra" ? <Extra me={me} /> : <PickClass me={me} mode={mode} />}
      <Upcoming />
    </div>
  );
}

function Extra({ me }: { me: Me }) {
  const qc = useQueryClient();
  const o = useOptions();
  const [div, setDiv] = useState("");
  const [batch, setBatch] = useState("");
  const [course, setCourse] = useState("");
  const [other, setOther] = useState("");
  const [kind, setKind] = useState("TH");
  const [fac, setFac] = useState("");
  const [date, setDate] = useState(today());
  const [dur, setDur] = useState(1);
  const [hour, setHour] = useState<number | null>(null);
  const [room, setRoom] = useState("");
  const [note, setNote] = useState("");
  const d = div || o.data?.divisions[0]?.id || "";
  const dv = o.data?.divisions.find((x) => x.id === d);
  const courses = o.data?.courses[d] || [];
  const crs = course === "__other" ? other : course || courses[0] || "";
  const fh = useQuery({
    queryKey: ["free-hours", d, date, fac, batch], enabled: !!d,
    queryFn: () => api<{ hours: number[] }>(`/api/m/free-hours?date=${date}&division=${encodeURIComponent(d)}${fac ? `&faculty=${encodeURIComponent(fac)}` : ""}${batch ? `&batch=${batch}` : ""}`),
  });
  const starts = (fh.data?.hours || []).filter((h) => Array.from({ length: dur }, (_, k) => h + k).every((x) => fh.data!.hours.includes(x)));
  const h = hour != null && starts.includes(hour) ? hour : starts[0] ?? null;
  const seats = dv ? (batch ? Math.ceil(dv.size / dv.batches) : dv.size) : 0;
  const m = useMutation({
    mutationFn: () => api("/api/m/changes", { json: { date, kind: "extra", division: d, batch: batch ? Number(batch) : null, course: crs, kind_of_class: kind, faculty: fac || null, hour: h, dur, room: room || null, note } }),
    onSuccess: () => { refreshAll(qc); setRoom(""); setNote(""); setHour(null); },
  });
  if (o.isLoading) return <Spinner />;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[1.5fr_1fr] gap-3">
        <Field label="Class"><Select value={d} onChange={(v) => { setDiv(v); setCourse(""); }}>{o.data?.divisions.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select></Field>
        <Field label="Who"><Select value={batch} onChange={setBatch}><option value="">Whole class</option>{Array.from({ length: dv?.batches || 0 }, (_, i) => <option key={i} value={i + 1}>Batch {i + 1}</option>)}</Select></Field>
      </div>
      <Field label="Course">
        <Select value={course || courses[0] || ""} onChange={setCourse}>{courses.map((c) => <option key={c}>{c}</option>)}<option value="__other">Other…</option></Select>
      </Field>
      {course === "__other" && <input className="field" placeholder="Course or session name" value={other} onChange={(e) => setOther(e.target.value)} />}
      <div className="grid grid-cols-[1fr_1.4fr] gap-3">
        <Field label="Type"><Select value={kind} onChange={setKind}><option value="TH">Lecture</option><option value="LAB">Lab</option><option value="TUT">Tutorial</option></Select></Field>
        <Field label="Teacher"><Select value={fac} onChange={setFac}><option value="">TBA</option>{o.data?.faculty.map((f) => <option key={f}>{f}</option>)}</Select></Field>
      </div>
      <div className="grid grid-cols-[1.5fr_1fr] gap-3">
        <Field label="Day"><DateSelect value={date} onChange={setDate} /></Field>
        <Field label="Length"><Select value={String(dur)} onChange={(v) => setDur(Number(v))}><option value="1">1 hour</option><option value="2">2 hours</option><option value="3">3 hours</option></Select></Field>
      </div>
      <div>
        <p className="label mb-2">Start · only times when the class{fac ? " and the teacher are" : " is"} free</p>
        {fh.isLoading ? <Spinner /> : starts.length ? (
          <div className="flex flex-wrap gap-2">{starts.map((x) => (
            <button key={x} type="button" onClick={() => setHour(x)} className={`tap mono rounded-full px-3.5 py-2 text-[13px] font-semibold ring-1 ${x === h ? "bg-ink text-paper ring-ink" : "bg-sheet ring-grid"}`}>{hh(x)}</button>
          ))}</div>
        ) : <p className="text-sm text-ink-3">No free time that day — try another day or a shorter class.</p>}
      </div>
      {h != null && (
        <div><p className="label mb-2">Room · free then, {seats}+ seats</p><FreeRooms me={me} date={date} hour={h} dur={dur} minSeats={seats} pick={setRoom} value={room} /></div>
      )}
      <Field label="Note for students (optional)"><input className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Make-up for Monday's lecture" /></Field>
      <ErrorNote error={m.error} />
      {m.isSuccess && <p className="rounded-2xl bg-[color-mix(in_srgb,var(--ok)_12%,var(--sheet))] px-4 py-3 text-sm text-ok">Extra class added. Everyone in it is notified.</p>}
      <Button className="w-full" disabled={m.isPending || h == null || !crs} onClick={() => m.mutate()}><CalendarPlus size={16} />Add extra class</Button>
    </div>
  );
}

function PickClass({ me, mode }: { me: Me; mode: "cancel" | "room" }) {
  const qc = useQueryClient();
  const o = useOptions();
  const [div, setDiv] = useState("");
  const [date, setDate] = useState(today());
  const [it, setIt] = useState<Item | null>(null);
  const [room, setRoom] = useState("");
  const [note, setNote] = useState("");
  const d = div || o.data?.divisions[0]?.id || "";
  const s = useSchedule({ division: d, start: date }, 1, !!d);
  const m = useMutation({
    mutationFn: () => api("/api/m/changes", { json: { date, kind: mode, key: it!.key, room: mode === "room" ? room : null, note } }),
    onSuccess: () => { refreshAll(qc); setIt(null); setRoom(""); setNote(""); },
  });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[1.3fr_1.5fr] gap-3">
        <Field label="Class"><Select value={d} onChange={setDiv}>{o.data?.divisions.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select></Field>
        <Field label="Day"><DateSelect value={date} onChange={setDate} /></Field>
      </div>
      <p className="label">Tap the class to {mode === "cancel" ? "cancel" : "move to another room"}</p>
      {s.isLoading ? <Spinner /> : s.error ? <ErrorNote error={s.error} /> : s.data && (
        <DayList day={{ ...s.data.days[0], items: s.data.days[0].items.filter((i) => i.status === "normal") }} forFaculty={false} onPick={setIt} />
      )}
      <Sheet open={!!it} onClose={() => setIt(null)} title={mode === "cancel" ? "Cancel this class?" : "Change room"}>
        {it && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-sheet p-4 ring-1 ring-grid"><b className="font-semibold">{it.course}</b>
              <p className="text-sm text-ink-2">{fmtDay(it.date, { weekday: "long", day: "numeric", month: "short" })} · {hh(it.start)}–{hh(it.end)} · {it.room} · {it.faculty}</p></div>
            {mode === "room" && <div><p className="label mb-2">New room · free then</p><FreeRooms me={me} date={it.date} hour={it.start} dur={it.end - it.start} minSeats={it.size || 0} pick={setRoom} value={room} /></div>}
            <Field label="Note (optional)"><input className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder={mode === "cancel" ? "Teacher on leave" : "Projector not working in 404"} /></Field>
            <ErrorNote error={m.error} />
            <Button className="w-full" variant={mode === "cancel" ? "danger" : "primary"} disabled={m.isPending || (mode === "room" && !room)} onClick={() => m.mutate()}>
              {mode === "cancel" ? <><XCircle size={16} />Cancel class</> : <><ArrowRightLeft size={16} />Move to {room || "…"}</>}
            </Button>
          </div>
        )}
      </Sheet>
    </div>
  );
}

export function Upcoming({ limit }: { limit?: number }) {
  const qc = useQueryClient();
  const c = useQuery({ queryKey: ["changes"], queryFn: () => api<Change[]>(`/api/m/changes?start=${today()}&days=60`) });
  const del = useMutation({ mutationFn: (id: number) => api(`/api/m/changes/${id}`, { method: "DELETE" }), onSuccess: () => refreshAll(qc) });
  const list = (c.data || []).slice(0, limit);
  return (
    <section>
      <h2 className="acc-title mb-3 text-[17px]">Upcoming changes</h2>
      {c.isLoading ? <Spinner /> : !list.length ? <Empty title="No changes">The published timetable runs as it is.</Empty> : (
        <div className="space-y-2">
          {list.map((x) => (
            <Card key={x.id} className="flex items-center gap-3 !p-3.5">
              <div className="grid size-9 shrink-0 place-items-center rounded-full" style={{ color: x.kind === "cancel" ? "var(--bad)" : x.kind === "extra" ? "var(--acc)" : "var(--warn)", background: "var(--sheet-2)" }}>
                {x.kind === "cancel" ? <XCircle size={17} /> : x.kind === "extra" ? <CalendarPlus size={17} /> : <ArrowRightLeft size={17} />}</div>
              <div className="min-w-0 flex-1">
                <b className="block truncate font-semibold">{x.kind === "cancel" ? "Cancelled · " : x.kind === "extra" ? "Extra · " : "Room → "}{x.kind === "room" ? `${x.room} · ${x.course}` : x.course}</b>
                <p className="truncate text-[12.5px] text-ink-2">{fmtDay(x.date)} · {x.hour != null ? hh(x.hour) : ""} · {x.group}{x.kind === "extra" && x.room ? ` · ${x.room}` : ""}</p>
              </div>
              <button onClick={() => del.mutate(x.id)} className="p-2 text-ink-3" aria-label="Remove change"><Trash2 size={16} /></button>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
