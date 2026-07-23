# Kulalılar Katalog — Genel Durum ve Eksik Analizi

Tarih: 2026-07-23

Bu belge, projenin şu anki halinde **eksik veya güçlendirilebilir** alanları
kapsamlı biçimde ele alır. Önce kısa bir "sağlam temel" özeti, sonra kategori
kategori boşluklar ve sonda önceliklendirme var.

---

## 0. Sağlam olan taraf (temel)

Kod kalitesi iyi bir noktada: TypeScript strict geçiyor, marka bazlı yetki
kapsamı tutarlı, `console.log`/`any` yok, hata sayfaları var, CI (tsc + eslint +
test) kurulu, 107 birim testi geçiyor. Bu oturumda sipariş API'si sertleştirildi,
oturum imzası/iptali, cihaz cookie sertleştirmesi, PWA offline, marka
görünürlüğü DB'ye taşındı, Netsis stok kodları, stok yönetimi, satış aç/kapat,
benzer ürünler, renk/tip filtreleri ve tıklanma raporları eklendi. Aşağıdakiler
bu sağlam temelin **üstündeki** boşluklardır.

---

## 1. İzlenebilirlik ve hata takibi (en önemli operasyonel boşluk)

Şu an hata takibi yok. Hatalar yalnızca `console.error` → Vercel logları.
Sahadaki bir tablette bir şey bozulduğunda **haberin olmuyor**; birinin sana
söylemesi gerekiyor.

- **Sentry (veya benzeri)** eklenmeli: hem sunucu (API/SSR) hem istemci
  (tablet) hataları merkezi toplansın, uyarı gelsin.
- Kritik akışlarda (sipariş oluşturma, stok import, sync) yapılandırılmış log +
  başarı/başarısızlık metriği faydalı olur.
- Şu an "kaç tablet aktif, kaç sync başarısız, kaç sipariş düştü" gibi bir
  operasyon panosu yok.

## 2. Rate limit hâlâ bellekte (production'da zayıf)

`rate-limit.ts` bir `Map` kullanıyor. Vercel serverless'te her instance kendi
Map'ini tutar ve instance'lar sürekli yeniden doğar; bu yüzden admin login
brute-force koruması pratikte çalışmıyor. **Upstash Redis / Vercel KV** ile
paylaşılan sayaca geçilmeli. Aynı şekilde `clientIp` `x-forwarded-for`'a
güveniyor — güvenilir proxy arkasında değilse taklit edilebilir.

## 3. Girdi doğrulama standardı yok

Sipariş API'sinde elle validasyon var ama çoğu admin endpoint'i gelen JSON'u
şekil doğrulaması yapmadan kabul ediyor. **zod** (veya benzeri) ile tüm API
girdilerini şema doğrulamasından geçirmek, sessiz veri bozulmalarını ve 500'leri
azaltır. Şu an her endpoint kendi elle ayrıştırmasını yazıyor (tekrar + risk).

## 4. Admin denetim izi (audit log) eksik

Siparişlerde `OrderAdminLog` var ama **fiyat, stok, ürün, renk/tip, marka
görünürlüğü, Netsis kodu** değişikliklerinin kim tarafından ne zaman yapıldığı
tutulmuyor. Birden çok admin varken (Gökhan, Mustafa…) "bu fiyatı kim değiştirdi"
sorusunun cevabı yok. Genel bir `AdminAuditLog` tablosu + kritik mutasyonlara
kayıt hesap verebilirliği ciddi artırır.

## 5. Sipariş akışının olgunlaşmamış yanları

Sipariş + admin onay akışı var, ama:

- **Bildirim yok:** sipariş oluşunca bayiye/plasiyere veya admine e-posta/SMS/
  push gitmiyor. Admin panelde manuel bakılıyor.
- **Sipariş çıktısı yok:** PDF/yazdırma yok; bayiye verilecek bir belge üretmiyor.
- **Stok düşümü yok:** sipariş onaylanınca stok rezerve edilmiyor/düşmüyor;
  stok yalnızca Netsis'ten geliyor. Aynı ürün iki bayiye "stokta var" diye
  satılabilir.
- **Bayi tarafında sipariş geçmişi/durumu yok:** bayi kendi cihazında geçmiş
  siparişini veya onay durumunu göremiyor.

## 6. Netsis otomasyonu (senin de belirttiğin yön)

Şu an stok CSV/Excel ile **elle** import ediliyor + manuel sabitleme var. Senin
hedefin "Netsis'ten otomatik çekilen pivot ile sürekli güncelleme" idi — bu
henüz yok. Buna giden yolda gerekenler: bir cron/webhook, Netsis erişimi
(dosya/servis), ve import'un idempotent + hatada güvenli çalışması. Mevcut
manuel yol iyi bir temel; otomatik besleme üstüne kurulabilir.

Ayrıca stok import'unda **ön izleme (dry-run)** yok — ne değişeceğini uygulamadan
göstermiyor (yedek alınıyor ama "şu 12 ürün 0 olacak" gibi bir onay ekranı yok).

## 7. Test kapsamı dar

7 test dosyası var, hepsi **saf mantık** (parse, hesap, izin, oturum). Kritik
uçtan uca akışlar test edilmiyor:

- Sipariş oluşturma (cihaz doğrulama + sunucu fiyatı + validasyon) — entegrasyon
  testi yok.
- Stok import eşleştirme (Netsis kod → varyant, bakiye yazımı).
- Sync payload + `showStock`/`salesEnabled` görünürlük kuralları.
- Benzer ürün simetrisi, renk/tip filtreleri.

Prisma'yı SQLite bellek-içi DB ile kullanan **entegrasyon testleri** ve kritik
bileşenler için birkaç **component testi** (Playwright/Vitest+RTL) güven ağını
büyütür. Şu an bir regresyon sessizce prod'a gidebilir.

## 8. Deploy'da migration otomatik değil (tekrarlayan risk)

Bu oturumda birkaç kez yaşandı: kodu push edince yeni tablo/kolon Turso'da
olmadan çöktü, sonra elle `db:migrate:turso` çalıştırdın. Vercel **Build
Command**'i `npm run build` yapılırsa (`prisma generate && tsx turso-migrate &&
next build`) migration her deploy'da otomatik uygulanır ve bu sınıf çökme biter.
`turso-migrate.ts` ayrıca **transaction/rollback vermiyor**; yarıda kalan bir
migration DB'yi tutarsız bırakabilir — en azından deploy öncesi yedek şart.

## 9. Büyük client bileşenleri (teknik borç)

En büyükler: `admin/import` (1027 satır), `admin/aileler` (770),
`ProductDetailView` (680), `OrderAdminDetail` (607), `admin/gorseller` (522).
Hepsi state yoğun, tek dosya. Test edilemez, değiştirmesi riskli. Parse/işlem
mantığını `lib/`'e, formları alt bileşenlere ayırmak gerekiyor. İlişkili olarak
~20 adet `react-hooks/set-state-in-effect` uyarısı `warn`'a çekildi — bunlar
bileşenler bölündükçe `error`'a geri alınmalı.

## 10. Görsel yönetimi — tek görsel sınırı

Bir aile/varyant için tek görsel var. **Ürün galerisi** (birden çok açı/uygulama
fotoğrafı) yok. Bayiye ürünü göstermede çoklu görsel değer katar. Ayrıca
görsellerin aile içinde sıralanması/öne çıkarılması yok.

## 11. Offline sipariş ve sync dayanıklılığı

PWA app-shell + görsel cache + `/offline` eklendi. Ama:

- **Çevrimdışı sipariş kuyruğu yok:** ağ yokken sipariş gönderilemez (üstelik
  artık cihaz doğrulaması + satış aç/kapat sunucuda). Depoda internet yoksa
  bayi sipariş veremez. Çevrimdışı kuyruk + ağ gelince gönderim düşünülebilir.
- Sync bayat cache/versiyon uyumsuzluğu bir kez sorun çıkardı (sürüm bump ile
  çözüldü). Sürümleme/şema değişiminde otomatik cache temizleme kalıcı bir
  mekanizmaya bağlanmalı.

## 12. Erişilebilirlik (a11y)

Yeni modallar (benzer ürünler, renk/tip, rapor) **focus trap / Escape ile
kapatma / focus geri verme** içermiyor. Klavye navigasyonu ve ekran okuyucu
desteği sınırlı. Dahili tablet uygulaması için düşük öncelik ama tabletlerde
erişilebilirlik ayarları kullanılıyorsa önemli olur.

## 13. Güvenlikte kalan küçük maddeler

- **`ADMIN_ACCESS_KEY` URL query'sinde** taşınıyor (`?key=...`) — log/geçmiş/
  Referer'a sızabilir. Tek seferlik ama POST forma çevrilebilir.
- **Düz metin şifre desteği** hâlâ açık (geçiş dönemi). Migration tamamlandıysa
  `verifyPassword`'daki düz metin dalı kaldırılmalı.
- **Aktif oturumları görme/sonlandırma** arayüzü yok (şifre değişimiyle toplu
  iptal var, ama "şu cihazdaki oturumu at" yok).
- **CSRF:** durum değiştiren POST'lar same-site lax cookie'ye güveniyor; kritik
  admin işlemleri için açık CSRF token değerlendirilebilir (bu app için düşük
  risk).

## 14. Ölçek/performans notları (şimdilik sorun değil)

- `getGlobalSearchCatalog` tüm aile+varyantı sunucuda indeksler (cache'li).
  Katalog çok büyürse maliyet artar; sayfalama/индeks stratejisi gerekebilir.
- Tıklanma raporu 50k event'i belleğe çekip JS'te toplarlar; büyük veri için
  SQL tarafında (raw `GROUP BY`, tarih fonksiyonları) toplama daha ölçekli.
- Sync payload tüm aktif kataloğu gönderiyor (delta var). Çok büyük katalogda
  ilk tam sync ağırlaşır.

## 15. Yedekleme & kurtarma

Günlük cron ile Cloudinary'e yedek alınıyor (iyi). Ama **kurtarma prosedürü
denenmiş mi**, yedek saklama süresi/rotasyonu ve "gerçekten geri yükleyebiliyor
muyuz" testi belirsiz. Felaket tatbikatı (restore denemesi) bir kez yapılmalı.

---

## Önceliklendirme

**Yüksek (operasyonel/güven):**
1. Deploy'da migration'ı otomatikleştir (Vercel Build Command → `npm run build`).
2. Hata takibi (Sentry) — sahadaki tablet hatalarını görmek için.
3. Paylaşılan rate limit (Upstash/Vercel KV) — admin login koruması.
4. Admin audit log — fiyat/stok/ürün değişikliklerinde hesap verebilirlik.

**Orta (ürün olgunluğu):**
5. Sipariş bildirimi (e-posta/SMS/push) + sipariş PDF/çıktısı.
6. Netsis otomatik besleme (cron/servis) + import dry-run önizleme.
7. Stok–sipariş ilişkisi (rezervasyon/düşüm) kararı.
8. Entegrasyon testleri (sipariş, stok import, sync) + zod ile girdi doğrulama.

**Düşük (iyileştirme/borç):**
9. Büyük client bileşenlerini böl; set-state uyarılarını kapat.
10. Ürün galerisi (çoklu görsel).
11. Çevrimdışı sipariş kuyruğu.
12. Modal a11y (focus trap/Escape), düz metin şifre dalını kaldır, ADMIN_ACCESS_KEY'i POST'a taşı.
13. Yedek geri-yükleme tatbikatı.
