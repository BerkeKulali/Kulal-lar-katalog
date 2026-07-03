import Link from "next/link";
import { PriceSummaryBlock } from "@/components/PriceSummary";
import { TileImage } from "@/components/TileImage";
import type { PriceSummary } from "@/lib/catalog";

export function ProductCard({
  href,
  name,
  imageUrl,
  prices,
  aspect,
  size,
  quality,
}: {
  href: string;
  name: string;
  imageUrl?: string | null;
  prices: PriceSummary;
  aspect?: string;
  size?: string;
  quality?: "FIRST" | "END";
}) {
  return (
    <Link href={href} className="product-card block">
      <TileImage src={imageUrl} alt={name} aspect={aspect ?? "1/1"} size={size} />
      <h3 className="product-card-title">{name}</h3>
      <PriceSummaryBlock prices={prices} quality={quality} />
    </Link>
  );
}
