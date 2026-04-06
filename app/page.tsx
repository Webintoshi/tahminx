import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#000000]">
      {/* Hero Section */}
      <section className="relative px-6 pt-20 pb-32">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#2A3035] bg-[#171C1F] px-4 py-1.5">
            <span className="flex h-2 w-2 rounded-full bg-[#7A84FF]" />
            <span className="text-sm font-medium text-[#9CA3AF]">
              Yeni: AI Destekli Tahmin Motoru
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl font-semibold tracking-tight text-[#ECEDEF] sm:text-5xl lg:text-6xl">
            Veriye dayalı
            <br />
            <span className="text-[#7A84FF]">spor tahminleri</span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#9CA3AF]">
            Futbol ve basketbol maçları için gelişmiş analiz araçları, 
            istatistiksel modeller ve gerçek zamanlı verilerle 
            kazanma olasılığınızı artırın.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/dashboard"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-[#7A84FF] px-8 text-base font-semibold text-black transition-all hover:bg-[#8B94FF] active:scale-[0.98]"
            >
              Analize Başla
            </Link>
            <Link
              href="/guide"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-[#2A3035] bg-transparent px-8 text-base font-medium text-[#ECEDEF] transition-all hover:border-[#3A4047] hover:bg-[#171C1F] active:scale-[0.98]"
            >
              Nasıl Çalışır?
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="border-t border-[#2A3035] px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="group rounded-2xl border border-[#2A3035] bg-[#171C1F] p-6 transition-colors hover:border-[#3A4047]">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#7A84FF]/10">
                <svg className="h-5 w-5 text-[#7A84FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-[#ECEDEF]">Detaylı İstatistikler</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#9CA3AF]">
                Takım ve oyuncu performans verileri, tarihsel sonuçlar ve karşılaştırmalı analizler.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group rounded-2xl border border-[#2A3035] bg-[#171C1F] p-6 transition-colors hover:border-[#3A4047]">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#7A84FF]/10">
                <svg className="h-5 w-5 text-[#7A84FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-[#ECEDEF]">Gerçek Zamanlı Veriler</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#9CA3AF]">
                Canlı maç istatistikleri, anlık oran değişimleri ve hızlı bildirimler.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group rounded-2xl border border-[#2A3035] bg-[#171C1F] p-6 transition-colors hover:border-[#3A4047]">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#7A84FF]/10">
                <svg className="h-5 w-5 text-[#7A84FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-[#ECEDEF]">AI Tahminleri</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#9CA3AF]">
                Makine öğrenmesi modelleri tarafından üretilmiş akıllı tahmin önerileri.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group rounded-2xl border border-[#2A3035] bg-[#171C1F] p-6 transition-colors hover:border-[#3A4047]">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#7A84FF]/10">
                <svg className="h-5 w-5 text-[#7A84FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-[#ECEDEF]">Görsel Analizler</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#9CA3AF]">
                Interaktif grafikler, form durumu görselleştirmeleri ve karşılaştırmalı veriler.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="group rounded-2xl border border-[#2A3035] bg-[#171C1F] p-6 transition-colors hover:border-[#3A4047]">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#7A84FF]/10">
                <svg className="h-5 w-5 text-[#7A84FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-[#ECEDEF]">Maç Takvimi</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#9CA3AF]">
                Gelecek maçlar, fikstür analizleri ve önemli karşılaşma hatırlatıcıları.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="group rounded-2xl border border-[#2A3035] bg-[#171C1F] p-6 transition-colors hover:border-[#3A4047]">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#7A84FF]/10">
                <svg className="h-5 w-5 text-[#7A84FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-[#ECEDEF]">Güvenilir Veri Kaynakları</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#9CA3AF]">
                Resmi lig verileri, doğrulanmış istatistikler ve şeffaf analiz metodolojisi.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-t border-[#2A3035] px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-8 sm:grid-cols-3">
            <div className="text-center">
              <div className="text-3xl font-bold text-[#7A84FF]">50+</div>
              <div className="mt-1 text-sm text-[#9CA3AF]">Lig ve Turnuva</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[#7A84FF]">10K+</div>
              <div className="mt-1 text-sm text-[#9CA3AF]">Analiz Edilen Maç</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[#7A84FF]">%78</div>
              <div className="mt-1 text-sm text-[#9CA3AF]">Tahmin Doğruluğu</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#2A3035] px-6 py-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#7A84FF]">
                <span className="text-xs font-bold text-black">T</span>
              </div>
              <span className="text-sm font-medium text-[#ECEDEF]">TahminX</span>
            </div>
            <p className="text-sm text-[#9CA3AF]">
              © 2025 TahminX. Tüm hakları saklıdır.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
