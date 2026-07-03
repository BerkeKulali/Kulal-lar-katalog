"use client";

import Link from "next/link";
import { useCartStore } from "@/store/cart";

export function PaletteFab() {
  const count = useCartStore((s) => s.items.length);

  return (
    <Link
      href="/sepet"
      className="palette-fab fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full border-2 border-white bg-black shadow-lg transition hover:scale-105"
      aria-label={`Sipariş listesi, ${count} ürün`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-7 w-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M12 3c-2 3-4 5-4 8a4 4 0 0 0 8 0c0-3-2-5-4-8z" />
        <circle cx="8" cy="14" r="1.2" fill="currentColor" />
        <circle cx="12" cy="16" r="1.2" fill="currentColor" />
        <circle cx="16" cy="13" r="1.2" fill="currentColor" />
        <path d="M5 20h14" strokeLinecap="round" />
      </svg>
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-black">
          {count}
        </span>
      )}
    </Link>
  );
}
