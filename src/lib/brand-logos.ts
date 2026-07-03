export type BrandLogoConfig = {
  src: string;
  alt: string;
  /** Logo dosyası kendi arka planıyla kare kutuyu doldurur */
  coverTile?: boolean;
};

export const BRAND_LOGOS: Record<string, BrandLogoConfig> = {
  qua: { src: "/brands/qua.png", alt: "QUA Seramik", coverTile: true },
  bien: { src: "/brands/bien.png", alt: "Bien", coverTile: true },
};

export function getBrandLogo(slug: string) {
  return BRAND_LOGOS[slug.trim().toLowerCase()] ?? null;
}
