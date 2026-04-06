"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  // Don't show breadcrumbs on homepage
  if (pathname === "/") return null;

  return (
    <nav aria-label="Breadcrumb" className="text-sm">
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link 
            href="/" 
            className="font-medium text-[#9CA3AF] transition-colors hover:text-[#ECEDEF]"
          >
            Ana Sayfa
          </Link>
        </li>
        {segments.map((segment, index) => {
          const href = `/${segments.slice(0, index + 1).join("/")}`;
          const isLast = index === segments.length - 1;
          const label = decodeURIComponent(segment).charAt(0).toUpperCase() + decodeURIComponent(segment).slice(1);
          
          return (
            <li key={href} className="flex items-center gap-2">
              <span className="text-[#2A3035]">/</span>
              {isLast ? (
                <span className="font-medium text-[#ECEDEF]">{label}</span>
              ) : (
                <Link 
                  href={href} 
                  className="font-medium text-[#9CA3AF] transition-colors hover:text-[#ECEDEF]"
                >
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
