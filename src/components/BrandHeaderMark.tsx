const BRAND_HEADER_LOGOS: Record<
  string,
  { src: string; alt: string; className?: string; style?: { height?: string; maxWidth?: string } }
> = {
  qua: {
    src: "/logos/qua-logo.png",
    alt: "QUA SERAMİK",
    className: "brand-header-mark__logo--qua",
    style: { height: "1.6rem", maxWidth: "4.8rem" },
  },
  bien: {
    src: "/logos/bien-logo.png",
    alt: "BIEN",
    className: "brand-header-mark__logo--bien",
    style: { height: "1.6rem", maxWidth: "4.8rem" },
  },
  gural: {
    src: "/logos/gural-logo.png",
    alt: "GÜRAL",
  },
};

export function BrandHeaderMark({
  brandSlug,
  brandName,
}: {
  brandSlug?: string;
  brandName?: string;
}) {
  if (!brandSlug && !brandName) return null;

  const logo = brandSlug ? BRAND_HEADER_LOGOS[brandSlug] : undefined;

  if (logo) {
    return (
      <div className="brand-header-mark brand-header-mark--catalog shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo.src}
          alt={logo.alt}
          className={`brand-header-mark__logo ${logo.className ?? ""}`}
          style={logo.style}
        />
      </div>
    );
  }

  if (brandName) {
    return (
      <p className="brand-header-mark brand-header-mark--catalog text-sm font-bold tracking-[0.2em]">
        {brandName}
      </p>
    );
  }

  return null;
}
