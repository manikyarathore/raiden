import { useMutation, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Bell, KeyRound, LogOut, Moon, Server } from "lucide-react";
import { useState } from "react";
import { Clock } from "../components/Logo";
import { Button, Card, ErrorNote, Field, Segmented, Select, Sheet } from "../components/ui";
import { api, server, session, type Me } from "../lib/api";
import { useOptions } from "../lib/hooks";
import { reminders } from "../lib/notify";
import { theme, type Mode } from "../lib/theme";
import { ChangePassword } from "./Login";

const ROLE = { student: "Student", faculty: "Teacher", dean: "Dean", admin: "Admin" };

export default function MeScreen({ me }: { me: Me }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<Mode>(theme.mode());
  const [on, setOn] = useState(reminders.on());
  const [min, setMin] = useState(reminders.minutes());
  const [pw, setPw] = useState(false);
  const [edit, setEdit] = useState(false);
  const mine = me.role === "student" || me.role === "faculty";
  const out = () => { session.clear(); qc.clear(); window.dispatchEvent(new Event("raiden:logout")); };
  const setRem = (o: boolean, m = min) => { setOn(o); setMin(m); reminders.set(o, m); qc.invalidateQueries({ queryKey: ["schedule"] }); };
  return (
    <div className="space-y-5">
      <div className="lit graph relative overflow-hidden p-5">
        <Clock size={110} className="absolute -right-6 -top-6 opacity-[.13]" bolt={false} />
        <div className="grid size-14 place-items-center rounded-full bg-ink text-[22px] font-semibold text-paper">{me.name.replace(/^(Dr|Prof|Mr|Ms|Mrs)\.?\s+/i, "").slice(0, 1)}</div>
        <h1 className="display mt-3 text-[26px] leading-tight">{me.name}</h1>
        <p className="mono mt-1 text-[12px] text-ink-3">{me.username} · {ROLE[me.role]}</p>
        {me.role === "student" && (
          <div className="mt-4 flex flex-wrap gap-2 text-[13px]">
            <span className="rounded-full bg-sheet px-3 py-1 ring-1 ring-grid">{me.division_name || me.division || "No class set"}</span>
            {me.batch && <span className="rounded-full bg-sheet px-3 py-1 ring-1 ring-grid">Batch {me.batch}</span>}
            {me.electives.map((e) => <span key={e} className="rounded-full bg-[var(--ele-bg)] px-3 py-1 text-[var(--ele)]">{e}</span>)}
            <button onClick={() => setEdit(true)} className="rounded-full px-3 py-1 font-semibold text-[var(--acc)]">Edit</button>
          </div>
        )}
        {me.faculty_name && me.role !== "student" && <p className="mt-3 text-sm text-ink-2">Timetable name: {me.faculty_name}</p>}
      </div>

      {mine && (
        <Card className="space-y-3">
          <div className="flex items-center gap-3"><Bell size={18} className="text-ink-2" /><b className="flex-1 font-semibold">Class reminders</b>
            <button role="switch" aria-checked={on} onClick={() => setRem(!on)} className={clsx("relative h-7 w-12 rounded-full transition", on ? "bg-[var(--acc)]" : "bg-grid-strong")}>
              <i className={clsx("absolute top-1 size-5 rounded-full bg-white transition-all", on ? "left-6" : "left-1")} /></button></div>
          {on && <Segmented value={String(min)} onChange={(v) => setRem(true, Number(v))} options={[5, 10, 15, 30].map((m) => ({ value: String(m), label: `${m} min` }))} />}
          <p className="text-xs text-ink-3">A notification before each class with the room. Changes and announcements notify you when the app opens.</p>
        </Card>
      )}
      <Card className="space-y-3">
        <div className="flex items-center gap-3"><Moon size={18} className="text-ink-2" /><b className="font-semibold">Look</b></div>
        <Segmented value={mode} onChange={(m) => { setMode(m); theme.set(m); }} options={[{ value: "system", label: "Auto" }, { value: "light", label: "Light" }, { value: "dark", label: "Dark" }]} />
      </Card>
      <Card className="divide-y divide-grid !p-0">
        <button onClick={() => setPw(true)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left"><KeyRound size={18} className="text-ink-2" /><span className="flex-1 font-semibold">Change password</span></button>
        <div className="flex items-center gap-3 px-4 py-3.5"><Server size={18} className="text-ink-2" /><span className="flex-1 font-semibold">Server</span><span className="mono max-w-[55%] truncate text-[12px] text-ink-3">{server.get() || location.host}</span></div>
        <button onClick={out} className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-bad"><LogOut size={18} /><span className="flex-1 font-semibold">Sign out</span></button>
      </Card>
      <p className="label text-center">Raiden 1.0 · MPSTME</p>
      <Sheet open={pw} onClose={() => setPw(false)} title="Change password"><ChangePassword me={me} onDone={() => setPw(false)} /></Sheet>
      <Sheet open={edit} onClose={() => setEdit(false)} title="Your class details"><EditStudent me={me} done={() => setEdit(false)} /></Sheet>
    </div>
  );
}

function EditStudent({ me, done }: { me: Me; done: () => void }) {
  const qc = useQueryClient();
  const o = useOptions();
  const div = o.data?.divisions.find((d) => d.id === me.division_id);
  const offered = (me.division_id && o.data?.electives[me.division_id]) || [];
  const [batch, setBatch] = useState(String(me.batch || ""));
  const [el, setEl] = useState<string[]>(me.electives);
  const m = useMutation({
    mutationFn: () => api("/api/m/profile", { method: "PUT", json: { batch: batch ? Number(batch) : null, electives: el } }),
    onSuccess: () => { qc.invalidateQueries(); done(); },
  });
  return (
    <div className="space-y-4">
      <Field label="Lab / tutorial batch">
        <Select value={batch} onChange={setBatch}><option value="">Not set</option>{Array.from({ length: div?.batches || 2 }, (_, i) => <option key={i} value={i + 1}>Batch {i + 1}</option>)}</Select>
      </Field>
      {offered.length > 0 && (
        <div><p className="label mb-2">Your electives</p>
          <div className="flex flex-wrap gap-2">{offered.map((c) => {
            const sel = el.includes(c);
            return <button key={c} type="button" onClick={() => setEl(sel ? el.filter((x) => x !== c) : [...el, c])}
              className={clsx("tap rounded-full px-3.5 py-2 text-[13px] font-semibold ring-1", sel ? "bg-[var(--ele)] text-white ring-[var(--ele)]" : "bg-sheet ring-grid")}>{c}</button>;
          })}</div>
          <p className="mt-2 text-xs text-ink-3">Pick none to see every elective.</p></div>
      )}
      <ErrorNote error={m.error} />
      <Button className="w-full" onClick={() => m.mutate()} disabled={m.isPending}>Save</Button>
    </div>
  );
}
