# EasyKitchen – Architektur & Fortschritt

> App: `EasyKitchen.app` · Daten: `~/Library/Application Support/EasyKitchen/state.json`
> Build: `./build_mac_app.sh` · Release: `./publish_release.sh "Notizen"` · JS-Check: `node --check app/js/*.js`
> Struktur und Updater übernommen von FinPilot (`cookiegeschmack/FinPilot`).

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
| 8 | Erstes GitHub-Release v1.0.0 veröffentlichen | `publish_release.sh` | ⏳ offen |
