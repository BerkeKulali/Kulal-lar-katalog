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
        if (data && typeof data.showStock === "boolean") {
          useCatalogSyncStore.setState({ showStock: data.showStock });
        }
      })
      .catch(() => {});
  }, []);

  return null;
}
