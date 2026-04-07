"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

// Feature card component
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
    purple: "border-[#7A84FF]/30 hover:border-[#7A84FF]",
    green: "border-[#34C759]/30 hover:border-[#34C759]",
    orange: "border-[#FF9500]/30 hover:border-[#FF9500]",
  };

  const iconColors = {
    purple: "text-[#7A84FF] group-hover:bg-[#7A84FF] group-hover:text-black",
    green: "text-[#34C759] group-hover:bg-[#34C759] group-hover:text-black",
    orange: "text-[#FF9500] group-hover:bg-[#FF9500] group-hover:text-black",
  };

  return (
    <div className={cn(
      "group rounded-2xl border bg-[#171C1F] p-6 transition-all duration-300",
      "hover:scale-[1.02] hover:shadow-xl hover:bg-[#1F2529]",
      colors[color]
    )}>
      <div className={cn(
        "mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl",
        "bg-[#1F2529] border border-[#2A3035] transition-all duration-300",
        iconColors[color]
      )}>
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-bold text-[#ECEDEF]">{title}</h3>
      <p className="text-sm text-[#9CA3AF] leading-relaxed">{description}</p>
    </div>
  );
}

// Stat number
function StatNumber({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center px-4">
      <div className="text-4xl md:text-5xl font-black text-[#ECEDEF]">
        {value}
      </div>
      <div className="mt-1 text-xs uppercase tracking-wider text-[#9CA3AF]">{label}</div>
    </div>
  );
}

// Navigation
function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#2A3035] bg-black/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7A84FF]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M6 4h8c2.5 0 4 1.5 4 3.5S16.5 11 14 11H6V4z" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 11h9c2.5 0 4 1.5 4 3.5S17.5 18 15 18H6V11z" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 4v14" stroke="black" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="text-xl font-bold text-[#ECEDEF]">betify</span>
        </Link>
        
        <div className="hidden md:flex items-center gap-6">
          <Link href="/matches" className="text-sm text-[#9CA3AF] hover:text-[#ECEDEF] transition-colors">Maçlar</Link>
          <Link href="/predictions" className="text-sm text-[#9CA3AF] hover:text-[#ECEDEF] transition-colors">Tahminler</Link>
          <Link href="/guide" className="text-sm text-[#9CA3AF] hover:text-[#ECEDEF] transition-colors">Nasıl Çalışır</Link>
        </div>

        <Link 
          href="/dashboard" 
          className="inline-flex h-10 items-center justify-center rounded-lg bg-[#7A84FF] px-5 text-sm font-bold text-black hover:bg-[#8B94FF] transition-colors"
        >
          Başla
        </Link>
      </div>
    </nav>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-16 px-6">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-96 h-96 bg-[#7A84FF]/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-20 right-10 w-80 h-80 bg-[#34C759]/10 rounded-full blur-[100px]" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#34C759]/30 bg-[#34C759]/10 px-4 py-1.5 mb-8">
            <span className="flex h-2 w-2 rounded-full bg-[#34C759] animate-pulse" />
            <span className="text-xs font-semibold text-[#34C759]">Şu An 47 Canlı Maç</span>
          </div>
          
          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#ECEDEF] leading-tight">
            Yapay Zeka ile{" "}
            <span className="text-[#7A84FF]">Kazan</span>
          </h1>
          
          <p className="mt-6 text-lg text-[#9CA3AF] max-w-2xl mx-auto">
            Günlük 1000+ maç analizi, %78 başarı oranı. Profesyonel bahisçilerin tercih ettiği yapay zeka destekli tahmin platformu.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/dashboard"
              className="inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-[#7A84FF] px-8 text-base font-bold text-black hover:bg-[#8B94FF] transition-all"
            >
              Analizlere Göz At
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href="/guide"
              className="inline-flex h-14 items-center justify-center rounded-xl border border-[#2A3035] bg-[#171C1F] px-8 text-base font-semibold text-[#ECEDEF] hover:border-[#7A84FF] hover:text-[#7A84FF] transition-all"
            >
              Nasıl Çalışır?
            </Link>
          </div>

          {/* Users */}
          <div className="mt-10 flex items-center justify-center gap-3">
            <div className="flex -space-x-2">
              {[1,2,3,4].map((i) => (
                <div key={i} className="h-8 w-8 rounded-full border-2 border-black bg-gradient-to-br from-[#7A84FF] to-[#34C759]" />
              ))}
            </div>
            <span className="text-sm text-[#9CA3AF]"><span className="text-[#ECEDEF] font-semibold">25,000+</span> kullanıcı</span>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y border-[#2A3035] bg-[#171C1F]/50 py-12">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatNumber value="50+" label="Aktif Lig" />
            <StatNumber value="1000+" label="Günlük Analiz" />
            <StatNumber value="%78" label="Başarı Oranı" />
            <StatNumber value="25K+" label="Mutlu Kullanıcı" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#ECEDEF] mb-3">
              Profesyoneller Neden <span className="text-[#7A84FF]">betify</span>?
            </h2>
            <p className="text-[#9CA3AF]">Yapay zeka destekli analizler ve gerçek zamanlı veriler</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              title="AI Tahmin Motoru"
              description="Derin öğrenme algoritmaları ile 50+ faktör analiz edilir. Geçmiş performans, form durumu ve daha fazlası."
              color="purple"
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              }
            />
            <FeatureCard
              title="Canlı Veri Akışı"
              description="Maç devam ederken bile anlık güncellemeler. Gol, kart, değişiklik anında bildirim."
              color="green"
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
            />
            <FeatureCard
              title="Risk Analizi"
              description="Her tahminde risk skoru ve güven seviyesi. Düşük güvenli maçları filtrele."
              color="orange"
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              }
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-[#7A84FF]/30 bg-[#171C1F] p-10 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-[#ECEDEF] mb-3">
              Kazanmaya Bugün Başla
            </h2>
            <p className="text-[#9CA3AF] mb-8">
              Ücretsiz hesap oluştur, analizlere anında eriş. Kredi kartı gerekmez.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/dashboard"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-[#7A84FF] px-8 text-base font-bold text-black hover:bg-[#8B94FF] transition-colors"
              >
                Ücretsiz Hesap Oluştur
              </Link>
              <Link
                href="/membership"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-[#2A3035] bg-[#1F2529] px-8 text-base font-semibold text-[#ECEDEF] hover:border-[#7A84FF] transition-colors"
              >
                Planları İncele
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#2A3035] bg-[#171C1F] py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#7A84FF]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M6 4h8c2.5 0 4 1.5 4 3.5S16.5 11 14 11H6V4z" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6 11h9c2.5 0 4 1.5 4 3.5S17.5 18 15 18H6V11z" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6 4v14" stroke="black" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="text-lg font-bold text-[#ECEDEF]">betify</span>
          </div>
          
          <div className="flex items-center gap-6">
            <Link href="/guide" className="text-sm text-[#9CA3AF] hover:text-[#ECEDEF] transition-colors">Nasıl Çalışır</Link>
            <Link href="/membership" className="text-sm text-[#9CA3AF] hover:text-[#ECEDEF] transition-colors">Planlar</Link>
          </div>
          
          <p className="text-sm text-[#9CA3AF]">© 2025 betify</p>
        </div>
      </footer>
    </div>
  );
}
