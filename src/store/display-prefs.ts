"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type DisplayPrefsState = {
  /** Ürün kartlarında fiyat gösterilsin mi (kapatınca müşteriye fiyatsız gösterilebilir). */
  showPrices: boolean;
  /** Ürün kartlarında stok gösterilsin mi. Yetkisi olmayanlarda zaten veri gelmez. */
  showStockPref: boolean;
  /**
   * Katalog listelerinde (marka+ölçü, ölçü, arama) yalnızca stoğu olan
   * ürünler gösterilsin mi. showStockPref'ten BAĞIMSIZ: biri "ekranda stok
   * sayısını göster/gizle", diğeri "listeyi stoğu olanlarla sınırla".
   */
  onlyInStock: boolean;
  setShowPrices: (v: boolean) => void;
  setShowStockPref: (v: boolean) => void;
  setOnlyInStock: (v: boolean) => void;
};

/**
 * Katalog izleme sayfalarındaki "fiyatlı göster / stoklu göster / sadece
 * stoklu" tercihi. catalog-sync store'daki showStock'tan FARKLI bir şey: o
 * cihazın stok GÖRME YETKİSİ var mı sorusuna cevap verir (sunucu tarafından
 * belirlenir); burası ise yetkisi olan birinin "şu an ekranda nasıl
 * göstersin" tercihidir (ör. müşteriye gösterirken kapatmak için, ya da
 * listeyi stoğu olanlarla sınırlamak için). skipHydration: true — SSR ile
 * localStorage arasında uyuşmazlık olmasın diye DisplayPrefsToggle mount
 * olduğunda elle rehydrate edilir (catalog-sync store'daki desenin aynısı).
 */
export const useDisplayPrefsStore = create<DisplayPrefsState>()(
  persist(
    (set) => ({
      showPrices: true,
      showStockPref: true,
      onlyInStock: false,
      setShowPrices: (showPrices) => set({ showPrices }),
      setShowStockPref: (showStockPref) => set({ showStockPref }),
      setOnlyInStock: (onlyInStock) => set({ onlyInStock }),
    }),
    { name: "kulalilar-display-prefs", skipHydration: true }
  )
);
