"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  variantId: string;
  familyName: string;
  brandName: string;
  size: string;
  surface: string;
  quality: string;
  feature3D?: boolean;
  featureRec?: boolean;
  price: number;
  quantityM2: number;
  code?: string | null;
  saleMode?: "pallet" | "truck";
};

type CartState = {
  items: CartItem[];
  dealerName: string;
  notes: string;
  addItem: (item: Omit<CartItem, "quantityM2"> & { quantityM2?: number }) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantityM2: number) => void;
  setDealerName: (name: string) => void;
  setNotes: (notes: string) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      dealerName: "",
      notes: "",
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.variantId === item.variantId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.variantId === item.variantId
                  ? {
                      ...i,
                      quantityM2: i.quantityM2 + (item.quantityM2 ?? 1),
                    }
                  : i
              ),
            };
          }
          return {
            items: [
              ...state.items,
              { ...item, quantityM2: item.quantityM2 ?? 1 },
            ],
          };
        }),
      removeItem: (variantId) =>
        set((state) => ({
          items: state.items.filter((i) => i.variantId !== variantId),
        })),
      updateQuantity: (variantId, quantityM2) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.variantId === variantId ? { ...i, quantityM2 } : i
          ),
        })),
      setDealerName: (dealerName) => set({ dealerName }),
      setNotes: (notes) => set({ notes }),
      clear: () => set({ items: [], dealerName: "", notes: "" }),
    }),
    { name: "kulalilar-cart" }
  )
);
