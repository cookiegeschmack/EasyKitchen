# 🍳 EasyKitchen – Deine Rezepte, passend zu dem, was noch da ist

EasyKitchen ist eine schlichte Rezept-App für den Alltag: Du speicherst deine eigenen Rezepte mit Zutaten, Zubereitung und optionalem Foto – und findest später über die Suche sofort alles, was du mit den Resten im Kühlschrank kochen kannst.

Gleiche Architektur wie **FinPilot**: nativer macOS-Wrapper (Swift + WKWebView), 100 % offline, und automatische 1-Klick-Updates über GitHub Releases.

---

## 📥 Download & Installation

### 🍎 macOS (empfohlen)
👉 **[EasyKitchen.dmg herunterladen (Latest Release)](https://github.com/cookiegeschmack/EasyKitchen/releases/latest/download/EasyKitchen.dmg)**

1. `EasyKitchen.dmg` öffnen und **EasyKitchen** in **Programme** ziehen.
2. Erster Start: Die App ist ad-hoc signiert (ohne Apple-Entwicklerzertifikat). macOS 15+: einmal öffnen, dann *Systemeinstellungen → Datenschutz & Sicherheit → „Dennoch öffnen“*. macOS 11–14: Rechtsklick → „Öffnen“. Die DMG enthält dazu die Datei „Erster Start – bitte lesen.txt“.
   Voraussetzung: Mac mit Apple-Chip (M1/M2/M3/M4 …) und macOS 11 Big Sur oder neuer.
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
- **Zeiten**: Vorbereitung und Zubereitung getrennt, die Gesamtzeit wird berechnet und als Tabelle angezeigt (App & PDF).
- **Nährwerte (Richtwerte)**: Kalorien, Eiweiß, Kohlenhydrate und Fett pro Portion werden offline aus den Zutaten geschätzt (`app/js/nutrition.js`, ~180 gängige Zutaten) – als Balkendiagramm unten am Rezept und live im Editor, in der PDF kurz ganz unten. Unbekannte Zutaten werden als „nicht berücksichtigt“ ausgewiesen.
- **Portionsregler**: In jedem Rezept die Portionen per Regler ändern – Mengen werden umgerechnet, die Wahl wird pro Rezept gemerkt (das Rezept bleibt unverändert).
- **Eigenschaften**: Vegetarisch (aus den Zutaten), High Protein (≥ 20 g Eiweiß/Portion und ≥ 20 % der Kalorien), Hauptspeise/Nebenspeise/Nachspeise und Süß/Salzig – automatisch erkannt, im Editor korrigierbar.
- **Filter**: Vegetarisch, High Protein, Art (Haupt-/Nebenspeise), Geschmack (süß/salzig), Gesamtzeit (≤ 15 / 30 / 60 Min), Aufwand (einfach / mittel / aufwendig), Kosten (€ / €€ / €€€) und Sortierung.
- **Wocheneinkaufsplaner** (🛒 oben): Rezepte für die Woche wählen, Portionen anpassen – daraus entsteht eine gemeinsame Einkaufsliste. Gleiche Zutaten werden zusammengefasst (g/kg, ml/l umgerechnet), nach Supermarkt-Bereichen sortiert und lassen sich abhaken, kopieren, teilen oder als PDF speichern.
- **Design**: Grundfarbe Grün, hell in Pastellfarben oder dunkel – in den Einstellungen wählbar (System / Hell / Dunkel).
- **Einkaufsliste teilen**: als Text (Menge zuerst) über das macOS-Teilen-Menü (WhatsApp, Nachrichten, AirDrop …), als Bild (PNG, Handy-Format) oder als PDF.
- **Favoriten**: Rezepte mit ★ markieren und per „Nur Favoriten“ filtern (oder „Favoriten zuerst“ sortieren).
- **Rezept(e) des Tages**: Diashow über der Liste mit täglich zufällig gewählten Lieblingsrezepten (10 s pro Rezept, Ladebalken, „Nächstes“). Unter 30 Rezepten 1, ab 30 zwei, ab 40 drei – unabhängig von Suche und Filtern.
- **Version & Updates**: Die installierte Version steht oben neben dem Namen. EasyKitchen sucht beim Start automatisch nach Updates, sobald eine Internetverbindung besteht (ohne Internet: sobald die Verbindung da ist; danach alle 6 Stunden). Während die App läuft, wird alle 10 Minuten geprüft – ein neues Release erscheint oben als Hinweis (LED), ein Klick startet das Update. Beim Start öffnet ein vorhandenes Update einmalig den Dialog.
- **Teilen & PDF-Export**: Ein Rezept (Detailansicht → „Teilen“) oder alle angezeigten Rezepte als PDF im einheitlichen EasyKitchen-Layout speichern oder per AirDrop/Nachrichten/Mail teilen.
- **Austausch zwischen EasyKitchen-Nutzern**: `.easykitchen`-Dateien per Doppelklick importieren (inkl. Foto). Bereits vorhandene Rezepte (gleicher Name oder gleiche Kennung) werden übersprungen – es kommen nur neue dazu. Auch von EasyKitchen erzeugte PDFs enthalten die Rezeptdaten und werden 1:1 importiert.
- **Import aus anderen Quellen**: Screenshots, Fotos (PNG, JPG, HEIC, WebP …) und PDFs anderer Anbieter per „Importieren“, Drag & Drop, Einfügen (⌘V) oder „Öffnen mit → EasyKitchen“. Der Text wird lokal mit der macOS-Texterkennung gelesen und als Rezept vorausgefüllt – nur noch prüfen und speichern. Rezepttext lässt sich auch direkt einfügen.
- **„Was ist neu“**: Nach jedem Update zeigt EasyKitchen einmalig, was dazugekommen ist (Einträge in `app/js/changelog.js`).
- **Eigene Einheiten**: Neben g, ml, EL, Stück & Co. gibt es „Eigenes …“ – die Einheit wird frei benannt (z. B. Blätter, Stangen, Tropfen).
- **Entwürfe**: Wer den Rezept-Editor mit ungespeicherten Eingaben verlässt (daneben klicken, Esc, Abbrechen), wird gefragt, ob ein Entwurf gespeichert werden soll. Entwürfe stehen oben unter „Entwürfe“; beim Beenden der App wird ein offener Editor automatisch gesichert.
- **Doppelte Rezepte vergleichen**: Beim Import werden schon vorhandene Rezepte übersprungen. „Unterschiede ansehen“ zeigt beide Fassungen nebeneinander mit markierten Unterschieden; auf Wunsch wird das importierte als neues Rezept (gleicher oder eigener Name) übernommen.
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
