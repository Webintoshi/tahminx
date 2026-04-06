"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { useToast } from "@/components/providers/ToastProvider";
import { getAdminAccessTokenClaims, hasAdminSession, setAdminSession } from "@/lib/auth/admin-session";
import { useAdminLoginMutation } from "@/lib/hooks/use-api";

const DEFAULT_EMAIL = "admin@tahminx.local";
const DEFAULT_PASSWORD = "Admin123!";

async function bootstrapAdminLogin(email: string, password: string) {
  const response = await fetch("/api/admin/bootstrap-login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });

  const raw = (await response.json()) as {
    success?: boolean;
    data?: { accessToken: string; refreshToken: string } | null;
    error?: { message?: string } | null;
  };

  if (!response.ok || !raw.success || !raw.data) {
    throw new Error(raw.error?.message ?? "Admin bootstrap girisi yapilamadi.");
  }

  return raw.data;
}

export default function AdminLoginPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const hasSession = hasAdminSession();
  const loginMutation = useAdminLoginMutation();
  const claims = getAdminAccessTokenClaims();

  const [email, setEmail] = useState(DEFAULT_EMAIL);
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [nextUrl, setNextUrl] = useState("/admin");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const next = new URLSearchParams(window.location.search).get("next");
    setNextUrl(next || "/admin");
  }, []);

  useEffect(() => {
    if (hasSession && claims?.role === "admin") {
      router.replace(nextUrl);
    }
  }, [claims?.role, hasSession, nextUrl, router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      let tokens: { accessToken: string; refreshToken: string };

      try {
        tokens = await bootstrapAdminLogin(email, password);
      } catch {
        const response = await loginMutation.mutateAsync({ email, password });
        tokens = response.data;
      }

      setAdminSession(tokens);
      showToast({
        tone: "success",
        title: "Admin oturumu acildi",
        description: "Yonlendiriliyorsunuz."
      });
      router.replace(nextUrl);
      router.refresh();
    } catch (error) {
      showToast({
        tone: "error",
        title: "Giris basarisiz",
        description: error instanceof Error ? error.message : "Admin girisi yapilamadi."
      });
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader
        title="Admin Girisi"
        description="Admin modullerine erismek icin yetkili hesapla oturum acin."
      />

      <SectionCard
        title="Yetkilendirme"
        subtitle="Bu alan model operasyonlari ve sistem yonetimi icin korunur."
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-sm text-[color:var(--muted)]">E-posta</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 w-full rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 text-sm text-[color:var(--foreground)] focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              autoComplete="username"
              required
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm text-[color:var(--muted)]">Sifre</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 w-full rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 text-sm text-[color:var(--foreground)] focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              autoComplete="current-password"
              required
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="rounded-lg bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-black transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loginMutation.isPending ? "Giris yapiliyor" : "Admin girisi yap"}
            </button>
            <p className="text-xs text-[color:var(--muted)]">
              Seed ortaminda varsayilan hesap: <span className="font-mono">{DEFAULT_EMAIL}</span>
            </p>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
