import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { ArrowRightLeft, BellOff, CalendarPlus, Check, Inbox, Megaphone, Plus, Trash2, X, XCircle } from "lucide-react";
import { useState } from "react";
import { Button, Card, Empty, ErrorNote, Field, Segmented, Select, Sheet, Spinner } from "../components/ui";
import { api, type FeedItem, type Me, type Req } from "../lib/api";
import { useFeed, useOptions } from "../lib/hooks";
import { ago, fmtDay } from "../lib/time";

const ICON: Record<string, React.ReactNode> = {
  announcement: <Megaphone size={17} />, request: <Inbox size={17} />, pending: <Inbox size={17} />,
};
const changeIcon = (s?: string) => s === "cancelled" ? <XCircle size={17} /> : s === "extra" ? <CalendarPlus size={17} /> : <ArrowRightLeft size={17} />;
const tone = (f: FeedItem) => f.type === "change" ? (f.status === "cancelled" ? "var(--bad)" : f.status === "extra" ? "var(--acc)" : "var(--warn)") : f.type === "announcement" ? "var(--lec)" : "var(--ink-2)";

export default function Updates({ me }: { me: Me }) {
  const staff = me.role === "admin" || me.role === "dean";
  const [tab, setTab] = useState<"feed" | "requests">("feed");
  const [ann, setAnn] = useState(false);
  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div><p className="label">What changed</p><h1 className="display mt-1 text-[30px]">Updates<em>.</em></h1></div>
        {staff && <Button onClick={() => setAnn(true)} className="!px-4 !py-2.5 text-sm"><Plus size={16} />Announce</Button>}
      </div>
      {staff && <Segmented value={tab} onChange={setTab} options={[{ value: "feed", label: "Updates" }, { value: "requests", label: "Requests" }]} />}
      {tab === "feed" ? <Feed me={me} /> : <Requests decide />}
      {staff && <Announce open={ann} onClose={() => setAnn(false)} />}
    </div>
  );
}

function Feed({ me }: { me: Me }) {
  const f = useFeed();
  const qc = useQueryClient();
  const del = useMutation({ mutationFn: (id: number) => api(`/api/m/announcements/${id}`, { method: "DELETE" }), onSuccess: () => qc.invalidateQueries({ queryKey: ["feed"] }) });
  if (f.isLoading) return <Spinner />;
  if (f.error) return <ErrorNote error={f.error} />;
  if (!f.data?.length) return <Empty title="All quiet" icon={<BellOff size={22} />}>Cancelled classes, room changes, extra classes and announcements show up here.</Empty>;
  return (
    <div className="space-y-2.5">
      {f.data.map((x) => (
        <Card key={x.id} className="rise flex gap-3 !p-3.5">
          <div className="grid size-9 shrink-0 place-items-center rounded-full" style={{ color: tone(x), background: `color-mix(in srgb, ${tone(x)} 12%, var(--sheet))` }}>
            {x.type === "change" ? changeIcon(x.status) : ICON[x.type]}</div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <b className="font-semibold leading-snug">{x.title}</b>
              <span className="mono shrink-0 pt-0.5 text-[10.5px] text-ink-3">{ago(x.at)}</span>
            </div>
            {x.body && <p className="mt-0.5 whitespace-pre-line text-[13.5px] text-ink-2">{x.body}</p>}
            {x.type === "announcement" && (
              <div className="mt-1.5 flex items-center gap-3">
                <span className="mono text-[10.5px] uppercase tracking-wider text-ink-3">{x.by} · to {x.audience}</span>
                {(me.role === "admin" || me.role === "dean") && x.ann_id && (
                  <button onClick={() => del.mutate(x.ann_id!)} className="ml-auto text-ink-3" aria-label="Delete announcement"><Trash2 size={15} /></button>)}
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

export function Requests({ decide, mine }: { decide?: boolean; mine?: boolean }) {
  const qc = useQueryClient();
  const r = useQuery({ queryKey: ["requests"], queryFn: () => api<Req[]>("/api/m/requests") });
  const [open, setOpen] = useState<Req | null>(null);
  const [resp, setResp] = useState("");
  const m = useMutation({
    mutationFn: (b: { id: number; status: string }) => api(`/api/m/requests/${b.id}`, { method: "PATCH", json: { status: b.status, response: resp } }),
    onSuccess: () => { setOpen(null); setResp(""); qc.invalidateQueries({ queryKey: ["requests"] }); qc.invalidateQueries({ queryKey: ["feed"] }); },
  });
  if (r.isLoading) return <Spinner />;
  if (r.error) return <ErrorNote error={r.error} />;
  if (!r.data?.length) return <Empty title={mine ? "No requests yet" : "No requests"} icon={<Inbox size={22} />}>{mine ? "Ask for leave, a move or a swap and it lands with the admin." : "Teachers' change requests show up here."}</Empty>;
  return (
    <div className="space-y-2.5">
      {r.data.map((x) => (
        <Card key={x.id} onClick={decide ? () => setOpen(x) : undefined} className="!p-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="mono text-[10.5px] uppercase tracking-wider text-ink-3">{x.kind}{x.date ? ` · ${fmtDay(x.date)}` : ""}</span>
            <span className={clsx("mono rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider",
              x.status === "pending" ? "bg-[color-mix(in_srgb,var(--warn)_14%,var(--sheet))] text-warn" : x.status === "approved" ? "bg-[color-mix(in_srgb,var(--ok)_13%,var(--sheet))] text-ok" : "bg-[color-mix(in_srgb,var(--bad)_12%,var(--sheet))] text-bad")}>{x.status}</span>
          </div>
          {!mine && <b className="mt-1 block font-semibold">{x.faculty}</b>}
          <p className="mt-1 text-[14px] text-ink-2">{x.text}</p>
          {x.response && <p className="mt-2 rounded-xl bg-sheet-2 px-3 py-2 text-[13px]"><b className="font-semibold">{x.decided_by}:</b> {x.response}</p>}
          <p className="mono mt-2 text-[10.5px] text-ink-3">{ago(x.at)}</p>
        </Card>
      ))}
      <Sheet open={!!open} onClose={() => setOpen(null)} title="Answer request">
        {open && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-sheet p-4 ring-1 ring-grid"><b className="font-semibold">{open.faculty}</b><span className="mono ml-2 text-[11px] uppercase text-ink-3">{open.kind}{open.date ? ` · ${fmtDay(open.date)}` : ""}</span><p className="mt-1 text-sm text-ink-2">{open.text}</p></div>
            <Field label="Reply (optional)"><textarea className="field min-h-[80px]" value={resp} onChange={(e) => setResp(e.target.value)} placeholder="e.g. Done — moved to Thursday 11:00 in CR 404" /></Field>
            <ErrorNote error={m.error} />
            <div className="grid grid-cols-2 gap-3">
              <Button variant="danger" onClick={() => m.mutate({ id: open.id, status: "rejected" })} disabled={m.isPending}><X size={16} />Reject</Button>
              <Button onClick={() => m.mutate({ id: open.id, status: "approved" })} disabled={m.isPending}><Check size={16} />Approve</Button>
            </div>
            <p className="text-xs text-ink-3">Approving doesn't change the timetable by itself — make the change on the Manage tab.</p>
          </div>
        )}
      </Sheet>
    </div>
  );
}

function Announce({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const o = useOptions(open);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [aud, setAud] = useState("all");
  const m = useMutation({
    mutationFn: () => api("/api/m/announcements", { json: { title, body, audience: aud } }),
    onSuccess: () => { setTitle(""); setBody(""); onClose(); qc.invalidateQueries({ queryKey: ["feed"] }); },
  });
  return (
    <Sheet open={open} onClose={onClose} title="New announcement">
      <div className="space-y-4">
        <Field label="Title"><input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="No classes on Friday" /></Field>
        <Field label="Message"><textarea className="field min-h-[100px]" value={body} onChange={(e) => setBody(e.target.value)} /></Field>
        <Field label="Who sees it">
          <Select value={aud} onChange={setAud}>
            <option value="all">Everyone</option><option value="students">All students</option><option value="faculty">All teachers</option>
            {o.data?.divisions.map((d) => <option key={d.id} value={d.id}>{d.name} only</option>)}
          </Select>
        </Field>
        <ErrorNote error={m.error} />
        <Button className="w-full" onClick={() => m.mutate()} disabled={m.isPending || title.trim().length < 2}><Megaphone size={16} />Send announcement</Button>
      </div>
    </Sheet>
  );
}
