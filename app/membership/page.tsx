"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { DataFeedback } from "@/components/states/DataFeedback";
import { useMembership } from "@/lib/hooks/use-api";
import { cn } from "@/lib/utils";

function PlanCard({ plan, isPopular }: { plan: { id: string; name: string; priceMonthly: number; features: string[]; recommended?: boolean }; isPopular?: boolean }) {
  return (
    <div className={cn(
      "relative rounded-2xl border p-6 transition-all",
      isPopular 
        ? "border-[#7A84FF]/50 bg-[#7A84FF]/5" 
        : "border-[#2A3035] bg-[#171C1F] hover:border-[#3A4047]"
    )}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#7A84FF] px-4 py-1 text-xs font-bold text-black">
          ÖNERİLEN
        </div>
      )}
      
      <div className="text-center">
        <h3 className="text-xl font-bold text-[#ECEDEF]">{plan.name}</h3>
        <div className="mt-4 flex items-baseline justify-center gap-1">
          <span className="text-4xl font-bold text-[#ECEDEF]">${plan.priceMonthly}</span>
          <span className="text-[#9CA3AF]">/ay</span>
        </div>
      </div>

      <ul className="mt-6 space-y-3">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-sm text-[#9CA3AF]">
            <svg className="h-5 w-5 shrink-0 text-[#34C759]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {feature}
          </li>
        ))}
      </ul>

      <button
        type="button"
        className={cn(
          "mt-6 w-full rounded-xl py-3 text-sm font-bold transition-all",
          isPopular
            ? "bg-[#7A84FF] text-black hover:bg-[#7A84FF]/90"
            : "border border-[#2A3035] bg-[#1F2529] text-[#ECEDEF] hover:border-[#7A84FF] hover:text-[#7A84FF]"
        )}
      >
        Planı Seç
      </button>
    </div>
  );
}

function BillingTable() {
  return (
    <div className="rounded-2xl border border-[#2A3035] bg-[#171C1F] p-5">
      <h3 className="mb-4 text-lg font-semibold text-[#ECEDEF]">Fatura Geçmişi</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2A3035]">
              <th className="py-3 text-left text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">Tarih</th>
              <th className="py-3 text-left text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">Plan</th>
              <th className="py-3 text-left text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">Tutar</th>
              <th className="py-3 text-left text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">Durum</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[#2A3035]/50">
              <td className="py-3 text-[#ECEDEF]">2026-03-01</td>
              <td className="py-3 text-[#ECEDEF]">Pro</td>
              <td className="py-3 text-[#ECEDEF]">$49</td>
              <td className="py-3">
                <span className="rounded-full bg-[#34C759]/10 px-2.5 py-1 text-xs font-medium text-[#34C759]">
                  Ödendi
                </span>
              </td>
            </tr>
            <tr>
              <td className="py-3 text-[#ECEDEF]">2026-02-01</td>
              <td className="py-3 text-[#ECEDEF]">Pro</td>
              <td className="py-3 text-[#ECEDEF]">$49</td>
              <td className="py-3">
                <span className="rounded-full bg-[#34C759]/10 px-2.5 py-1 text-xs font-medium text-[#34C759]">
                  Ödendi
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function MembershipPage() {
  const { data, error, isLoading, refetch } = useMembership();
  const plans = data?.data ?? [];

  return (
    <div className="space-y-6 p-6">
      <PageHeader 
        title="Üyelik" 
        description="Planlar, paket karşılaştırma, özellikler ve fatura özeti" 
      />

      <DataFeedback
        isLoading={isLoading}
        error={error as Error | undefined}
        isEmpty={plans.length === 0}
        emptyTitle="Plan bulunamadı"
        emptyDescription="Üyelik paketleri şu an listelenemiyor."
        onRetry={() => void refetch()}
      >
        {/* Plans Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard 
              key={plan.id} 
              plan={plan} 
              isPopular={plan.recommended}
            />
          ))}
        </div>

        {/* Billing History */}
        <BillingTable />
      </DataFeedback>
    </div>
  );
}
