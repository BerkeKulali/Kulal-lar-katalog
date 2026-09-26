' ============================================================
'  launch-excel.vbs ile CIFT TIKLAMA GIBI acilmis olan Excel'e COM ile
'  BAGLANIR (GetObject - YENI bir ornek ACMAZ, yenilemeyi TETIKLEMEZ) -
'  sadece dogal yenilemenin (run.bat'taki bekleme suresince) tamamlanmis
'  halini KAYDEDIP KAPATIR.
'
'  ONEMLI GUVENLIK ONLEMI: Ofis bilgisayarinda ayni anda BASKA bir Excel
'  dosyasi da acik olabilir (paylasimli makine). Bu yuzden hedef dosya
'  TAM YOLUYLA eslestirilir; eslesme yoksa ya da beklenmedik sekilde
'  belirsizse HICBIR SEYE DOKUNULMAZ, baska workbook'lar ASLA
'  kaydedilmez/kapatilmaz. Ayrica islem sonunda BASKA acik dosya kaldiysa
'  Excel'in kendisi (excelApp.Quit) ZORLA kapatilmaz - yalnizca bizim
'  workbook'umuz kapatilir.
'
'  Kullanim (run.bat tarafindan otomatik cagrilir, launch-excel.vbs +
'  bir bekleme suresinden SONRA):
'    cscript //nologo save-and-close-excel.vbs
' ============================================================

TIB = ChrW(304) ' Turkce buyuk nokta olu I (U+0130)

' <<< BURAYI KENDI EXCEL DOSYANIZIN TAM YOLUYLA DEGISTIRIN - launch-excel.vbs ile AYNI OLMALI >>>
excelPath = "C:\Users\berke.kulali\Desktop\KATALOG STOK\STOK SAB" & TIB & "T BAK" & TIB & "YE.xlsx"

Sub Log(msg)
  Dim fso, ts, logPath
  On Error Resume Next
  Set fso = CreateObject("Scripting.FileSystemObject")
  logPath = fso.GetParentFolderName(WScript.ScriptFullName) & "\refresh-excel.log"
  Set ts = fso.OpenTextFile(logPath, 8, True)
  ts.WriteLine "[save-close " & Now & "] " & msg
  ts.Close
  Err.Clear
End Sub

On Error Resume Next

Set excelApp = GetObject(, "Excel.Application")
If Err.Number <> 0 Then
  Log "Calisan bir Excel ornegi bulunamadi (" & Err.Description & ") - launch-excel.vbs basarisiz olmus olabilir."
  WScript.Quit 1
End If
Err.Clear

Dim wb, target, matchCount
matchCount = 0
For Each wb In excelApp.Workbooks
  Err.Clear
  If Err.Number = 0 Then
    If LCase(wb.FullName) = LCase(excelPath) Then
      Set target = wb
      matchCount = matchCount + 1
    End If
  End If
Next

If matchCount = 0 Then
  Log "UYARI: hedef dosya acik bulunamadi (" & excelPath & ") - hicbir sey yapilmadi, dokunulmadi."
  WScript.Quit 1
End If

If matchCount > 1 Then
  Log "UYARI: ayni dosya " & matchCount & " kez acik gorunuyor, ilk bulunani kullaniyorum."
End If

Log "Kaydediliyor: " & target.FullName
target.Save
If Err.Number <> 0 Then
  Log "Kaydetme hatasi: " & Err.Description
  Err.Clear
End If

target.Close False
Log "Kapatildi: " & excelPath

' Baska acik workbook yoksa Excel'i tamamen kapat. Baska dosyalar
' aciksa (ornegin ofisteki biri baska bir seyle calisiyorsa) Excel'e
' ASLA dokunmuyoruz - sadece kendi workbook'umuzu kapattik, yeterli.
If excelApp.Workbooks.Count = 0 Then
  excelApp.Quit
  Log "Baska acik dosya kalmadigi icin Excel de kapatildi."
Else
  Log "Baska acik dosyalar var (" & excelApp.Workbooks.Count & "), Excel'e dokunulmadi."
End If

Log "Bitti."
WScript.Quit 0
