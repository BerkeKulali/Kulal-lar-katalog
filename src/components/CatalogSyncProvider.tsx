"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/offline-images";
import { startCatalogSyncLoop } from "@/lib/sync-client";
import { useCatalogSyncStore } from "@/store/catalog-sync";

export function CatalogSyncProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    let stopSync: (() => void) | undefined;

    void (async () => {
      await useCatalogSyncStore.persist.rehydrate();
      registerServiceWorker();
      stopSync = startCatalogSyncLoop();
    })();

    return () => {
      stopSync?.();
    };
  }, []);

  return <>{children}</>;
}
