import Link from "next/link";
import { BrandHeaderMark } from "@/components/BrandHeaderMark";
import { formatSizeDisplay } from "@/lib/constants";

export function CatalogSizeHeader({
  backHref,
  backLabel,
  size,
  qualityLabel,
  brandSlug,
  brandName,
  right,
}: {
  backHref: string;
  backLabel?: string;
  size: string;
  qualityLabel?: string;
  brandSlug?: string;
  brandName?: string;
  right?: React.ReactNode;
}) {
  const hasBrandMark = Boolean(brandSlug || brandName);

  const main = (
    <div className="catalog-size-header-main text-center">
      <Link href={backHref} className="catalog-back-link">
        ← {backLabel ?? "Ölçüler"}
      </Link>
      <p className="catalog-size-title">{formatSizeDisplay(size)}</p>
      {qualityLabel && (
        <p className="catalog-size-quality">{qualityLabel}</p>
      )}
    </div>
  );

  if (!hasBrandMark) {
    return (
      <header className="catalog-size-header catalog-size-header--solo pb-2 pt-1">
        {main}
        {right && (
          <div className="catalog-size-header-solo-right">{right}</div>
        )}
      </header>
    );
  }

  return (
    <header className="catalog-size-header pb-2 pt-1">
      <div className="catalog-size-header-grid">
        <BrandHeaderMark brandSlug={brandSlug} brandName={brandName} />
        {main}
        <div className="catalog-size-header-spacer" aria-hidden={!right}>
          {right}
        </div>
      </div>
    </header>
  );
}

export function CatalogBrandBar({
  brandSlug,
  brandName,
  children,
  right,
}: {
  brandSlug?: string;
  brandName?: string;
  children?: React.ReactNode;
  right?: React.ReactNode;
}) {
  if (!brandSlug && !brandName && !children && !right) return null;

  return (
    <div className="catalog-brand-bar pb-2 pt-1">
      <div className="catalog-size-header-grid">
        <BrandHeaderMark brandSlug={brandSlug} brandName={brandName} />
        {children ? (
          <div className="catalog-size-header-main">{children}</div>
        ) : (
          <div className="catalog-size-header-main" />
        )}
        <div className="catalog-size-header-spacer" aria-hidden={!right}>
          {right}
        </div>
      </div>
    </div>
  );
}
