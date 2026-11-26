import clsx from "clsx";
import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

export function Button({ children, variant = "primary", className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "soft" | "danger" }) {
  return (
    <button {...p} className={clsx("tap inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[15px] font-semibold disabled:opacity-45",
      variant === "primary" && "shine", variant === "ghost" && "text-ink-2 active:bg-sheet-2",
      variant === "soft" && "bg-sheet text-ink ring-1 ring-grid-strong active:bg-sheet-2",
      variant === "danger" && "bg-[color-mix(in_srgb,var(--bad)_12%,var(--sheet))] text-bad", className)}>
      {children}
    </button>
  );
}

export function Segmented<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; className?: string }) {
  return (
    <div className={clsx("flex rounded-full bg-sheet p-1 ring-1 ring-grid", className)} role="tablist">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={o.value === value} onClick={() => onChange(o.value)}
          className={clsx("flex-1 rounded-full px-3 py-2 text-[13.5px] font-semibold transition-colors", o.value === value ? "bg-ink text-paper" : "text-ink-2")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label mb-1.5 block">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-ink-3">{hint}</span>}
    </label>
  );
}

export function Select({ value, onChange, children, className }: { value: string; onChange: (v: string) => void; children: ReactNode; className?: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={clsx("field appearance-none !pr-10", className)}
      style={{ backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center", backgroundSize: "14px", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238a8f9d' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}>
      {children}
    </select>
  );
}

export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return <div onClick={onClick} className={clsx("lit bg-sheet p-4", onClick && "tap cursor-pointer", className)}>{children}</div>;
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-14 text-sm text-ink-3">
      <svg width="30" height="30" viewBox="0 0 30 30" className="animate-spin [animation-duration:1.4s]">
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i * 30 - 90) * Math.PI / 180;
          return <circle key={i} cx={15 + 11 * Math.cos(a)} cy={15 + 11 * Math.sin(a)} r={i === 0 ? 2.3 : 1.6} fill={i === 0 ? "var(--acc)" : "var(--ink-3)"} opacity={i === 0 ? 1 : 0.25 + i / 18} />;
        })}
      </svg>
      {label}
    </div>
  );
}

export function Empty({ title, children, icon }: { title: string; children?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      {icon && <div className="mb-4 grid size-14 place-items-center rounded-full bg-sheet text-ink-3 ring-1 ring-grid">{icon}</div>}
      <p className="display text-xl">{title}</p>
      {children && <div className="mt-2 max-w-xs text-sm text-ink-2">{children}</div>}
    </div>
  );
}

export function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null;
  return <div className="rounded-2xl bg-[color-mix(in_srgb,var(--bad)_10%,var(--sheet))] px-4 py-3 text-sm text-bad">{(error as Error).message}</div>;
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const f = (e: Event) => { e.preventDefault(); onClose(); };
    window.addEventListener("raiden:back", f);
    return () => window.removeEventListener("raiden:back", f);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div className="rise safe-bottom max-h-[88vh] overflow-y-auto rounded-t-[28px] bg-paper px-5 pt-3" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-grid-strong" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="display text-[22px]">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full bg-sheet ring-1 ring-grid"><X size={17} /></button>
        </div>
        <div className="pb-4">{children}</div>
      </div>
    </div>
  );
}

const KIND: Record<string, [string, string]> = {
  TH: ["var(--lec)", "var(--lec-bg)"], LAB: ["var(--lab)", "var(--lab-bg)"], TUT: ["var(--tut)", "var(--tut-bg)"], EL: ["var(--ele)", "var(--ele-bg)"],
};
export const kindColor = (k: string) => KIND[k]?.[0] || "var(--ink-3)";
export function KindChip({ kind, word }: { kind: string; word: string }) {
  const [c, bg] = KIND[kind] || KIND.TH;
  return <span className="mono rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: c, background: bg }}>{kind === "EL" ? `Elective ${word.toLowerCase()}` : word}</span>;
}

export function StatusChip({ status }: { status: string }) {
  if (status === "normal") return null;
  const m: Record<string, [string, string]> = { cancelled: ["Cancelled", "var(--bad)"], room: ["Room changed", "var(--warn)"], extra: ["Extra class", "var(--acc)"] };
  const [t, c] = m[status] || [status, "var(--ink-3)"];
  return <span className="mono rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: c, background: `color-mix(in srgb, ${c} 12%, var(--sheet))` }}>{t}</span>;
}
