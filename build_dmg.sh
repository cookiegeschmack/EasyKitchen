#!/bin/bash
# Erstellt ein installierbares macOS Disk-Image (EasyKitchen.dmg) mit Drag-and-Drop in Applications.
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
APP="$DIR/EasyKitchen.app"
DMG="$DIR/EasyKitchen.dmg"
TEMP="$DIR/.dmg_temp"

# 1) App immer frisch bauen
bash "$DIR/build_mac_app.sh"

echo "▶︎ Erstelle EasyKitchen.dmg …"
rm -rf "$TEMP" "$DMG"
mkdir -p "$TEMP"

# 2) App, Applications-Verknüpfung & Anleitung kopieren
cp -R "$APP" "$TEMP/"
ln -s /Applications "$TEMP/Applications"
MIN_MACOS=$(/usr/libexec/PlistBuddy -c "Print :LSMinimumSystemVersion" "$DIR/macos/Info.plist" 2>/dev/null || echo "11.0")
cat > "$TEMP/Erster Start – bitte lesen.txt" <<TXT
EasyKitchen – Installation & erster Start
==========================================

1. „EasyKitchen“ in den Ordner „Applications“ (Programme) ziehen.

2. EasyKitchen ist eine private App ohne Apple-Entwicklerzertifikat.
   macOS fragt deshalb beim allerersten Öffnen nach:

   macOS 15 (Sequoia) und neuer:
   • EasyKitchen einmal öffnen → Meldung mit „Fertig“ schließen
   • Systemeinstellungen → Datenschutz & Sicherheit → ganz nach unten
   • Bei „EasyKitchen wurde blockiert …“ auf „Dennoch öffnen“ klicken
     und mit Passwort / Touch ID bestätigen

   macOS 11 bis 14:
   • Im Programme-Ordner mit Rechtsklick (oder Ctrl-Klick) auf EasyKitchen
   • „Öffnen“ wählen und im Dialog nochmals „Öffnen“ klicken

   Danach startet die App ganz normal per Doppelklick.

3. Falls „EasyKitchen ist beschädigt“ erscheint: Terminal öffnen und eingeben
     xattr -cr /Applications/EasyKitchen.app
   Dann wie unter 2. öffnen.

Voraussetzungen: Mac mit Apple-Chip (M1, M2, M3, M4 …), macOS $MIN_MACOS oder neuer.
Deine Rezepte bleiben nur auf deinem Mac (keine Cloud, kein Konto nötig).
TXT

# 3) DMG komprimiert erzeugen (UDZO)
hdiutil create -volname "EasyKitchen" -srcfolder "$TEMP" -ov -format UDZO "$DMG"
rm -rf "$TEMP"

echo "✅ Fertig: $DMG"
