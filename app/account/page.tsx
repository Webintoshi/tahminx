"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataFeedback } from "@/components/states/DataFeedback";
import { useAccount } from "@/lib/hooks/use-api";
import { cn } from "@/lib/utils";

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-lg font-semibold text-[#ECEDEF]">{title}</h3>
      {description && <p className="text-xs text-[#9CA3AF]">{description}</p>}
    </div>
  );
}

function FormInput({ label, defaultValue, type = "text" }: { label: string; defaultValue?: string; type?: string }) {
  return (
    <label className="space-y-2 block">
      <span className="text-xs font-medium text-[#9CA3AF]">{label}</span>
      <input 
        type={type}
        defaultValue={defaultValue} 
        className="h-11 w-full rounded-xl border border-[#2A3035] bg-[#1F2529] px-4 text-sm text-[#ECEDEF] placeholder:text-[#9CA3AF] focus:border-[#7A84FF] focus:outline-none transition-colors"
      />
    </label>
  );
}

function Checkbox({ label, defaultChecked }: { label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <div className="relative flex items-center">
        <input 
          type="checkbox" 
          defaultChecked={defaultChecked}
          className="peer h-5 w-5 cursor-pointer appearance-none rounded-lg border border-[#2A3035] bg-[#1F2529] checked:border-[#7A84FF] checked:bg-[#7A84FF]"
        />
        <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-0 peer-checked:opacity-100 text-black" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <span className="text-sm text-[#9CA3AF] group-hover:text-[#ECEDEF] transition-colors">{label}</span>
    </label>
  );
}

export default function AccountPage() {
  const { data, error, isLoading, refetch } = useAccount();
  const [saved, setSaved] = useState(false);
  const profile = data?.data;

  return (
    <div className="space-y-6 p-6">
      <PageHeader 
        title="Hesabım" 
        description="Profil, favoriler, bildirim ve güvenlik ayarları" 
      />

      <DataFeedback
        isLoading={isLoading}
        error={error as Error | undefined}
        isEmpty={!profile}
        emptyTitle="Hesap verisi bulunamadı"
        emptyDescription="Profil bilgileri şu an yüklenemedi."
        onRetry={() => void refetch()}
      >
        {profile ? (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Profile Section */}
            <div className="rounded-2xl border border-[#2A3035] bg-[#171C1F] p-5">
              <SectionHeader title="Profil" description="Kullanıcı temel bilgileri" />
              <div className="grid gap-4">
                <FormInput label="Ad Soyad" defaultValue={profile.fullName} />
                <FormInput label="E-posta" defaultValue={profile.email} type="email" />
              </div>
            </div>

            {/* Favorites Section */}
            <div className="rounded-2xl border border-[#2A3035] bg-[#171C1F] p-5">
              <SectionHeader title="Favoriler" description="Takip edilen ligler ve takımlar" />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-3 text-sm font-medium text-[#9CA3AF]">Favori Ligler</p>
                  <ul className="space-y-2">
                    {profile.favoriteLeagues?.map((league: string) => (
                      <li key={league} className="flex items-center gap-2 rounded-lg border border-[#2A3035] bg-[#1F2529] px-3 py-2 text-sm text-[#ECEDEF]">
                        <svg className="h-4 w-4 text-[#7A84FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                        {league}
                      </li>
                    ))}
                    {(!profile.favoriteLeagues || profile.favoriteLeagues.length === 0) && (
                      <li className="text-sm text-[#9CA3AF]">Henüz favori lig yok</li>
                    )}
                  </ul>
                </div>
                <div>
                  <p className="mb-3 text-sm font-medium text-[#9CA3AF]">Favori Takımlar</p>
                  <ul className="space-y-2">
                    {profile.favoriteTeams?.map((team: string) => (
                      <li key={team} className="flex items-center gap-2 rounded-lg border border-[#2A3035] bg-[#1F2529] px-3 py-2 text-sm text-[#ECEDEF]">
                        <svg className="h-4 w-4 text-[#34C759]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                        {team}
                      </li>
                    ))}
                    {(!profile.favoriteTeams || profile.favoriteTeams.length === 0) && (
                      <li className="text-sm text-[#9CA3AF]">Henüz favori takım yok</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>

            {/* Notifications Section */}
            <div className="rounded-2xl border border-[#2A3035] bg-[#171C1F] p-5">
              <SectionHeader title="Bildirim Ayarları" description="Canlı ve sistem bildirim tercihleri" />
              <div className="space-y-4">
                <Checkbox label="Canlı maç alarmları" defaultChecked={profile.notifications?.liveAlerts} />
                <Checkbox label="Güven skoru düşüş alarmları" defaultChecked={profile.notifications?.confidenceDropAlerts} />
                <Checkbox label="Haftalık özet" defaultChecked={profile.notifications?.weeklyDigest} />
                <Checkbox label="Yeni tahmin bildirimleri" defaultChecked={profile.notifications?.newPredictions} />
              </div>
            </div>

            {/* Security Section */}
            <div className="rounded-2xl border border-[#2A3035] bg-[#171C1F] p-5">
              <SectionHeader title="Güvenlik" description="Hesap güvenliği ayarları" />
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setSaved(true)}
                  className="w-full rounded-xl bg-[#7A84FF] px-4 py-3 text-sm font-bold text-black transition-all hover:bg-[#7A84FF]/90"
                >
                  Değişiklikleri Kaydet
                </button>
                <button 
                  type="button" 
                  className="w-full rounded-xl border border-[#2A3035] bg-[#1F2529] px-4 py-3 text-sm font-medium text-[#ECEDEF] transition-all hover:border-[#7A84FF] hover:text-[#7A84FF]"
                >
                  Şifre Değiştir
                </button>
                <button 
                  type="button" 
                  className="w-full rounded-xl border border-[#FF3B30]/30 bg-[#FF3B30]/10 px-4 py-3 text-sm font-medium text-[#FF3B30] transition-all hover:bg-[#FF3B30]/20"
                >
                  Hesabı Sil
                </button>
                {saved && (
                  <div className="flex items-center gap-2 rounded-lg bg-[#34C759]/10 px-3 py-2 text-sm text-[#34C759]">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Değişiklikler kaydedildi.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </DataFeedback>
    </div>
  );
}
