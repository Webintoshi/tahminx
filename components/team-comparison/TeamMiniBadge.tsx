/* eslint-disable @next/next/no-img-element */

import { placeholderLogo } from "@/lib/utils";

export function TeamMiniBadge({
  name,
  shortName,
  logoUrl,
  align = "left"
}: {
  name: string;
  shortName?: string | null;
  logoUrl?: string | null;
  align?: "left" | "right";
}) {
  return (
    <div className={`flex items-center gap-3 ${align === "right" ? "justify-end text-right" : ""}`}>
      {align === "right" ? (
        <>
          <div>
            <p className="text-sm font-semibold text-[#ECEDEF]">{name}</p>
            <p className="text-xs text-[#9CA3AF]">{shortName || placeholderLogo(name)}</p>
          </div>
          {logoUrl ? (
            <img src={logoUrl} alt={name} className="h-11 w-11 rounded-xl border border-[#2A3035] bg-[#1F2529] object-cover" />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#2A3035] bg-[#1F2529] text-sm font-semibold text-[#ECEDEF]">
              {placeholderLogo(name)}
            </div>
          )}
        </>
      ) : (
        <>
          {logoUrl ? (
            <img src={logoUrl} alt={name} className="h-11 w-11 rounded-xl border border-[#2A3035] bg-[#1F2529] object-cover" />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#2A3035] bg-[#1F2529] text-sm font-semibold text-[#ECEDEF]">
              {placeholderLogo(name)}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-[#ECEDEF]">{name}</p>
            <p className="text-xs text-[#9CA3AF]">{shortName || placeholderLogo(name)}</p>
          </div>
        </>
      )}
    </div>
  );
}
