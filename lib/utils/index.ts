import type { MatchStatus, SportKey } from "@/types/api-contract";

export const cn = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" ");

export const toPercent = (value: number | null | undefined, fractionDigits = 0) => {
  if (value == null || Number.isNaN(value)) return "-";
  return `${value.toFixed(fractionDigits)}%`;
};

const safeDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

export const formatDateTime = (iso?: string | null) => {
  const date = safeDate(iso);
  if (!date) return "Tarih bilinmiyor";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
};

export const formatDate = (iso?: string | null) => {
  const date = safeDate(iso);
  if (!date) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(date);
};

export const getStatusLabel = (status: MatchStatus | string) => {
  switch (status) {
    case "live":
      return "Canli";
    case "completed":
      return "Tamamlandi";
    case "scheduled":
      return "Planlandi";
    case "postponed":
      return "Ertelendi";
    case "cancelled":
      return "Iptal";
    default:
      return "Bilinmiyor";
  }
};

export const getSportLabel = (sport: SportKey | undefined) => {
  if (sport === "football") return "Futbol";
  if (sport === "basketball") return "Basketbol";
  return "Spor";
};

export const safeScore = (value?: number | null) => (value == null ? "-" : String(value));

export const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export const placeholderLogo = (name: string) => initials(name || "TM");

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
