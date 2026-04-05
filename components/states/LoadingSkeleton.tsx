import { cn } from "@/lib/utils";

type SkeletonVariant = "card" | "list" | "table";

const variantClassMap: Record<SkeletonVariant, string> = {
  card: "h-36",
  list: "h-24",
  table: "h-14"
};

export function LoadingSkeleton({
  className,
  variant = "card"
}: {
  className?: string;
  variant?: SkeletonVariant;
}) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl border border-[var(--border)] bg-gradient-to-r from-[color:var(--surface-alt)] via-white/5 to-[color:var(--surface-alt)]",
        variantClassMap[variant],
        className
      )}
      aria-hidden="true"
    />
  );
}

