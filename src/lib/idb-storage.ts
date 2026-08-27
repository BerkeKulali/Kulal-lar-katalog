"use client";

import type { StateStorage } from "zustand/middleware";

/**
 * zustand `persist` için IndexedDB tabanlı depolama katmanı.
 *
 * Neden gerekli: katalog senkron mağazası (variants + families + imageCache)
 * binlerce kayıt içeriyor ve JSON'a çevrilince birkaç MB'a ulaşabiliyor.
 * localStorage'ın kotası (tarayıcıya göre ~5-10MB, bazı durumlarda daha az)
 * bunu karşılayamıyordu — `persist`'in her `set()` sonrası yaptığı senkron
 * `localStorage.setItem` çağrısı `QuotaExceededError` fırlatıyor, bu da
 * `runCatalogSync`'teki catch'e düşüp "Senkron: The quota has been
 * exceeded." hatasına dönüşüyordu. Sonuç: senkron veriyi ağdan başarıyla
 * çekiyor ama diske YAZAMIYOR, cihaz hep eski (veya boş) veride donuk
 * kalıyordu. IndexedDB kotası çok daha büyük (genelde diskin bir yüzdesi,
 * onlarca-yüzlerce MB) — bu yüzden aynı veri burada sorunsuz saklanabiliyor.
 */

const DB_NAME = "kulalilar-catalog-sync-idb";
const STORE_NAME = "kv";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const store = tx.objectStore(STORE_NAME);
      const req = run(store);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

/**
 * IndexedDB yoksa (çok eski tarayıcı, bazı gizlilik modu kısıtlamaları vb.)
 * sessizce no-op döner — senkron o oturumda kalıcı olmaz ama uygulama
 * çökmez; bir sonraki başarılı yazımda normale döner.
 */
export const idbStateStorage: StateStorage = {
  async getItem(name) {
    if (typeof indexedDB === "undefined") return null;
    try {
      const value = await withStore<string | undefined>("readonly", (s) =>
        s.get(name)
      );
      return value ?? null;
    } catch {
      return null;
    }
  },
  async setItem(name, value) {
    if (typeof indexedDB === "undefined") return;
    try {
      await withStore<IDBValidKey>("readwrite", (s) => s.put(value, name));
    } catch {
      // Kota yine aşılırsa (çok nadir) senkron sessizce kalıcı olmaz —
      // bir sonraki başarılı senkronda tekrar denenir.
    }
  },
  async removeItem(name) {
    if (typeof indexedDB === "undefined") return;
    try {
      await withStore<undefined>("readwrite", (s) => s.delete(name));
    } catch {
      // yok say
    }
  },
};

/**
 * v4 mağazası artık localStorage yerine IndexedDB'de tutuluyor (yukarıya
 * bakın). Eski `localStorage` kaydı (kota aşıldığı için zaten çoğu cihazda
 * ya boştu ya da yarım/bozuk veri barındırıyordu) artık okunmuyor — ama
 * orada duruyorsa temizleyelim ki gereksiz yer kaplamasın.
 */
export function clearLegacyLocalStorageSync(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // yok say
  }
}
