import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";

const items = [
  { href: "/admin/features/lab", label: "Feature Lab", description: "Feature group ve toggle yonetimi" },
  { href: "/admin/features/experiments", label: "Feature Experiments", description: "Deney kurulumlari ve sonuclari" }
];

export default function AdminFeaturesPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Admin Features" description="Feature yonetimi ve deney akislari" />
      <SectionCard title="Feature Modulleri" subtitle="Alt modullerden birini secin">
        <div className="grid gap-3 md:grid-cols-2">
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
