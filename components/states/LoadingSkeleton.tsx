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
        "animate-pulse rounded-xl border border-[#2A3035] bg-[#1F2529]",
        variantClassMap[variant],
        className
      )}
      aria-hidden="true"
    />
  );
}
