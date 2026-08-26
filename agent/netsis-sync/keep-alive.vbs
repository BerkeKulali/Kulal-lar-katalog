' ============================================================
'  Oturumun "hareketsiz" gorunmesini engeller - boylece hareketsizlik
'  tabanli otomatik oturum kapama (nereden geldigi bilinmiyor, IT
'  tarafindan mi yoksa baska bir mekanizma mi) tetiklenmez.
'
'  Ne yapar: her birkac dakikada bir, gorunmez sekilde Scroll Lock
'  tusuna basip birakir (net etkisi yok, klavyedeki isik disinda hicbir
'  sey degismez). Bu, Windows'a "kullanici hala burada" sinyali verir.
'
'  Nasil calistirilir: Task Scheduler'da "Oturum acildiginda" tetikleyicili
'  ayri bir goreve baglanir, o oturum acik oldugu surece arka planda
'  sessizce calisir (wscript.exe ile - konsol penceresi acmaz).
' ============================================================

intervalMinutes = 4

Set WshShell = CreateObject("WScript.Shell")

Do While True
  WshShell.SendKeys "{SCROLLLOCK}"
  WScript.Sleep 200
  WshShell.SendKeys "{SCROLLLOCK}"
  WScript.Sleep intervalMinutes * 60 * 1000
Loop
