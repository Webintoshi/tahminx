interface BarPoint {
  label: string;
  value: number;
}

export function BarChart({ data }: { data: BarPoint[] }) {
  if (!data.length) {
    return <p className="text-sm text-[color:var(--muted)]">Grafik verisi bulunmuyor.</p>;
  }

  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="space-y-3" role="img" aria-label="Bar grafik">
      {data.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between text-xs text-[color:var(--muted)]">
            <span>{item.label}</span>
            <span>{item.value.toFixed(1)}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-[color:var(--surface-alt)]">
            <div className="h-full rounded-full bg-[color:var(--accent)]" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

