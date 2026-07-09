"use client";

/**
 * Ürün detayına tıklamaları istemcide biriktirip seyrek aralıklarla topluca
 * sunucuya gönderir. Her tıklama için ayrı istek atmaz; bu yüzden kullanıcıyı
 * yavaşlatmaz ve sunucu maliyetini minimumda tutar.
 *
 * - Buffer localStorage'da tutulur (yeniden yükleme/çevrimdışı durumlarına dayanıklı).
 * - Gönderim `navigator.sendBeacon` ile yapılır (sayfa kapanırken bile güvenli).
 */

const STORAGE_KEY = "kulalilar-click-buffer";
const ENDPOINT = "/api/track/clicks";
const FLUSH_DEBOUNCE_MS = 8000;

type Buffer = Record<string, number>;

let flushTimer: ReturnType<typeof setTimeout> | null = null;
let listenersReady = false;

function readBuffer(): Buffer {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Buffer) : {};
  } catch {
    return {};
  }
}

function writeBuffer(buffer: Buffer) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(buffer));
  } catch {
    // kota dolabilir; analitik kritik değil
  }
}

function clearBuffer() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // yoksay
  }
}

/** Buffer'ı sunucuya gönderir. Başarılıysa buffer'ı temizler. */
export function flushClicks() {
  if (typeof window === "undefined") return;
  const buffer = readBuffer();
  const items = Object.entries(buffer)
    .filter(([, count]) => count > 0)
    .map(([familyId, count]) => ({ familyId, count }));
  if (items.length === 0) return;

  const payload = JSON.stringify({ items });

  let sent = false;
  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    try {
      sent = navigator.sendBeacon(
        ENDPOINT,
        new Blob([payload], { type: "application/json" })
      );
    } catch {
      sent = false;
    }
  }

  if (!sent) {
    // sendBeacon yoksa/başarısızsa keepalive fetch ile dene
    try {
      void fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      });
      sent = true;
    } catch {
      sent = false;
    }
  }

  if (sent) clearBuffer();
}

function scheduleFlush() {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushClicks();
  }, FLUSH_DEBOUNCE_MS);
}

function ensureListeners() {
  if (listenersReady || typeof window === "undefined") return;
  listenersReady = true;

  const onHidden = () => {
    if (document.visibilityState === "hidden") flushClicks();
  };
  document.addEventListener("visibilitychange", onHidden);
  window.addEventListener("pagehide", flushClicks);

  // Açılışta bekleyen (önceki oturumdan kalan) tıklamaları gönder.
  flushClicks();
}

/** Bir ürün ailesi detayına tıklamayı kaydeder. */
export function recordFamilyClick(familyId: string) {
  if (typeof window === "undefined" || !familyId) return;
  ensureListeners();
  const buffer = readBuffer();
  buffer[familyId] = (buffer[familyId] ?? 0) + 1;
  writeBuffer(buffer);
  scheduleFlush();
}
