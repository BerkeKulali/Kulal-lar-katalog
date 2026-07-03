import type { Surface } from "@/generated/prisma/client";
import type { PriceSummary } from "@/lib/catalog";

function PriceLine({
  label,
  prices,
}: {
  label: string;
  prices: Partial<Record<Surface, number>>;
}) {
  const parts = (Object.keys(prices) as Surface[])
    .filter((s) => prices[s] !== undefined)
    .map((s) => (
      <span key={s}>
        {s} {prices[s]}+
      </span>
    ));

  if (parts.length === 0) return null;

  return (
    <p className="product-price-line">
      <span className="product-price-label">{label}</span>
      {parts.map((part, i) => (
        <span key={i}>
          {i > 0 && <span className="product-price-sep">·</span>}
          {part}
        </span>
      ))}
    </p>
  );
}

export function PriceSummaryBlock({
  prices,
  quality,
}: {
  prices: PriceSummary;
  quality?: "FIRST" | "END";
}) {
  const hasFirst = Object.keys(prices.first).length > 0;
  const hasEnd = Object.keys(prices.end).length > 0;

  if (!hasFirst && !hasEnd) return null;

  if (quality === "FIRST") {
    return hasFirst ? (
      <div className="product-price-block">
        <PriceLine label="1." prices={prices.first} />
      </div>
    ) : null;
  }

  if (quality === "END") {
    return hasEnd ? (
      <div className="product-price-block">
        <PriceLine label="END" prices={prices.end} />
      </div>
    ) : null;
  }

  return (
    <div className="product-price-block">
      {hasFirst && <PriceLine label="1." prices={prices.first} />}
      {hasEnd && <PriceLine label="END" prices={prices.end} />}
    </div>
  );
}
