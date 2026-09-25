' ============================================================
'  Excel dosyasini gorunmez sekilde acar (bu, Netsis verisinin
'  cekilmesini tetikler), yenilenmesini bekler, kaydedip kapatir.
'  run.bat tarafindan otomatik cagrilir - elle calistirmaya
'  gerek yok, ama isterseniz test icin dogrudan da calistirabilirsiniz:
'
'    cscript //nologo refresh-excel.vbs
'

'  Not: RefreshAll + CalculateUntilAsyncQueriesDone ile yenilenir (bkz.
'  asagidaki "ONEMLI DEGISIKLIK (25.09.2026, 3. deneme)" yorumu) - tek tek
'  baglanti.Refresh() ile senkron (BackgroundQuery=False) zorlamak COM
'  otomasyonunda hata 1004 ("Bilinmeyen calisma hatasi") ile patliyordu.
'
'  Not 2: dosya yolundaki Turkce buyuk "I" (I noktali) karakteri, dosya
'  aktarimi sirasinda bozulmaya karsi ChrW(304) ile kod noktasindan
'  olusturuluyor - dogrudan harf olarak yazmiyoruz. Yolu degistirmeniz
'  gerekirse, TIB harfi gecen yerlerde yine ChrW(304) kullanin ya da
'  yolda o harf yoksa direkt yazabilirsiniz.
' ============================================================

TIB = ChrW(304) ' Turkce buyuk nokta olu I (U+0130) - Unicode kod noktasi icin ChrW gerekli, Chr sadece 0-255 (ANSI) kabul eder

' <<< BURAYI KENDI EXCEL DOSYANIZIN TAM YOLUYLA DEGISTIRIN >>>
excelPath = "C:\Users\berke.kulali\Desktop\KATALOG STOK\STOK SAB" & TIB & "T BAK" & TIB & "YE.xlsx"

' calistirma yontemine gore Log() ciktisi:
'  - cscript.exe (onerilen: Gorev Zamanlayici / komut satiri) -> konsola
'    yazar, HICBIR SEYI ENGELLEMEZ.
'  - wscript.exe (bir .vbs dosyasina CIFT TIKLANDIGINDA Windows'un
'    VARSAYILAN calistiricisi budur) -> WScript.Echo KESINLIKLE
'    KULLANILMAZ. Bu modda HER Echo satiri, "Tamam" tiklanana kadar
'    bekleyen bir ACILIR PENCERE (MsgBox) olarak cikar - ve script (dolayisiyla
'    TUM otomatik senkron) o pencere kapatilana kadar SONSUZA DEK durur.
'    Gunlerce/haftalarca ayni (donmus) verinin gonderilmesinin asil sebebi
'    buydu: Gorev Zamanlayici scripti tetikliyor, ilk log satirinda kimsenin
'    tiklamadigi bir "Tamam" penceresi beliriyor, Netsis'ten hic taze veri
'    cekilmeden script takili kaliyordu. Bu yuzden Log() artik wscript.exe
'    altinda ASLA WScript.Echo cagirmiyor; bunun yerine ayni klasordeki
'    refresh-excel.log dosyasina yazar - ekrana hicbir sey cikmaz.
isWscriptHost = (LCase(Right(WScript.FullName, Len("wscript.exe"))) = "wscript.exe")

Sub Log(msg)
  Dim line
  line = "[excel-refresh " & Now & "] " & msg
  If isWscriptHost Then
    LogToFile line
  Else
    WScript.Echo line
  End If
End Sub

Sub LogToFile(line)
  Dim fso, ts, logPath
  On Error Resume Next
  Set fso = CreateObject("Scripting.FileSystemObject")
  logPath = fso.GetParentFolderName(WScript.ScriptFullName) & "\refresh-excel.log"
  Set ts = fso.OpenTextFile(logPath, 8, True) ' 8 = ForAppending, True = yoksa olustur
  ts.WriteLine line
  ts.Close
  Err.Clear
End Sub

' Verilen basligin (ornek: "STOK_KODU") gectigi ilk hucreyi arar,
' "satir,sutun" seklinde dondurur; bulamazsa "" doner.
Function FindHeaderRowCol(ws, headerText, maxRow, maxCol)
  Dim r, c, v
  FindHeaderRowCol = ""
  On Error Resume Next
  For r = 1 To maxRow
    For c = 1 To maxCol
      v = ws.Cells(r, c).Value
      If Err.Number = 0 Then
        If UCase(Trim(CStr(v))) = UCase(headerText) Then
          FindHeaderRowCol = r & "," & c
          Exit Function
        End If
      Else
        Err.Clear
      End If
    Next
  Next
End Function

On Error Resume Next

Set excelApp = CreateObject("Excel.Application")
If Err.Number <> 0 Then
  Log "Excel baslatilamadi: " & Err.Description
  WScript.Quit 1
End If
Err.Clear

' ONEMLI DEGISIKLIK (25.09.2026, 2. deneme): Visible = False iken
' baglanti yenileme (Refresh) "Bilinmeyen calisma hatasi" ile patliyordu -
' elle cift tiklayinca calisirken, AYNI baglanti COM otomasyonuyla
' gorunmez modda (Visible=False) hem eski (pasif bekleme) hem yeni
' (senkron Refresh) yontemde basarisiz oluyordu. Bu, Excel'in bu tur
' harici veri baglantilarini yenilerken gercek bir pencere/mesaj pompasi
' beklediginin isareti - Excel'in disaridan (VBScript/COM) otomasyonunda
' bilinen bir kisitlama. Cozum: Excel'i GORUNUR ac (Visible = True) ama
' hemen kucult + ekran disina tasi - kullanici hicbir sey gormez (veya en
' fazla cok kisa bir yanip sonme), ama Excel'in ic mekanizmasi artik
' gercek bir pencereye sahip oluyor.
excelApp.Visible = True
excelApp.DisplayAlerts = False
excelApp.AskToUpdateLinks = False
excelApp.EnableEvents = True
excelApp.WindowState = -4140 ' xlMinimized
excelApp.Left = -32000
excelApp.Top = -32000
Err.Clear

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

' ONEMLI DEGISIKLIK (25.09.2026, 3. deneme): Tek tek baglanti.Refresh()
' cagirip BackgroundQuery=False zorlamak COM otomasyonunda hata 1004
' ("Bilinmeyen calisma hatasi") veriyordu - Visible=True/False fark
' etmiyordu. Bunun yerine Excel'in ASENKRON sorgular icin ozel olarak
' sundugu otomasyon yontemi kullaniliyor: wb.RefreshAll (butun
' baglantilari, kendi varsayilan/asenkron modunda, yani BackgroundQuery
' ELLE False YAPILMADAN baslatir), ardindan
' Application.CalculateUntilAsyncQueriesDone (Excel'in TUM asenkron
' sorgular/baglanti yenilemeleri bitene kadar bloke eden, otomasyon
' senaryolari icin ozel olarak eklenmis resmi metodu - guvenilmez
' ".Refreshing bayragini yoklama" yonteminin yerini almasi icin var).
Err.Clear
Log "RefreshAll baslatiliyor..."
wb.RefreshAll
If Err.Number <> 0 Then
  Log "UYARI: RefreshAll baslatilirken hata (" & Err.Number & "): " & Err.Description
  Err.Clear
End If

Log "Asenkron sorgularin bitmesi bekleniyor (CalculateUntilAsyncQueriesDone)..."
excelApp.CalculateUntilAsyncQueriesDone
If Err.Number <> 0 Then
  Log "UYARI: CalculateUntilAsyncQueriesDone hata (" & Err.Number & "): " & Err.Description
  Err.Clear
Else
  Log "Asenkron sorgular tamamlandi."
End If

Log "Tum baglanti yenilemeleri tamamlandi, kaydediliyor."

' Kaydetmeden hemen once dosyadaki birkac gercek deger yazdiriliyor - bu
' yenilemenin GERCEKTEN olup olmadigini gozle gormek icin. Bu satirlardaki
' STOK_KODU/BAKIYE degerlerini Netsis'teki (veya depodaki) guncel degerle
' karsilastirin - eslesirse yenileme gercekten calisiyor demektir.
Dim foundSample
foundSample = False
For Each ws In wb.Worksheets
  Dim stokPos, bakiyePos
  stokPos = FindHeaderRowCol(ws, "STOK_KODU", 15, 40)
  If stokPos <> "" Then
    bakiyePos = FindHeaderRowCol(ws, "BAKIYE", 15, 40)
    If bakiyePos <> "" Then
      Dim sp, bp, hdrRow, stokCol, bakiyeCol
      sp = Split(stokPos, ",")
      bp = Split(bakiyePos, ",")
      hdrRow = CInt(sp(0))
      stokCol = CInt(sp(1))
      bakiyeCol = CInt(bp(1))
      Log "Ornek veri (sayfa: " & ws.Name & "):"
      Dim i, r, kod, bal, shown
      shown = 0
      For i = 1 To 15
        r = hdrRow + i
        kod = ws.Cells(r, stokCol).Value
        If Trim(CStr(kod)) = "" Then Exit For
        bal = ws.Cells(r, bakiyeCol).Value
        Log "  " & kod & " -> BAKIYE=" & bal
        shown = shown + 1
        If shown >= 5 Then Exit For
      Next
      foundSample = True
    End If
  End If
  If foundSample Then Exit For
Next
If Not foundSample Then
  Log "UYARI: STOK_KODU/BAKIYE basliklari bulunamadi, ornek deger gosterilemedi."
End If
Err.Clear

wb.Save
If Err.Number <> 0 Then
  Log "Kaydetme hatasi: " & Err.Description
  Err.Clear
End If
wb.Close False
excelApp.Quit

Log "Bitti."
WScript.Quit 0
