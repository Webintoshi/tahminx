export function ModelVersionSelect({
  value,
  options,
  onChange
}: {
  value: string;
  options: string[];
  onChange: (value?: string) => void;
}) {
  return (
    <label className="space-y-1">
      <span className="text-xs text-[color:var(--muted)]">Model version</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value || undefined)}
        className="h-10 w-full rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 text-sm"
      >
        <option value="">Tum modeller</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
