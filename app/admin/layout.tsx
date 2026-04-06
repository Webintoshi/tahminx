"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearAdminSession, getAdminAccessTokenClaims, hasAdminSession } from "@/lib/auth/admin-session";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/admin/login";
  const sessionExists = hasAdminSession();
  const claims = getAdminAccessTokenClaims();
  const isAdmin = claims?.role === "admin";

  useEffect(() => {
    if (isLoginPage) return;

    const next = encodeURIComponent(pathname);

    if (!sessionExists) {
      router.replace(`/admin/login?next=${next}`);
      return;
    }

    if (!isAdmin) {
      clearAdminSession();
      router.replace(`/admin/login?next=${next}`);
    }
  }, [isAdmin, isLoginPage, pathname, router, sessionExists]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!sessionExists || !isAdmin) {
    return null;
  }

  return <>{children}</>;
}
