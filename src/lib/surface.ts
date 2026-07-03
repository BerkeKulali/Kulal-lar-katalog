import { Surface } from "@/generated/prisma/enums";

function surfaceSet() {
  return new Set<string>(Object.values(Surface));
}

/** Prisma Surface enum değerine çevir */
export function toSurface(value: string): Surface {
  const upper = value.trim().toUpperCase();
  const allowed = surfaceSet();
  if (!allowed.has(upper)) {
    throw new Error(
      `Geçersiz yüzey: ${value}. Geçerli kodlar: ${[...allowed].join(", ")}`
    );
  }
  return upper as Surface;
}

export function isPrismaSurface(value: string): value is Surface {
  return surfaceSet().has(value.trim().toUpperCase());
}
