"use client";

export function ErrorState({
  title = "Veri alınırken hata oluştu",
  description,
  onRetry
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <section role="alert" className="rounded-xl border border-[#FF3B30]/30 bg-[#FF3B30]/10 p-6">
      <h3 className="text-lg font-semibold text-[#FF3B30]">{title}</h3>
      <p className="mt-1 text-sm text-[#FF3B30]/80">{description ?? "Beklenmeyen bir hata oluştu."}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-lg bg-[#FF3B30] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#FF3B30]/90"
        >
          Tekrar dene
        </button>
      ) : null}
    </section>
  );
}
