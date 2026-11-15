# 🍳 EasyKitchen – Deine Rezepte, passend zu dem, was noch da ist

EasyKitchen ist eine schlichte Rezept-App für den Alltag: Du speicherst deine eigenen Rezepte mit Zutaten, Zubereitung und optionalem Foto – und findest später über die Suche sofort alles, was du mit den Resten im Kühlschrank kochen kannst.

Gleiche Architektur wie **FinPilot**: nativer macOS-Wrapper (Swift + WKWebView), 100 % offline, und automatische 1-Klick-Updates über GitHub Releases.

---

## 📥 Download & Installation

### 🍎 macOS (empfohlen)
👉 **[EasyKitchen.dmg herunterladen (Latest Release)](https://github.com/cookiegeschmack/EasyKitchen/releases/latest/download/EasyKitchen.dmg)**

1. `EasyKitchen.dmg` öffnen und **EasyKitchen** in **Programme** ziehen.
2. Fertig – die App ist ad-hoc signiert und startet sofort.
3. **1-Klick-Update**: Erscheint ein neues Release, zeigt EasyKitchen oben **„Update vX.Y.Z“** an. Ein Klick lädt die neue Version, ersetzt die App und startet neu. Deine Rezepte bleiben erhalten.

*Alternativ:* `Start-Mac.command` doppelklicken (baut und startet die App aus dem Quellcode).

### 🪟 Windows
`Start-Windows.bat` doppelklicken – öffnet EasyKitchen als App-Fenster in Edge oder Chrome.

### 🌐 Browser
`app/index.html` in einem beliebigen Browser öffnen.

---

## ✨ Funktionen

- **Rezepte anlegen**: Name, Zutatenliste (Pflicht), Zubereitung, Kochzeit, Aufwand, Kosten, Portionen und optional ein Foto (auswählen, hineinziehen oder einfügen).
- **Mengen bequem eingeben**: Jede Zutat hat ein Zahlenfeld, einen Regler und −/+ Knöpfe. Die Schrittweite passt sich der gewählten Einheit an (g, kg, ml, l, Stück, EL, TL, Prise, Bund, Dose, Packung, Zehe, Tasse, nach Geschmack).
- **Reste-Suche**: Gib ein, was du noch hast (z. B. `Rindfleisch, Paprika`). Es erscheinen alle Rezepte, in denen mindestens eine dieser Zutaten vorkommt – die passendsten zuerst, mit Anzeige „✓ 2 von 6 Zutaten da“.
- **Filter**: Kochzeit (≤ 15 / 30 / 60 Min), Aufwand (einfach / mittel / aufwendig), Kosten (€ / €€ / €€€) und Sortierung.
- **Watchlist**: Rezepte mit ★ markieren, die du bald kochen möchtest – eigener Reiter, gleiche Suche & Filter.
- **Teilen & PDF-Export**: Ein Rezept (Detailansicht → „Teilen“) oder alle angezeigten Rezepte als PDF im einheitlichen EasyKitchen-Layout speichern oder per AirDrop/Nachrichten/Mail teilen.
- **Austausch zwischen EasyKitchen-Nutzern**: `.easykitchen`-Dateien per Doppelklick importieren (inkl. Foto). Auch von EasyKitchen erzeugte PDFs enthalten die Rezeptdaten und werden 1:1 importiert.
- **Import aus anderen Quellen**: Screenshots, Fotos (PNG, JPG, HEIC, WebP …) und PDFs anderer Anbieter per „Importieren“, Drag & Drop, Einfügen (⌘V) oder „Öffnen mit → EasyKitchen“. Der Text wird lokal mit der macOS-Texterkennung gelesen und als Rezept vorausgefüllt – nur noch prüfen und speichern. Rezepttext lässt sich auch direkt einfügen.
- **„Was ist neu“**: Nach jedem Update zeigt EasyKitchen einmalig, was dazugekommen ist (Einträge in `app/js/changelog.js`).
- **Backup**: Export/Import aller Rezepte inkl. Fotos als JSON (⚙︎ Einstellungen).
- **Tastenkürzel**: `⌘N` neues Rezept, `⌘F` oder `/` Suche, `Esc` schließt Dialoge.

---

## 🛠️ Technik

- **macOS-Wrapper**: `macos/main.swift` (Cocoa + WKWebView, kein Electron).
- **Daten**: `~/Library/Application Support/EasyKitchen/state.json` (+ `state.backup.json`), Fallback `localStorage`.
- **Web-App**: `app/` – reines HTML/CSS/JS ohne Frameworks oder externe Abhängigkeiten.
- **Updater**: `app/js/updater.js` + nativer Teil in `main.swift`. Prüft beim Start `cookiegeschmack/EasyKitchen/releases/latest` (privates Repo: über angemeldete `gh` CLI), lädt die DMG, tauscht die App aus und startet neu.

### Befehle

```bash
./build_mac_app.sh            # EasyKitchen.app bauen
./build_dmg.sh                # EasyKitchen.dmg erzeugen
./publish_release.sh "Text"   # Version +1, bauen, committen, als GitHub Latest Release veröffentlichen
```

**Vor einem Release** die Neuerungen oben in `app/js/changelog.js` eintragen – daraus entstehen der „Was ist neu“-Dialog und die GitHub-Release-Notizen. Fehlt der Eintrag, legt das Skript ihn aus der Beschreibung an (mehrere Punkte mit `;` trennen). Für ein Funktions-Update die Version explizit angeben, z. B. `./publish_release.sh 1.2.0 "…"`.

`publish_release.sh` erhöht die Patch-Version automatisch (1.0.0 → 1.0.1), synchronisiert sie in `macos/Info.plist`, `app/js/updater.js` und `app/index.html` und lädt `EasyKitchen.dmg` + eine All-in-One `Start-Windows.bat` als Release hoch. Beim allerersten Release wird die aktuelle Version (1.0.0) verwendet.

---

© 2026 EasyKitchen · Entwickelt von Duc Anh Hönemann
