# Netsis Stok Senkron Ajanı

Ofisteki (sürekli açık) Windows makinesinde çalışır. Netsis'in bir klasöre
yazdığı **en yeni** stok dosyasını (Excel/CSV) katalog uygulamasının güvenli
ucuna yükler. Ayrıştırma/eşleştirme/kilit mantığı tamamen sunucudadır — bu ajan
yalnızca "en yeni dosyayı gönder" işini yapar.

## Neden bu yöntem?

- Netsis ofis içinde (on-prem); Vercel bulutu ofise doğrudan erişemez → veriyi
  **ofisten dışarı iten** bir ajan en sağlam yol.
- Zamanlamayı **Windows Task Scheduler** yapar → Vercel Hobby cron limiti
  (günde 1) devreye girmez. 2–3 saatte bir çalıştırmak sorunsuz.

## Ön koşullar

1. **Node.js LTS** kurulu olmalı (https://nodejs.org). Doğrula:
   `node --version` (v18+).
2. **Token:** Uygulama (Vercel) ortamında `NETSIS_INGEST_TOKEN` tanımlı olmalı;
   ajan makinesinde de **aynı** değer kullanılır. Üret: `openssl rand -base64 48`
   (veya herhangi uzun rastgele değer).
3. **Netsis export:** Netsis, stok pivotunu/dökümünü izlenen klasöre periyodik
   yazacak şekilde ayarlanmalı. Sütunlar: `Stok Kodu` ve `Bakiye` (tüm depolar
   toplam bakiye). Aynı varyanta birden çok kod atanmışsa sunucu bakiyeleri
   toplar.

## Kurulum

1. Bu `agent/netsis-sync` klasörünü ofis makinesine kopyala (ör.
   `C:\netsis-sync`).
2. `run.bat` içindeki üç değeri doldur:
   - `NETSIS_SYNC_URL` → `https://<katalog-adresin>/api/integrations/netsis/stock`
   - `NETSIS_INGEST_TOKEN` → sunucudakiyle aynı token
   - `NETSIS_WATCH_DIR` → Netsis'in dosyayı yazdığı klasör
3. **İlk test (yazmadan):** `run.bat` içinde `NETSIS_DRY_RUN=1` satırının başındaki
   `REM`'i kaldır, bir kez elle çalıştır (çift tıkla). Çıktıda kaç kodun eşleştiğini
   görürsün. Eşleşmeyen çoksa katalogda **Netsis kod eşleştirme** ekranından kod
   ata. Sonra `NETSIS_DRY_RUN` satırını tekrar `REM`'le.

## Windows Task Scheduler (2–3 saatte bir)

1. **Görev Zamanlayıcı**'yı aç → **Görev Oluştur** (Create Task).
2. **Genel:** ad ver; "Kullanıcı oturum açmasa da çalıştır" seçilebilir.
3. **Tetikleyiciler → Yeni:**
   - Başlat: Bir kez / bugün.
   - "Görevi şu aralıklarla yinele: **3 saat**", süre: **Süresiz**.
4. **Eylemler → Yeni:**
   - Eylem: Program başlat.
   - Program/script: `C:\netsis-sync\run.bat` (tam yol).
5. Kaydet. İstersen **Şimdi Çalıştır** ile test et; "Son Çalışma Sonucu" `0x0`
   ise başarılı.

## İzleme

- Katalog admin panelinde **Netsis senkron geçmişi** ekranı her çalıştırmayı
  gösterir: eşleşen/güncellenen/eşleşmeyen/kilitli-atlanan, hata durumu.
- Ajan çıktısı (başarı/eşleşmeyen kodlar) Task Scheduler geçmişinde ve konsolda
  görünür. Bir log dosyasına yazmak istersen `run.bat` sonunu şöyle değiştir:
  `node "%~dp0sync.mjs" >> "%~dp0sync.log" 2>&1`

## Manuel kilit ile ilişki

Katalogda bir ürünün stoğunu **elle sabitlersen** o varyant "kilitli" olur ve bu
ajan onu **ezmez** (manuel değer korunur). Kilidi kaldırmak için Stok Yönetimi
ekranından "Kilidi kaldır" de; sonraki senkron o ürünü tekrar günceller.
