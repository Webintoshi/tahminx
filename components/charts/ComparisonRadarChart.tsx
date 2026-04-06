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
  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 100;

  const homePath = toPath(values.map((v) => v.home), radius, cx, cy);
  const awayPath = toPath(values.map((v) => v.away), radius, cx, cy);

  return (
    <div className="grid gap-6 md:grid-cols-[280px_1fr] md:items-center">
      <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto h-[280px] w-[280px]">
        {/* Grid circles */}
        {[0.25, 0.5, 0.75, 1].map((scale) => (
          <circle
            key={scale}
            cx={cx}
            cy={cy}
            r={radius * scale}
            fill="none"
            stroke="#2A3035"
            strokeWidth="1"
          />
        ))}
        
        {/* Axis lines */}
        {values.map((value, idx) => {
          const angle = (Math.PI * 2 * idx) / values.length - Math.PI / 2;
          const point = polarToCartesian(cx, cy, radius, angle);
          return <line key={value.label} x1={cx} y1={cy} x2={point.x} y2={point.y} stroke="#2A3035" strokeWidth="1" />;
        })}

        {/* Data paths */}
        <path d={homePath} fill="rgba(122,132,255,0.25)" stroke="#7A84FF" strokeWidth="2.5" />
        <path d={awayPath} fill="rgba(52,199,89,0.15)" stroke="#34C759" strokeWidth="2.5" />
        
        {/* Center dot */}
        <circle cx={cx} cy={cy} r="3" fill="#7A84FF" />
      </svg>

      {/* Legend */}
      <div className="space-y-4">
        {/* Team indicators */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#7A84FF]" />
            <span className="text-sm font-medium text-[#ECEDEF]">Ev Sahibi</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#34C759]" />
            <span className="text-sm font-medium text-[#ECEDEF]">Deplasman</span>
          </div>
        </div>

        {/* Values list */}
        <ul className="space-y-2">
          {values.map((value) => (
            <li key={value.label} className="flex items-center justify-between rounded-lg border border-[#2A3035] bg-[#1F2529] px-4 py-3">
              <span className="text-sm text-[#9CA3AF]">{value.label}</span>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-[#7A84FF]">{value.home}</span>
                <span className="text-[#9CA3AF]">/</span>
                <span className="font-semibold text-[#34C759]">{value.away}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
