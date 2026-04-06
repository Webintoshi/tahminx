import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";

const items = [
  { href: "/admin/predictions/failed", label: "Failed Predictions", description: "Yanlis tahmin analizi" },
  { href: "/admin/low-confidence", label: "Low Confidence", description: "Dusuk guvenli prediction listesi" },
  { href: "/admin/risk-monitor", label: "Risk Monitor", description: "Risk ozeti ve bayraklar" }
];

export default function AdminPredictionsPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Admin Predictions" description="Prediction kalitesi ve risk modulleri" />
      <SectionCard title="Prediction Modulleri" subtitle="Prediction admin alanlarina hizli erisim">
        <div className="grid gap-3 md:grid-cols-3">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-xl border border-[var(--border)] bg-[color:var(--surface-alt)] px-4 py-4 transition hover:border-[color:var(--accent)] hover:bg-white/5"
            >
              <div className="text-sm font-semibold text-[color:var(--foreground)]">{item.label}</div>
              <div className="mt-1 text-sm text-[color:var(--muted)]">{item.description}</div>
            </Link>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
