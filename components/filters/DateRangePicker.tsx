"use client";

export function DateRangePicker({
  from,
  to,
  onFromChange,
  onToChange
}: {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="space-y-1">
        <span className="text-xs text-[color:var(--muted)]">Baslangic</span>
        <input
          type="date"
          value={from}
          onChange={(event) => onFromChange(event.target.value)}
          className="h-10 w-full rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 text-sm"
        />
      </label>
      <label className="space-y-1">
        <span className="text-xs text-[color:var(--muted)]">Bitis</span>
        <input
          type="date"
          value={to}
          onChange={(event) => onToChange(event.target.value)}
          className="h-10 w-full rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 text-sm"
        />
      </label>
    </div>
  );
}

