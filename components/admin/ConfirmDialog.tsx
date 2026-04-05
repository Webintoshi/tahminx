import { useEffect } from "react";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Onayla",
  cancelLabel = "Iptal",
  isProcessing,
  onCancel,
  onConfirm
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isProcessing?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/60 px-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(event) => {
        if (event.currentTarget === event.target && !isProcessing) {
          onCancel();
        }
      }}
    >
      <article className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[color:var(--surface)] p-4">
        <h3 className="text-lg font-semibold text-[color:var(--foreground)]">{title}</h3>
        <p className="mt-2 text-sm text-[color:var(--muted)]">{description}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className="rounded-md border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 py-1.5 text-sm font-semibold"
          >
            {isProcessing ? "Isleniyor..." : confirmLabel}
          </button>
        </div>
      </article>
    </div>
  );
}
