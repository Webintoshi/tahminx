"use client";

import type { SportType } from "@/types/domain";

const tabs: Array<{ label: string; value: SportType | "all" }> = [
  { label: "Tümü", value: "all" },
  { label: "Futbol", value: "football" },
  { label: "Basketbol", value: "basketball" }
];

export function SportTabs({ value, onChange }: { value: SportType | "all"; onChange: (value: SportType | "all") => void }) {
  return (
    <div className="inline-flex rounded-lg border border-[#2A3035] bg-[#1F2529] p-1">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            value === tab.value 
              ? "bg-[#7A84FF] text-black" 
              : "text-[#9CA3AF] hover:text-[#ECEDEF]"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
