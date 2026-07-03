import Link from "next/link";

const LOGO_SRC = "/logos/kulalilar-logo.png";

export function KulalilarLogo({
  theme,
  className = "",
}: {
  theme: "dark" | "light";
  className?: string;
}) {
  const invert = theme === "light" ? "invert" : "";

  return (
    <Link href="/" className={`inline-flex shrink-0 items-center ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LOGO_SRC}
        alt="Kulalılar"
        className={`h-12 w-auto max-w-[16rem] object-contain sm:h-14 sm:max-w-[18rem] ${invert}`}
      />
    </Link>
  );
}

export { LOGO_SRC };
