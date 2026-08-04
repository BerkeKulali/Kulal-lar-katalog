import Link from "next/link";

const LOGO_SRC_DARK = "/logos/kulalilar-logo.png";
const LOGO_SRC_LIGHT = "/logos/kulalilar-logo-light.png";

export function KulalilarLogo({
  theme,
  className = "",
}: {
  theme: "dark" | "light";
  className?: string;
}) {
  const src = theme === "light" ? LOGO_SRC_LIGHT : LOGO_SRC_DARK;

  return (
    <Link href="/" className={`inline-flex shrink-0 items-center ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Kulalılar"
        className="h-12 w-auto max-w-[16rem] object-contain sm:h-14 sm:max-w-[18rem]"
      />
    </Link>
  );
}

export { LOGO_SRC_DARK, LOGO_SRC_LIGHT };
