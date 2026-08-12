/**
 * Türkçe metin aramasında "kullanıcı hangi I harfini yazarsa yazsın eşleşsin"
 * normalizasyonu.
 *
 * Sorun: JS'in düz `.toLowerCase()`'ı Türkçe İ/I/ı harflerini doğru
 * katlamıyor. Örnek: "İ" (Türkçe büyük noktalı I) `.toLowerCase()` ile
 * "i̇" olur — görünüşte "i" ama aslında İKİ karakter (i + ayrı bir nokta
 * işareti, U+0307). Bu yüzden veritabanında "SİDE" diye (Türkçe klavyeyle
 * girilmiş, noktalı İ ile) kayıtlı bir ürün ailesi, kullanıcı ASCII
 * "Side"/"SIDE"/"side" yazınca BULUNAMIYORDU — "si̇de" (gizli nokta
 * karakteriyle) ile "side" alt-dize olarak eşleşmiyor. Aynı şekilde küçük
 * noktasız "ı" da düz toLowerCase ile "i"ye dönüşmüyor, yani "ınca" da
 * "inca"yı bulamıyordu.
 *
 * Çözüm: arama ve karşılaştırmadan önce dört İ/I/i/ı varyantının hepsini
 * tek bir "i"ye indirgiyoruz, sonra geri kalanını normal `.toLowerCase()`
 * ile katlıyoruz (Ç/Ş/Ğ/Ö/Ü zaten locale'den bağımsız doğru katlanıyor,
 * onlara dokunmaya gerek yok — sorun yalnızca I ailesinde).
 */
export function turkishFold(value: string): string {
  return value
    .replace(/İ/g, "i")
    .replace(/I/g, "i")
    .replace(/ı/g, "i")
    .toLowerCase();
}

/** `haystack` içinde `needle` geçiyor mu — Türkçe I-katlamalı, boşluk kırpmalı. */
export function turkishIncludes(haystack: string, needle: string): boolean {
  const q = turkishFold(needle.trim());
  if (!q) return true;
  return turkishFold(haystack).includes(q);
}
