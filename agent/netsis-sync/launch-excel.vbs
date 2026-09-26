' ============================================================
'  Excel dosyasini CIFT TIKLAMA GIBI acar (COM otomasyonu ile DEGIL,
'  Windows'un dosya iliskilendirmesi uzerinden gercek bir baslatma ile) -
'  boylece Excel'in dis veri baglantilarini (TM_STSABIT/TM_STSABIT5)
'  yenilemesi, elle acildiginda oldugu gibi GUVENILIR sekilde tetiklenir.
'
'  ONEMLI DEGISIKLIK (26.09.2026): Daha once refresh-excel.vbs, Excel'i
'  CreateObject("Excel.Application") ile COM otomasyonuyla aciyordu.
'  Bu sekilde acildiginda - RefreshAll, CalculateUntilAsyncQueriesDone,
'  Visible=True/False, hicbiri fark etmeksizin - dis veri baglantisi
'  YENILENMIYORDU (Netsis'te gercekten degisen bir bakiye, siparis
'  girildikten SONRA bile script'in kaydettigi dosyaya YANSIMADI).
'  Oysa AYNI dosya kullanici tarafindan elle (cift tiklanarak) acildiginda
'  yenileme HER ZAMAN ~10 saniyede tamamlaniyor. Sebep muhtemelen Excel'in
'  COM/otomasyon modunda calistigini algilayip dis veri yenilemesini
'  farkli (ve bu baglanti turu icin guvenilmez) ele almasi.
'
'  Cozum: Excel'i COM ile ACMIYORUZ, "gercekten" cift tiklanmis gibi
'  Windows Shell uzerinden baslatiyoruz. Bu script HEMEN doner, yenilemeyi
'  BEKLEMEZ - run.bat'taki "timeout" adimi dogal yenilemenin
'  tamamlanmasi icin bekler, ardindan save-and-close-excel.vbs KAYDET+
'  KAPAT islemini COM ile (ama YENI bir ornek ACMADAN, sadece calisan
'  Excel'e BAGLANARAK) yapar.
'
'  DUZELTME (26.09.2026, 2. deneme): Ilk denemede "WScript.Shell".Run
'  kullanilmisti, ama bu metod dosya yolundaki Turkce "I" (U+0130)
'  karakterini duzgun tasimiyor - log dosyasinda bozuk bir karaktere
'  donusmus halde goruldu, yani Windows'a GERCEKTE OLMAYAN bir
'  dosya adi gonderiliyordu; Excel de bu yuzden BOS aciliyordu (hata
'  vermeden - dosya bulunamayinca sessizce yeni/bos calisma kitabi
'  acmasi Excel'in kendi varsayilan davranisi). Bunun yerine Unicode
'  dosya yollarini guvenilir tasiyan "Shell.Application".ShellExecute
'  kullaniliyor.
'
'  Kullanim (run.bat tarafindan otomatik cagrilir):
'    cscript //nologo launch-excel.vbs
' ============================================================

TIB = ChrW(304) ' Turkce buyuk nokta olu I (U+0130) - Unicode kod noktasi icin ChrW gerekli

' <<< BURAYI KENDI EXCEL DOSYANIZIN TAM YOLUYLA DEGISTIRIN >>>
excelPath = "C:\Users\berke.kulali\Desktop\KATALOG STOK\STOK SAB" & TIB & "T BAK" & TIB & "YE.xlsx"

Sub Log(msg)
  Dim fso, ts, logPath
  On Error Resume Next
  Set fso = CreateObject("Scripting.FileSystemObject")
  logPath = fso.GetParentFolderName(WScript.ScriptFullName) & "\refresh-excel.log"
  Set ts = fso.OpenTextFile(logPath, 8, True) ' 8 = ForAppending, True = yoksa olustur
  ts.WriteLine "[launch-excel " & Now & "] " & msg
  ts.Close
  Err.Clear
End Sub

On Error Resume Next

Set shellApp = CreateObject("Shell.Application")
If Err.Number <> 0 Then
  Log "Shell.Application olusturulamadi: " & Err.Description
  WScript.Quit 1
End If
Err.Clear

Log "Aciliyor (cift tiklama gibi, COM otomasyonu OLMADAN): " & excelPath
shellApp.ShellExecute excelPath, "", "", "open", 1
If Err.Number <> 0 Then
  Log "Acma hatasi: " & Err.Description
  WScript.Quit 1
End If

Log "Baslatildi - dogal yenilemenin tamamlanmasi run.bat'taki bekleme suresince bekleniyor."
WScript.Quit 0
