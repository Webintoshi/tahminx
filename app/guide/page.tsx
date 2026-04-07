import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";

// SVG Icons
const icons = {
  settings: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  chart: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  trending: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  soccer: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
    </svg>
  ),
  rocket: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  warning: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
};

const guideSections = [
  {
    iconKey: "settings" as const,
    title: "Sistem nasıl çalışır?",
    text: "TahminX; veri toplama, modelleme, güven skoru hesaplama ve açıklanabilirlik adımlarını sıralı olarak çalıştırır. Her adım bir sonraki adımın kalitesini etkiler."
  },
  {
    iconKey: "chart" as const,
    title: "Güven skoru nasıl okunur?",
    text: "Güven skoru tek başına değil; veri güven seviyesi ve belirsizlik göstergesi ile birlikte yorumlanmalıdır. %75 üzeri yüksek, %60-75 orta, %60 altı düşük güven olarak değerlendirilir."
  },
  {
    iconKey: "trending" as const,
    title: "Form analizi nasıl yorumlanır?",
    text: "Son maç trendleri, rakip seviyesi ve iç-dış saha etkisi ayrık olarak değerlendirilir. Form kartlarındaki G (Galibiyet), M (Mağlubiyet), B (Beraberlik) sonuçlarına dikkat edin."
  },
  {
    iconKey: "soccer" as const,
    title: "Toplam skor analizi",
    text: "Over/under terimi yerine toplam skor aralıkları ve tempo bağlamlı skor senaryoları kullanılır. Beklenen skor tahmini, olasılık dağılımı ile birlikte sunulur."
  },
  {
    iconKey: "rocket" as const,
    title: "Yeni başlayanlar için",
    text: "İlk adımda Dashboard özetini takip edin, sonra maç detay sekmelerinden model açıklamasını okuyun. Düşük güvenli tahminleri daha dikkatli değerlendirin."
  },
  {
    iconKey: "warning" as const,
    title: "Risk faktörleri",
    text: "Model, veri eksikliği, sakat oyuncu, hava koşulları gibi risk faktörlerini otomatik tespit eder. Risk uyarıları olan maçlarda daha temkinli olun."
  }
];

function GuideCard({ iconKey, title, text, index }: { iconKey: keyof typeof icons; title: string; text: string; index: number }) {
  const icon = icons[iconKey];
  
  return (
    <div className="group relative rounded-2xl border border-[#2A3035] bg-[#171C1F] p-6 transition-all hover:border-[#7A84FF]/50 hover:bg-[#1F2529]">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#1F2529] text-[#7A84FF] group-hover:bg-[#7A84FF] group-hover:text-black transition-colors">
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
            iconKey={section.iconKey} 
            title={section.title} 
            text={section.text}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}
