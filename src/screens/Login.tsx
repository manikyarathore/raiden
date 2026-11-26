import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Eye, EyeOff, Server } from "lucide-react";
import { useState } from "react";
import { Clock } from "../components/Logo";
import { Button, ErrorNote, Field } from "../components/ui";
import { api, native, server, session, type Me } from "../lib/api";

export default function Login({ onDone, onLocal }: { onDone: () => void; onLocal?: () => void }) {
  const [user, setUser] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [srv, setSrv] = useState(server.get());
  const [srvOpen, setSrvOpen] = useState(native && !server.get());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>(null);

  const go = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (native && !srv.trim()) { setSrvOpen(true); setErr(new Error("Enter the server address first (ask your timetable coordinator).")); return; }
    let s = srv.trim();
    if (s && !/^https?:\/\//i.test(s)) s = "http://" + s;
    server.set(s);
    setBusy(true);
    try {
      const r = await api<{ access_token: string }>("/api/auth/login", { json: { username: user.trim(), password: pw }, auth: false });
      session.save(r.access_token);
      onDone();
    } catch (e) { setErr(e); } finally { setBusy(false); }
  };

  return (
    <div className="safe-top safe-bottom flex min-h-full flex-col px-6">
      <div className="graph pointer-events-none absolute inset-x-0 top-0 h-[46vh] [mask-image:linear-gradient(black,transparent)]" />
      <div className="relative mt-[12vh] flex flex-col items-start">
        <Clock size={64} />
        <h1 className="display mt-6 text-[46px] leading-[.95]">Raiden<em>.</em></h1>
        <p className="label mt-3">Next class · any time</p>
        <p className="mt-4 max-w-[30ch] text-[15px] text-ink-2">Your timetable, the room you need and every change, the moment it happens.</p>
      </div>
      <form onSubmit={go} className="relative mt-10 space-y-4">
        <Field label="SAP ID or college email">
          <input className="field" value={user} onChange={(e) => setUser(e.target.value)} autoCapitalize="none" autoCorrect="off" autoComplete="username"
            inputMode="email" placeholder="70572300001 or name@nmims.edu" required />
        </Field>
        <Field label="Password">
          <div className="relative">
            <input className="field pr-12" type={show ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" required />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-ink-3" aria-label={show ? "Hide password" : "Show password"}>
              {show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
          </div>
        </Field>
        <div className="rounded-2xl bg-sheet ring-1 ring-grid">
          <button type="button" onClick={() => setSrvOpen(!srvOpen)} className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm">
            <Server size={16} className="text-ink-3" /><span className="flex-1 truncate text-ink-2">{srv || (native ? "Set the server address" : "This server")}</span>
            <ChevronDown size={16} className={srvOpen ? "rotate-180 transition" : "transition"} /></button>
          {srvOpen && (
            <div className="border-t border-grid px-4 pb-4 pt-3">
              <input className="field" value={srv} onChange={(e) => setSrv(e.target.value)} placeholder="http://192.168.1.20:8000" autoCapitalize="none" autoCorrect="off" inputMode="url" />
              <p className="mt-2 text-xs text-ink-3">The address where the college runs the timetable generator (CTTGS).</p>
            </div>
          )}
        </div>
        <ErrorNote error={err} />
        <Button type="submit" disabled={busy} className="w-full !py-4 text-base">{busy ? "Signing in…" : "Sign in"}</Button>
      </form>
      <p className="mt-auto pt-8 text-center text-xs text-ink-3">Students sign in with their SAP ID, teachers with their college email.
        {onLocal && <><br /><button type="button" onClick={onLocal} className="mt-2 font-semibold text-ink-2 underline">Use without signing in</button></>}</p>
    </div>
  );
}

export function ChangePassword({ me, onDone }: { me: Me; onDone?: () => void }) {
  const qc = useQueryClient();
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [err, setErr] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (a.length < 6) return setErr(new Error("Use at least 6 characters."));
    if (a !== b) return setErr(new Error("The two passwords don't match."));
    setBusy(true);
    try {
      await api(`/api/users/${encodeURIComponent(me.username)}/password`, { method: "PUT", json: { password: a } });
      await qc.invalidateQueries({ queryKey: ["me"] });
      onDone?.();
    } catch (e) { setErr(e); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={save} className={onDone ? "space-y-4" : "safe-top flex min-h-full flex-col justify-center space-y-4 px-6"}>
      {!onDone && <><Clock size={48} /><h1 className="display text-[34px] leading-tight">Set your own password<em>.</em></h1>
        <p className="text-sm text-ink-2">You're signed in with a starter password. Pick a new one to continue.</p></>}
      <Field label="New password"><input className="field" type="password" value={a} onChange={(e) => setA(e.target.value)} autoComplete="new-password" /></Field>
      <Field label="Type it again"><input className="field" type="password" value={b} onChange={(e) => setB(e.target.value)} autoComplete="new-password" /></Field>
      <ErrorNote error={err} />
      <Button type="submit" disabled={busy} className="w-full">{busy ? "Saving…" : "Save password"}</Button>
    </form>
  );
}
