# Performans Analizi — "Cache'lenmemiş sayfalar yavaş"

Tarih: 2026-07-24

Gözlem doğru: **cache miss (önbelleğe düşmeyen) durumda dinamik sayfalar
yavaş.** Kök nedenleri kod ve dağıtım yapılandırmasından tek tek çıkardım.
Aşağıda en etkiliden en küçüğe sıralı.

---

## 1. En büyük neden: Vercel bölgesi ile Turso bölgesi farklı (Atlantik gecikmesi)

- Vercel fonksiyonları **iad1 (Washington DC, ABD Doğu)** bölgesinde çalışıyor
  (build logu bunu gösterdi; `vercel.json`'da `regions` tanımlı değil, Hobby
  varsayılanı iad1).
- Turso veritabanı **aws-eu-west-1 (İrlanda)** bölgesinde (`.env`'deki URL).

Yani **her DB sorgusu Atlantik'i geçiyor.** Tek gidiş-dönüş ~80–100 ms.
Sayfa birden çok sorgu yapıyorsa bu **çarpılıyor**. Türkiye'deki kullanıcı için
en kötü kombinasyon: kullanıcı TR, fonksiyon ABD, DB İrlanda.

**Etki:** DB'ye bağlı her dinamik render'a sorgu başına ~90 ms biner. Aşağıdaki
"sorgu şelalesi" ile birleşince tek sayfa 300–400 ms+ sadece DB beklemesi olur.

**Çözüm (en yüksek kazanç):** Fonksiyon bölgesini Turso'ya (ve TR
kullanıcılarına) yakın **fra1 (Frankfurt)**'a taşı. `vercel.json`:

```json
{ "regions": ["fra1"] }
```

fra1 ↔ eu-west-1 gecikmesi ~30 ms (Atlantik'in ~1/3'ü). Bu tek değişiklik
DB-bağlı sayfaları kabaca **2–3 kat** hızlandırır. (Hobby tek bölge seçimine
izin verir.) Alternatif/ek: Turso'da iad1'e replika eklemek.

---

## 2. `getAppSettings` HER dinamik render'da veritabanına YAZIYOR

`src/lib/catalog.ts`:

```ts
export async function getAppSettings() {
  return prisma.appSettings.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } });
}
```

Bu bir **upsert = yazma işlemi** ve **önbelleğe alınmamış**. Anasayfa, ürün
detayı ve `/api/device/me` her açılışta bunu çağırıyor. Yani katalog önbelleği
tam isabet etse bile **her sayfa yine de bir yazma round-trip'i** ödüyor
(Atlantik gecikmesiyle çarpılıyor).

**Çözüm:** Yazma yerine önbellekli okuma yap. Satır zaten var (seed/migration
ile bir kez oluşturulur), o yüzden `findUnique` + `unstable_cache` (tag'li)
yeterli. Değer değişince (satış aç/kapat, fiyat listesi tarihi) tag invalidasyonu
zaten var. Bu, cache-hit sayfalarını bile hızlandırır.

---

## 3. Ürün detayında sorgu şelalesi (cache miss yolu)

`katalog/[brand]/[size]/[family]/page.tsx` sırası:

1. `getFamilyDetail()` — **önce** ve tek başına await ediliyor. Cache miss'te
   içinde 3 **ardışık** sorgu var: marka → aile(+variant+stok) → benzer ürünler.
2. Sonra `getAdminSession()` (admin cookie yoksa DB'ye gitmez).
3. Sonra `Promise.all([resolveStockVisibility, getAppSettings])`.

Cache miss'te en kötü hal ~4 round-trip ve `getFamilyDetail` içindeki 3'ü
**ardışık** (paralel değil). Atlantik gecikmesiyle ~360 ms+.

**Çözümler:**
- `getFamilyDetail` içinde marka + aile'yi **tek sorguda** birleştir
  (`productFamily.findFirst where brand.slug = X`), ayrı marka sorgusunu kaldır
  → bir round-trip eksilir.
- `getFamilyDetail`'i sayfadaki `getAdminSession`/`getAppSettings`/stok
  çözümüyle **paralel** başlat (birbirine bağlı değiller); `notFound` kontrolünü
  sonra yap.
- Benzer ürünler (`getSimilarFamilies`) aile id'sine bağlı olduğu için ardışık
  kalır ama tek round-trip.

---

## 4. Önbellek admin değişikliğinde tamamen sıfırlanıyor → sık cache miss

Katalog verisi `unstable_cache` ile önbellekli ve **her admin mutasyonunda**
(`invalidateCatalogCache` → fiyat/stok/görsel/aile/renk-tip…) tag geçersiz
kılınıyor. Stok ve fiyat sık değiştiği için önbellek sık sık boşalıyor; sonraki
ziyaretçiler **yavaş (cache miss) yolu** yaşıyor. "Cache'lenmemiş kısım yavaş"
hissinin bir kaynağı bu: değişiklikten sonra ilk ziyaretçiler yavaş.

**Çözümler:**
- İnvalidasyonu **daha dar** yap: fiyat değişiminde tüm katalog yerine yalnızca
  ilgili aile/ölçü önbelleğini boşalt (tag granülerliği).
- `revalidate` süresini koru ki isabet penceresi büyük olsun.
- 1 ve 2'yi düzeltmek cache miss yolunu da hızlandırdığı için bu his azalır.

---

## 5. Cold start (Hobby planı)

Dinamik rotalar serverless fonksiyonda çalışır; uzun süre trafik olmayınca
**soğuk başlatma** ~200–500 ms ekler. Tablet sabah ilk açıldığında bu belirgin.
Hobby'de fonksiyonu sıcak tutmak (cron ping vb.) sınırlı ve tavsiye edilmez.
Bundle küçültmek soğuk başlatmayı biraz azaltır. Bölge düzeltmesi (madde 1) bunu
doğrudan çözmez ama toplam gecikmeyi düşürür.

---

## 6. İkincil notlar

- **Middleware (`proxy.ts`)** cihaz doğrulaması için DB sorgusu yapıyor ama
  `DEVICE_AUTH` cookie'si (10 dk) ile throttle'lı — çoğu gezinmede DB'ye
  gitmiyor. Küçük etki.
- **`getGlobalSearchCatalog`** (arama + anasayfa) tüm aile+variant'ı indeksliyor;
  cache miss'te ağır ama önbellekli. Katalog büyürse sayfalama gerekebilir.
- **Sync** tüm aktif kataloğu gönderiyor (delta var, 10 dk throttle) — tablet
  ilk tam sync'i ağır olabilir.

---

## Önceliklendirilmiş eylem planı

**Hızlı ve yüksek etkili (önce bunlar):**
1. `vercel.json` → `"regions": ["fra1"]` (Atlantik gecikmesini ~3'e böler).
2. `getAppSettings`'i önbellekli okumaya çevir (her render'daki yazmayı kaldır).
3. Ürün detayında `getFamilyDetail`'i diğer await'lerle paralelleştir; marka+aile
   sorgusunu birleştir.

**Orta:**
4. Katalog cache invalidasyonunu daha granüler yap (fiyat/stok değişiminde tümü
   yerine ilgili aile).
5. Bölge sonrası ölçüm: Vercel Analytics / Speed Insights ile gerçek TTFB'yi izle.

**İzleme:**
6. Vercel'de gerçek gecikmeyi görmek için deploy sonrası bir dinamik sayfanın
   sunucu render süresini (Sentry trace / Vercel logs) ölç; iyileşmeyi doğrula.

En büyük tek kazanç **madde 1 (bölge)**. Kod tarafında en temiz kazanç
**madde 2 (getAppSettings)**. İkisi birlikte cache-miss yavaşlığını belirgin
azaltır.
