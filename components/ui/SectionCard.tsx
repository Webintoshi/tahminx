import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionCard({ 
  title, 
  subtitle, 
  action, 
  children, 
  className 
}: { 
  title: string; 
  subtitle?: string; 
  action?: ReactNode; 
  children: ReactNode; 
  className?: string 
}) {
  return (
    <section className={cn("rounded-xl border border-[#2A3035] bg-[#171C1F] p-5", className)}>
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-[#ECEDEF]">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-[#9CA3AF]">{subtitle}</p> : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
