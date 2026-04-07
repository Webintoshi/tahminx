import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";

const guideSections = [
  {
    icon: "⚙️",
    title: "Sistem nasıl çalışır?",
    text: "TahminX; veri toplama, modelleme, güven skoru hesaplama ve açıklanabilirlik adımlarını sıralı olarak çalıştırır. Her adım bir sonraki adımın kalitesini etkiler."
  },
  {
    icon: "📊",
    title: "Güven skoru nasıl okunur?",
    text: "Güven skoru tek başına değil; veri güven seviyesi ve belirsizlik göstergesi ile birlikte yorumlanmalıdır. %75 üzeri yüksek, %60-75 orta, %60 altı düşük güven olarak değerlendirilir."
  },
  {
    icon: "📈",
    title: "Form analizi nasıl yorumlanır?",
    text: "Son maç trendleri, rakip seviyesi ve iç-dış saha etkisi ayrık olarak değerlendirilir. Form kartlarındaki G (Galibiyet), M (Mağlubiyet), B (Beraberlik) sonuçlarına dikkat edin."
  },
  {
    icon: "⚽",
    title: "Toplam skor analizi",
    text: "Over/under terimi yerine toplam skor aralıkları ve tempo bağlamlı skor senaryoları kullanılır. Beklenen skor tahmini, olasılık dağılımı ile birlikte sunulur."
  },
  {
    icon: "🚀",
    title: "Yeni başlayanlar için",
    text: "İlk adımda Dashboard özetini takip edin, sonra maç detay sekmelerinden model açıklamasını okuyun. Düşük güvenli tahminleri daha dikkatli değerlendirin."
  },
  {
    icon: "⚠️",
    title: "Risk faktörleri",
    text: "Model, veri eksikliği, sakat oyuncu, hava koşulları gibi risk faktörlerini otomatik tespit eder. Risk uyarıları olan maçlarda daha temkinli olun."
  }
];

function GuideCard({ icon, title, text, index }: { icon: string; title: string; text: string; index: number }) {
  return (
    <div className="group relative rounded-2xl border border-[#2A3035] bg-[#171C1F] p-6 transition-all hover:border-[#7A84FF]/50 hover:bg-[#1F2529]">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#1F2529] text-2xl group-hover:bg-[#7A84FF] group-hover:text-black transition-colors">
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#7A84FF]/10 text-xs font-bold text-[#7A84FF]">
              {index + 1}
            </span>
            <h3 className="text-lg font-bold text-[#ECEDEF] group-hover:text-[#7A84FF] transition-colors">
              {title}
            </h3>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-[#9CA3AF]">{text}</p>
        </div>
      </div>
    </div>
  );
}

export default function GuidePage() {
  return (
    <div className="space-y-6 p-6">
      <PageHeader 
        title="Rehber" 
        description="Sistemin çalışma mantığı ve yorumlama kılavuzu" 
      />

      {/* Quick Tips */}
      <div className="rounded-2xl border border-[#7A84FF]/20 bg-[#7A84FF]/5 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#7A84FF]">
            <svg className="h-5 w-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-[#9CA3AF]">
            <span className="font-semibold text-[#ECEDEF]">İpucu:</span> Yüksek güven skoru her zaman kazanç garantisi değildir. Risk faktörlerini ve form durumunu da değerlendirin.
          </p>
        </div>
      </div>

      {/* Guide Grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {guideSections.map((section, index) => (
          <GuideCard 
            key={section.title} 
            icon={section.icon} 
            title={section.title} 
            text={section.text}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}
