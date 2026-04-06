"use client";

const ACCESS_COOKIE = "tahminx_admin_access_token";
const REFRESH_COOKIE = "tahminx_admin_refresh_token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

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

export const getAdminAccessToken = () => readCookie(ACCESS_COOKIE);

export const getAdminRefreshToken = () => readCookie(REFRESH_COOKIE);

export const hasAdminSession = () => Boolean(getAdminAccessToken() || getAdminRefreshToken());

export const setAdminSession = (tokens: { accessToken: string; refreshToken: string }) => {
  writeCookie(ACCESS_COOKIE, tokens.accessToken);
  writeCookie(REFRESH_COOKIE, tokens.refreshToken);
};

export const clearAdminSession = () => {
  clearCookie(ACCESS_COOKIE);
  clearCookie(REFRESH_COOKIE);
};
