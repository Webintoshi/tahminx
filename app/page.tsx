import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-[#000000]">
      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          {/* Logo Mark */}
          <div className="mb-8 inline-flex items-center justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#7A84FF]">
              <span className="text-xl font-bold text-black">T</span>
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-4xl font-semibold tracking-tight text-[#ECEDEF] sm:text-5xl">
            TahminX
          </h1>
          <p className="mt-4 text-lg text-[#9CA3AF]">
            Veriye dayalı spor tahmin platformu
          </p>

          {/* CTA */}
          <div className="mt-10">
            <Link
              href="/dashboard"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-[#7A84FF] px-8 text-base font-semibold text-black transition-all hover:bg-[#8B94FF] active:scale-[0.98]"
            >
              Analize Başla
            </Link>
          </div>

          {/* Stats Row */}
          <div className="mt-16 grid grid-cols-3 gap-8 border-t border-[#2A3035] pt-8">
            <div>
              <div className="text-2xl font-semibold text-[#ECEDEF]">50+</div>
              <div className="mt-1 text-sm text-[#9CA3AF]">Lig</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-[#ECEDEF]">10K+</div>
              <div className="mt-1 text-sm text-[#9CA3AF]">Maç</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-[#7A84FF]">%78</div>
              <div className="mt-1 text-sm text-[#9CA3AF]">Doğruluk</div>
            </div>
          </div>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="border-t border-[#2A3035] px-6 py-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <p className="text-sm text-[#9CA3AF]">© 2025 TahminX</p>
          <div className="flex items-center gap-6">
            <Link href="/guide" className="text-sm text-[#9CA3AF] transition-colors hover:text-[#ECEDEF]">
              Nasıl Çalışır
            </Link>
            <Link href="/membership" className="text-sm text-[#9CA3AF] transition-colors hover:text-[#ECEDEF]">
              Planlar
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
