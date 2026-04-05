import type { PredictionItem } from "@/types/api-contract";
import { formatDateTime, getSportLabel } from "@/lib/utils";
import { ConfidenceGauge } from "@/components/ui/ConfidenceGauge";
import { ProbabilityBar } from "@/components/ui/ProbabilityBar";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function PredictionCard({ prediction }: { prediction: PredictionItem }) {
  const riskFlags = prediction.riskFlags ?? [];
  const isLowConfidence = Boolean(prediction.isLowConfidence) || (prediction.confidenceScore ?? 0) < 67;
  const isRecommended = Boolean(prediction.isRecommended) && !isLowConfidence;

  return (
    <article
      className={`rounded-2xl border bg-[color:var(--surface)] p-4 ${
        isLowConfidence ? "border-amber-500/45" : isRecommended ? "border-teal-500/40" : "border-[var(--border)]"
      }`}
    >
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--muted)]">{prediction.leagueName || "Lig bilgisi yok"}</p>
          <p className="text-sm text-[color:var(--muted)]">
            {formatDateTime(prediction.kickoffAt)} - {getSportLabel(prediction.sportKey)}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {isRecommended ? <StatusBadge status="recommended" /> : null}
          {isLowConfidence ? <StatusBadge status="low-confidence" /> : null}
          <StatusBadge status={prediction.riskLevel} />
        </div>
      </header>

      <h3 className="mt-3 text-lg text-[color:var(--foreground)] [font-family:var(--font-display)]">
        {prediction.homeTeamName || "Ev"} vs {prediction.awayTeamName || "Dep"}
      </h3>

      <p className="mt-2 text-sm text-[color:var(--muted)]">
        Beklenen skor: {prediction.expectedScore.home ?? "-"} - {prediction.expectedScore.away ?? "-"}
      </p>
      <p className="mt-2 text-sm text-[color:var(--muted)]">{prediction.modelSummary || "Model notu bulunmuyor."}</p>

      {isLowConfidence ? (
        <p className="mt-2 rounded-md border border-amber-500/35 bg-amber-500/10 px-2 py-1 text-xs text-amber-100">
          Bu tahmin dusuk guven seviyesinde. Karar verirken ek belirsizlik payini dikkate alin.
        </p>
      ) : null}

      {riskFlags.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-2" aria-label="Risk bayraklari">
          {riskFlags.map((flag) => (
            <li key={flag} className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-200">
              {flag}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-[color:var(--muted)]">Risk bayragi yok.</p>
      )}

      <div className="mt-3 space-y-3">
        <ProbabilityBar
          home={prediction.probabilities.home}
          draw={prediction.probabilities.draw}
          away={prediction.probabilities.away}
        />
        <ConfidenceGauge value={prediction.confidenceScore} />
      </div>
    </article>
  );
}

