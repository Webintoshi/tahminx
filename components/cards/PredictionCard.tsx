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
  if (h > d && h > a) return { team: prediction.homeTeamName, prob: h, type: "home" as const };
  if (a > d && a > h) return { team: prediction.awayTeamName, prob: a, type: "away" as const };
  return { team: "Beraberlik", prob: d, type: "draw" as const };
}

// Olasılık barı segmenti
function ProbBar({ 
  value, 
  color, 
  label 
}: { 
  value: number; 
  color: string; 
  label: string;
}) {
  const width = Math.max(value, 3); // Min 3% width for visibility
  return (
    <div 
      className={cn("relative flex h-full items-center justify-center overflow-hidden", color)}
      style={{ width: `${width}%` }}
    >
      {value > 10 && (
        <span className="text-[10px] font-bold text-black/80">{Math.round(value)}%</span>
      )}
    </div>
  );
}

export function PredictionCard({ prediction }: { prediction: PredictionItem }) {
  const confidence = getConfidenceLevel(prediction.confidenceScore);
  const winner = getWinner(prediction);
  const riskCount = (prediction.riskFlags ?? []).length;
  const probs = {
    home: prediction.probabilities.home ?? 0,
    draw: prediction.probabilities.draw ?? 0,
    away: prediction.probabilities.away ?? 0
  };

  // Favori takım rengi
  const getWinnerColor = (type: string) => {
    if (type === "home") return "text-[#34C759]";
    if (type === "away") return "text-[#7A84FF]";
    return "text-[#9CA3AF]";
  };
  
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

      {/* Tahmin Özeti */}
      <div className="mt-3 flex flex-wrap items-center gap-3">
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
          <span className={cn("font-bold", getWinnerColor(winner.type))}>
            {winner.team}
          </span>
        </div>
      </div>

      {/* Skor ve Risk - Yan Yana */}
      <div className="mt-3 flex flex-wrap items-center gap-4">
        {/* Beklenen Skor */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#9CA3AF]">Skor:</span>
          <span className="rounded-lg bg-[#1F2529] px-3 py-1 font-mono text-base font-bold text-[#ECEDEF]">
            {prediction.expectedScore.home ?? "?"} - {prediction.expectedScore.away ?? "?"}
          </span>
        </div>

        {/* Risk Uyarısı */}
        {riskCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-[#FF9500]">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{riskCount} risk</span>
          </div>
        )}
      </div>

      {/* Olasılık Barı */}
      <div className="mt-4 rounded-xl bg-[#1F2529] p-3">
        {/* Takım İsimleri */}
        <div className="mb-2 flex justify-between text-xs">
          <span className="text-[#34C759]">{prediction.homeTeamName}</span>
          <span className="text-[#9CA3AF]">Beraberlik</span>
          <span className="text-[#7A84FF]">{prediction.awayTeamName}</span>
        </div>
        
        {/* Bar */}
        <div className="flex h-7 overflow-hidden rounded-lg">
          <ProbBar value={probs.home} color="bg-[#34C759]" label="Ev" />
          <ProbBar value={probs.draw} color="bg-[#9CA3AF]" label="Beraberlik" />
          <ProbBar value={probs.away} color="bg-[#7A84FF]" label="Deplasman" />
        </div>
        
        {/* Yüzdeler */}
        <div className="mt-2 flex justify-between text-xs">
          <span className="font-medium text-[#34C759]">%{Math.round(probs.home)}</span>
          <span className="font-medium text-[#9CA3AF]">%{Math.round(probs.draw)}</span>
          <span className="font-medium text-[#7A84FF]">%{Math.round(probs.away)}</span>
        </div>
      </div>
    </article>
  );
}
