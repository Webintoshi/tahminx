"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DataFeedback } from "@/components/states/DataFeedback";
import { clearAdminSession, hasAdminSession } from "@/lib/auth/admin-session";
import { ApiClientError } from "@/lib/api/http-client";
import { useAdminMe } from "@/lib/hooks/use-api";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/admin/login";
  const sessionExists = hasAdminSession();
  const meQuery = useAdminMe(!isLoginPage && sessionExists);

  useEffect(() => {
    if (isLoginPage) return;

    const next = encodeURIComponent(pathname);

    if (!sessionExists) {
      router.replace(`/admin/login?next=${next}`);
      return;
    }

    if (meQuery.error instanceof ApiClientError && meQuery.error.status === 401) {
      clearAdminSession();
      router.replace(`/admin/login?next=${next}`);
    }
  }, [isLoginPage, meQuery.error, pathname, router, sessionExists]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!sessionExists) {
    return null;
  }

  const user = meQuery.data?.data;
  const isAdmin = user?.role?.name === "admin";

  return (
    <DataFeedback
      isLoading={meQuery.isLoading}
      error={(!isAdmin && user ? new Error("Bu hesap admin yetkisine sahip degil.") : meQuery.error as Error | undefined)}
      isEmpty={!user}
      emptyTitle="Admin oturumu gerekli"
      emptyDescription="Bu ekrana erismek icin admin girisi yapmaniz gerekiyor."
      onRetry={() => void meQuery.refetch()}
      loadingCount={1}
      loadingVariant="card"
    >
      {children}
    </DataFeedback>
  );
}
