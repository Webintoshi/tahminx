import { TEAM_COMPARISON_WINDOWS } from "@/lib/team-comparison";
import { cn } from "@/lib/utils";

export function DataWindowSelector({
  value,
  onChange,
  disabled
}: {
  value: "last3" | "last5" | "last10";
  onChange: (value: "last3" | "last5" | "last10") => void;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label="Veri penceresi" className="grid grid-cols-3 gap-2">
      {TEAM_COMPARISON_WINDOWS.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-[#7A84FF] bg-[#7A84FF] text-black"
                : "border-[#2A3035] bg-[#1F2529] text-[#ECEDEF] hover:border-[#3A4047]",
              disabled ? "cursor-not-allowed opacity-60" : ""
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
