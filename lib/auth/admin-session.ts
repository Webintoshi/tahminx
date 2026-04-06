"use client";

const ACCESS_COOKIE = "tahminx_admin_access_token";
const REFRESH_COOKIE = "tahminx_admin_refresh_token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const BOOTSTRAP_SUBJECT = "admin-bootstrap";

export type AdminSessionClaims = {
  sub?: string;
  email?: string;
  role?: string;
  exp?: number;
  iat?: number;
};

const readCookie = (name: string) => {
  if (typeof document === "undefined") return null;

  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${name}=`));

  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : null;
};

const writeCookie = (name: string, value: string, maxAgeSeconds = COOKIE_MAX_AGE) => {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`;
};

const clearCookie = (name: string) => {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
};

const decodeTokenClaims = (token: string | null): AdminSessionClaims | null => {
  if (!token) return null;

  const [, payload] = token.split(".");
  if (!payload) return null;

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(atob(padded)) as AdminSessionClaims;
  } catch {
    return null;
  }
};

export const getAdminAccessToken = () => readCookie(ACCESS_COOKIE);

export const getAdminRefreshToken = () => readCookie(REFRESH_COOKIE);

export const getAdminAccessTokenClaims = () => decodeTokenClaims(getAdminAccessToken());

export const getAdminRefreshTokenClaims = () => decodeTokenClaims(getAdminRefreshToken());

export const hasAdminSession = () => Boolean(getAdminAccessToken());

export const isBootstrapAdminSession = () => getAdminAccessTokenClaims()?.sub === BOOTSTRAP_SUBJECT;

export const setAdminSession = (tokens: { accessToken: string; refreshToken: string }) => {
  writeCookie(ACCESS_COOKIE, tokens.accessToken);
  if (tokens.refreshToken) {
    writeCookie(REFRESH_COOKIE, tokens.refreshToken);
  } else {
    clearCookie(REFRESH_COOKIE);
  }
};

export const clearAdminSession = () => {
  clearCookie(ACCESS_COOKIE);
  clearCookie(REFRESH_COOKIE);
};
