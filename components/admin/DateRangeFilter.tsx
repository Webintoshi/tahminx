export function DateRangeFilter({
  from,
  to,
  onChange
}: {
  from: string;
  to: string;
  onChange: (value: { from?: string; to?: string }) => void;
}) {
  return (
    <>
      <label className="space-y-1">
        <span className="text-xs text-[color:var(--muted)]">Baslangic</span>
        <input
          type="date"
          value={from}
          onChange={(event) => onChange({ from: event.target.value || undefined })}
          className="h-10 w-full rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 text-sm"
        />
      </label>
      <label className="space-y-1">
        <span className="text-xs text-[color:var(--muted)]">Bitis</span>
        <input
          type="date"
          value={to}
          onChange={(event) => onChange({ to: event.target.value || undefined })}
          className="h-10 w-full rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 text-sm"
        />
      </label>
    </>
  );
}
