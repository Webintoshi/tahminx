import Link from "next/link";
import { cn } from "@/lib/utils";

// Animated background component
function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute -left-1/4 top-0 h-[500px] w-[500px] rounded-full bg-[#7A84FF]/20 blur-[120px]" />
      <div className="absolute -right-1/4 bottom-0 h-[500px] w-[500px] rounded-full bg-[#34C759]/10 blur-[120px]" />
      <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7A84FF]/10 blur-[100px]" />
    </div>
  );
}

// Feature card component
function FeatureCard({ 
  icon, 
  title, 
  description, 
  color = "accent" 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
  color?: "accent" | "success" | "warning";
}) {
  const colors = {
    accent: "border-[#7A84FF]/30 bg-[#7A84FF]/5 hover:border-[#7A84FF]",
    success: "border-[#34C759]/30 bg-[#34C759]/5 hover:border-[#34C759]",
    warning: "border-[#FF9500]/30 bg-[#FF9500]/5 hover:border-[#FF9500]",
  };

  return (
    <div className={cn(
      "group rounded-2xl border p-6 transition-all duration-300",
      colors[color]
    )}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#1F2529] text-[#7A84FF] group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-semibold text-[#ECEDEF]">{title}</h3>
      <p className="text-sm text-[#9CA3AF] leading-relaxed">{description}</p>
    </div>
  );
}

// Stat counter with animation effect
function StatCounter({ value, label, suffix = "" }: { value: string; label: string; suffix?: string }) {
  return (
    <div className="text-center">
      <div className="text-4xl font-bold text-[#ECEDEF]">
        {value}<span className="text-[#7A84FF]">{suffix}</span>
      </div>
      <div className="mt-1 text-sm text-[#9CA3AF]">{label}</div>
    </div>
  );
}

// Live indicator
function LiveIndicator() {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[#34C759]/30 bg-[#34C759]/10 px-3 py-1">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#34C759] opacity-75"></span>
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#34C759]"></span>
      </span>
      <span className="text-xs font-medium text-[#34C759]">CANLI</span>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#000000]">
      <AnimatedBackground />
      
      {/* Navigation */}
      <nav className="relative z-10 border-b border-[#2A3035]/50 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7A84FF]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M6 4h8c2.5 0 4 1.5 4 3.5S16.5 11 14 11H6V4z" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6 11h9c2.5 0 4 1.5 4 3.5S17.5 18 15 18H6V11z" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6 4v14" stroke="black" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="text-lg font-bold text-[#ECEDEF]">betify</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/guide" className="text-sm text-[#9CA3AF] hover:text-[#ECEDEF] transition-colors">
              Nasıl Çalışır
            </Link>
            <Link 
              href="/dashboard" 
              className="rounded-lg bg-[#7A84FF] px-4 py-2 text-sm font-semibold text-black transition-all hover:bg-[#8B94FF]"
            >
              Giriş Yap
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 px-6 pt-20 pb-16">
        <div className="mx-auto max-w-5xl text-center">
          <div className="mb-6 flex justify-center">
            <LiveIndicator />
          </div>
          
          <h1 className="text-5xl font-bold tracking-tight text-[#ECEDEF] sm:text-6xl lg:text-7xl">
            Yapay Zeka ile
            <span className="block bg-gradient-to-r from-[#7A84FF] to-[#34C759] bg-clip-text text-transparent">
              Kazanmanın Yeni Yolu
            </span>
          </h1>
          
          <p className="mx-auto mt-6 max-w-2xl text-lg text-[#9CA3AF]">
            Günlük 1000+ maç analizi, %78 başarı oranı ve gerçek zamanlı tahminler. 
            Spor bahislerinde avantajını yakala.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/dashboard"
              className="group inline-flex h-14 items-center gap-2 rounded-xl bg-[#7A84FF] px-8 text-base font-bold text-black transition-all hover:bg-[#8B94FF] hover:scale-105"
            >
              Hemen Analiz Et
              <svg className="h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href="/guide"
              className="inline-flex h-14 items-center gap-2 rounded-xl border border-[#2A3035] bg-[#171C1F] px-8 text-base font-semibold text-[#ECEDEF] transition-all hover:border-[#7A84FF] hover:text-[#7A84FF]"
            >
              Daha Fazla Bilgi
            </Link>
          </div>
        </div>
      </section>

      {/* Live Stats Bar */}
      <section className="relative z-10 border-y border-[#2A3035]/50 bg-[#171C1F]/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <StatCounter value="50" label="Aktif Lig" suffix="+" />
            <StatCounter value="1000" label="Günlük Analiz" suffix="+" />
            <StatCounter value="78" label="Başarı Oranı" suffix="%" />
            <StatCounter value="25K" label="Aktif Üye" suffix="+" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-[#ECEDEF]">Neden betify?</h2>
            <p className="mt-3 text-[#9CA3AF]">Profesyonel bahisçilerin tercih ettiği özellikler</p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-3">
            <FeatureCard
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              }
              title="AI Destekli Analiz"
              description="Yapay zeka modellerimiz binlerce veri noktasını analiz ederek en doğru tahminleri üretir."
              color="accent"
            />
            <FeatureCard
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
              title="Canlı Veri Akışı"
              description="Maçlar devam ederken bile gerçek zamanlı güncellemeler ve anlık tahmin değişiklikleri."
              color="success"
            />
            <FeatureCard
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              title="Şeffaf Performans"
              description="Tüm tahminlerimizin geçmiş performansını görüntüleyin. Ne söylediysek arkasındayız."
              color="warning"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-6 py-20">
        <div className="mx-auto max-w-4xl rounded-3xl border border-[#7A84FF]/30 bg-gradient-to-br from-[#7A84FF]/10 to-[#34C759]/5 p-10 text-center">
          <h2 className="text-3xl font-bold text-[#ECEDEF]">Bugün kazanmaya başla</h2>
          <p className="mx-auto mt-3 max-w-lg text-[#9CA3AF]">
            Ücretsiz hesap oluştur, analizlere eriş ve kazanma şansını artır.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/dashboard"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-[#7A84FF] px-8 text-base font-bold text-black transition-all hover:bg-[#8B94FF]"
            >
              Ücretsiz Başla
            </Link>
            <Link
              href="/membership"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-[#7A84FF] px-8 text-base font-semibold text-[#7A84FF] transition-all hover:bg-[#7A84FF] hover:text-black"
            >
              Planları İncele
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#2A3035] px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-[#7A84FF]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M6 4h8c2.5 0 4 1.5 4 3.5S16.5 11 14 11H6V4z" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6 11h9c2.5 0 4 1.5 4 3.5S17.5 18 15 18H6V11z" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6 4v14" stroke="black" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="text-sm font-semibold text-[#ECEDEF]">betify</span>
          </div>
          <p className="text-sm text-[#9CA3AF]">© 2025 betify. Tüm hakları saklıdır.</p>
          <div className="flex items-center gap-6">
            <Link href="/guide" className="text-sm text-[#9CA3AF] hover:text-[#ECEDEF] transition-colors">
              Nasıl Çalışır
            </Link>
            <Link href="/membership" className="text-sm text-[#9CA3AF] hover:text-[#ECEDEF] transition-colors">
              Planlar
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
