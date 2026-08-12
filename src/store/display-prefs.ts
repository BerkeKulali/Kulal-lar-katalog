"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type DisplayPrefsState = {
  /** Ürün kartlarında fiyat gösterilsin mi (kapatınca müşteriye fiyatsız gösterilebilir). */
  showPrices: boolean;
  /** Ürün kartlarında stok gösterilsin mi. Yetkisi olmayanlarda zaten veri gelmez. */
  showStockPref: boolean;
  setShowPrices: (v: boolean) => void;
  setShowStockPref: (v: boolean) => void;
};

/**
 * Katalog izleme sayfalarındaki "fiyatlı göster / stoklu göster" tercihi.
 * catalog-sync store'daki showStock'tan FARKLI bir şey: o cihazın stok
 * GÖRME YETKİSİ var mı sorusuna cevap verir (sunucu tarafından belirlenir);
 * burası ise yetkisi olan birinin "şu an ekranda göstersin mi" tercihidir
 * (ör. müşteriye gösterirken kapatmak için). skipHydration: true — SSR ile
 * localStorage arasında uyuşmazlık olmasın diye DisplayPrefsToggle mount
 * olduğunda elle rehydrate edilir (catalog-sync store'daki desenin aynısı).
 */
export const useDisplayPrefsStore = create<DisplayPrefsState>()(
  persist(
    (set) => ({
      showPrices: true,
      showStockPref: true,
      setShowPrices: (showPrices) => set({ showPrices }),
      setShowStockPref: (showStockPref) => set({ showStockPref }),
    }),
    { name: "kulalilar-display-prefs", skipHydration: true }
  )
);
