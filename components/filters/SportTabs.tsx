"use client";

import type { SportType } from "@/types/domain";

const tabs: Array<{ label: string; value: SportType | "all" }> = [
  { label: "Tum Sporlar", value: "all" },
  { label: "Futbol", value: "football" },
  { label: "Basketbol", value: "basketball" }
];

export function SportTabs({ value, onChange }: { value: SportType | "all"; onChange: (value: SportType | "all") => void }) {
  return (
    <div className="inline-flex rounded-xl border border-[var(--border)] bg-[color:var(--surface-alt)] p-1">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] transition ${
            value === tab.value ? "bg-[color:var(--accent)] text-black" : "text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

