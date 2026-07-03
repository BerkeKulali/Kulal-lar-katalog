const PLACEHOLDER_PREFIX = "color:";

export function isPlaceholderImage(src?: string | null) {
  return !src || src.startsWith(PLACEHOLDER_PREFIX);
}

export function placeholderColor(src?: string | null) {
  if (!src?.startsWith(PLACEHOLDER_PREFIX)) return "#666666";
  return src.replace(PLACEHOLDER_PREFIX, "");
}

/** Cloudinary CDN — boyut sınırı + retina için yeterli genişlik */
export function optimizeCatalogImage(
  src: string,
  widthOrOptions: number | { width?: number } = 960
) {
  const width =
    typeof widthOrOptions === "number"
      ? widthOrOptions
      : (widthOrOptions.width ?? 960);

  if (!src.includes("res.cloudinary.com")) return src;
  if (src.includes("/upload/f_auto") || src.includes("/upload/c_")) return src;

  return src.replace(
    "/upload/",
    `/upload/f_auto,q_auto:best,w_${width},c_limit,dpr_auto/`
  );
}

export function resolveProductImage(
  src?: string | null,
  options?: { width?: number }
) {
  if (!src || isPlaceholderImage(src)) return null;
  return optimizeCatalogImage(src, options?.width ?? 960);
}
