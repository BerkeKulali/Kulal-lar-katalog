# Netsis Stok Senkron Ajanı

Ofisteki (sürekli açık) Windows makinesinde çalışır. Excel dosyasını yeniler
(Netsis'ten canlı veri çeker), sonra o dosyayı katalog uygulamasının güvenli
ucuna yükler. Ayrıştırma/eşleştirme/kilit mantığı tamamen sunucudadır — bu
ajan yalnızca "Excel'i yenile, en yeni dosyayı gönder" işini yapar.

`run.bat` içindeki adres ve token **zaten dolduruldu**
(`kulalilar-katalog.vercel.app` ve Vercel'e eklediğiniz token), `refresh-excel.vbs`
içindeki Excel dosya yolu da **zaten dolduruldu**
(`C:\Users\berke.kulali\Desktop\KATALOG STOK\STOK SABİT BAKİYE.xlsx`).

## Durum: çalışıyor ✅

İlk uçtan uca test başarılı oldu: Excel açıldı, Netsis verisi çekildi
(~5 dakika sürdü — bu normal, canlı veri çekimi zaman alabiliyor), dosya
kaydedildi, sunucuya gönderildi ve stoklar güncellendi. Netsis kod eşleştirmesi
henüz tüm ürünlerde tamamlanmadığı için bazı kodlar "eşleşmeyen" olarak
görünecek — bu beklenen bir durum, **Netsis kod eşleştirme** ekranından yeni
kod eklendikçe eşleşme oranı kendiliğinden artacak (aşağıdaki "Sonradan
eklenen Netsis kodları" bölümüne bakın).

## Nasıl çalışıyor

`run.bat` iki adımı sırayla yapar:

1. `refresh-excel.vbs` — Excel'i görünmez şekilde açar (bu, dosyanın Netsis'ten
   veri çekmesini tetikler), verinin gelmesini bekler, dosyayı kaydedip kapatır.
2. `sync.mjs` — o taze kaydedilmiş dosyayı sunucuya gönderir.

İnsan hiç dokunmadan, Windows Task Scheduler ile otomatik çalışacak şekilde
kurulabilir (aşağıda).

## Ön koşullar

1. **Node.js LTS** kurulu olmalı (https://nodejs.org). Doğrula:
   `node --version` (v18+).
2. **Microsoft Excel**, bu ajanın çalışacağı bilgisayarda kurulu olmalı
   (`refresh-excel.vbs` Excel'i COM ile açıyor) ve Excel dosyasının bulunduğu
   klasör Excel'in **Güvenilen Konumlar**'ına eklenmiş olmalı (Dosya →
   Seçenekler → Güven Merkezi → Güven Merkezi Ayarları → Güvenilen Konumlar →
   Yeni Konum Ekle) — aksi halde Excel, programla açıldığında "Dış Veri
   Bağlantıları devre dışı bırakıldı" güvenlik uyarısını gösterip donmuş gibi
   bekler. **Bu adım zaten sizin makinenizde yapıldı ve sorunu çözdü.**

## İlk kurulum (bir kereye mahsus, tamamlandı)

1. `agent\netsis-sync` klasörü `C:\Users\berke.kulali\Desktop\KATALOG STOK\netsis-sync`
   içine kopyalandı.
2. `run.bat` içindeki `NETSIS_WATCH_DIR`, Excel dosyasının bulunduğu klasörle
   dolduruldu (Excel'in kendisi "en yeni dosya" olacak, çünkü her yenilemede
   üzerine kaydediliyor).
3. `refresh-excel.vbs` içindeki `excelPath` dolduruldu.
4. İlk gerçek çalıştırma test edildi ve başarılı oldu.

## Windows Task Scheduler (2–3 saatte bir) — sıradaki adım

1. **Görev Zamanlayıcı**'yı aç → **Görev Oluştur** (Create Task).
2. **Genel:** ad ver; "Kullanıcı oturum açmasa da çalıştır" seçilebilir.
3. **Tetikleyiciler → Yeni:**
   - Başlat: Bir kez / bugün.
   - "Görevi şu aralıklarla yinele: **3 saat**", süre: **Süresiz**.
4. **Eylemler → Yeni:**
   - Eylem: Program başlat.
   - Program/script: `C:\Users\berke.kulali\Desktop\KATALOG STOK\netsis-sync\run.bat`
5. Kaydet. İstersen **Şimdi Çalıştır** ile test et; "Son Çalışma Sonucu" `0x0`
   ise başarılı.

## İzleme

- Katalog admin panelinde **Netsis senkron geçmişi** ekranı her çalıştırmayı
  gösterir: eşleşen/güncellenen/eşleşmeyen/kilitli-atlanan, hata durumu.
- Ajan çıktısı (başarı/eşleşmeyen kodlar, Excel yenileme durumu) Task Scheduler
  geçmişinde ve konsolda görünür. Bir log dosyasına yazmak istersen `run.bat`
  sonundaki `node "%~dp0sync.mjs"` satırını şöyle değiştir:
  `node "%~dp0sync.mjs" >> "%~dp0sync.log" 2>&1`

## Manuel kilit ile ilişki

Katalogda bir ürünün stoğunu **elle sabitlersen** o varyant "kilitli" olur ve bu
ajan onu **ezmez** (manuel değer korunur). Kilidi kaldırmak için Stok Yönetimi
ekranından "Kilidi kaldır" de; sonraki senkron o ürünü tekrar günceller.

## Sonradan eklenen Netsis kodları

Excel her seferinde tüm kodları içerir; eşleştirme tamamen sunucuda ve her
çalıştırmada canlı yapılır (önbelleğe alınmaz). Yani **Netsis kod eşleştirme**
ekranından bir varyanta yeni kod atadığında, ekstra bir işlem yapmana gerek
kalmadan bir sonraki senkronda (en geç birkaç saat içinde) o kod otomatik
eşleşip stok yazılmaya başlar.
