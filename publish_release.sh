#!/bin/bash
# Erzeugt automatisch die nächste EasyKitchen-Version (z. B. 1.0.0 -> 1.0.1),
# baut EasyKitchen.app + EasyKitchen.dmg und veröffentlicht sie direkt als GitHub Latest Release.
# Installierte Apps erkennen das neue Release beim Start und bieten das 1-Klick-Update an.
#
# Verwendung (nur Message nötig!):
#   ./publish_release.sh "Neu: Filter nach Kosten"
#
# Optional (ohne Argument -> nimmt letzte Git-Commit-Nachricht):
#   ./publish_release.sh
#
# Optional (mit expliziter Wunsch-Version):
#   ./publish_release.sh 1.1.0 "Großes Funktions-Update"
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
PLIST="$DIR/macos/Info.plist"
REPO="cookiegeschmack/EasyKitchen"

# 1) Erstes Argument = Versionsnummer (z. B. 1.1.0 oder v1.1.0) oder direkt die Message?
if [[ "${1:-}" =~ ^[vV]?[0-9]+\.[0-9]+(\.[0-9]+)?$ ]]; then
  CLEAN_VER="${1#v}"
  CLEAN_VER="${CLEAN_VER#V}"
  NOTES="${2:-}"
else
  CLEAN_VER=""
  NOTES="${1:-}"
fi

# 2) Keine explizite Version: höhere aus Info.plist / GitHub Latest Release nehmen, Patch +1
if [ -z "$CLEAN_VER" ]; then
  PLIST_VER=$(/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" "$PLIST" 2>/dev/null || echo "1.0.0")
  GH_LATEST=""
  if command -v gh >/dev/null 2>&1; then
    GH_LATEST=$(gh release view --repo "$REPO" --json tagName -q .tagName 2>/dev/null || echo "")
  fi
  if [ -z "$GH_LATEST" ]; then
    # Allererstes Release: aktuelle Plist-Version unverändert verwenden
    CLEAN_VER="$PLIST_VER"
  else
    CLEAN_VER=$(python3 -c '
import sys
def parse(v):
    v = (v or "").strip().lstrip("vV").split("-")[0]
    parts = [int(x) if x.isdigit() else 0 for x in v.split(".") if x != ""]
    while len(parts) < 3:
        parts.append(0)
    return parts[:3]
base = max(parse(sys.argv[1]), parse(sys.argv[2]))
base[2] += 1
print(f"{base[0]}.{base[1]}.{base[2]}")
' "$PLIST_VER" "$GH_LATEST")
  fi
fi

# 3) Keine Message: letzte Git-Commit-Message als Fallback
if [ -z "$NOTES" ]; then
  LAST_COMMIT=$(git -C "$DIR" log -1 --pretty=%B 2>/dev/null | head -n 1 || echo "")
  NOTES="${LAST_COMMIT:-EasyKitchen Update v$CLEAN_VER}"
fi

TAG="v$CLEAN_VER"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Starte Release-Build für EasyKitchen $TAG"
echo "📝 Release-Notizen: $NOTES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 4) Version in macos/Info.plist, app/js/updater.js und app/index.html synchronisieren
python3 -c '
import re, sys
plist_path, js_path, html_path, ver = sys.argv[1:5]

with open(plist_path, encoding="utf-8") as f:
    t = f.read()
t = re.sub(r"(<key>CFBundleVersion</key>\s*<string>)[^<]+(</string>)", rf"\g<1>{ver}\2", t)
t = re.sub(r"(<key>CFBundleShortVersionString</key>\s*<string>)[^<]+(</string>)", rf"\g<1>{ver}\2", t)
with open(plist_path, "w", encoding="utf-8") as f:
    f.write(t)

with open(js_path, encoding="utf-8") as f:
    t = f.read()
t = re.sub(r"const APP_FALLBACK_VERSION = \x27[^\x27]+\x27;", f"const APP_FALLBACK_VERSION = \x27{ver}\x27;", t)
with open(js_path, "w", encoding="utf-8") as f:
    f.write(t)

with open(html_path, encoding="utf-8") as f:
    t = f.read()
t = re.sub(r"(id=\"version-label\">v)[0-9.]+(<)", rf"\g<1>{ver}\2", t)
with open(html_path, "w", encoding="utf-8") as f:
    f.write(t)
' "$PLIST" "$DIR/app/js/updater.js" "$DIR/app/index.html" "$CLEAN_VER"

# 4b) „Was ist neu“: Changelog-Eintrag sicherstellen & Release-Notizen daraus erzeugen
#     Fehlt in app/js/changelog.js ein Eintrag für diese Version, wird er aus der
#     Release-Beschreibung angelegt (mehrere Punkte mit „;“ trennen).
CHANGELOG="$DIR/app/js/changelog.js"
NOTES_FILE=$(mktemp)
python3 - "$CHANGELOG" "$CLEAN_VER" "$NOTES" "$NOTES_FILE" <<'PYCL'
import re, sys, json, datetime
path, ver, notes, out = sys.argv[1:5]
src = open(path, encoding="utf-8").read()
if f"version: '{ver}'" not in src:
    items = [x.strip() for x in re.split(r";|\n", notes) if x.strip()] or [f"Verbesserungen und Fehlerbehebungen."]
    title = items[0] if len(items) == 1 else "Update"
    entry = "\n  {\n    version: '%s',\n    date: '%s',\n    title: %s,\n    items: [\n%s\n    ]\n  }," % (
        ver, datetime.date.today().isoformat(), json.dumps(title, ensure_ascii=False),
        ",\n".join("      " + json.dumps(i, ensure_ascii=False) for i in items))
    src = src.replace("// @@CHANGELOG_START@@", "// @@CHANGELOG_START@@" + entry, 1)
    open(path, "w", encoding="utf-8").write(src)
    print(f"  ✓ Changelog-Eintrag für v{ver} angelegt")
m = re.search(r"version: '%s'.*?title: (\"[^\"]*\"|'[^']*').*?items: \[(.*?)\]" % re.escape(ver), src, re.S)
lines = []
if m:
    title = m.group(1)[1:-1]
    found = re.findall(r"(?:'((?:[^'\\]|\\.)*)'|\"((?:[^\"\\]|\\.)*)\")", m.group(2))
    items = [a or b for a, b in found]
    lines = [f"## Was ist neu – {title}", ""] + [f"- {i}" for i in items]
open(out, "w", encoding="utf-8").write("\n".join(lines) or notes)
PYCL

# 5) EasyKitchen.app & EasyKitchen.dmg frisch bauen
bash "$DIR/build_dmg.sh"

# 6) All-in-One Start-Windows.bat (bettet den app/-Ordner komprimiert ein)
WIN_RELEASE_BAT="$DIR/.build_Start-Windows.bat"
echo "▶︎ Erstelle All-in-One Start-Windows.bat ($TAG) …"
python3 - "$DIR" "$CLEAN_VER" "$WIN_RELEASE_BAT" <<'PY'
import os, sys, io, zipfile, base64

root_dir, ver, out_bat = sys.argv[1], sys.argv[2], sys.argv[3]
app_dir = os.path.join(root_dir, "app")

buf = io.BytesIO()
with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
    for r, _, files in os.walk(app_dir):
        for f in sorted(files):
            if f == ".DS_Store":
                continue
            full = os.path.join(r, f)
            zf.write(full, os.path.relpath(full, root_dir).replace(os.sep, "/"))

b64_raw = base64.b64encode(buf.getvalue()).decode("ascii")
b64_lines = [b64_raw[i:i+76] for i in range(0, len(b64_raw), 76)]

browsers = [
    r"%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe",
    r"%ProgramFiles%\Microsoft\Edge\Application\msedge.exe",
    r"%ProgramFiles%\Google\Chrome\Application\chrome.exe",
    r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe",
]
launch = "".join(
    f'if exist "{b}" (\n  start "" "{b}" --app="file:///%APPFILE%" --user-data-dir="%PROFILE%" --window-size=1280,860\n  goto :eof\n)\n'
    for b in browsers
)

bat_header = f"""@echo off
REM ============================================================================
REM EasyKitchen v{ver} - All-in-One Windows-Starter
REM Entpackt die eingebettete App beim ersten Start nach %LOCALAPPDATA%\\EasyKitchen
REM oder startet direkt aus dem Projektordner.
REM ============================================================================
setlocal
set "VER={ver}"
set "PROFILE=%LOCALAPPDATA%\\EasyKitchen\\BrowserProfile"
set "LOCAL_APP=%~dp0app\\index.html"
set "RUNTIME_DIR=%LOCALAPPDATA%\\EasyKitchen\\Runtime\\v%VER%"
set "RUNTIME_APP=%RUNTIME_DIR%\\app\\index.html"

if exist "%LOCAL_APP%" (
  set "APPFILE=%LOCAL_APP%"
) else (
  if not exist "%RUNTIME_APP%" (
    echo EasyKitchen v%VER% wird fuer den ersten Start vorbereitet...
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
      "$lines = Get-Content -LiteralPath '%~f0'; " ^
      "$idx = [Array]::IndexOf($lines, ':: === EASYKITCHEN_PAYLOAD_BEGIN ==='); " ^
      "if ($idx -ge 0) {{ " ^
      "  $b64 = ($lines[($idx+1)..($lines.Length-1)] -join ''); " ^
      "  $bytes = [Convert]::FromBase64String($b64); " ^
      "  New-Item -ItemType Directory -Force -Path '%RUNTIME_DIR%' | Out-Null; " ^
      "  $zip = Join-Path '%RUNTIME_DIR%' 'app.zip'; " ^
      "  [IO.File]::WriteAllBytes($zip, $bytes); " ^
      "  Expand-Archive -LiteralPath $zip -DestinationPath '%RUNTIME_DIR%' -Force; " ^
      "  Remove-Item -LiteralPath $zip -Force -ErrorAction SilentlyContinue; " ^
      "}}"
  )
  set "APPFILE=%RUNTIME_APP%"
)

{launch}
start "" "%APPFILE%"
goto :eof
:: === EASYKITCHEN_PAYLOAD_BEGIN ===
"""

with open(out_bat, "w", encoding="utf-8", newline="\r\n") as f:
    f.write(bat_header + "\n".join(b64_lines) + "\n")
PY

# 7) Versions-Dateien committen & pushen (damit git status sauber bleibt)
if ! git -C "$DIR" diff --quiet -- "$PLIST" "$DIR/app/js/updater.js" "$DIR/app/index.html" "$CHANGELOG"; then
  echo "▶︎ Committe & pushe aktualisierte Release-Dateien ($TAG) …"
  git -C "$DIR" add "$PLIST" "$DIR/app/js/updater.js" "$DIR/app/index.html" "$CHANGELOG"
  git -C "$DIR" commit -m "chore(release): $TAG – $NOTES" || true
  git -C "$DIR" push || true
fi

# 8) GitHub Latest Release veröffentlichen (EasyKitchen.dmg + All-in-One Start-Windows.bat)
if command -v gh >/dev/null 2>&1; then
  echo "▶︎ Veröffentliche GitHub Latest Release $TAG …"
  TMP_BAT_DIR=$(mktemp -d)
  cp "$WIN_RELEASE_BAT" "$TMP_BAT_DIR/Start-Windows.bat"
  if gh release view "$TAG" --repo "$REPO" >/dev/null 2>&1; then
    gh release upload "$TAG" "$DIR/EasyKitchen.dmg" "$TMP_BAT_DIR/Start-Windows.bat" --repo "$REPO" --clobber
    gh release edit "$TAG" --repo "$REPO" --title "EasyKitchen $TAG" --notes-file "$NOTES_FILE" --latest
  else
    gh release create "$TAG" "$DIR/EasyKitchen.dmg" "$TMP_BAT_DIR/Start-Windows.bat" \
      --repo "$REPO" --title "EasyKitchen $TAG" --notes-file "$NOTES_FILE" --latest
  fi
  rm -rf "$WIN_RELEASE_BAT" "$TMP_BAT_DIR" "$NOTES_FILE"
  rm -f "$DIR/EasyKitchen.dmg"
  echo "🧹 Lokale EasyKitchen.dmg nach erfolgreichem Upload gelöscht."
  echo "✅ Release $TAG ist jetzt als Latest Release auf GitHub live!"
else
  echo "⚠️  'gh' CLI nicht gefunden. EasyKitchen.dmg liegt lokal bereit (wurde nicht hochgeladen)."
fi
