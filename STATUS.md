# EasyKitchen – Architektur & Fortschritt

> App: `EasyKitchen.app` · Daten: `~/Library/Application Support/EasyKitchen/state.json`
> Build: `./build_mac_app.sh` · Release: `./publish_release.sh "Notizen"` · JS-Check: `node --check app/js/*.js`
> Struktur und Updater übernommen von FinPilot (`cookiegeschmack/FinPilot`).

## v1.1.0 (2026-11-15) – Teilen, PDF & Import

| # | Aufgabe | Datei(en) | Status |
|---|---|---|---|
| 1 | PDF-Export im EasyKitchen-Layout (offscreen WKWebView → paginierte A4-PDF), Rezeptdaten als `EKDATA:` in den PDF-Keywords eingebettet | `app/js/share.js`, `macos/main.swift` | ✅ |
| 2 | Teilen-Dialog (Detail & „angezeigte Rezepte“), macOS-Teilen-Menü, `.easykitchen`-Dateien, Dateityp in Info.plist registriert | `app/js/share.js`, `macos/Info.plist` | ✅ |
| 3 | Import: Vision-Texterkennung (Zeilen-Gruppierung für Spalten-Layouts, Modell-Vorladen), PDF-Text/OCR, EasyKitchen-PDFs exakt, Finder „Öffnen mit“ | `macos/main.swift`, `app/js/importer.js` | ✅ |
| 4 | Rezept-Parser (Abschnitte, Mengen/Brüche/Einheiten, Zeiten, Portionen, Aufwand; DE+EN) → Editor mit Hinweis & Originaltext | `app/js/importer.js`, `app/js/app.js` | ✅ |
| 5 | „Was ist neu“-Dialog nach jedem Update; Changelog → Release-Notizen in `publish_release.sh` | `app/js/changelog.js`, `app/js/app.js`, `publish_release.sh` | ✅ |
| 6 | Getestet: Browser (Text-Import, Teilen, .easykitchen-Roundtrip) und Mac-App (Screenshot-OCR, PDF-Export, PDF-Reimport) | – | ✅ |

## v1.0.0 (2026-11-15) – Erste Version

| # | Aufgabe | Datei(en) | Status |
|---|---|---|---|
| 1 | Nativer macOS-Wrapper inkl. Storage-Bridge, Backup-Dialoge, Bildauswahl, 1-Klick-Updater (Repo `cookiegeschmack/EasyKitchen`) | `macos/main.swift`, `macos/Info.plist` | ✅ |
| 2 | App-Icon (Pfanne auf Teller, Apple-HIG-Raster) | `macos/make_icon.swift`, `macos/AppIcon.icns`, `app/img/icon-128.png` | ✅ |
| 3 | Build-, DMG-, Release- und Start-Skripte | `build_mac_app.sh`, `build_dmg.sh`, `publish_release.sh`, `Start-*.{command,bat}` | ✅ |
| 4 | Datenmodell, Speicherung, Zutatensuche (Umlaute/Plural-tolerant, Ranking nach Treffern) | `app/js/data.js` | ✅ |
| 5 | Rezept-Editor (Pflicht: Name + Zutaten; Foto optional; Menge per Feld/Regler/±, einheitenabhängig) | `app/js/app.js`, `app/index.html` | ✅ |
| 6 | Liste, Watchlist, Filter (Kochzeit/Aufwand/Kosten), Sortierung, Detailansicht | `app/js/app.js`, `app/css/styles.css` | ✅ |
| 7 | Getestet im Browser (Anlegen, Foto, Suche, Filter, Watchlist, Persistenz) und als native App gestartet | – | ✅ |
| 8 | Erstes GitHub-Release v1.0.0 veröffentlicht (EasyKitchen.dmg + Start-Windows.bat) | `publish_release.sh` | ✅ |
