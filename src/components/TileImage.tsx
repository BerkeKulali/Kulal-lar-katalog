import {
  isPlaceholderImage,
  optimizeCatalogImage,
  placeholderColor,
  resolveProductImage,
} from "@/lib/image-url";
import {
  tileImageProfile,
  type TileImageContext,
} from "@/lib/tile-image-profile";

export function TileImage({
  src,
  alt,
  aspect,
  size,
  context = "list",
  className = "",
  width,
  variant = "catalog",
}: {
  src?: string | null;
  alt: string;
  aspect?: string;
  size?: string | null;
  context?: TileImageContext;
  className?: string;
  width?: number;
  variant?: "catalog" | "plain";
}) {
  const profile = tileImageProfile(size, context);
  const displayAspect = aspect ?? profile.aspect;
  const cloudWidth = width ?? profile.cloudWidth;
  const imageSrc = resolveProductImage(src, { width: cloudWidth });
  const color = placeholderColor(src);

  const frameClass =
    variant === "catalog" ? "catalog-tile" : "border border-zinc-800";

  const tile = (
    <div
      className={`relative w-full overflow-hidden ${frameClass} ${className}`}
      style={{ aspectRatio: displayAspect.replace("/", " / ") }}
    >
      {imageSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageSrc}
          alt={alt}
          className="h-full w-full object-cover object-center"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div
          className="h-full w-full"
          style={{ backgroundColor: color }}
          aria-label={alt}
        />
      )}
    </div>
  );

  if (variant === "catalog") {
    return <div className="catalog-tile-wrap">{tile}</div>;
  }

  return tile;
}

export { isPlaceholderImage, optimizeCatalogImage };
