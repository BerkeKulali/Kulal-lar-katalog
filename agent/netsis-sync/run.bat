@echo off
REM ============================================================
REM  Netsis stok senkron ajani - Windows Task Scheduler ile calisir.
REM  Bu dosyayi kendi degerlerinle doldur; token'i GIZLI tut.
REM ============================================================

REM --- Zorunlu ayarlar ---
set "NETSIS_SYNC_URL=https://KATALOG-ADRESIN/api/integrations/netsis/stock"
set "NETSIS_INGEST_TOKEN=BURAYA_SUNUCUDAKI_ILE_AYNI_TOKEN"
set "NETSIS_WATCH_DIR=C:\Netsis\StokExport"

REM --- Opsiyonel ayarlar ---
REM set "NETSIS_FILE_EXT=xlsx,xls,csv"
REM set "NETSIS_MAX_AGE_MIN=240"     REM en yeni dosya 4 saatten eskiyse gonderme
REM set "NETSIS_DRY_RUN=1"           REM ilk testte yazmadan dene

REM node kurulu olmali (https://nodejs.org LTS). "node --version" ile dogrula.
REM Node'u PATH yerine bilinen kurulum konumlarindan doğrudan buluyoruz -
REM boylece Node kurulduktan sonra sunucu/oturum yeniden baslatilmasa
REM bile (Task Scheduler'in eski PATH onbellegi kullanmasi riski olmadan)
REM calisir.
set "NODE_EXE=node"
if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles(x86)%\nodejs\node.exe"

REM --- KILIT DOSYASI (28.09.2026 eklendi) ---
REM refresh-excel.log incelemesinde su goruldu: cok yakin araliklarla
REM (bazen ~20-30 saniyede bir) birden fazla run.bat calistirmasi UST USTE
REM binmis - ornegin biri elle test ederken ayni anda zamanlanmis gorev de
REM ateslenmis, ya da iki calistirma birbirini kovalamis. Sonuc: bir
REM calistirmanin save-and-close-excel.vbs'i, BASKA bir calistirmanin
REM henuz kaydetmedigi/kapatmadigi Excel'i araya girip kapatiyor - bu da
REM "Nesne gerekli" (workbook COM referansi calisirken gecersiz oldu) ve
REM "Calisan bir Excel ornegi bulunamadi" (Excel baska bir calistirma
REM tarafindan zaten kapatilmis) hatalarina yol aciyordu. Cozum: ayni anda
REM sadece TEK bir run.bat calissin - digerleri, onceki bitene kadar
REM (veya kilit dosyasi 10 dakikadan eskiyse - onceki calistirma cokmus/
REM takilmis demektir - kilidi gormezden gelip devam ederek) beklemeden
REM sessizce atlanir.
set "LOCKFILE=%~dp0run.lock"
set "STALE_MINUTES=10"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$f = $env:LOCKFILE; if (Test-Path -LiteralPath $f) { $age = (Get-Date) - (Get-Item -LiteralPath $f).LastWriteTime; if ($age.TotalMinutes -lt [double]$env:STALE_MINUTES) { exit 1 } } ; exit 0"
if errorlevel 1 (
  echo [run.bat] Onceki calistirma hala suruyor gibi gorunuyor ^(kilit dosyasi taze^) - bu calistirma atlaniyor.
  exit /b 0
)

echo %date% %time% > "%LOCKFILE%"

REM --- Adim 1: Excel'i CIFT TIKLAMA GIBI ac, dogal yenilemesini bekle, kaydedip kapat ---
REM ONEMLI DEGISIKLIK (26.09.2026): Daha once Excel, CreateObject(
REM "Excel.Application") ile COM otomasyonuyla aciliyordu (refresh-excel.vbs).
REM Bu sekilde acildiginda dis veri baglantisi (TM_STSABIT/TM_STSABIT5)
REM GUVENILIR YENILENMIYORDU - RefreshAll, CalculateUntilAsyncQueriesDone,
REM Visible=True/False, hicbiri fark etmedi; Netsis'te gercekten degisen
REM bir bakiye bile script'in kaydettigi dosyaya yansimiyordu. Oysa AYNI
REM dosya elle (cift tiklanarak) acildiginda yenileme HER ZAMAN calisiyor.
REM Cozum: artik Excel'i COM ile degil, GERCEKTEN cift tiklanmis gibi
REM Windows dosya iliskilendirmesi uzerinden aciyoruz (launch-excel.vbs),
REM dogal yenilemenin tamamlanmasini bekliyoruz, sonra AYRI bir script
REM (save-and-close-excel.vbs) sadece KAYDET+KAPAT icin COM ile o CALISAN
REM Excel'e BAGLANIYOR (yeni ornek ACMIYOR, yenilemeyi TETIKLEMIYOR).
REM
REM Not: "cscript" (launch/save-close script'leri icin) ACIKCA kullaniliyor,
REM "wscript" DEGIL - .vbs dosyalarina cift tiklandiginda Windows'un
REM varsayilani wscript.exe'dir ve o modda script icindeki her log satiri
REM "Tamam" bekleyen bir ACILIR PENCERE olarak cikip TUM senkronu SONSUZA
REM DEK durdurur - gunlerce ayni (donmus) verinin gonderilmesinin asil
REM sebebi buydu. cscript.exe altinda log, ekrana hicbir pencere
REM cikarmadan refresh-excel.log dosyasina yazilir.
REM ON-TEMIZLIK (26.09.2026): Dosya onceki calistirmadan (ornegin script
REM ortasinda kesintiye ugradiysa) ya da elle acilip kapatilmadan takili
REM kaldiysa, Excel yeniden acmaya calisildiginda "zaten acik, yeniden
REM acilsin mi?" diye SORAN, kimse tiklamazsa SONSUZA DEK bekleyen bir
REM ACILIR PENCERE cikarir - tipki eski WScript.Echo sorunu gibi yeni bir
REM donma riski. Bu yuzden acmadan ONCE, dosya (eski/takili bir oturumdan)
REM zaten aciksa once TEMIZ sekilde kaydedip kapatiyoruz. Dosya acik
REM degilse bu adim zararsizca "acik degil" deyip gecer.
cscript.exe //nologo "%~dp0save-and-close-excel.vbs" >nul 2>&1

cscript.exe //nologo "%~dp0launch-excel.vbs"
if errorlevel 1 (
  echo [run.bat] launch-excel.vbs basarisiz oldu, yine de devam ediliyor.
)

REM Dogal yenilemenin tamamlanmasi icin bekleme - elle acildiginda ~10
REM saniyede bitiyor, guvenlik payi olarak 30 saniye bekleniyor.
timeout /t 30 /nobreak >nul

cscript.exe //nologo "%~dp0save-and-close-excel.vbs"
if errorlevel 1 (
  echo [run.bat] save-and-close-excel.vbs basarisiz oldu, yine de mevcut dosya gonderilmeye calisilacak.
)

REM --- Adim 2: taze kaydedilen dosyayi sunucuya gonder ---
"%NODE_EXE%" "%~dp0sync.mjs"
set "SYNC_EXITCODE=%ERRORLEVEL%"

REM Kilidi HER durumda (basarili/basarisiz) kaldir ki bir sonraki
REM calistirma (elle ya da zamanlanmis) takilmasin.
del "%LOCKFILE%" >nul 2>&1

exit /b %SYNC_EXITCODE%
