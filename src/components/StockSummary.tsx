import type { StockSummary } from "@/lib/stock";
import { formatStock } from "@/lib/utils";

function StockLine({ label, value }: { label: string; value: number }) {
  return (
    <p className="product-stock-line">
      <span className="product-stock-label">{label}</span>
      {formatStock(value)}
    </p>
  );
}

export function StockSummaryBlock({
  stock,
  quality,
}: {
  stock: StockSummary;
  quality?: "FIRST" | "END";
}) {
  const hasFirst = stock.first != null;
  const hasEnd = stock.end != null;

  if (!hasFirst && !hasEnd) return null;

  if (quality === "FIRST") {
    return hasFirst ? (
      <div className="product-stock-block">
        <StockLine label="1." value={stock.first!} />
      </div>
    ) : null;
  }

  if (quality === "END") {
    return hasEnd ? (
      <div className="product-stock-block">
        <StockLine label="END" value={stock.end!} />
      </div>
    ) : null;
  }

  return (
    <div className="product-stock-block">
      {hasFirst && <StockLine label="1." value={stock.first!} />}
      {hasEnd && <StockLine label="END" value={stock.end!} />}
    </div>
  );
}
