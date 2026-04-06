"use client";

export function SearchInput({
  value,
  onChange,
  placeholder = "Ara..."
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="relative block">
      <span className="sr-only">Arama</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-[#2A3035] bg-[#1F2529] px-3 text-sm text-[#ECEDEF] placeholder:text-[#9CA3AF] focus:border-[#7A84FF] focus:outline-none"
      />
    </label>
  );
}
