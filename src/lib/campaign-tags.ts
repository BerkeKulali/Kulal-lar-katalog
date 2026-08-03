/**
 * Kampanya kartlarında gösterilen sabit etiket seçenekleri (lokasyon/ebat/
 * kalite). Kampanyayı oluşturan admin bunlardan seçer; serbest metin değil —
 * kartlardaki yuvarlak rozetler bu sabit kümeyle tutarlı kalsın diye.
 * Yeni bir depo/ebat/kalite eklemek gerekirse buraya eklemek yeterli.
 */
export const CAMPAIGN_LOCATIONS = ["SÖKE", "PANCAR", "BİLECİK"] as const;
export type CampaignLocationTag = (typeof CAMPAIGN_LOCATIONS)[number];

export const CAMPAIGN_SIZE_TAGS = ["60x120", "40x120", "60x60", "MİX"] as const;
export type CampaignSizeTag = (typeof CAMPAIGN_SIZE_TAGS)[number];

export const CAMPAIGN_QUALITY_TAGS = ["1.", "END", "MİX"] as const;
export type CampaignQualityTag = (typeof CAMPAIGN_QUALITY_TAGS)[number];

export function isValidCampaignTag(
  value: string,
  allowed: readonly string[]
): boolean {
  return allowed.includes(value);
}

export type ParsedTag =
  | { ok: true; value: string | null }
  | { ok: false };

/** Boş string/undefined/null -> null (etiket temizlenir); doluysa izin verilen listede olmalı. */
export function parseCampaignTag(
  value: unknown,
  allowed: readonly string[]
): ParsedTag {
  if (value === undefined || value === null || value === "") {
    return { ok: true, value: null };
  }
  if (typeof value !== "string" || !isValidCampaignTag(value, allowed)) {
    return { ok: false };
  }
  return { ok: true, value };
}
