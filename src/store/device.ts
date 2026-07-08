"use client";

import { create } from "zustand";
import {
  DEVICE_ACTOR_NAME_COOKIE,
  DEVICE_ACTOR_TYPE_COOKIE,
  DEVICE_TOKEN_COOKIE,
  SALESPERSON_ID_COOKIE,
  SALESPERSON_NAME_COOKIE,
} from "@/lib/device-cookie";

type DeviceData = {
  deviceToken: string;
  salespersonId: string | null;
  salespersonName: string;
  actorType: string;
  actorName: string;
};

type DeviceState = {
  deviceToken: string | null;
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

/** Tarayıcı cookie'lerinden cihaz bilgisini oku (kurulum middleware ile yapılır) */
export function readDeviceFromCookies(): DeviceData | null {
  const deviceToken = readCookie(DEVICE_TOKEN_COOKIE);
  const salespersonId = readCookie(SALESPERSON_ID_COOKIE);
  const salespersonName = readCookie(SALESPERSON_NAME_COOKIE);
  const actorType = readCookie(DEVICE_ACTOR_TYPE_COOKIE) ?? "salesperson";
  const actorName = readCookie(DEVICE_ACTOR_NAME_COOKIE) ?? salespersonName ?? "";

  if (!deviceToken) return null;

  return {
    deviceToken,
    salespersonId: salespersonId ?? null,
    salespersonName: salespersonName ?? "",
    actorType,
    actorName,
  };
}

export const useDeviceStore = create<DeviceState>()((set) => ({
  deviceToken: null,
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
      deviceToken: null,
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
