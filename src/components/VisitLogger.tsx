"use client";

import { useEffect } from "react";
import { DEVICE_TOKEN_COOKIE } from "@/lib/device-cookie";

const VISIT_KEY = "kulalilar-visit-logged";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/** Oturum başına bir kez katalog girişini kaydeder. */
export function VisitLogger() {
  useEffect(() => {
    if (sessionStorage.getItem(VISIT_KEY)) return;
    if (!readCookie(DEVICE_TOKEN_COOKIE)) return;

    sessionStorage.setItem(VISIT_KEY, "1");
    void fetch("/api/visit", { method: "POST" }).catch(() => {
      sessionStorage.removeItem(VISIT_KEY);
    });
  }, []);

  return null;
}
