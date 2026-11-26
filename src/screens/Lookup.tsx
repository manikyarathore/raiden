import { useState } from "react";
import { DatePills, DayList } from "../components/Schedule";
import { ErrorNote, Segmented, Select, Spinner } from "../components/ui";
import type { Me } from "../lib/api";
import { useOptions, useSchedule } from "../lib/hooks";
import { today } from "../lib/time";
import { NotPublished } from "./Home";

export default function Lookup({ me }: { me: Me }) {
  const o = useOptions(me.published);
  const [kind, setKind] = useState<"division" | "faculty" | "room">("division");
  const [key, setKey] = useState("");
  const [pick, setPick] = useState(today());
  const list = kind === "division" ? (o.data?.divisions || []).map((d) => ({ v: d.id, l: d.name }))
    : kind === "faculty" ? (o.data?.faculty || []).map((f) => ({ v: f, l: f })) : (o.data?.rooms || []).map((r) => ({ v: r.code, l: `${r.code} · ${r.lab ? "lab" : "classroom"}` }));
  const k = list.some((x) => x.v === key) ? key : list[0]?.v || "";
  const s = useSchedule({ [kind]: k }, 7, !!k && me.published);
  const days = s.data?.days || [];
  const sel = days.find((d) => d.date === pick) || days[0];
  return (
    <div className="space-y-5">
      <div><p className="label">Any class, teacher or room</p><h1 className="display mt-1 text-[30px]">Look up<em>.</em></h1></div>
      {!me.published ? <NotPublished /> : (
        <>
          <Segmented value={kind} onChange={(v) => { setKind(v); setKey(""); }} options={[{ value: "division", label: "Class" }, { value: "faculty", label: "Teacher" }, { value: "room", label: "Room" }]} />
          <Select value={k} onChange={setKey}>{list.map((x) => <option key={x.v} value={x.v}>{x.l}</option>)}</Select>
          {s.isLoading || o.isLoading ? <Spinner /> : s.error ? <ErrorNote error={s.error} /> : sel && (
            <><DatePills days={days} value={sel.date} onChange={setPick} /><DayList day={sel} forFaculty={kind !== "division"} /></>
          )}
        </>
      )}
    </div>
  );
}
