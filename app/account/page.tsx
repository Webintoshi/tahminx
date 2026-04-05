"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { DataFeedback } from "@/components/states/DataFeedback";
import { useAccount } from "@/lib/hooks/use-api";

export default function AccountPage() {
  const { data, error, isLoading, refetch } = useAccount();
  const [saved, setSaved] = useState(false);
  const profile = data?.data;

  return (
    <div className="space-y-5">
      <PageHeader title="Hesabim" description="Profil, favoriler, bildirim ve guvenlik ayarlari" />

      <DataFeedback
        isLoading={isLoading}
        error={error as Error | undefined}
        isEmpty={!profile}
        emptyTitle="Hesap verisi bulunamadi"
        emptyDescription="Profil bilgileri su an yuklenemedi."
        onRetry={() => void refetch()}
      >
        {profile ? (
          <>
            <SectionCard title="Profil" subtitle="Kullanici temel bilgileri">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs text-[color:var(--muted)]">Ad Soyad</span>
                  <input defaultValue={profile.fullName} className="h-10 w-full rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3" />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-[color:var(--muted)]">E-posta</span>
                  <input defaultValue={profile.email} className="h-10 w-full rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3" />
                </label>
              </div>
            </SectionCard>

            <SectionCard title="Favoriler" subtitle="Takip edilen ligler ve takimlar">
              <div className="grid gap-4 md:grid-cols-2">
                <article>
                  <p className="mb-2 text-sm font-semibold text-[color:var(--foreground)]">Favori ligler</p>
                  <ul className="space-y-2">
                    {profile.favoriteLeagues.map((league: string) => (
                      <li key={league} className="rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 py-2 text-sm">{league}</li>
                    ))}
                  </ul>
                </article>
                <article>
                  <p className="mb-2 text-sm font-semibold text-[color:var(--foreground)]">Favori takimlar</p>
                  <ul className="space-y-2">
                    {profile.favoriteTeams.map((team: string) => (
                      <li key={team} className="rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 py-2 text-sm">{team}</li>
                    ))}
                  </ul>
                </article>
              </div>
            </SectionCard>

            <SectionCard title="Bildirim ayarlari" subtitle="Canli ve sistem bildirim tercihleri">
              <div className="space-y-2 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked={profile.notifications.liveAlerts} />
                  Canli mac alarmlari
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked={profile.notifications.confidenceDropAlerts} />
                  Guven skoru dusus alarmlari
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked={profile.notifications.weeklyDigest} />
                  Haftalik ozet
                </label>
              </div>
            </SectionCard>

            <SectionCard title="Guvenlik" subtitle="Hesap guvenligi ayarlari">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setSaved(true)}
                  className="rounded-lg bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-black"
                >
                  Ayarlari kaydet
                </button>
                <button type="button" className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm">
                  Sifre degistir
                </button>
                {saved ? <span className="text-sm text-emerald-400">Degisiklikler kaydedildi.</span> : null}
              </div>
            </SectionCard>
          </>
        ) : null}
      </DataFeedback>
    </div>
  );
}

