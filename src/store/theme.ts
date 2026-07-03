"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CatalogTheme = "dark" | "light";

type ThemeState = {
  theme: CatalogTheme;
  setTheme: (theme: CatalogTheme) => void;
  toggleTheme: () => void;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set({ theme: get().theme === "dark" ? "light" : "dark" }),
    }),
    { name: "kulalilar-theme" }
  )
);
