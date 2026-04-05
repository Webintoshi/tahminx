"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type ToastTone = "error" | "success" | "info";

export interface ToastPayload {
  title: string;
  description?: string;
  tone?: ToastTone;
  durationMs?: number;
}

interface ToastItem extends ToastPayload {
  id: number;
}

interface ToastContextValue {
  showToast: (payload: ToastPayload) => void;
  dismissToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toneClassMap: Record<ToastTone, string> = {
  error: "border-rose-500/45 bg-rose-500/15 text-rose-100",
  success: "border-emerald-500/45 bg-emerald-500/15 text-emerald-100",
  info: "border-sky-500/45 bg-sky-500/15 text-sky-100"
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ tone = "info", durationMs = 4500, ...payload }: ToastPayload) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((current) => [...current, { id, tone, durationMs, ...payload }]);

      window.setTimeout(() => {
        dismissToast(id);
      }, durationMs);
    },
    [dismissToast]
  );

  const value = useMemo(
    () => ({
      showToast,
      dismissToast
    }),
    [dismissToast, showToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed right-3 top-3 z-[9999] flex w-[min(90vw,360px)] flex-col gap-2"
      >
        {toasts.map((toast) => (
          <section
            key={toast.id}
            role="status"
            className={cn(
              "pointer-events-auto rounded-xl border px-3 py-2 shadow-lg backdrop-blur",
              toneClassMap[toast.tone ?? "info"]
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{toast.title}</p>
                {toast.description ? <p className="mt-0.5 text-xs opacity-90">{toast.description}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="rounded border border-white/25 px-1.5 py-0.5 text-[11px] font-semibold transition hover:bg-white/10"
                aria-label="Bildirimi kapat"
              >
                Kapat
              </button>
            </div>
          </section>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

