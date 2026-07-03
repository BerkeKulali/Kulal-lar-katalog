"use client";

import Link from "next/link";
import { KulalilarLogo } from "@/components/KulalilarLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useThemeStore } from "@/store/theme";

const NAV_ITEMS = [
  { href: "/", label: "Anasayfa" },
  { href: "/katalog", label: "Katalog" },
];

export function SiteHeader({ rightSlot }: { rightSlot?: React.ReactNode }) {
  const theme = useThemeStore((s) => s.theme);

  return (
    <header className="site-header relative pb-3 pt-2">
      <div className="absolute right-0 top-2 z-10 flex items-center gap-3">
        <nav className="flex items-center gap-3">
          <details className="relative">
            <summary className="theme-icon-button flex h-9 w-9 cursor-pointer list-none items-center justify-center border text-xs">
              ≡
            </summary>
            <div className="theme-dropdown absolute right-0 z-50 mt-2 min-w-[180px] border py-2 shadow-xl">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="theme-menu-item block px-4 py-2 text-sm"
                >
                  {item.label}
                </Link>
              ))}
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
