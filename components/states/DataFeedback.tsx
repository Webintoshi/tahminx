"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { EmptyState } from "@/components/states/EmptyState";
import { ErrorState } from "@/components/states/ErrorState";
import { LoadingSkeleton } from "@/components/states/LoadingSkeleton";
import { useToast } from "@/components/providers/ToastProvider";

export function DataFeedback({
  isLoading,
  error,
  isEmpty,
  isPartial,
  emptyTitle,
  emptyDescription,
  partialTitle = "Veri eksik",
  partialDescription = "Bazi alanlar eksik oldugu icin ekran kisitli gosteriliyor.",
  loadingCount = 3,
  loadingVariant = "card",
  onRetry,
  children
}: {
  isLoading: boolean;
  error?: Error;
  isEmpty: boolean;
  isPartial?: boolean;
  emptyTitle: string;
  emptyDescription: string;
  partialTitle?: string;
  partialDescription?: string;
  loadingCount?: number;
  loadingVariant?: "card" | "list" | "table";
  onRetry?: () => void;
  children: ReactNode;
}) {
  const { showToast } = useToast();
  const lastErrorRef = useRef<string | null>(null);

  useEffect(() => {
    if (!error) {
      lastErrorRef.current = null;
      return;
    }

    const signature = `${error.name}:${error.message}`;
    if (lastErrorRef.current === signature) {
      return;
    }

    lastErrorRef.current = signature;
    showToast({
      tone: "error",
      title: "Veri yuklenemedi",
      description: error.message
    });
  }, [error, showToast]);

  if (isLoading) {
    return (
      <div
        className={`grid gap-3 ${loadingVariant === "table" ? "grid-cols-1" : loadingVariant === "list" ? "grid-cols-1 md:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3"}`}
        aria-busy="true"
        aria-live="polite"
      >
        {Array.from({ length: loadingCount }).map((_, idx) => (
          <LoadingSkeleton key={idx} variant={loadingVariant} />
        ))}
      </div>
    );
  }

  if (error) {
    return <ErrorState description={error.message} onRetry={onRetry} />;
  }

  if (isEmpty) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  if (isPartial) {
    return (
      <div className="space-y-3">
        <EmptyState
          title={partialTitle}
          description={partialDescription}
          action={
            onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm transition hover:bg-[color:var(--surface-alt)]"
              >
                Yenile
              </button>
            ) : undefined
          }
        />
        {children}
      </div>
    );
  }

  return <>{children}</>;
}

