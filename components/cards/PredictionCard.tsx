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
      className={`rounded-xl border bg-[#171C1F] p-4 transition-colors hover:border-[#3A4047] ${
        isLowConfidence ? "border-[#FF9500]/50" : isRecommended ? "border-[#34C759]/50" : "border-[#2A3035]"
      }`}
    >
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">{prediction.leagueName || "Lig bilgisi yok"}</p>
          <p className="mt-1 text-xs text-[#9CA3AF]">
            {formatDateTime(prediction.kickoffAt)} · {getSportLabel(prediction.sportKey)}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {isRecommended ? <StatusBadge status="recommended" /> : null}
          {isLowConfidence ? <StatusBadge status="low-confidence" /> : null}
          <StatusBadge status={prediction.riskLevel} />
        </div>
      </header>

      <h3 className="mt-3 text-base font-semibold text-[#ECEDEF]">
        {prediction.homeTeamName || "Ev"} vs {prediction.awayTeamName || "Dep"}
      </h3>

      <p className="mt-2 text-sm text-[#9CA3AF]">
        Beklenen skor: <span className="text-[#ECEDEF]">{prediction.expectedScore.home ?? "-"} - {prediction.expectedScore.away ?? "-"}</span>
      </p>
      <p className="mt-1 text-sm text-[#9CA3AF]">{prediction.modelSummary || "Model notu bulunmuyor."}</p>

      {isLowConfidence ? (
        <div className="mt-3 rounded-lg border border-[#FF9500]/30 bg-[#FF9500]/10 px-3 py-2">
          <p className="text-xs text-[#FF9500]">
            Bu tahmin düşük güven seviyesinde. Karar verirken ek belirsizlik payını dikkate alın.
          </p>
        </div>
      ) : null}

      {riskFlags.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Risk bayraklari">
          {riskFlags.map((flag) => (
            <li key={flag} className="rounded-md border border-[#FF9500]/30 bg-[#FF9500]/10 px-2 py-1 text-[11px] font-medium text-[#FF9500]">
              {flag}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 space-y-4">
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
