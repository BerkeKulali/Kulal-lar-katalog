# Kulalılar Katalog — Eksik Analizi ve Yapılan Düzeltmeler

İlk tarama: 2026-07-18 (commit `4d1cdfb`) · Düzeltmeler aynı gün uygulandı.

Durum özeti: **12 başlığın 12'si tamamlandı.** Aşağıda ne yapıldığı ve
bilinçli olarak ertelenen maddeler yer alıyor.

---

## ✅ 1. Sipariş API'si (KRİTİK)

**Sorun:** `POST /api/orders` hiçbir kimlik doğrulaması yapmıyordu (middleware
matcher'ı `/api`'yi hariç tutuyor), fiyat (`unitPriceSnapshot`) ve ürün etiketi
doğrudan istemciden alınıyordu, miktar doğrulanmıyordu. Sepet `localStorage`'da
tutulduğu için fiyat düzenlenip 1 TL'ye sipariş geçilebiliyordu.
`GET /api/orders` ise yalnızca `requireAdmin()` kullanıp izin ve marka
kapsamını atlıyordu.

**Yapılan:**
- `src/lib/order-validation.ts` (yeni, saf mantık): miktar/bayi adı/not/satır
  doğrulaması, satır ve miktar üst sınırları, aynı varyantın birleştirilmesi.
- `src/lib/order-create.ts` (yeni): cihaz token'ı **yalnızca cookie'den**
  okunur ve `getAuthorizedDevice()` ile DB'de doğrulanır; fiyat ve etiket
  sunucuda DB'den üretilir; plasiyer atfı cihaz kaydından gelir.
- `GET /api/orders` **kaldırıldı** (`/api/admin/orders` zaten doğru koruma
  altında).
- Route'a rate limit ve düzgün hata eşlemesi eklendi.
- `src/app/sepet/page.tsx` artık fiyat/etiket göndermiyor.

## ✅ 2. SESSION_SECRET zorunlu

`DATABASE_AUTH_TOKEN` fallback'i kaldırıldı (DB token'ı rotasyona girince tüm
oturumlar sessizce düşüyordu). Minimum 32 karakter kontrolü, eksikse admin
girişinde net 503 yanıtı. `.env.example` yeniden yazıldı.

## ✅ 3. admin-access.ts imza doğrulaması

`hasAdminSession()` yalnızca cookie'nin **varlığına** bakıyordu; kayıtlı bir
tablet çöp bir cookie yazarak "tabletler admin paneline erişemez" korumasını
atlatabiliyordu. Artık `verifyAdminSessionValue()` kullanılıyor. Üç yerde
hardcode edilmiş cookie adı tek kaynağa indirildi.

## ✅ 4. Cihaz cookie'leri sertleştirildi

Cihaz token'ı artık `httpOnly` + production'da `secure`. İstemcinin token'a
ihtiyacı olmadığı için `store/device.ts`'ten kaldırıldı; kurulum sinyali olarak
gizli olmayan `actorType` cookie'si kullanılıyor. LAN geliştirmesi bozulmasın
diye `secure` yalnızca production'da açılıyor.

## ✅ 5. Hata sayfaları

`src/app/error.tsx`, `not-found.tsx`, `global-error.tsx` eklendi (Türkçe, tema
uyumlu). `global-error` satır içi stil kullanır çünkü o noktada CSS yüklü
olmayabilir.

## ✅ 6. Sipariş numarası çakışması

`SIP-<zaman>-<3 hane>` (~1/900 çakışma) yerine 32 karakterlik alfabeden 6 haneli
sonek (karışabilen I/O/0/1 hariç) + unique çakışmasında 5 kez yeniden deneme.

## ✅ 7. Oturum iptali

`AdminUser.passwordChangedAt` eklendi (migration:
`20260718120000_admin_password_changed_at`). Oturum token'ına gömülür,
`getAdminSession()` DB değeriyle karşılaştırır. Şifre değişince eldeki 30 günlük
"beni hatırla" cookie'leri anında geçersizleşir. İmza doğrulaması middleware'de
DB'ye gitmeden yapılmaya devam eder.

## ✅ 8. Tekrarlanan kod birleştirildi

- `lastSeenAt` güncellemesi 4 yerde farklı throttle'larla tekrarlanıyordu →
  `src/lib/device-activity.ts` içindeki `touchDevice()`.
- `isPublicPath` iki dosyada birebir kopyaydı → tek kaynak.

## ✅ 9. Testler ve CI

- **85 test**, hepsi geçiyor. Kapsam: `parseSurface` (20+ dal), `slugify`,
  kalite ayrıştırma, sipariş doğrulama (negatif/NaN/Infinity miktarlar dahil),
  oturum imzalama/kurcalama/iptal, ambalaj hesapları, izin çözümü, ölçü/yüzey
  marka kuralları.
- Ek bağımlılık yok: Node 22'nin yerleşik test koşucusu + tip sıyırma.
  `@/` takma adı `scripts/test-alias-loader.mjs` ile çözülüyor.
- `.github/workflows/ci.yml`: tsc + eslint + test.
- **Gerçek bir hata bulundu ve düzeltildi:** `admin/kullanicilar/page.tsx`
  içindeki `PermissionCheckboxes` ana component'ın içinde tanımlıydı, her
  render'da yeniden mount oluyordu (checkbox odağı kayboluyordu). Modül
  seviyesine taşındı.

## ✅ 10. PWA ikonları ve offline

- `public/icons/` üretildi (192, 512, maskable-512, apple-touch-icon) — mevcut
  Kulalılar "K" logosundan. `manifest.json`'a `icons` eklendi (daha önce hiç
  yoktu), `layout.tsx`'e ikon metadata'sı eklendi.
- Service worker yeniden yazıldı: uygulama kabuğu (HTML/JS/CSS) artık
  cache'leniyor, gezinmeler network-first, ağ yokken `/offline` sayfası
  gösteriliyor. Önceden yalnızca Cloudinary görselleri cache'leniyordu ve
  **uygulama offline hiç açılmıyordu**.
- `/api/*`, `/admin`, `/sepet` bilinçli olarak **asla** cache'lenmiyor — bayat
  fiyat/stok ile sipariş oluşmasın diye.
- Görsel cache adı sabit tutuldu (`kulalilar-images-v1`); bump etmek sahadaki
  tabletlerin indirdiği tüm görselleri silerdi.

## ✅ 11. Marka görünürlüğü DB'ye taşındı

Kural üç ayrı yerde koda gömülüydü (`catalog.ts` sabitleri, `proxy.ts`
yönlendirmesi, `page.tsx`'te `!text.includes("qua")` duyuru filtresi).
`Brand.isVisible` ve `Brand.visibleToDealers` eklendi (migration:
`20260718130000_brand_visibility`, mevcut davranışı birebir aktarır).
Duyuru filtresi artık gizli marka **adlarından** türetiliyor. Proxy'deki
slug'a gömülü yönlendirme kaldırıldı; kontrol sayfa seviyesinde (middleware'de
DB sorgusu yapmamak için).

## ✅ 12. Dokümantasyon ve config

- `.env.example` yeniden yazıldı: zorunlu/opsiyonel ayrımı, eksik olan
  `SESSION_SECRET`, `SEED_*`, `ALLOWED_DEV_ORIGINS` eklendi.
- README: doğru build komutu, zorunlu değişken tablosu, test bölümü ve
  `turso-migrate.ts`'in **rollback garantisi olmadığı** uyarısı.
- `next.config.ts`'teki sabit `192.168.1.10` kaldırıldı.

---

## Bilinçli olarak ertelenenler

| Konu | Neden | Öneri |
|---|---|---|
| Paylaşılan rate limit | Upstash/Vercel KV gibi dış servis kararı gerekiyor | Serverless'te bellek-içi limit instance başına çalışır; admin login için Upstash Redis önerilir |
| Büyük client component'lar | `admin/import` (1015 satır), `admin/aileler` (770) bölünmeden çözülemez | 22 `react-hooks/set-state-in-effect` uyarısı bu yüzden `warn` seviyesinde; component'lar bölündükçe `error`'a çekilmeli |
| Düz metin şifre desteği | Migration'ın tamamlandığı doğrulanmalı | `scripts/rotate-admin-passwords.ts` çalıştırılıp `verifyPassword`'daki düz metin dalı kaldırılmalı |
| `ADMIN_ACCESS_KEY` URL'de | Mevcut akışı bozar | Tek seferlik olduğu için risk sınırlı; POST formuna çevrilebilir |
| Monitoring (Sentry vb.) | Hesap/servis kararı gerekiyor | Sahadaki tablet hatalarını görmek için önerilir |

---

## Deploy öncesi yapılması gerekenler

1. **`npx prisma generate`** — iki yeni alan eklendi (`passwordChangedAt`,
   `Brand.isVisible` / `visibleToDealers`). Bu çalıştırılmadan tip kontrolü
   ve build geçmez.
2. **Migration'ları uygula** — yerelde `npm run db:migrate`, Turso'da
   `npm run db:migrate:turso`. Önce yedek alın (`AdminUser` tablosu yeniden
   oluşturuluyor).
3. **`SESSION_SECRET` tanımlayın** (`openssl rand -base64 48`). Tanımlanmazsa
   admin girişi 503 döner.
4. **Tüm admin oturumları düşecek** — token biçimi değişti (3 → 4 parça).
   Yöneticiler bir kez yeniden giriş yapacak. Beklenen davranış.
5. `npm test` ve `npx tsc --noEmit` ile doğrulayın.
