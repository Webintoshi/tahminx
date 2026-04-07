"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

// Animated gradient orbs for background
function GradientOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#7A84FF]/30 blur-[150px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#34C759]/20 blur-[130px] animate-pulse delay-1000" />
      <div className="absolute top-[40%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[400px] h-[400px] rounded-full bg-[#7A84FF]/15 blur-[100px]" />
    </div>
  );
}

// Floating card component with glass effect
function FloatingCard({ 
  children, 
  className,
  delay = 0 
}: { 
  children: React.ReactNode; 
  className?: string;
  delay?: number;
}) {
  return (
    <div 
      className={cn(
        "absolute backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl",
        "transition-all duration-500 hover:scale-105",
        className
      )}
      style={{ 
        animationDelay: `${delay}ms`,
        background: "linear-gradient(135deg, rgba(122,132,255,0.1) 0%, rgba(23,28,31,0.8) 100%)"
      }}
    >
      {children}
    </div>
  );
}

// Feature card with image/icon
function FeatureCard({ 
  title, 
  description, 
  icon,
  color = "purple"
}: { 
  title: string; 
  description: string; 
  icon: React.ReactNode;
  color?: "purple" | "green" | "orange";
}) {
  const colors = {
    purple: "from-[#7A84FF]/20 to-[#7A84FF]/5 border-[#7A84FF]/30",
    green: "from-[#34C759]/20 to-[#34C759]/5 border-[#34C759]/30",
    orange: "from-[#FF9500]/20 to-[#FF9500]/5 border-[#FF9500]/30",
  };

  return (
    <div className={cn(
      "group relative overflow-hidden rounded-3xl border p-8 transition-all duration-500",
      "hover:scale-[1.02] hover:shadow-2xl",
      colors[color]
    )} style={{ background: `linear-gradient(135deg, ${color === 'purple' ? 'rgba(122,132,255,0.15)' : color === 'green' ? 'rgba(52,199,89,0.15)' : 'rgba(255,149,0,0.15)'} 0%, rgba(23,28,31,0.95) 100%)` }}>
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        {icon}
      </div>
      <div className="relative z-10">
        <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
          {icon}
        </div>
        <h3 className="mb-3 text-xl font-bold text-white">{title}</h3>
        <p className="text-[#9CA3AF] leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

// Stat number with animation
function StatNumber({ value, label, prefix = "" }: { value: string; label: string; prefix?: string }) {
  return (
    <div className="text-center">
      <div className="text-5xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-[#7A84FF]">
        {prefix}{value}
      </div>
      <div className="mt-2 text-sm uppercase tracking-widest text-[#9CA3AF] font-medium">{label}</div>
    </div>
  );
}

// Live match ticker
function LiveMatchTicker() {
  const matches = [
    { home: "Galatasaray", away: "Fenerbahçe", score: "2-1", time: "78'" },
    { home: "Man City", away: "Liverpool", score: "1-1", time: "65'" },
    { home: "Real Madrid", away: "Barcelona", score: "0-0", time: "32'" },
  ];

  return (
    <div className="w-full overflow-hidden bg-[#171C1F]/80 backdrop-blur-lg border-y border-[#2A3035]">
      <div className="flex items-center gap-8 py-4 animate-marquee whitespace-nowrap">
        {matches.map((match, i) => (
          <div key={i} className="flex items-center gap-4 px-6">
            <span className="flex h-2 w-2 rounded-full bg-[#34C759] animate-pulse" />
            <span className="text-white font-medium">{match.home}</span>
            <span className="text-[#7A84FF] font-bold bg-[#7A84FF]/10 px-3 py-1 rounded-lg">{match.score}</span>
            <span className="text-white font-medium">{match.away}</span>
            <span className="text-[#9CA3AF] text-sm">{match.time}</span>
          </div>
        ))}
        {matches.map((match, i) => (
          <div key={`dup-${i}`} className="flex items-center gap-4 px-6">
            <span className="flex h-2 w-2 rounded-full bg-[#34C759] animate-pulse" />
            <span className="text-white font-medium">{match.home}</span>
            <span className="text-[#7A84FF] font-bold bg-[#7A84FF]/10 px-3 py-1 rounded-lg">{match.score}</span>
            <span className="text-white font-medium">{match.away}</span>
            <span className="text-[#9CA3AF] text-sm">{match.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Navigation
function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#7A84FF] to-[#5A64DF]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M6 4h8c2.5 0 4 1.5 4 3.5S16.5 11 14 11H6V4z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 11h9c2.5 0 4 1.5 4 3.5S17.5 18 15 18H6V11z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 4v14" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="text-xl font-bold text-white">betify</span>
        </Link>
        
        <div className="hidden md:flex items-center gap-8">
          <Link href="/matches" className="text-sm text-[#9CA3AF] hover:text-white transition-colors">Maçlar</Link>
          <Link href="/predictions" className="text-sm text-[#9CA3AF] hover:text-white transition-colors">Tahminler</Link>
          <Link href="/guide" className="text-sm text-[#9CA3AF] hover:text-white transition-colors">Nasıl Çalışır</Link>
          <Link href="/membership" className="text-sm text-[#9CA3AF] hover:text-white transition-colors">Planlar</Link>
        </div>

        <div className="flex items-center gap-4">
          <Link 
            href="/dashboard" 
            className="hidden sm:inline-flex h-10 items-center justify-center rounded-lg bg-white/5 border border-white/10 px-4 text-sm font-medium text-white hover:bg-white/10 transition-colors"
          >
            Giriş Yap
          </Link>
          <Link 
            href="/dashboard" 
            className="inline-flex h-10 items-center justify-center rounded-lg bg-[#7A84FF] px-5 text-sm font-bold text-black hover:bg-[#8B94FF] transition-colors"
          >
            Başla
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-black overflow-x-hidden">
      <GradientOrbs />
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            {/* Left Content */}
            <div className="relative z-10 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#34C759]/30 bg-[#34C759]/10 px-4 py-1.5 mb-6">
                <span className="flex h-2 w-2 rounded-full bg-[#34C759] animate-pulse" />
                <span className="text-xs font-semibold text-[#34C759] uppercase tracking-wider">Şu An 47 Canlı Maç</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black tracking-tight text-white leading-[1.1]">
                Yapay Zeka ile{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7A84FF] via-[#9B9FFF] to-[#34C759]">
                  Kazan
                </span>
              </h1>
              
              <p className="mt-6 text-lg sm:text-xl text-[#9CA3AF] max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Günlük 1000+ maç analizi, %78 başarı oranı. 
                Profesyonel bahisçilerin tercih ettiği yapay zeka destekli tahmin platformu.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  href="/dashboard"
                  className="group inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-[#7A84FF] px-8 text-base font-bold text-black transition-all hover:bg-[#8B94FF] hover:scale-105"
                >
                  Analizlere Göz At
                  <svg className="h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link
                  href="/guide"
                  className="inline-flex h-14 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-8 text-base font-semibold text-white transition-all hover:bg-white/10"
                >
                  Nasıl Çalışır?
                </Link>
              </div>

              <div className="mt-10 flex items-center gap-6 justify-center lg:justify-start">
                <div className="flex -space-x-3">
                  {[1,2,3,4].map((i) => (
                    <div key={i} className="h-10 w-10 rounded-full border-2 border-black bg-gradient-to-br from-[#7A84FF] to-[#34C759]" />
                  ))}
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold text-white">25,000+</div>
                  <div className="text-xs text-[#9CA3AF]">Aktif Kullanıcı</div>
                </div>
              </div>
            </div>

            {/* Right Visual - Floating Cards */}
            <div className="relative h-[500px] lg:h-[600px] hidden lg:block">
              {/* Main Card */}
              <FloatingCard className="top-10 left-10 w-72 p-6" delay={0}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#34C759]/20">
                    <span className="text-[#34C759] text-lg">⚡</span>
                  </div>
                  <div>
                    <div className="text-white font-semibold">Canlı Tahmin</div>
                    <div className="text-xs text-[#9CA3AF]">Galatasaray - Fenerbahçe</div>
                  </div>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[#9CA3AF] text-sm">Galibiyet</span>
                  <span className="text-[#34C759] font-bold">%67</span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full w-[67%] bg-gradient-to-r from-[#34C759] to-[#7A84FF] rounded-full" />
                </div>
              </FloatingCard>

              {/* Stats Card */}
              <FloatingCard className="top-40 right-0 w-64 p-5" delay={200}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[#9CA3AF] text-sm">Başarı Oranı</span>
                  <span className="text-[#7A84FF] font-bold text-2xl">%78</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {['Pzt', 'Sal', 'Çar'].map((day, i) => (
                    <div key={day} className="text-center">
                      <div className="text-xs text-[#9CA3AF] mb-1">{day}</div>
                      <div 
                        className="h-16 rounded-lg bg-gradient-to-t from-[#7A84FF] to-[#7A84FF]/30"
                        style={{ height: `${40 + i * 20}px` }}
                      />
                    </div>
                  ))}
                </div>
              </FloatingCard>

              {/* Mini Card */}
              <FloatingCard className="bottom-20 left-20 w-56 p-4" delay={400}>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FF9500]/20">
                    <svg className="h-5 w-5 text-[#FF9500]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-white font-semibold">Yüksek Güven</div>
                    <div className="text-xs text-[#9CA3AF]">23 tahmin hazır</div>
                  </div>
                </div>
              </FloatingCard>
            </div>
          </div>
        </div>
      </section>

      {/* Live Ticker */}
      <LiveMatchTicker />

      {/* Stats Section */}
      <section className="relative py-20 border-y border-white/5 bg-[#0A0A0A]/50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
            <StatNumber value="50" label="Aktif Lig" prefix="+" />
            <StatNumber value="1000" label="Günlük Analiz" prefix="+" />
            <StatNumber value="78" label="Başarı Oranı" prefix="%" />
            <StatNumber value="25K" label="Mutlu Kullanıcı" prefix="+" />
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Profesyoneller Neden <span className="text-[#7A84FF]">betify</span>?
            </h2>
            <p className="text-[#9CA3AF] text-lg max-w-2xl mx-auto">
              Yapay zeka destekli analizler, gerçek zamanlı veriler ve şeffaf performans raporları
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              title="AI Tahmin Motoru"
              description="Derin öğrenme algoritmaları ile 50+ faktör analiz edilir. Geçmiş performans, form durumu, hava koşulları ve daha fazlası."
              color="purple"
              icon={
                <svg className="h-6 w-6 text-[#7A84FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              }
            />
            <FeatureCard
              title="Canlı Veri Akışı"
              description="Maç devam ederken bile anlık güncellemeler. Gol, kart, değişiklik anında bildirim. Asla kaçırmazsın."
              color="green"
              icon={
                <svg className="h-6 w-6 text-[#34C759]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
            />
            <FeatureCard
              title="Risk Analizi"
              description="Her tahminde risk skoru ve güven seviyesi. Düşük güvenli maçları filtrele, sadece en iyileri gör."
              color="orange"
              icon={
                <svg className="h-6 w-6 text-[#FF9500]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              }
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="relative overflow-hidden rounded-3xl border border-[#7A84FF]/30 bg-gradient-to-br from-[#7A84FF]/20 via-[#171C1F] to-[#34C759]/10 p-10 md:p-16 text-center">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM3QTg0RkYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0aDR2NGgtNHpNMjAgMjBoNHY0aC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
            
            <h2 className="relative text-3xl md:text-4xl font-bold text-white mb-4">
              Kazanmaya Bugün Başla
            </h2>
            <p className="relative text-[#9CA3AF] text-lg max-w-xl mx-auto mb-8">
              Ücretsiz hesap oluştur, analizlere anında eriş. Kredi kartı gerekmez.
            </p>
            
            <div className="relative flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/dashboard"
                className="inline-flex h-14 items-center justify-center rounded-xl bg-white px-8 text-base font-bold text-black transition-all hover:bg-gray-100"
              >
                Ücretsiz Hesap Oluştur
              </Link>
              <Link
                href="/membership"
                className="inline-flex h-14 items-center justify-center rounded-xl border border-white/20 bg-white/5 px-8 text-base font-semibold text-white transition-all hover:bg-white/10"
              >
                Planları İncele
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/5 bg-[#0A0A0A] py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#7A84FF] to-[#5A64DF]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M6 4h8c2.5 0 4 1.5 4 3.5S16.5 11 14 11H6V4z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6 11h9c2.5 0 4 1.5 4 3.5S17.5 18 15 18H6V11z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6 4v14" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </div>
              <span className="text-lg font-bold text-white">betify</span>
            </div>
            
            <div className="flex items-center gap-8">
              <Link href="/guide" className="text-sm text-[#9CA3AF] hover:text-white transition-colors">Nasıl Çalışır</Link>
              <Link href="/membership" className="text-sm text-[#9CA3AF] hover:text-white transition-colors">Planlar</Link>
              <Link href="/privacy" className="text-sm text-[#9CA3AF] hover:text-white transition-colors">Gizlilik</Link>
            </div>
            
            <p className="text-sm text-[#9CA3AF]">© 2025 betify. Tüm hakları saklıdır.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
