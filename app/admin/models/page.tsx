import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";

const items = [
  { href: "/admin/models/comparison", label: "Model Comparison", description: "Versiyon ve accuracy karsilastirmasi" },
  { href: "/admin/models/feature-importance", label: "Feature Importance", description: "Ozellik katki agirliklari" },
  { href: "/admin/models/performance", label: "Model Performance", description: "Zaman serisi performans trendi" },
  { href: "/admin/models/drift", label: "Model Drift", description: "Drift ve sapma ozeti" },
  { href: "/admin/models/strategies", label: "Strategies", description: "Strategy secimi ve guncelleme" },
  { href: "/admin/models/ensemble", label: "Ensemble Config", description: "Ensemble agirlik yonetimi" }
];

export default function AdminModelsPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Admin Models" description="Model izleme ve yonetim modulleri" />
      <SectionCard title="Model Modulleri" subtitle="Bir model operasyon paneli secin">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
