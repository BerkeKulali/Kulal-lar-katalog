"use client";

import { usePathname } from "next/navigation";
import { CatalogSyncProvider } from "@/components/CatalogSyncProvider";
import { DeviceCookieSync } from "@/components/DeviceCookieSync";
import { ImageUpdateBanner } from "@/components/ImageUpdateBanner";
import { PaletteFab } from "@/components/PaletteFab";
import { VisitLogger } from "@/components/VisitLogger";

/** Katalog tablet akışı — admin panelinde sync/sepet/görsel banner yok */
export function CatalogChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <CatalogSyncProvider>
      <DeviceCookieSync />
      <VisitLogger />
      <ImageUpdateBanner />
      {children}
      <PaletteFab />
    </CatalogSyncProvider>
  );
}
