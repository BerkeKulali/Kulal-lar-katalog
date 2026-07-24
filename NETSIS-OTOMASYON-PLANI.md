# Netsis Stok Otomasyonu — Yapılacaklar ve Karar Planı

Tarih: 2026-07-24

Amaç: Netsis'teki stok bakiyelerinin katalogdaki ürünlere **otomatik ve sürekli**
yansıması (şu an manuel CSV/Excel import var).

---

## 0. Zaten hazır olan (temel)

Otomasyonun oturacağı altyapının çoğu mevcut:

- **Eşleşme anahtarı:** `VariantNetsisCode` — her varyanta bir/birden çok Netsis
  stok kodu atanabiliyor (admin ekranı: Netsis kod eşleştirme).
- **Bakiye ayrıştırma:** Türkçe binlik biçimi (`1.241` = 1241), negatif stok,
  virgül ondalık — düzeltilmiş ve testli (`parseStockQuantity`).
- **Gruplama:** kod → varyant, çok-kodlu toplama, eşleşmeyen raporu — saf ve
  testli (`groupBalancesByVariant`).
- **Yazım mantığı:** eşleşen varyantın stoğunu yeniden yazma, bakiye 0'ı da
  yazma (`/api/admin/stock/import`).
- **Yedek:** import öncesi otomatik yedek deseni.
- **Denetim izi:** stok değişiklikleri `AdminAuditLog`'a yazılıyor.

Yani otomasyon = **bu mantığı, admin dosya yüklemesi yerine otomatik bir
kaynaktan beslemek.**

---

## ✅ KESİNLEŞEN MİMARİ (2026-07-24)

Kullanıcı yanıtları:
- **Kaynak:** Yalnızca **pivot/Excel export** (Netsis API/SQL yok).
- **Ofis makinesi:** Sürekli açık bir bilgisayar/sunucu **var**.
- **Sıklık:** **Günde birkaç kez.**

→ Seçilen yol: **Seçenek A — on-prem ajan, en ince haliyle.**

### Akış
1. Netsis, stok pivotunu ofisteki bir **klasöre** yazar (periyodik export ayarı
   veya operatörün elle export'u — her ikisi de olur).
2. Ofisteki makinede küçük bir **ajan** (Node.js script), **Windows Task
   Scheduler** ile günde birkaç kez (ör. 09:00 / 13:00 / 17:00) çalışır:
   klasördeki **en yeni** Excel'i alır → uygulamanın ingest ucuna **Bearer
   token** ile **multipart** olarak yükler (ham dosyayı; parse etmez).
3. Uygulama, **mevcut import pipeline'ını** (`parseNetsisBalanceRows` +
   `groupBalancesByVariant` + yazım) yeniden kullanır, `NetsisSyncLog` yazar,
   eşleşmeyen kodları raporlar.

> Ajan bilerek "aptal": sadece "en yeni dosyayı uca gönder". Tüm ayrıştırma/
> eşleştirme sunucuda, zaten testli koddadır. Böylece Netsis biçimi değişirse
> ofiste değil, tek yerde (sunucuda) güncelleriz.

### Bu mimaride yapılacaklar (net sıra)
1. [ ] **Ingest ucu:** `POST /api/integrations/netsis/stock` — `Authorization:
   Bearer <NETSIS_INGEST_TOKEN>`, multipart Excel kabul eder. İç mantık mevcut
   `/api/admin/stock/import` ile paylaşılır (ortak bir servis fonksiyonuna çıkar).
2. [ ] **Ortak servis:** import route'unun gövdesini `applyNetsisStock(buffer,
   { brandId, dryRun, respectLock })` gibi bir fonksiyona çıkar; hem admin route
   hem ingest ucu çağırsın. Yazımları **toplu (batch)** yap (Hobby ~10 sn süre
   sınırı için). `stockLocked = true` varyantları atla.
2b. [ ] **Manuel kilit:** `ProductVariant.stockLocked` (+ `stockLockedAt`) alanı
   + migration; manuel düzeltme onu `true` yapsın; admin UI'da kilit rozeti +
   "kilidi kaldır".
3. [ ] **`NetsisSyncLog` modeli + migration:** zaman, kaynak ("agent"/"manual"),
   eşleşen, eşleşmeyen sayısı, güncellenen varyant, hata özeti, dosya adı.
4. [ ] **Admin ekranı:** senkron geçmişi + son eşleşmeyen kodlar (mevcut stok
   ekranına sekme).
5. [ ] **Dry-run:** `?dryRun=1` → uygulamadan ne değişeceğini döndür (ilk kurulum
   güveni için).
6. [ ] **Uyarı:** senkron başarısız olursa veya eşleşmeyen sayısı eşiği aşarsa
   Sentry'ye kaydet (e-posta opsiyonel).
7. [ ] **Ajan scripti** (`agent/netsis-sync/`): klasördeki en yeni dosyayı uca
   POST eden ~40 satırlık Node scripti + `README` + **Windows Task Scheduler**
   kurulum yönergesi (günde birkaç kez).
8. [ ] **`.env`:** `NETSIS_INGEST_TOKEN` (uzun rastgele değer) — hem Vercel hem
   ajan makinesinde.
9. [ ] **Ön koşul:** Netsis kod eşleştirme kapsamını yükselt (bir manuel import
   ile "eşleşmeyen kod" ~0'a indir).

### Kesinleşen küçük kararlar (2026-07-24)
- **Depo:** Tüm depolar geçerli → toplam bakiye kullanılır. Mevcut gruplama zaten
  aynı varyantın tüm kodlarını topluyor; ek iş yok.
- **Manuel sabitlenen stoklar KORUNUR.** → Varyanta **manuel kilit** eklenecek:
  - `ProductVariant.stockLocked Boolean @default(false)` (+ `stockLockedAt`).
  - Manuel stok düzeltme (`/api/admin/stock/manual`) yapıldığında `stockLocked =
    true`.
  - Otomasyon (`applyNetsisStock`) `stockLocked = true` olan varyantları **atlar**
    ve "kilitli/atlandı" olarak raporlar.
  - Admin UI: kilit rozeti + "kilidi kaldır" butonu (kaldırılınca sonraki senkron
    günceller).

### Vercel Hobby notu
- **Güncelleme sıklığı (2-3 saatte bir) sorun değil:** zamanlamayı ofis ajanı
  yapıyor, Vercel cron değil → Hobby cron limiti devreye girmez. Günde ~8-12 POST
  önemsiz.
- **Tek dikkat: fonksiyon süresi (~10 sn).** Çok varyantta her varyanta ayrı
  transaction yavaş kalabilir. Çözüm: yazımları **toplu (batch)** yap
  (`applyNetsisStock` içinde). Bu, yapılacaklar #2'ye dahildir.

---

## 1. MERKEZÎ KARAR: Veri Netsis'ten nasıl çıkacak ve buluta nasıl ulaşacak?

Bu kararın tamamı buna bağlı. Netsis büyük olasılıkla **ofis içi (on-prem)** bir
MSSQL üzerinde; uygulama ise **Vercel bulutunda**. Bulut, ofisteki Netsis'e
doğrudan erişemez. Üç mimari var:

### Seçenek A — On-prem senkron ajanı (PUSH) ✅ önerilen

Ofisteki bir bilgisayarda/sunucuda küçük bir program (Windows Task Scheduler ile
ör. her 30–60 dk) çalışır:
1. Netsis'ten güncel stoğu okur (aşağıdaki 3 yoldan biriyle).
2. JSON olarak uygulamanın **kimlik doğrulamalı ingest ucuna** POST eder.
3. Hata/başarı loglar, gerekirse yeniden dener.

**Artıları:** Ofis ağına dışarıdan erişim gerekmez (güvenli), sağlam, zamanlamayı
sen kontrol edersin, **Vercel cron limitinden etkilenmez** (Hobby'de cron günde
1). **Eksileri:** Ofiste sürekli açık bir makine + küçük bir kurulum gerekir.

### Seçenek B — Bulut cron + erişilebilir dosya (PULL)

Netsis, pivot/Excel'i internetten erişilebilir bir yere (SFTP, Google Drive,
Dropbox, S3 veya bir e-posta kutusu) periyodik yazar; uygulama zamanlanmış bir
görevle çeker ve içe aktarır.

**Artıları:** Ofiste ekstra bir şey çalıştırmaya gerek yok (Netsis'in kendi
export'u yeterli). **Eksileri:** Netsis'in dosyayı erişilebilir bir yere
bırakması gerekir; **Vercel Hobby cron günde 1 kez** (sık güncelleme için Pro
veya harici bir zamanlayıcı gerekir); dosya biçimi kırılganlığı.

### Seçenek C — Buluttan doğrudan Netsis'e (VPN/tünel)

Bulut fonksiyonların ofis SQL'ine VPN/tünelle bağlanması. Genelde güvenlik ve
karmaşıklık nedeniyle **kaçınılır**. Önerilmez.

> **Öneri:** Seçenek A (on-prem ajan). En sağlam ve Hobby planıyla uyumlu.

---

## 2. Netsis tarafı — veriyi okuma yolu (A veya B'de ajan/kaynak ne kullanacak)

Netsis'in sunduğuna göre üçünden biri:

1. **Netsis REST/SOAP API** varsa: en temiz. API kimlik bilgileri + stok/bakiye
   uç dokümanı gerekir.
2. **MSSQL'e read-only erişim:** Netsis stok tablolarından (ör. stok sabit +
   bakiye) doğrudan `SELECT`. Netsis şemasını bilmek + salt-okunur bir DB
   kullanıcısı gerekir.
3. **Pivot/Excel export:** Netsis'i pivotu bir klasöre/FTP'ye periyodik yazacak
   şekilde ayarlamak; ajan/uygulama o dosyayı okur. (Senin ilk tarif ettiğin
   yöntem buydu.)

Ajan bu ayrıntıyı soyutlar — küçük bir program (Node.js / Python / PowerShell).

---

## 3. Bizim taraf — yapılacaklar (yöntemden bağımsız ortak bileşenler)

1. **Kimlik doğrulamalı ingest ucu** — `POST /api/integrations/netsis/stock`.
   - Admin oturumu DEĞİL, ayrı bir **servis token'ı** (`NETSIS_INGEST_TOKEN`,
     Bearer) ile korunur. Rate limit + opsiyonel IP allowlist.
   - Gövde: JSON `[{ stokKodu, bakiye }, ...]` (veya dosya). Mevcut eşleştirme
     mantığını (`parseStockQuantity` + `groupBalancesByVariant`) yeniden kullanır.
2. **Idempotency & güvenlik:** Tekrar çalıştırılabilir olmalı (zaten stok
   satırını yeniden yazıyor). Değişmeyen veri için checksum ile "atla" opsiyonu.
3. **Dry-run / önizleme:** `?dryRun=1` uygulamadan neyin değişeceğini döner (ilk
   kurulumlar ve güven için). (DURUM-ANALIZI'ndeki "import önizleme" maddesiyle
   aynı iş.)
4. **Senkron logu + izleme:** `NetsisSyncLog` (zaman, kaynak, eşleşen,
   eşleşmeyen, güncellenen, hata). Admin ekranı: senkron geçmişi + son eşleşmeyen
   kodlar. Senkron başarısız olursa veya eşleşmeyen sayısı fırlarsa
   **Sentry/e-posta uyarısı**.
5. **Manuel ile çakışma kararı:** Otomasyon stok satırını yeniden yazdığı için
   manuel sabitlemeyi ezer. Karar: belirli varyantlarda "manuel kilit" bayrağı
   olsun mu (otomasyon onları atlasın)? (Opsiyonel.)
6. **Ön koşul — eşleşme kapsamı:** Otomatik stok yalnızca **Netsis kodu atanmış**
   varyantları günceller. Bu yüzden önce eşleştirme kapsamının yüksek olması
   gerek (admin ekranı hazır; "eşleşmeyen kod" raporuyla boşluklar kapatılır).
7. **Zamanlama (yöntem B ise):** Vercel cron — ama **Hobby'de günde 1**. Sık
   güncelleme isteniyorsa on-prem ajan (A) bu limiti aşar (kendi zamanlayıcısı).

---

## 4. Operasyon / aşamalı geçiş (rollout)

1. **Eşleştirmeyi tamamla:** Netsis kod eşleştirme ekranından mümkün olduğunca
   çok varyanta kod ata; bir manuel import ile "eşleşmeyen kod" sayısını sıfıra
   yaklaştır.
2. **Dry-run:** Otomasyon ucunu dry-run modda çalıştır; ne değişeceğini doğrula.
3. **Düşük sıklıkla aç:** Önce günde birkaç kez, yedekle, izle.
4. **Sıklığı artır:** Güven oluşunca 30–60 dk'ya çek (ajan yöntemiyle).

---

## 5. Senin cevaplaman gereken açık sorular (bunlar mimariyi belirler)

1. **Netsis verisini nasıl veriyor?** (a) REST/SOAP API var mı? (b) MSSQL'e
   read-only erişim mümkün mü? (c) Yalnızca pivot/Excel export mı?
2. **Netsis nerede çalışıyor?** Ofis içi (on-prem) mi, bir sunucu/bulutta mı?
3. **Ofiste sürekli açık bir bilgisayar/sunucu var mı?** (ajan çalıştırmak için)
4. **Stok kaç depoda tutuluyor?** Hepsi toplansın mı, belirli bir depo mu?
5. **Ne sıklıkta güncelleme istiyorsun?** (saatlik / 15 dk / günde birkaç kez)
6. **Manuel sabitlenen stoklar** otomasyon tarafından ezilsin mi, korunsun mu?

---

## 6. Özet — yapılacaklar listesi (mimari seçilince netleşir)

**Kesin (hangi yöntemi seçersek seçelim):**
- [ ] `POST /api/integrations/netsis/stock` kimlik-doğrulamalı ingest ucu
      (servis token + rate limit).
- [ ] Ortak eşleştirme/yazım mantığını bu uca bağla (mevcut saf fonksiyonlar).
- [ ] Dry-run / önizleme modu.
- [ ] `NetsisSyncLog` modeli + migration + admin görüntüleme ekranı.
- [ ] Başarısızlık/anomali uyarısı (Sentry/e-posta).
- [ ] `.env` + README: `NETSIS_INGEST_TOKEN` ve kurulum notları.

**Seçenek A (on-prem ajan) seçilirse ek:**
- [ ] Küçük ajan programı (Netsis'ten oku → uca POST), Windows Task Scheduler
      kurulum yönergesi.
- [ ] Ajanın Netsis okuma yolu (API / SQL / pivot dosyası) — soru 1'e göre.

**Seçenek B (bulut pull) seçilirse ek:**
- [ ] Dosya kaynağı bağlayıcısı (SFTP/Drive/S3/e-posta) + çekme.
- [ ] Zamanlayıcı (Hobby cron günde 1 → sık istenirse Pro veya harici tetik).

**Ön koşul:**
- [ ] Netsis kod eşleştirme kapsamını yükselt (eşleşmeyen kod ~0).

---

Bir sonraki adım: **Bölüm 5'teki soruları** yanıtla (özellikle 1, 2, 3).
Cevaplara göre mimariyi (A/B) kesinleştirip net bir uygulama sırası çıkarırım.
