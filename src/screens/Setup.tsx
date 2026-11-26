import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { ArrowLeft, GraduationCap, Presentation, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Clock } from "../components/Logo";
import { Button, ErrorNote, Field, Select, Spinner } from "../components/ui";
import { load, profile, type Profile } from "../lib/local";

/** no sign-in: pick who you are once, the app remembers it */
export default function Setup({ onDone, onServer }: { onDone: () => void; onServer: () => void }) {
  const b = useQuery({ queryKey: ["bundle"], queryFn: () => load(true), retry: 1 });
  const old = profile.get();
  const [role, setRole] = useState<Profile["role"] | null>(old?.role || null);
  const [name, setName] = useState(old?.role === "student" ? old.name : "");
  const [div, setDiv] = useState(old?.division || "");
  const [batch, setBatch] = useState(String(old?.batch || ""));
  const [el, setEl] = useState<string[]>(old?.electives || []);
  const [fac, setFac] = useState(old?.faculty_name || "");
  const data = b.data;
  const d = div || data?.divisions[0]?.id || "";
  const dv = data?.divisions.find((x) => x.id === d);
  const offered = data ? [...new Set(data.sessions.filter((s) => s.elective && (s.el_divs.includes(d) || s.divs[d])).map((s) => s.course))].sort() : [];
  const teachers = data ? data.faculty.map((f) => f.name).filter((f) => data.sessions.some((s) => s.faculty === f)) : [];
  const t = fac || teachers[0] || "";

  const save = () => {
    if (role === "student") profile.set({ role, name: name.trim() || "Student", division: d, batch: batch ? Number(batch) : null, electives: el });
    else if (role === "faculty") profile.set({ role, name: t, faculty_name: t });
    else profile.set({ role: "dean", name: name.trim() || "Dean" });
    onDone();
  };

  const roles = [
    { id: "student" as const, icon: <GraduationCap size={22} />, title: "Student", text: "Your class, batch and electives" },
    { id: "faculty" as const, icon: <Presentation size={22} />, title: "Teacher", text: "Your own teaching week" },
    { id: "dean" as const, icon: <ShieldCheck size={22} />, title: "Dean", text: "Who's free, any timetable" },
  ];
  return (
    <div className="safe-top safe-bottom flex min-h-full flex-col px-6">
      <div className="graph pointer-events-none absolute inset-x-0 top-0 h-[40vh] [mask-image:linear-gradient(black,transparent)]" />
      <div className="relative mt-[8vh]">
        <Clock size={56} />
        <h1 className="display mt-5 text-[42px] leading-[.95]">Raiden<em>.</em></h1>
        <p className="label mt-3">Next class · any time</p>
      </div>
      {b.isLoading ? <Spinner label="Getting the timetable" /> : b.error ? <div className="mt-8 space-y-4"><ErrorNote error={b.error} /><Button variant="soft" onClick={() => b.refetch()}>Try again</Button></div> : !role ? (
        <div className="relative mt-9 space-y-3">
          <p className="text-[15px] text-ink-2">Who are you? You only do this once.</p>
          {roles.map((r) => (
            <button key={r.id} onClick={() => setRole(r.id)} className="tap lit flex w-full items-center gap-4 bg-sheet p-4 text-left">
              <span className="grid size-12 place-items-center rounded-2xl bg-ink text-paper">{r.icon}</span>
              <span><b className="block text-[17px] font-semibold">{r.title}</b><span className="text-[13px] text-ink-2">{r.text}</span></span>
            </button>
          ))}
        </div>
      ) : (
        <div className="relative mt-7 space-y-4">
          <button onClick={() => setRole(null)} className="flex items-center gap-1.5 text-sm font-semibold text-ink-2"><ArrowLeft size={16} />{roles.find((r) => r.id === role)?.title}</button>
          {role === "student" && (
            <>
              <Field label="Your name (optional)"><input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Manikya" /></Field>
              <div className="grid grid-cols-[1.5fr_1fr] gap-3">
                <Field label="Class"><Select value={d} onChange={(v) => { setDiv(v); setEl([]); }}>{data!.divisions.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select></Field>
                <Field label="Batch"><Select value={batch} onChange={setBatch}><option value="">All</option>{Array.from({ length: dv?.batches || 2 }, (_, i) => <option key={i} value={i + 1}>Batch {i + 1}</option>)}</Select></Field>
              </div>
              {offered.length > 0 && (
                <div><p className="label mb-2">Your electives</p>
                  <div className="flex flex-wrap gap-2">{offered.map((c) => {
                    const on = el.includes(c);
                    return <button key={c} type="button" onClick={() => setEl(on ? el.filter((x) => x !== c) : [...el, c])}
                      className={clsx("tap rounded-full px-3.5 py-2 text-[13px] font-semibold ring-1", on ? "bg-[var(--ele)] text-white ring-[var(--ele)]" : "bg-sheet ring-grid")}>{c}</button>;
                  })}</div>
                  <p className="mt-2 text-xs text-ink-3">Pick none to see every elective.</p></div>
              )}
            </>
          )}
          {role === "faculty" && <Field label="Your name"><Select value={t} onChange={setFac}>{teachers.map((f) => <option key={f}>{f}</option>)}</Select></Field>}
          {role === "dean" && <Field label="Your name (optional)"><input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Dean" /></Field>}
          <Button className="w-full !py-4 text-base" onClick={save}>Continue</Button>
        </div>
      )}
      <button onClick={onServer} className="mt-auto pt-8 text-center text-xs text-ink-3">Admin or live features? <b className="font-semibold text-ink-2 underline">Sign in to a CTTGS server</b></button>
    </div>
  );
}
