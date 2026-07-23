"use client";

import { useEffect, useMemo, useState, type FocusEvent, type ReactNode } from "react";
import Link from "next/link";
import { TileImage } from "@/components/TileImage";
import { useCartStore } from "@/store/cart";
import { formatSizeDisplay, surfaceDisplayLabel } from "@/lib/constants";
import {
  colorHex,
  colorLabel,
  materialTypeLabel,
} from "@/lib/product-attributes";
import { featureBadges } from "@/lib/product-features";
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
  feature3D: boolean;
  featureRec: boolean;
  price: number | null;
  code: string | null;
  palletM2: number | null;
  boxM2: number | null;
  truckM2: number | null;
  imageUrl: string | null;
  stockLines: { id: string; label: string; quantityM2: number }[];
  stockUpdatedAt: string | null;
};

export type SimilarProduct = {
  id: string;
  name: string;
  slug: string;
  brandSlug: string;
  brandName: string;
  size: string;
  imageUrl: string | null;
};

const STOCK_UPDATED_FMT = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Istanbul",
});

function formatStockUpdated(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return STOCK_UPDATED_FMT.format(d);
}

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
  salesEnabled: initialSalesEnabled = true,
  similar = [],
  color = null,
  materialType = null,
}: {
  familyName: string;
  brandName: string;
  familyImageUrl?: string | null;
  sizes: string[];
  variants: Variant[];
  initialSize: string;
  initialQuality?: "FIRST" | "END";
  showStock?: boolean;
  salesEnabled?: boolean;
  similar?: SimilarProduct[];
  color?: string | null;
  materialType?: string | null;
}) {
  const addItem = useCartStore((s) => s.addItem);
  const getSyncedPrice = useCatalogSyncStore((s) => s.getSyncedPrice);
  const getFamilyStockForVariant = useCatalogSyncStore(
    (s) => s.getFamilyStockForVariant
  );
  const syncedShowStock = useCatalogSyncStore((s) => s.showStock);
  const syncedSalesEnabled = useCatalogSyncStore((s) => s.salesEnabled);
  const hasSyncData = useCatalogSyncStore(
    (s) => Object.keys(s.variants).length > 0
  );
  const [size, setSize] = useState(initialSize);
  const [surface, setSurface] = useState<string | null>(null);
  const [quality, setQuality] = useState<string | null>(initialQuality ?? null);
  const [feature3D, setFeature3D] = useState<boolean | null>(null);
  const [featureRec, setFeatureRec] = useState<boolean | null>(null);
  const [qtyText, setQtyText] = useState("");
  const [saleMode, setSaleMode] = useState<SaleMode>("m2");
  const [added, setAdded] = useState(false);
  const [showSimilar, setShowSimilar] = useState(false);

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

  const variantsForSurfaceQuality = useMemo(() => {
    const s = surface ?? surfaces[0];
    const q = quality ?? qualities[0];
    if (!s || !q) return [];
    return variantsForSize.filter((v) => v.surface === s && v.quality === q);
  }, [variantsForSize, surface, quality, surfaces, qualities]);

  const has3DChoice = useMemo(
    () =>
      variantsForSurfaceQuality.some((v) => v.feature3D) &&
      variantsForSurfaceQuality.some((v) => !v.feature3D),
    [variantsForSurfaceQuality]
  );

  const hasRecChoice = useMemo(
    () =>
      variantsForSurfaceQuality.some((v) => v.featureRec) &&
      variantsForSurfaceQuality.some((v) => !v.featureRec),
    [variantsForSurfaceQuality]
  );

  const resolvedFeature3D = has3DChoice
    ? (feature3D ?? false)
    : (variantsForSurfaceQuality[0]?.feature3D ?? false);

  const resolvedFeatureRec = hasRecChoice
    ? (featureRec ?? false)
    : (variantsForSurfaceQuality[0]?.featureRec ?? false);

  const selected = useMemo(() => {
    const s = surface ?? surfaces[0];
    const q = quality ?? qualities[0];
    if (!s || !q) return null;
    return (
      variantsForSize.find(
        (v) =>
          v.surface === s &&
          v.quality === q &&
          v.feature3D === resolvedFeature3D &&
          v.featureRec === resolvedFeatureRec
      ) ?? null
    );
  }, [
    variantsForSize,
    surface,
    quality,
    surfaces,
    qualities,
    resolvedFeature3D,
    resolvedFeatureRec,
  ]);

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
  const salesEnabled = hasSyncData ? syncedSalesEnabled : initialSalesEnabled;

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
      feature3D: selected.feature3D,
      featureRec: selected.featureRec,
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
              {featureBadges(selected).map((badge) => (
                <span key={badge} className="product-detail-badge">
                  {badge}
                </span>
              ))}
            </div>
            {(materialTypeLabel(materialType) || colorLabel(color)) && (
              <div className="product-detail-attrs">
                {materialTypeLabel(materialType) && (
                  <span className="product-detail-attr">
                    {materialTypeLabel(materialType)}
                  </span>
                )}
                {colorLabel(color) && (
                  <span className="product-detail-attr">
                    <span
                      className="product-detail-attr-swatch"
                      style={{ background: colorHex(color) ?? undefined }}
                    />
                    {colorLabel(color)}
                  </span>
                )}
              </div>
            )}
            {selected.code && (
              <p className="product-detail-code">{selected.code}</p>
            )}

            {similar.length > 0 && (
              <button
                type="button"
                onClick={() => setShowSimilar(true)}
                className="product-detail-similar-btn"
                aria-label={`Benzer ürünler (${similar.length})`}
              >
                <span className="product-detail-similar-hex">
                  <svg viewBox="0 0 76 76" aria-hidden="true">
                    <polygon
                      className="product-detail-similar-hexline"
                      points="26,8 50,8 68,38 50,68 26,68 8,38"
                    />
                    <g
                      className="product-detail-similar-icon"
                      transform="translate(38,38)"
                    >
                      <rect x="-13" y="-9" width="11" height="11" rx="2" />
                      <rect x="2" y="-2" width="11" height="11" rx="2" />
                      <path d="M-4,7 L6,-5" />
                    </g>
                  </svg>
                  <span className="product-detail-similar-badge">
                    {similar.length}
                  </span>
                </span>
                <span className="product-detail-similar-label">
                  Benzer ürünler
                </span>
              </button>
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

            {canShowStock && formatStockUpdated(selected.stockUpdatedAt) && (
              <p className="product-detail-stock-updated">
                Stok güncellendi: {formatStockUpdated(selected.stockUpdatedAt)}
              </p>
            )}
          </div>

          {salesEnabled && (
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
          )}
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
                  setFeature3D(null);
                  setFeatureRec(null);
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
                  setFeature3D(null);
                  setFeatureRec(null);
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
                onClick={() => {
                  setQuality(q);
                  setFeature3D(null);
                  setFeatureRec(null);
                }}
              >
                {qualityLabel(q as "FIRST" | "END")}
              </DetailOption>
            ))}
          </DetailSection>
        )}

        {(has3DChoice || hasRecChoice) && (
          <DetailSection title="ÖZELLİKLER">
            {has3DChoice && (
              <DetailOption
                active={resolvedFeature3D}
                onClick={() => setFeature3D((v) => !(v ?? false))}
              >
                3D
              </DetailOption>
            )}
            {hasRecChoice && (
              <DetailOption
                active={resolvedFeatureRec}
                onClick={() => setFeatureRec((v) => !(v ?? false))}
              >
                REC
              </DetailOption>
            )}
          </DetailSection>
        )}

        {selected && salesEnabled && (
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

      {showSimilar && (
        <SimilarProductsModal
          items={similar}
          onClose={() => setShowSimilar(false)}
        />
      )}
    </div>
  );
}

function SimilarProductsModal({
  items,
  onClose,
}: {
  items: SimilarProduct[];
  onClose: () => void;
}) {
  return (
    <div
      className="product-detail-similar-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="product-detail-similar-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="product-detail-similar-head">
          <p className="product-detail-similar-title">Benzer ürünler</p>
          <button
            type="button"
            onClick={onClose}
            className="product-detail-similar-close"
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>
        <div className="product-detail-similar-grid">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/katalog/${item.brandSlug}/${item.size}/${item.slug}`}
              onClick={onClose}
              className="product-detail-similar-card"
            >
              <TileImage
                src={item.imageUrl}
                alt={item.name}
                size={item.size}
                context="list"
              />
              <p className="product-detail-similar-name">{item.name}</p>
              <p className="product-detail-similar-brand">{item.brandName}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
