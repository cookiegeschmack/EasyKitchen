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

# 2) App & Applications-Verknüpfung kopieren
cp -R "$APP" "$TEMP/"
ln -s /Applications "$TEMP/Applications"

# 3) DMG komprimiert erzeugen (UDZO)
hdiutil create -volname "EasyKitchen" -srcfolder "$TEMP" -ov -format UDZO "$DMG"
rm -rf "$TEMP"

echo "✅ Fertig: $DMG"
