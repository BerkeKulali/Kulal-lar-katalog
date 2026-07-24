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
node "%~dp0sync.mjs"
exit /b %ERRORLEVEL%
