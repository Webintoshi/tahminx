"use client";

export function ErrorState({
  title = "Veri alinirken hata olustu",
  description,
  onRetry
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <section role="alert" className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-6">
      <h3 className="text-xl text-amber-200 [font-family:var(--font-display)]">{title}</h3>
      <p className="mt-2 text-sm text-amber-100/90">{description ?? "Beklenmeyen bir hata olustu."}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-lg border border-amber-300/40 px-3 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-400/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
        >
          Tekrar dene
        </button>
      ) : null}
    </section>
  );
}

