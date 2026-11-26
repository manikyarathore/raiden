/** the RAIDEN clock: 12 dots (the hours that have gone are blue, now is orange) around a lightning bolt */
const BOLT = [[1.2, -5.8], [-4, 1], [-0.9, 1], [-2.4, 5.7], [3, -1.4], [-0.1, -1.4], [2.2, -5.8]];
export function boltPath(cx: number, cy: number, h: number) {
  const k = h / 11.5;
  return "M" + BOLT.map(([x, y]) => `${(cx + x * k).toFixed(2)} ${(cy + y * k).toFixed(2)}`).join(" L") + " Z";
}

export function Clock({ size = 40, current = 4, ink = "var(--ink)", bolt = true, className }: { size?: number; current?: number; ink?: string; bolt?: boolean; className?: string }) {
  const blue = "var(--lec)";
  return (
    <svg width={size} height={size} viewBox="0 0 372 372" className={className} aria-hidden>
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * 30 - 90) * Math.PI / 180;
        const on = i === current;
        return <circle key={i} cx={186 + 130 * Math.cos(a)} cy={186 + 130 * Math.sin(a)} r={on ? 19 : 14} fill={on ? "var(--acc)" : i < current ? blue : ink} />;
      })}
      {bolt && <path d={boltPath(186, 186, 140)} fill={ink} />}
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={className + " flex items-center gap-3"}>
      <Clock size={44} />
      <div className="leading-none">
        <div className="display text-[30px]">Raiden</div>
        <div className="label mt-1.5 !text-[9.5px]">Next class · any time</div>
      </div>
    </div>
  );
}
