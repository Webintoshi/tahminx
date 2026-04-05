"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { DataFeedback } from "@/components/states/DataFeedback";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useMembership } from "@/lib/hooks/use-api";

export default function MembershipPage() {
  const { data, error, isLoading, refetch } = useMembership();
  const plans = data?.data ?? [];

  return (
    <div className="space-y-5">
      <PageHeader title="Uyelik" description="Planlar, paket karsilastirma, ozellikler ve fatura ozeti" />

      <DataFeedback
        isLoading={isLoading}
        error={error as Error | undefined}
        isEmpty={plans.length === 0}
        emptyTitle="Plan bulunamadi"
        emptyDescription="Uyelik paketleri su an listelenemiyor."
        onRetry={() => void refetch()}
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <SectionCard
              key={plan.id}
              title={plan.name}
              subtitle={`$${plan.priceMonthly}/ay`}
              action={plan.recommended ? <StatusBadge status="low" className="!text-emerald-100" /> : null}
            >
              <ul className="space-y-2 text-sm text-[color:var(--muted)]">
                {plan.features.map((feature) => (
                  <li key={feature} className="rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 py-2">
                    {feature}
                  </li>
                ))}
              </ul>
            </SectionCard>
          ))}
        </div>

        <SectionCard title="Fatura gecmisi" subtitle="Son donem odemeleri">
          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="min-w-full text-sm">
              <thead className="bg-[color:var(--surface-alt)] text-left text-xs uppercase tracking-[0.08em] text-[color:var(--muted)]">
                <tr>
                  <th className="px-3 py-2">Tarih</th>
                  <th className="px-3 py-2">Plan</th>
                  <th className="px-3 py-2">Tutar</th>
                  <th className="px-3 py-2">Durum</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-[var(--border)]">
                  <td className="px-3 py-2">2026-03-01</td>
                  <td className="px-3 py-2">Pro</td>
                  <td className="px-3 py-2">$49</td>
                  <td className="px-3 py-2"><StatusBadge status="neutral" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </SectionCard>
      </DataFeedback>
    </div>
  );
}

