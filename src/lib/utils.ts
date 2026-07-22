/**
 * Bir diziyi en fazla `size` elemanlı parçalara böler.
 * Turso/SQLite'ın sorgu parametre limitini (IN listesi) aşmamak için kullanılır.
 */
export function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function formatPrice(price: number) {
  return `${price} + KDV`;
}

/** m² × birim fiyat gibi tutarlar için */
export function formatMoneyTotal(amount: number) {
  const formatted = amount.toLocaleString("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${formatted} + KDV`;
}

export function formatStock(quantity: number) {
  const rounded =
    quantity % 1 === 0 ? quantity.toString() : quantity.toFixed(1);
  return `${rounded} m²`;
}

export function qualityLabel(quality: "FIRST" | "END") {
  return quality === "FIRST" ? "1." : "END";
}

/** Kalite seçenekleri: önce 1., sonra END */
export function sortQualities(qualities: string[]) {
  const order = (q: string) => (q === "FIRST" ? 0 : q === "END" ? 1 : 2);
  return [...qualities].sort((a, b) => order(a) - order(b));
}

export type CatalogQualityFilter = "FIRST" | "END" | "ALL";

export function kaliteFilterLabel(filter: CatalogQualityFilter) {
  if (filter === "ALL") return "Tümü";
  return qualityLabel(filter);
}

export function kaliteParam(quality: "FIRST" | "END") {
  return quality === "FIRST" ? "1" : "end";
}

export function kaliteQuery(filter: CatalogQualityFilter) {
  if (filter === "ALL") return "kalite=tumu";
  return `kalite=${kaliteParam(filter)}`;
}

export function parseKaliteFilter(value: string | null | undefined): CatalogQualityFilter {
  if (value == null || value.trim() === "") return "FIRST";
  const v = value.trim().toUpperCase();
  if (["TUMU", "TÜMÜ", "ALL", "HEPSI"].includes(v)) return "ALL";
  return parseQuality(value) ?? "FIRST";
}

export function parseQuality(value: string): "FIRST" | "END" | null {
  const v = value.trim().toUpperCase();
  if (["1", "1.", "FIRST", "BIRINCI", "1.KALITE"].includes(v)) return "FIRST";
  if (["END", "2", "2.", "END.", "2.KALITE"].includes(v)) return "END";
  return null;
}

export function parseSurface(
  value: string
):
  | "MAT"
  | "SLP"
  | "FLP"
  | "SGR"
  | "GLS"
  | "SOFT_ANTISLIP"
  | "ANTISLIP"
  | "R10"
  | "R11"
  | null {
  const v = value.trim().toUpperCase();
  const key = v.replace(/[\s-]+/g, "_");
  if (
    key === "MAT" ||
    key === "SLP" ||
    key === "FLP" ||
    key === "SGR" ||
    key === "GLS" ||
    key === "SOFT_ANTISLIP" ||
    key === "ANTISLIP" ||
    key === "R10" ||
    key === "R11"
  )
    return key as ReturnType<typeof parseSurface>;
  if (v.includes("SOFT") && v.includes("ANTI")) return "SOFT_ANTISLIP";
  if (v.includes("ANTISLIP") && v.includes("R11")) return "R11";
  if (v.includes("ANTISLIP") && v.includes("R10")) return "R10";
  if (/\bR11\b/.test(v)) return "R11";
  if (/\bR10\b/.test(v)) return "R10";
  if (v.includes("ANTISLIP") || v.includes("ANTI SLIP") || v.includes("ANTI-SLIP"))
    return "ANTISLIP";
  if (v.includes("SUGAR") || v.includes("SGR")) return "SGR";
  if (v.includes("PARLAK") || v.includes("GLOSS")) return "GLS";
  if (v.includes("SEMI") && v.includes("LAPP")) return "SLP";
  if (v.includes("FULL") && v.includes("LAPP")) return "FLP";
  if (v.includes("SEMI") || v.includes("SEMI LAPP")) return "SLP";
  if (v.includes("LAPP") || v === "FLP") return "FLP";
  if (v.includes("MAT")) return "MAT";
  return null;
}

const ORDER_SUFFIX_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * `SIP-<YYYYMMDDHHMMSS>-<6 karakter>` — saniye hassasiyeti tek başına yeterli
 * değildi (aynı saniyedeki iki sipariş çakışabiliyordu). Sonek 32^6 (~1 milyar)
 * olasılık verir; çağıran taraf ayrıca unique çakışmasında yeniden dener.
 * Karışabilen karakterler (I, O, 0, 1) alfabede yok.
 */
export function generateOrderNumber() {
  const now = new Date();
  const stamp = now.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);

  let suffix = "";
  for (let i = 0; i < 6; i += 1) {
    suffix +=
      ORDER_SUFFIX_ALPHABET[
        Math.floor(Math.random() * ORDER_SUFFIX_ALPHABET.length)
      ];
  }

  return `SIP-${stamp}-${suffix}`;
}
