"use client";

import Link from "next/link";
import { PriceSummaryBlock } from "@/components/PriceSummary";
import { StockSummaryBlock } from "@/components/StockSummary";
import { TileImage } from "@/components/TileImage";
import type { PriceSummary } from "@/lib/catalog";
import type { StockSummary } from "@/lib/stock";
import { useDisplayPrefsStore } from "@/store/display-prefs";

export function ProductCard({
  href,
  name,
  imageUrl,
  prices,
  stock,
  aspect,
  size,
  quality,
}: {
  href: string;
  name: string;
  imageUrl?: string | null;
  prices: PriceSummary;
  stock?: StockSummary | null;
  aspect?: string;
  size?: string;
  quality?: "FIRST" | "END";
}) {
  const showPrices = useDisplayPrefsStore((s) => s.showPrices);
  const showStockPref = useDisplayPrefsStore((s) => s.showStockPref);

  return (
    <Link href={href} className="product-card block">
      <TileImage src={imageUrl} alt={name} aspect={aspect ?? "1/1"} size={size} />
      <h3 className="product-card-title">{name}</h3>
      {showPrices && <PriceSummaryBlock prices={prices} quality={quality} />}
      {showStockPref && stock && (
        <StockSummaryBlock stock={stock} quality={quality} />
      )}
    </Link>
  );
}
