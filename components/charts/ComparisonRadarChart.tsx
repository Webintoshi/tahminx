interface RadarValue {
  label: string;
  home: number;
  away: number;
}

const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => ({
  x: cx + r * Math.cos(angle),
  y: cy + r * Math.sin(angle)
});

const toPath = (values: number[], radius: number, cx: number, cy: number) => {
  const points = values.map((value, i) => {
    const angle = (Math.PI * 2 * i) / values.length - Math.PI / 2;
    const r = (value / 100) * radius;
    return polarToCartesian(cx, cy, r, angle);
  });

  return `${points.map((p, idx) => `${idx === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")} Z`;
};

export function ComparisonRadarChart({ values }: { values: RadarValue[] }) {
  const size = 260;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 90;

  const homePath = toPath(values.map((v) => v.home), radius, cx, cy);
  const awayPath = toPath(values.map((v) => v.away), radius, cx, cy);

  return (
    <div className="grid gap-3 md:grid-cols-[260px_1fr] md:items-center">
      <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto h-[260px] w-[260px]">
        {[0.25, 0.5, 0.75, 1].map((scale) => (
          <circle
            key={scale}
            cx={cx}
            cy={cy}
            r={radius * scale}
            fill="none"
            stroke="rgba(148,163,184,0.25)"
            strokeWidth="1"
          />
        ))}
        {values.map((value, idx) => {
          const angle = (Math.PI * 2 * idx) / values.length - Math.PI / 2;
          const point = polarToCartesian(cx, cy, radius, angle);
          return <line key={value.label} x1={cx} y1={cy} x2={point.x} y2={point.y} stroke="rgba(148,163,184,0.2)" />;
        })}

        <path d={homePath} fill="rgba(14,165,233,0.35)" stroke="rgba(14,165,233,0.95)" strokeWidth="2" />
        <path d={awayPath} fill="rgba(16,185,129,0.2)" stroke="rgba(16,185,129,0.95)" strokeWidth="2" />
      </svg>

      <ul className="space-y-2 text-sm">
        {values.map((value) => (
          <li key={value.label} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 py-2">
            <span className="text-[color:var(--muted)]">{value.label}</span>
            <span className="font-semibold text-[color:var(--foreground)]">
              {value.home} / {value.away}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

