"use client";

import { create } from "zustand";
import {
  DEVICE_TOKEN_COOKIE,
  SALESPERSON_ID_COOKIE,
  SALESPERSON_NAME_COOKIE,
} from "@/lib/device-cookie";

type DeviceData = {
  deviceToken: string;
  salespersonId: string;
  salespersonName: string;
};

type DeviceState = {
  deviceToken: string | null;
  salespersonId: string | null;
  salespersonName: string | null;
  isSetup: boolean;
  setDevice: (data: DeviceData) => void;
  clearDevice: () => void;
};

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}

/** Tarayıcı cookie'lerinden cihaz bilgisini oku (kurulum middleware ile yapılır) */
export function readDeviceFromCookies(): DeviceData | null {
  const deviceToken = readCookie(DEVICE_TOKEN_COOKIE);
  const salespersonId = readCookie(SALESPERSON_ID_COOKIE);
  const salespersonName = readCookie(SALESPERSON_NAME_COOKIE);

  if (!deviceToken || !salespersonId) return null;

  return {
    deviceToken,
    salespersonId,
    salespersonName: salespersonName ?? "",
  };
}

export const useDeviceStore = create<DeviceState>()((set) => ({
  deviceToken: null,
  salespersonId: null,
  salespersonName: null,
  isSetup: false,
  setDevice: (data) =>
    set({
      ...data,
      isSetup: true,
    }),
  clearDevice: () =>
    set({
      deviceToken: null,
      salespersonId: null,
      salespersonName: null,
      isSetup: false,
    }),
}));

/** İstemci tarafında cookie → store senkronu (sepet için) */
export function syncDeviceFromCookies() {
  const fromCookies = readDeviceFromCookies();
  if (!fromCookies) return false;

  useDeviceStore.setState({
    ...fromCookies,
    isSetup: true,
  });
  return true;
}
