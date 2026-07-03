import Link from "next/link";

export function BrandCatalogTile({
  slug,
  name,
  logoText,
}: {
  slug: string;
  name: string;
  logoText?: string | null;
}) {
  return (
    <Link href={`/katalog/${slug}`} className="catalog-brand-tile">
      <span className="catalog-brand-label">{logoText ?? name}</span>
    </Link>
  );
}
