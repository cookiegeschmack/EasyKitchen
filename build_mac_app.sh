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

# 1) Swift kompilieren (Universal Binary: Apple Silicon + Intel, Fallback: aktuelle Architektur)
MCACHE="/tmp/swift-module-cache"
if swiftc -module-cache-path "$MCACHE" -O -target arm64-apple-macos12 -o "$BUILD/arm64" "$DIR/macos/main.swift" 2>"$BUILD/arm.log" && \
   swiftc -module-cache-path "$MCACHE" -O -target x86_64-apple-macos12 -o "$BUILD/x86_64" "$DIR/macos/main.swift" 2>"$BUILD/x86.log"; then
  lipo -create "$BUILD/arm64" "$BUILD/x86_64" -output "$APP/Contents/MacOS/EasyKitchen"
  echo "  ✓ Universal Binary (arm64 + x86_64)"
else
  swiftc -module-cache-path "$MCACHE" -O -o "$APP/Contents/MacOS/EasyKitchen" "$DIR/macos/main.swift"
  echo "  ✓ Binary für aktuelle Architektur"
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
