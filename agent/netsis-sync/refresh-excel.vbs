' ============================================================
'  Excel dosyasini gorunmez sekilde acar (bu, Netsis verisinin
'  cekilmesini tetikler), yenilenmesini bekler, kaydedip kapatir.
'  run.bat tarafindan otomatik cagrilir - elle calistirmaya
'  gerek yok, ama isterseniz test icin dogrudan da calistirabilirsiniz:
'
'    cscript //nologo refresh-excel.vbs
'
'  Not: ilk basarili calismada yenileme ~5 dakika surdu - bu normal,
'  Netsis'ten canli veri cekildigi icin biraz zaman alabiliyor.
'
'  Not 2: dosya yolundaki Turkce buyuk "I" (I noktali) karakteri, dosya
'  aktarimi sirasinda bozulmaya karsi Chr(304) ile kod noktasindan
'  olusturuluyor - dogrudan harf olarak yazmiyoruz. Yolu degistirmeniz
'  gerekirse, TIB harfi gecen yerlerde yine Chr(304) kullanin ya da
'  yolda o harf yoksa direkt yazabilirsiniz.
' ============================================================

TIB = Chr(304) ' Turkce buyuk nokta olu I (U+0130)

' <<< BURAYI KENDI EXCEL DOSYANIZIN TAM YOLUYLA DEGISTIRIN >>>
excelPath = "C:\Users\berke.kulali\Desktop\KATALOG STOK\STOK SAB" & TIB & "T BAK" & TIB & "YE.xlsx"

maxWaitSeconds = 600   ' yenileme en fazla bu kadar (saniye) surer varsayilir (10 dk)

Sub Log(msg)
  WScript.Echo "[excel-refresh " & Now & "] " & msg
End Sub

On Error Resume Next

Set excelApp = CreateObject("Excel.Application")
If Err.Number <> 0 Then
  Log "Excel baslatilamadi: " & Err.Description
  WScript.Quit 1
End If
Err.Clear

excelApp.Visible = False
excelApp.DisplayAlerts = False
excelApp.AskToUpdateLinks = False
excelApp.EnableEvents = True

Set wb = excelApp.Workbooks.Open(excelPath, 0, False, , , , , , , True)
If Err.Number <> 0 Or wb Is Nothing Then
  Log "Dosya acilamadi (" & excelPath & "): " & Err.Description
  excelApp.Quit
  WScript.Quit 1
End If
Err.Clear

Log "Acildi: " & excelPath & " - yenileniyor..."

' Kac baglanti var - tani/log amacli.
connCount = 0
For Each conn In wb.Connections
  connCount = connCount + 1
  connName = conn.Name
  Err.Clear
  Log "Baglanti bulundu: " & connName
Next
Log "Toplam " & connCount & " baglanti bulundu."

wb.RefreshAll
Err.Clear

startTime = Timer
Do
  stillRefreshing = False
  For Each conn In wb.Connections
    On Error Resume Next
    If Not (conn.OLEDBConnection Is Nothing) Then
      If conn.OLEDBConnection.Refreshing Then stillRefreshing = True
    End If
    If Not (conn.ODBCConnection Is Nothing) Then
      If conn.ODBCConnection.Refreshing Then stillRefreshing = True
    End If
    Err.Clear
  Next
  If Not stillRefreshing Then Exit Do
  WScript.Sleep 2000
Loop While (Timer - startTime) < maxWaitSeconds

If stillRefreshing Then
  Log "UYARI: " & maxWaitSeconds & " saniye sonra hala yenileniyor gorunuyor, yine de kaydetmeyi deneyecegim."
Else
  Log "Yenileme tamamlandi, kaydediliyor."
End If

wb.Save
If Err.Number <> 0 Then
  Log "Kaydetme hatasi: " & Err.Description
  Err.Clear
End If
wb.Close False
excelApp.Quit

Log "Bitti."
WScript.Quit 0
