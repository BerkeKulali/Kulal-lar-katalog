"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { KulalilarLogo } from "@/components/KulalilarLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { readDeviceFromCookies } from "@/store/device";
import { useThemeStore } from "@/store/theme";

const NAV_ITEMS = [
  { href: "/", label: "Anasayfa" },
  { href: "/katalog", label: "Katalog" },
];

type AdminSession = {
  name: string;
};

type ActorSession = {
  actorType: string;
  actorName: string;
};

export function SiteHeader({ rightSlot }: { rightSlot?: React.ReactNode }) {
  const theme = useThemeStore((s) => s.theme);
  const [admin, setAdmin] = useState<AdminSession | null>(null);
  const [actorSession, setActorSession] = useState<ActorSession | null>(null);

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

  useEffect(() => {
    const device = readDeviceFromCookies();
    const actorType = device?.actorType ?? "";
    const actorName = device?.actorName?.trim() ?? "";
    const showInHeader = actorType === "dealer" || actorType === "salesperson";
    if (!showInHeader || !actorName) {
      setActorSession(null);
      return;
    }
    setActorSession({ actorType, actorName });
  }, []);

  return (
    <header className="site-header relative z-[60] pb-3 pt-2">
      {actorSession && (
        <div className="site-header-actor mb-2 max-w-full truncate text-xs leading-none text-zinc-200 sm:absolute sm:mb-0 sm:left-0 sm:top-3 sm:max-w-[12.5rem]">
          <span className="mr-1 text-zinc-400">
            {actorSession.actorType === "dealer" ? "Bayi:" : "Plasiyer:"}
          </span>
          <span className="inline-block max-w-[8.8rem] truncate font-semibold align-bottom text-white sm:max-w-[8.8rem]">
            {actorSession.actorName}
          </span>
        </div>
      )}
      <div className="absolute right-0 top-2 z-[60] flex items-center gap-3 sm:top-2">
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
      <div className="flex justify-center px-14 pt-1 sm:px-[4.75rem] sm:pt-0">
        <KulalilarLogo theme={theme} />
      </div>
    </header>
  );
}
