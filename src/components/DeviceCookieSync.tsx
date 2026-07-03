"use client";

import { useEffect } from "react";
import { syncDeviceFromCookies } from "@/store/device";

/** Kurulum cookie'lerini Zustand store'a aktarır (sipariş gönderimi için). */
export function DeviceCookieSync() {
  useEffect(() => {
    syncDeviceFromCookies();
  }, []);

  return null;
}
