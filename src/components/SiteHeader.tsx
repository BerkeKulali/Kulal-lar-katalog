"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { KulalilarLogo } from "@/components/KulalilarLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useThemeStore } from "@/store/theme";

const NAV_ITEMS = [
  { href: "/", label: "Anasayfa" },
  { href: "/katalog", label: "Katalog" },
];

type AdminSession = {
  name: string;
};

export function SiteHeader({ rightSlot }: { rightSlot?: React.ReactNode }) {
  const theme = useThemeStore((s) => s.theme);
  const [admin, setAdmin] = useState<AdminSession | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.name) {
          setAdmin({ name: data.name as string });
        }
      })
      .catch(() => {
        if (!cancelled) setAdmin(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <header className="site-header relative z-[60] pb-3 pt-2">
      <div className="absolute right-0 top-2 z-[60] flex items-center gap-3">
        <nav className="flex items-center gap-3">
          <details className="relative z-[60]">
            <summary className="theme-icon-button flex h-9 w-9 cursor-pointer list-none items-center justify-center border text-xs [&::-webkit-details-marker]:hidden">
              ≡
            </summary>
            <div className="theme-dropdown absolute right-0 z-[100] mt-2 min-w-[200px] border py-2 shadow-xl">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="theme-menu-item block px-4 py-2 text-sm"
                >
                  {item.label}
                </Link>
              ))}
              {admin && (
                <Link
                  href="/admin"
                  className="theme-menu-item block border-t border-[var(--app-border)] px-4 py-2 text-sm font-medium"
                >
                  Admin panel
                </Link>
              )}
              <ThemeToggle compact />
            </div>
          </details>
          {rightSlot ?? <ThemeToggle />}
        </nav>
      </div>
      <div className="flex justify-center px-[4.75rem]">
        <KulalilarLogo theme={theme} />
      </div>
    </header>
  );
}
