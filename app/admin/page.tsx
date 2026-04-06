import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";

const sections = [
  {
    title: "Core Admin",
    items: [
      { href: "/admin/risk-monitor", label: "Risk Monitor", description: "Risk dagilimi ve bayraklar" },
      { href: "/admin/calibration", label: "Calibration", description: "Model calibration sonuclari" },
      { href: "/admin/low-confidence", label: "Low Confidence", description: "Dusuk guvenli prediction listesi" }
    ]
  },
  {
    title: "Model Ops",
    items: [
      { href: "/admin/models/comparison", label: "Model Comparison", description: "Model versiyon karsilastirmasi" },
      { href: "/admin/models/performance", label: "Model Performance", description: "Zaman serisi performans trendi" },
      { href: "/admin/models/drift", label: "Model Drift", description: "Drift ozeti" }
    ]
  },
  {
    title: "Feature Ops",
    items: [
      { href: "/admin/features/lab", label: "Feature Lab", description: "Feature group ve set yonetimi" },
      { href: "/admin/features/experiments", label: "Feature Experiments", description: "Feature experiment sonuclari" },
      { href: "/admin/predictions/failed", label: "Failed Predictions", description: "Yanlis tahmin analizi" }
    ]
  }
];

export default function AdminPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Admin" description="Admin modullerine toplu erisim sayfasi" />

      <div className="grid gap-4 xl:grid-cols-3">
        {sections.map((section) => (
          <SectionCard key={section.title} title={section.title}>
            <div className="space-y-3">
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-xl border border-[var(--border)] bg-[color:var(--surface-alt)] px-4 py-3 transition hover:border-[color:var(--accent)] hover:bg-white/5"
                >
                  <div className="text-sm font-semibold text-[color:var(--foreground)]">{item.label}</div>
                  <div className="mt-1 text-sm text-[color:var(--muted)]">{item.description}</div>
                </Link>
              ))}
            </div>
          </SectionCard>
        ))}
      </div>
    </div>
  );
}
