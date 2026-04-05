interface LineChartPoint {
  label: string;
  value: number;
}

export function LineChart({ data, height = 180 }: { data: LineChartPoint[]; height?: number }) {
  if (!data.length) return null;

  const width = 420;
  const max = Math.max(...data.map((d) => d.value), 1);
  const min = Math.min(...data.map((d) => d.value), 0);
  const range = max - min || 1;

  const points = data
    .map((point, idx) => {
      const x = (idx / (data.length - 1 || 1)) * width;
      const y = height - ((point.value - min) / range) * (height - 20) - 10;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full rounded-xl bg-[color:var(--surface-alt)] p-2" role="img" aria-label="Cizgi grafik">
        <polyline fill="none" stroke="var(--accent)" strokeWidth="3" points={points} strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <div className="grid gap-2 text-center text-[11px] text-[color:var(--muted)]" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}>
        {data.map((point) => (
          <span key={point.label} className="truncate">{point.label}</span>
        ))}
      </div>
    </div>
  );
}

