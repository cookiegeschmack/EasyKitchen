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

1. „EasyKitchen“ auf den Ordner „Applications“ (Programme) ziehen.
   Wurde EasyKitchen doch direkt aus diesem Fenster gestartet, bietet die App
   beim Start an, sich selbst in den Programme-Ordner zu verschieben.

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

# 3) Hintergrundbild (Pfeil App → Applications), 1x + 2x für Retina
mkdir -p "$TEMP/.background"
BG1="$TEMP/.bg1.png"; BG2="$TEMP/.bg2.png"
if swift "$DIR/macos/dmg_background.swift" "$BG1" 1 >/dev/null 2>&1 && swift "$DIR/macos/dmg_background.swift" "$BG2" 2 >/dev/null 2>&1; then
  tiffutil -cathidpicheck "$BG1" "$BG2" -out "$TEMP/.background/background.tiff" >/dev/null 2>&1 || cp "$BG1" "$TEMP/.background/background.tiff"
fi
rm -f "$BG1" "$BG2"

# 4) Beschreibbares Image anlegen, Fensterlayout per Finder setzen, dann komprimieren
RW="$DIR/.EasyKitchen_rw.dmg"
VOL="EasyKitchen"
rm -f "$RW"
[ -d "/Volumes/$VOL" ] && hdiutil detach "/Volumes/$VOL" -force -quiet || true
hdiutil create -volname "$VOL" -srcfolder "$TEMP" -fs HFS+ -format UDRW -ov "$RW" >/dev/null
DEV=$(hdiutil attach "$RW" -readwrite -noverify -noautoopen | awk '/Apple_HFS/ {print $1; exit}')
sleep 1
README="Erster Start – bitte lesen.txt"
if [ -f "/Volumes/$VOL/.background/background.tiff" ]; then BGLINE='set background picture of opts to file ".background:background.tiff"'; else BGLINE=''; fi
if osascript <<OSA >/dev/null 2>&1
tell application "Finder"
  tell disk "$VOL"
    open
    set current view of container window to icon view
    set toolbar visible of container window to false
    set statusbar visible of container window to false
    try
      set pathbar visible of container window to false
    end try
    set the bounds of container window to {200, 120, 840, 548}
    set opts to the icon view options of container window
    set arrangement of opts to not arranged
    set icon size of opts to 96
    set text size of opts to 13
    $BGLINE
    set position of item "EasyKitchen.app" of container window to {170, 190}
    set position of item "Applications" of container window to {470, 190}
    set position of item "$README" of container window to {320, 318}
    update without registering applications
    delay 1
    close
  end tell
end tell
OSA
then
  echo "  ✓ Fensterlayout gesetzt (App → Applications)"
else
  echo "  ⚠︎ Fensterlayout konnte nicht gesetzt werden (Finder-Automation nicht erlaubt) – DMG funktioniert trotzdem"
fi
chmod -Rf go-w "/Volumes/$VOL" 2>/dev/null || true
sync
hdiutil detach "$DEV" -quiet || hdiutil detach "/Volumes/$VOL" -force -quiet
rm -f "$DMG"
hdiutil convert "$RW" -format UDZO -imagekey zlib-level=9 -o "$DMG" >/dev/null
rm -f "$RW"
rm -rf "$TEMP"

echo "✅ Fertig: $DMG"
