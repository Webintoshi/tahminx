import type { TeamDetail, TeamFormPoint } from "@/types/api-contract";

const formColor = {
  W: "bg-emerald-500/70",
  D: "bg-amber-500/70",
  L: "bg-rose-500/70"
};

export function TeamFormCard({ team, form }: { team: TeamDetail; form?: TeamFormPoint[] }) {
  const latestForm = (form ?? []).slice(-5).map((item) => item.result);

  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[color:var(--surface)] p-4">
      <h3 className="text-lg text-[color:var(--foreground)] [font-family:var(--font-display)]">{team.name}</h3>
      <p className="mt-1 text-sm text-[color:var(--muted)]">{team.city ?? "-"} • {team.coach ?? "-"}</p>

      <div className="mt-3 flex items-center gap-2">
        {latestForm.length > 0 ? (
          latestForm.map((result, idx) => (
            <span
              key={`${team.id}-${idx}`}
              className={`h-7 w-7 rounded-full text-center text-xs font-semibold leading-7 text-white ${formColor[result]}`}
            >
              {result}
            </span>
          ))
        ) : (
          <p className="text-xs text-[color:var(--muted)]">Form verisi yok</p>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg border border-[var(--border)] p-2">
          <dt className="text-[color:var(--muted)]">Ic saha</dt>
          <dd className="font-semibold text-[color:var(--foreground)]">{team.homeMetric ?? "-"}%</dd>
        </div>
        <div className="rounded-lg border border-[var(--border)] p-2">
          <dt className="text-[color:var(--muted)]">Dis saha</dt>
          <dd className="font-semibold text-[color:var(--foreground)]">{team.awayMetric ?? "-"}%</dd>
        </div>
      </dl>
    </article>
  );
}
