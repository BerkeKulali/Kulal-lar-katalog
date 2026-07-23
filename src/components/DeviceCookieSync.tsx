"use client";

import { useEffect } from "react";
import { syncDeviceFromCookies } from "@/store/device";
import { useCatalogSyncStore } from "@/store/catalog-sync";

/** Kurulum cookie'lerini Zustand store'a aktarır; plasiyer stok yetkisini yükler. */
export function DeviceCookieSync() {
  useEffect(() => {
    syncDeviceFromCookies();

    fetch("/api/device/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        const patch: { showStock?: boolean; salesEnabled?: boolean } = {};
        if (typeof data.showStock === "boolean") patch.showStock = data.showStock;
        if (typeof data.salesEnabled === "boolean")
          patch.salesEnabled = data.salesEnabled;
        if (Object.keys(patch).length > 0) {
          useCatalogSyncStore.setState(patch);
        }
      })
      .catch(() => {});
  }, []);

  return null;
}
