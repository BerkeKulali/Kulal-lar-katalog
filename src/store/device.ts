"use client";

import { create } from "zustand";
import {
  DEVICE_ACTOR_NAME_COOKIE,
  DEVICE_ACTOR_TYPE_COOKIE,
  SALESPERSON_ID_COOKIE,
  SALESPERSON_NAME_COOKIE,
} from "@/lib/device-cookie";

/**
 * Cihaz token'ı BİLEREK burada tutulmaz: httpOnly cookie olduğu için JS'ten
 * okunamaz ve okunmasına gerek de yok — sunucu her istekte cookie'den doğrular.
 * Buradaki alanlar yalnızca arayüzde gösterim içindir.
 */
type DeviceData = {
  salespersonId: string | null;
  salespersonName: string;
  actorType: string;
  actorName: string;
};

type DeviceState = {
  salespersonId: string | null;
  salespersonName: string | null;
  actorType: string | null;
  actorName: string | null;
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

/**
 * Tarayıcı cookie'lerinden cihaz bilgisini oku (kurulum middleware ile yapılır).
 * Kurulum sinyali olarak actorType kullanılır; cihaz token'ı httpOnly olduğu
 * için JS'ten görünmez.
 */
export function readDeviceFromCookies(): DeviceData | null {
  const actorType = readCookie(DEVICE_ACTOR_TYPE_COOKIE);
  if (!actorType) return null;

  const salespersonId = readCookie(SALESPERSON_ID_COOKIE);
  const salespersonName = readCookie(SALESPERSON_NAME_COOKIE);
  const actorName = readCookie(DEVICE_ACTOR_NAME_COOKIE) ?? salespersonName ?? "";

  return {
    salespersonId: salespersonId ?? null,
    salespersonName: salespersonName ?? "",
    actorType,
    actorName,
  };
}

export const useDeviceStore = create<DeviceState>()((set) => ({
  salespersonId: null,
  salespersonName: null,
  actorType: null,
  actorName: null,
  isSetup: false,
  setDevice: (data) =>
    set({
      ...data,
      isSetup: true,
    }),
  clearDevice: () =>
    set({
      salespersonId: null,
      salespersonName: null,
      actorType: null,
      actorName: null,
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
