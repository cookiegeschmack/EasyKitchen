#!/bin/bash
# Baut EasyKitchen als native macOS-App (EasyKitchen.app).
# Entwickelt von Duc Anh Hönemann.
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
APP="$DIR/EasyKitchen.app"
BUILD="$DIR/.build"
VERSION=$(/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" "$DIR/macos/Info.plist" 2>/dev/null || echo "1.0.0")

echo "▶︎ Baue EasyKitchen v$VERSION …"
rm -rf "$APP" "$BUILD"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources" "$BUILD"

# 1) Swift kompilieren – IMMER mit fester Zielversion (sonst übernimmt der Compiler die
#    macOS-Version dieses Macs als Minimum und die App startet auf älteren Macs nicht).
#    Apple Silicon (M1/M2/M3/…) ist Pflicht, Intel wird ergänzt, falls die Toolchain es kann.
MCACHE="/tmp/swift-module-cache"
MIN_MACOS=$(/usr/libexec/PlistBuddy -c "Print :LSMinimumSystemVersion" "$DIR/macos/Info.plist" 2>/dev/null || echo "11.0")
if ! swiftc -module-cache-path "$MCACHE" -O -target "arm64-apple-macos$MIN_MACOS" -o "$BUILD/arm64" "$DIR/macos/main.swift" 2>"$BUILD/arm.log"; then
  cat "$BUILD/arm.log"; echo "❌ Build für Apple Silicon fehlgeschlagen"; exit 1
fi
if swiftc -module-cache-path "$MCACHE" -O -target "x86_64-apple-macos$MIN_MACOS" -o "$BUILD/x86_64" "$DIR/macos/main.swift" 2>"$BUILD/x86.log"; then
  lipo -create "$BUILD/arm64" "$BUILD/x86_64" -output "$APP/Contents/MacOS/EasyKitchen"
  echo "  ✓ Universal Binary (Apple Silicon + Intel), ab macOS $MIN_MACOS"
else
  cp "$BUILD/arm64" "$APP/Contents/MacOS/EasyKitchen"
  echo "  ✓ Apple Silicon (M1/M2/M3/…), ab macOS $MIN_MACOS – Intel-Teil auf diesem Mac nicht baubar"
fi
# Sicherheitsprüfung: Mindestversion im Binary muss zur Info.plist passen
BIN_MIN=$(vtool -show-build "$APP/Contents/MacOS/EasyKitchen" 2>/dev/null | awk '/minos/ {print $2; exit}')
if [ -n "$BIN_MIN" ] && [ "$BIN_MIN" != "$MIN_MACOS" ]; then
  echo "❌ Binary verlangt macOS $BIN_MIN statt $MIN_MACOS – Abbruch"; exit 1
fi

# 2) Bundle-Inhalte
cp "$DIR/macos/Info.plist" "$APP/Contents/Info.plist"
cp -R "$DIR/app" "$APP/Contents/Resources/app"
find "$APP/Contents/Resources/app" -name ".DS_Store" -delete

# 3) Icon
cp "$DIR/macos/AppIcon.icns" "$APP/Contents/Resources/AppIcon.icns"

# 4) Ad-hoc signieren & Quarantäne entfernen
xattr -d com.apple.quarantine "$APP" 2>/dev/null || true
codesign --force --deep --sign - "$APP" >/dev/null 2>&1 || true

# 5) LaunchServices aktualisieren (Icon im Finder)
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f "$APP" 2>/dev/null || true
touch "$APP"

rm -rf "$BUILD"
echo "✅ Fertig: $APP"
