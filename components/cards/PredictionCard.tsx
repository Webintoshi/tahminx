import type { PredictionItem } from "@/types/api-contract";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

// Güven seviyesine göre renk ve emoji
function getConfidenceLevel(score: number | null | undefined) {
  const s = score ?? 0;
  if (s >= 75) return { 
    label: "Yüksek", 
    color: "#34C759", 
    bg: "bg-[#34C759]/10",
    border: "border-[#34C759]/40",
    emoji: "✓" 
  };
  if (s >= 60) return { 
    label: "Orta", 
    color: "#7A84FF", 
    bg: "bg-[#7A84FF]/10",
    border: "border-[#7A84FF]/40",
    emoji: "~" 
  };
  return { 
    label: "Düşük", 
    color: "#FF9500", 
    bg: "bg-[#FF9500]/10",
    border: "border-[#FF9500]/40",
    emoji: "!" 
  };
}

// Kazanan tahmini belirle
function getWinner(prediction: PredictionItem) {
  const { home, draw, away } = prediction.probabilities;
  const h = home ?? 0;
  const d = draw ?? 0;
  const a = away ?? 0;
  if (h > d && h > a) return { team: prediction.homeTeamName, prob: h, type: "home" };
  if (a > d && a > h) return { team: prediction.awayTeamName, prob: a, type: "away" };
  return { team: "Beraberlik", prob: d, type: "draw" };
}

export function PredictionCard({ prediction }: { prediction: PredictionItem }) {
  const confidence = getConfidenceLevel(prediction.confidenceScore);
  const winner = getWinner(prediction);
  const riskCount = (prediction.riskFlags ?? []).length;
  const drawProbability = prediction.probabilities.draw ?? 0;
  
  return (
    <article className={cn(
      "rounded-xl border-2 bg-[#171C1F] p-4 transition-all hover:scale-[1.01]",
      confidence.border
    )}>
      {/* Üst Bilgi: Lig ve Tarih */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-[#9CA3AF]">{prediction.leagueName}</span>
        <span className="text-[#9CA3AF]/70">{formatDateTime(prediction.kickoffAt)}</span>
      </div>

      {/* Maç Başlığı */}
      <h3 className="mt-2 text-lg font-bold text-[#ECEDEF]">
        {prediction.homeTeamName} <span className="text-[#9CA3AF]">vs</span> {prediction.awayTeamName}
      </h3>

      {/* Tahmin Özeti - Tek Satır */}
      <div className="mt-3 flex items-center gap-3">
        {/* Güven Rozeti */}
        <div 
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold",
            confidence.bg
          )}
          style={{ color: confidence.color }}
        >
          <span>{confidence.emoji}</span>
          <span>%{prediction.confidenceScore ?? 0}</span>
          <span className="text-xs font-normal opacity-80">{confidence.label}</span>
        </div>

        {/* Tahmin Edilen Sonuç */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-[#9CA3AF]">Tahmin:</span>
          <span className="font-semibold text-[#ECEDEF]">{winner.team}</span>
          <span className="text-xs text-[#7A84FF]">(%{Math.round(winner.prob)})</span>
        </div>
      </div>

      {/* Beklenen Skor */}
      <div className="mt-3 flex items-center gap-2 text-sm">
        <span className="text-[#9CA3AF]">Skor Tahmini:</span>
        <span className="rounded bg-[#1F2529] px-2 py-0.5 font-mono text-lg font-bold text-[#ECEDEF]">
          {prediction.expectedScore.home ?? "?"} - {prediction.expectedScore.away ?? "?"}
        </span>
      </div>

      {/* Risk Uyarısı - Sadece varsa ve kısa */}
      {riskCount > 0 && (
        <div className="mt-3 flex items-center gap-2 text-xs text-[#FF9500]">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{riskCount} risk faktörü</span>
        </div>
      )}

      {/* Olasılık Barı - Sadece Görsel */}
      <div className="mt-4">
        <div className="flex h-2 overflow-hidden rounded-full bg-[#1F2529]">
          <div 
            className="bg-[#34C759]" 
            style={{ width: `${prediction.probabilities.home}%` }}
          />
          <div 
            className="bg-[#9CA3AF]" 
            style={{ width: `${drawProbability}%` }}
          />
          <div 
            className="bg-[#7A84FF]" 
            style={{ width: `${prediction.probabilities.away}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] text-[#9CA3AF]">
          <span>Ev: %{Math.round(prediction.probabilities.home)}</span>
          <span>Beraberlik: %{Math.round(drawProbability)}</span>
          <span>Deplasman: %{Math.round(prediction.probabilities.away)}</span>
        </div>
      </div>
    </article>
  );
}
