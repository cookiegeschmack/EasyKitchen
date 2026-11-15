@echo off
REM EasyKitchen (Windows-Starter)
REM Oeffnet die App in einem eigenen Fenster (ohne Browser-Leisten) mit Edge oder Chrome.
REM Rezepte werden im Browser-Speicher (localStorage) dieses Profils gespeichert.
REM Fuer Sicherheit regelmaessig in den Einstellungen "Backup speichern" nutzen.

setlocal
set "APPFILE=%~dp0app\index.html"
set "PROFILE=%LOCALAPPDATA%\EasyKitchen\BrowserProfile"

if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
  start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app="file:///%APPFILE%" --user-data-dir="%PROFILE%" --window-size=1280,860
  goto :eof
)
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
  start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app="file:///%APPFILE%" --user-data-dir="%PROFILE%" --window-size=1280,860
  goto :eof
)
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
  start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app="file:///%APPFILE%" --user-data-dir="%PROFILE%" --window-size=1280,860
  goto :eof
)
if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" (
  start "" "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" --app="file:///%APPFILE%" --user-data-dir="%PROFILE%" --window-size=1280,860
  goto :eof
)

REM Fallback: Standardbrowser
start "" "%APPFILE%"
