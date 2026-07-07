"use client";

import { useEffect, useMemo, useState, type FocusEvent, type ReactNode } from "react";
import { TileImage } from "@/components/TileImage";
import { useCartStore } from "@/store/cart";
import { formatSizeDisplay, surfaceDisplayLabel } from "@/lib/constants";
import { pickVariantDisplayImage, toImageCandidates } from "@/lib/product-image";
import { useCatalogSyncStore } from "@/store/catalog-sync";
import { formatPrice, formatStock, qualityLabel, sortQualities } from "@/lib/utils";
import { PalletFillIcon, TruckIcon } from "@/components/PackagingIcons";
import {
  formatPackCount,
  formatUnitM2,
  packCount,
  palletVisualState,
  quantityForSaleMode,
  type SaleMode,
} from "@/lib/packaging";

type Variant = {
  id: string;
  size: string;
  surface: string;
  quality: string;
  price: number | null;
  code: string | null;
  palletM2: number | null;
  boxM2: number | null;
  truckM2: number | null;
  imageUrl: string | null;
  stockLines: { id: string; label: string; quantityM2: number }[];
};

function parseQtyM2(text: string): number {
  const trimmed = text.trim().replace(",", ".");
  if (!trimmed) return 0;
  const n = Number(trimmed);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function DetailOption({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`product-detail-option${active ? " product-detail-option--active" : ""}${disabled ? " product-detail-option--disabled" : ""}`}
    >
      {children}
    </button>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="product-detail-section">
      <h2 className="product-detail-heading">{title}</h2>
      <div className="product-detail-options">{children}</div>
    </section>
  );
}

export function ProductDetailView({
  familyName,
  brandName,
  familyImageUrl,
  sizes,
  variants,
  initialSize,
  initialQuality,
  showStock: initialShowStock = true,
}: {
  familyName: string;
  brandName: string;
  familyImageUrl?: string | null;
  sizes: string[];
  variants: Variant[];
  initialSize: string;
  initialQuality?: "FIRST" | "END";
  showStock?: boolean;
}) {
  const addItem = useCartStore((s) => s.addItem);
  const getSyncedPrice = useCatalogSyncStore((s) => s.getSyncedPrice);
  const getFamilyStockForVariant = useCatalogSyncStore(
    (s) => s.getFamilyStockForVariant
  );
  const syncedShowStock = useCatalogSyncStore((s) => s.showStock);
  const hasSyncData = useCatalogSyncStore(
    (s) => Object.keys(s.variants).length > 0
  );
  const [size, setSize] = useState(initialSize);
  const [surface, setSurface] = useState<string | null>(null);
  const [quality, setQuality] = useState<string | null>(initialQuality ?? null);
  const [qtyText, setQtyText] = useState("");
  const [saleMode, setSaleMode] = useState<SaleMode>("m2");
  const [added, setAdded] = useState(false);

  const variantsForSize = useMemo(
    () => variants.filter((v) => v.size === size),
    [variants, size]
  );

  const surfaces = useMemo(
    () => [...new Set(variantsForSize.map((v) => v.surface))],
    [variantsForSize]
  );

  const qualities = useMemo(() => {
    const pool = surface
      ? variantsForSize.filter((v) => v.surface === surface)
      : variantsForSize;
    return sortQualities([...new Set(pool.map((v) => v.quality))]);
  }, [variantsForSize, surface]);

  const selected = useMemo(() => {
    const s = surface ?? surfaces[0];
    const q = quality ?? qualities[0];
    if (!s || !q) return null;
    return variantsForSize.find((v) => v.surface === s && v.quality === q) ?? null;
  }, [variantsForSize, surface, quality, surfaces, qualities]);

  const activeSurface = surface ?? surfaces[0] ?? null;
  const activeQuality = quality ?? qualities[0] ?? null;

  const quantity = parseQtyM2(qtyText);

  const syncedPrice =
    selected && hasSyncData ? getSyncedPrice(selected.id) : undefined;
  const displayPrice =
    syncedPrice != null && syncedPrice > 0
      ? syncedPrice
      : (selected?.price ?? null);

  const hasPrice = displayPrice != null && displayPrice > 0;

  const canShowStock = hasSyncData ? syncedShowStock : initialShowStock;

  const syncedStockTotal =
    canShowStock && selected && hasSyncData
      ? getFamilyStockForVariant(selected.id)
      : undefined;

  const totalStock =
    canShowStock && selected
      ? syncedStockTotal ??
        selected.stockLines.reduce((sum, line) => sum + line.quantityM2, 0)
      : 0;

  const hasPalletCap = Boolean(selected?.palletM2 && selected.palletM2 > 0);
  const palletVisual = selected
    ? palletVisualState(quantity, selected.palletM2)
    : null;
  const truckCount = selected ? packCount(quantity, selected.truckM2) : null;

  const effectiveQuantity = selected
    ? quantityForSaleMode(
        quantity,
        saleMode,
        selected.palletM2,
        selected.truckM2
      )
    : quantity;

  useEffect(() => {
    setSaleMode("m2");
    setQtyText("");
  }, [selected?.id]);

  function handleQtyChange(raw: string) {
    if (raw === "" || /^\d*[.,]?\d*$/.test(raw)) {
      setQtyText(raw);
    }
  }

  function handleQtyFocus(e: FocusEvent<HTMLInputElement>) {
    if (qtyText === "0" || qtyText.replace(",", ".") === "0") {
      setQtyText("");
    }
    e.target.select();
  }

  function handleQtyBlur() {
    const q = parseQtyM2(qtyText);
    if (q > 0) {
      const rounded = Math.round(q * 100) / 100;
      setQtyText(Number.isInteger(rounded) ? String(rounded) : String(rounded));
    } else {
      setQtyText("");
    }
  }

  function handleAdd() {
    if (!selected || !hasPrice || quantity <= 0) return;
    addItem({
      variantId: selected.id,
      familyName,
      brandName,
      size: selected.size,
      surface: selected.surface,
      quality: selected.quality,
      price: displayPrice!,
      code: selected.code,
      quantityM2: effectiveQuantity,
      saleMode: saleMode === "m2" ? undefined : saleMode,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  const displayImage = selected
    ? pickVariantDisplayImage(
        selected,
        toImageCandidates(variantsForSize),
        familyImageUrl ?? null,
        size
      )
    : null;

  return (
    <div className="space-y-8 pb-28">
      {selected && (
        <>
          <TileImage
            src={displayImage}
            alt={familyName}
            size={size}
            context="detail"
            className="mx-auto max-w-2xl"
          />

          <div className="product-detail-hero">
            <h1 className="product-detail-title">{familyName}</h1>
            <div className="product-detail-meta">
              <span className="product-detail-badge">
                {formatSizeDisplay(selected.size)}
              </span>
              <span className="product-detail-badge">
                {surfaceDisplayLabel(selected.surface)}
              </span>
              <span className="product-detail-badge">
                {qualityLabel(selected.quality as "FIRST" | "END")}
              </span>
            </div>
            {selected.code && (
              <p className="product-detail-code">{selected.code}</p>
            )}

            <div className="product-detail-stats product-detail-stats--pack">
              {canShowStock && (
                <div className="product-detail-stat">
                  <p className="product-detail-stat-label">Stok</p>
                  <p className="product-detail-stat-value">
                    {formatStock(totalStock)}
                  </p>
                </div>
              )}
              <div className="product-detail-stat">
                <p className="product-detail-stat-label">Fiyat</p>
                <p
                  className={`product-detail-stat-value${!hasPrice ? " product-detail-stat-value--muted" : ""}`}
                >
                  {hasPrice ? formatPrice(displayPrice!) : "Girilmedi"}
                </p>
              </div>
              <div className="product-detail-stat">
                <p className="product-detail-stat-label">Palet m²</p>
                <p className="product-detail-stat-value">
                  {formatUnitM2(selected.palletM2)}
                </p>
              </div>
              <div className="product-detail-stat">
                <p className="product-detail-stat-label">Kutu m²</p>
                <p className="product-detail-stat-value">
                  {formatUnitM2(selected.boxM2)}
                </p>
              </div>
            </div>

            {canShowStock && selected.stockLines.length > 0 && (
              <div className="product-detail-stock-lines">
                {selected.stockLines.map((line) => (
                  <p key={line.id} className="product-detail-stock-line">
                    <span>{line.label}</span>
                    <span>{formatStock(line.quantityM2)}</span>
                  </p>
                ))}
              </div>
            )}
          </div>

          <div className="product-detail-actions">
            <div className="product-detail-qty-block">
              <div className="product-detail-qty-row">
                <label className="product-detail-qty-label" htmlFor="detail-qty">
                  Miktar (m²)
                </label>
                <input
                  id="detail-qty"
                  type="text"
                  inputMode="decimal"
                  value={qtyText}
                  onChange={(e) => handleQtyChange(e.target.value)}
                  onFocus={handleQtyFocus}
                  onBlur={handleQtyBlur}
                  placeholder="m²"
                  className="product-detail-qty-input"
                />
                {hasPalletCap && (
                  <div className="product-detail-pallet-visual">
                    <PalletFillIcon
                      fill={palletVisual?.fill ?? 0}
                      className="product-detail-pallet-icon"
                    />
                    {palletVisual?.label && (
                      <span className="product-detail-pallet-multiplier">
                        {palletVisual.label}
                      </span>
                    )}
                  </div>
                )}
              </div>
              {quantity > 0 && truckCount != null && (
                <div className="product-detail-pack-counts">
                  <span className="product-detail-pack-count">
                    <TruckIcon className="product-detail-pack-icon" />
                    <span>{formatPackCount(truckCount)} tır</span>
                  </span>
                </div>
              )}
              {saleMode !== "m2" &&
                effectiveQuantity !== quantity &&
                quantity > 0 && (
                  <p className="product-detail-qty-hint">
                    Sepete{" "}
                    <strong>{formatStock(effectiveQuantity)}</strong> eklenecek
                    ({saleMode === "pallet" ? "palet" : "tır"} satışı)
                  </p>
                )}
            </div>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!hasPrice || quantity <= 0}
              className="product-detail-cta"
            >
              {added ? "Sepete eklendi ✓" : "Sepete ekle"}
            </button>
          </div>
        </>
      )}

      <div className="product-detail-panel">
        {sizes.length > 0 && (
          <DetailSection title="ÖLÇÜLER">
            {sizes.map((s) => (
              <DetailOption
                key={s}
                active={size === s}
                onClick={() => {
                  setSize(s);
                  setSurface(null);
                  setQuality(null);
                }}
              >
                {formatSizeDisplay(s)}
              </DetailOption>
            ))}
          </DetailSection>
        )}

        {surfaces.length > 0 && (
          <DetailSection title="YÜZEY">
            {surfaces.map((s) => (
              <DetailOption
                key={s}
                active={activeSurface === s}
                onClick={() => {
                  setSurface(s);
                  setQuality(null);
                }}
              >
                {surfaceDisplayLabel(s)}
              </DetailOption>
            ))}
          </DetailSection>
        )}

        {qualities.length > 0 && (
          <DetailSection title="KALİTE">
            {qualities.map((q) => (
              <DetailOption
                key={q}
                active={activeQuality === q}
                onClick={() => setQuality(q)}
              >
                {qualityLabel(q as "FIRST" | "END")}
              </DetailOption>
            ))}
          </DetailSection>
        )}

        {selected && (
          <DetailSection title="SATIŞ">
            <DetailOption
              active={saleMode === "pallet"}
              disabled={!selected.palletM2}
              onClick={() =>
                setSaleMode((m) => (m === "pallet" ? "m2" : "pallet"))
              }
            >
              Palet ile satış
            </DetailOption>
            <DetailOption
              active={saleMode === "truck"}
              disabled={!selected.truckM2}
              onClick={() =>
                setSaleMode((m) => (m === "truck" ? "m2" : "truck"))
              }
            >
              Tır ile satış
            </DetailOption>
          </DetailSection>
        )}
      </div>
    </div>
  );
}
