import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  action,
  tone = "default"
}: {
  title: string;
  description: string;
  action?: ReactNode;
  tone?: "default" | "warning";
}) {
  return (
    <section
      className={cn(
        "rounded-xl border bg-[#171C1F] p-6 text-center",
        tone === "warning" ? "border-[#FF9500]/30" : "border-[#2A3035]"
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">
        {tone === "warning" ? "Bilgilendirme" : "Boş Durum"}
      </p>
      <h3 className="mt-2 text-lg font-semibold text-[#ECEDEF]">{title}</h3>
      <p className="mt-1 text-sm text-[#9CA3AF]">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </section>
  );
}
