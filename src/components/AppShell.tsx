"use client";

import { cn } from "@/lib/cn";
import { KulalilarLogo } from "@/components/KulalilarLogo";
import { useThemeStore } from "@/store/theme";

type AppShellProps = {
  children: React.ReactNode;
  className?: string;
  /** Admin sayfaları masaüstünde biraz daha geniş */
  variant?: "catalog" | "admin" | "narrow";
  /**
   * Anasayfaya dönmek için üstte Kulalılar logosu göster. "admin" varyantında
   * varsayılan olarak açık (admin sayfalarının kendi header'ı yok). "catalog"/
   * "narrow" sayfaları genelde kendi SiteHeader'ını render eder — çift logo
   * olmaması için orada açıkça true geçilmediği sürece kapalı kalır.
   */
  showLogo?: boolean;
};

export function AppShell({
  children,
  className,
  variant = "catalog",
  showLogo,
}: AppShellProps) {
  const theme = useThemeStore((s) => s.theme);
  const shouldShowLogo = showLogo ?? variant === "admin";

  return (
    <div
      className={cn(
        "app-viewport",
        variant === "catalog" && "app-viewport--catalog"
      )}
    >
      <main
        className={cn(
          "app-main mx-auto min-h-screen w-full",
          variant === "catalog" && "app-main--catalog",
          variant === "admin" && "app-main--admin",
          variant === "narrow" && "app-main--narrow",
          className
        )}
      >
        {shouldShowLogo && (
          <div className="mb-6 flex justify-center border-b border-zinc-800 pb-4">
            <KulalilarLogo theme={theme} />
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
