"use client";

import { useEffect } from "react";
import { useCatalogSyncStore } from "@/store/catalog-sync";
import { useDisplayPrefsStore } from "@/store/display-prefs";

/**
 * Katalog izleme sayfalarının (marka+ölçü listesi, ürün detayı, arama)
 * sağ üstüne konan küçük "Fiyatlı / Stoklu" aç-kapa düğmeleri. Tercih
 * localStorage'da kalıcıdır (bkz. store/display-prefs.ts).
 *
 * "Stoklu" düğmesi yalnızca bu cihazın zaten stok görme YETKİSİ varsa
 * gösterilir — yetkisi olmayana veri hiç senkronlanmadığı için toggle
 * göstermenin bir anlamı yok. `initialShowStock`, sayfa sunucu tarafında
 * resolveStockVisibility ile hesaplanan değerdir; senkron verisi
 * yüklenene kadar (ilk boya) o kullanılır, sonra canlı değere geçilir —
 * ProductDetailView'daki canShowStock deseninin birebir aynısı.
 */
export function DisplayPrefsToggle({
  initialShowStock = false,
}: {
  initialShowStock?: boolean;
}) {
  useEffect(() => {
    void useDisplayPrefsStore.persist.rehydrate();
  }, []);

  const showPrices = useDisplayPrefsStore((s) => s.showPrices);
  const showStockPref = useDisplayPrefsStore((s) => s.showStockPref);
  const setShowPrices = useDisplayPrefsStore((s) => s.setShowPrices);
  const setShowStockPref = useDisplayPrefsStore((s) => s.setShowStockPref);

  const syncedShowStock = useCatalogSyncStore((s) => s.showStock);
  const hasSyncData = useCatalogSyncStore(
    (s) => Object.keys(s.variants).length > 0
  );
  const canShowStock = hasSyncData ? syncedShowStock : initialShowStock;

  return (
    <div className="display-prefs-toggle" role="group" aria-label="Görünüm ayarları">
      <button
        type="button"
        aria-pressed={showPrices}
        onClick={() => setShowPrices(!showPrices)}
        className={`theme-chip theme-chip--sm${showPrices ? " theme-chip--active" : ""}`}
      >
        Fiyatlı
      </button>
      {canShowStock && (
        <button
          type="button"
          aria-pressed={showStockPref}
          onClick={() => setShowStockPref(!showStockPref)}
          className={`theme-chip theme-chip--sm${showStockPref ? " theme-chip--active" : ""}`}
        >
          Stoklu
        </button>
      )}
    </div>
  );
}
