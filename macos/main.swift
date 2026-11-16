// EasyKitchen – native macOS wrapper (Cocoa + WKWebView, no Electron).
// Entwickelt von Duc Anh Hönemann. Struktur & Updater übernommen von FinPilot.
// Lädt app/index.html aus dem Bundle, speichert Rezepte unter
// ~/Library/Application Support/EasyKitchen/state.json und bietet
// native Speichern/Öffnen-Dialoge, Bildauswahl und 1-Klick-Updates über GitHub Releases.

import Cocoa
import WebKit
import UniformTypeIdentifiers
import PDFKit
import Vision

let APP_NAME = "EasyKitchen"
let GITHUB_REPO = "cookiegeschmack/EasyKitchen"
let JS_NS = "EasyKitchen"

final class AppDelegate: NSObject, NSApplicationDelegate, WKScriptMessageHandler, WKUIDelegate, WKNavigationDelegate, URLSessionDownloadDelegate {
    var window: NSWindow!
    var webView: WKWebView!
    var activeDownloadTask: URLSessionDownloadTask?
    var pendingUpdateTag: String?
    var pendingUpdateToken: String?
    var isTerminatingForUpdate = false
    var terminationReplySent = false
    var webReady = false
    var pendingOpenURLs: [URL] = []
    var pdfJobs: [PDFJob] = []

    /// Oberflächensprache ("de" / "en"), von der Web-App gesetzt; ohne Wahl wie das System.
    var appLanguage: String {
        if let l = UserDefaults.standard.string(forKey: "appLanguage"), l == "de" || l == "en" { return l }
        return systemLanguage
    }
    var systemLanguage: String { (Locale.preferredLanguages.first ?? "de").lowercased().hasPrefix("de") ? "de" : "en" }
    func L(_ de: String, _ en: String) -> String { appLanguage == "en" ? en : de }

    var currentAppVersion: String {
        (Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String) ?? "1.0.0"
    }

    var releasesLatestURL: String { "https://github.com/\(GITHUB_REPO)/releases/latest" }
    var dmgLatestURL: String { "https://github.com/\(GITHUB_REPO)/releases/latest/download/\(APP_NAME).dmg" }

    // MARK: Storage

    var storageURL: URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        let dir = base.appendingPathComponent(APP_NAME, isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir.appendingPathComponent("state.json")
    }

    func loadSavedState() -> String? {
        guard let data = try? Data(contentsOf: storageURL),
              let text = String(data: data, encoding: .utf8),
              !text.isEmpty else { return nil }
        return text
    }

    func saveState(_ json: String) {
        do {
            let backup = storageURL.deletingPathExtension().appendingPathExtension("backup.json")
            if FileManager.default.fileExists(atPath: storageURL.path) {
                try? FileManager.default.removeItem(at: backup)
                try? FileManager.default.copyItem(at: storageURL, to: backup)
            }
            try json.write(to: storageURL, atomically: true, encoding: .utf8)
            updateBootstrapScript(on: webView?.configuration.userContentController, with: json)
        } catch {
            NSLog("EasyKitchen: Speichern fehlgeschlagen: \(error)")
        }
    }

    func updateBootstrapScript(on controller: WKUserContentController?, with json: String?) {
        guard let controller = controller else { return }
        controller.removeAllUserScripts()
        var bootstrap = "window.__EK_NATIVE__ = true; window.__EK_VERSION__ = \(jsStringLiteral(currentAppVersion)); window.__EK_SYSTEM_LANG = \(jsStringLiteral(systemLanguage));"
        if let saved = json ?? loadSavedState() {
            bootstrap += "window.__EK_NATIVE_STATE__ = \(jsStringLiteral(saved));"
        }
        controller.addUserScript(WKUserScript(source: bootstrap, injectionTime: .atDocumentStart, forMainFrameOnly: true))
    }

    func jsStringLiteral(_ s: String) -> String {
        if let data = try? JSONSerialization.data(withJSONObject: [s], options: []),
           let arr = String(data: data, encoding: .utf8) {
            return "(\(arr))[0]"
        }
        return "null"
    }

    // MARK: Lifecycle

    func applicationDidFinishLaunching(_ notification: Notification) {
        if let iconURL = Bundle.main.url(forResource: "AppIcon", withExtension: "icns"),
           let iconImg = NSImage(contentsOf: iconURL) {
            NSApp.applicationIconImage = iconImg
        }
        buildMenu()

        let config = WKWebViewConfiguration()
        let controller = WKUserContentController()
        for name in ["nativeStorage", "nativeExport", "nativeImport", "nativeCheckUpdate",
                     "nativePerformUpdate", "nativeInstallLocalDMG", "nativeOpenURL",
                     "nativeExportPDF", "nativeShareFile", "nativeRecognize",
                     "nativeShareText", "nativeShareImage", "nativeSetAppearance", "nativeSetLanguage"] {
            controller.add(self, name: name)
        }
        updateBootstrapScript(on: controller, with: nil)
        config.userContentController = controller
        config.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")

        webView = WKWebView(frame: .zero, configuration: config)
        webView.uiDelegate = self
        webView.navigationDelegate = self
        webView.setValue(false, forKey: "drawsBackground")

        let screen = NSScreen.main?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1440, height: 900)
        let w = min(1280, screen.width * 0.9)
        let h = min(860, screen.height * 0.9)
        window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: w, height: h),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered, defer: false)
        window.collectionBehavior.insert(.fullScreenPrimary)
        window.title = APP_NAME
        window.titlebarAppearsTransparent = true
        window.titleVisibility = .hidden
        window.backgroundColor = NSColor.windowBackgroundColor
        window.minSize = NSSize(width: 720, height: 560)
        window.contentView = webView
        window.center()
        window.setFrameAutosaveName("EasyKitchenMainWindow")
        window.makeKeyAndOrderFront(nil)

        if let appDir = Bundle.main.resourceURL?.appendingPathComponent("app", isDirectory: true) {
            let index = appDir.appendingPathComponent("index.html")
            webView.loadFileURL(index, allowingReadAccessTo: appDir)
        }
        NSApp.activate(ignoringOtherApps: true)
        // Ergebnis eines vorherigen Updates prüfen (verhindert die Schleife „Update installiert → wieder alte Version“)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) { [weak self] in self?.checkUpdateOutcome() }
    }

    // MARK: Update-Ergebnis & Selbsthilfe

    var updateStatusURL: URL { storageURL.deletingLastPathComponent().appendingPathComponent("update-status.json") }
    /// Hier bleibt die Update-DMG liegen, falls die automatische Installation scheitert (für die manuelle Installation).
    var keptUpdateDMG: URL { storageURL.deletingLastPathComponent().appendingPathComponent("\(APP_NAME)-Update.dmg") }
    var standardAppPath: String { "/Applications/\(APP_NAME).app" }

    func appVersion(atPath path: String) -> String? {
        NSDictionary(contentsOfFile: (path as NSString).appendingPathComponent("Contents/Info.plist"))?["CFBundleShortVersionString"] as? String
    }

    func checkUpdateOutcome() {
        let fm = FileManager.default
        let current = currentAppVersion
        let here = Bundle.main.bundlePath
        if let data = try? Data(contentsOf: updateStatusURL),
           let st = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] {
            try? fm.removeItem(at: updateStatusURL)
            let expected = (st["expected"] as? String) ?? ""
            let ok = (st["ok"] as? Bool) ?? false
            let dest = (st["dest"] as? String) ?? ""
            let err = (st["error"] as? String) ?? ""
            if !expected.isEmpty && compareVersions(current, expected) >= 0 {
                try? fm.removeItem(at: keptUpdateDMG)
                toast(L("Update auf v\(current) installiert ✓", "Updated to v\(current) ✓"))
                return
            }
            if ok, !dest.isEmpty, dest != here, let v = appVersion(atPath: dest), compareVersions(v, current) > 0 {
                offerOpenNewerCopy(path: dest, version: v)
                return
            }
            if !expected.isEmpty {
                offerManualInstall(reason: err.isEmpty ? L("Die neue Version v\(expected) konnte nicht eingesetzt werden.", "The new version v\(expected) could not be installed.") : err)
                return
            }
        }
        // Alte Kopie gestartet (z. B. direkt aus der DMG oder aus „Downloads“), obwohl im Programme-Ordner eine neuere liegt
        if here != standardAppPath, let v = appVersion(atPath: standardAppPath),
           compareVersions(v, current) > 0 || (isTemporaryLocation && compareVersions(v, current) == 0) {
            offerOpenNewerCopy(path: standardAppPath, version: v)
            return
        }
        // Direkt aus der DMG / aus „Downloads“ gestartet → anbieten, in den Programme-Ordner zu verschieben
        if isTemporaryLocation && !UserDefaults.standard.bool(forKey: "skipMoveToApplications") {
            offerMoveToApplications()
        }
    }

    /// Läuft die App von einem Ort, an dem sie nicht bleiben sollte (DMG, App Translocation, Downloads)?
    var isTemporaryLocation: Bool {
        let p = Bundle.main.bundlePath
        let downloads = (FileManager.default.urls(for: .downloadsDirectory, in: .userDomainMask).first?.path ?? "/nonexistent") + "/"
        return p.hasPrefix("/Volumes/") || p.contains("/AppTranslocation/") || p.hasPrefix(downloads)
    }

    func offerMoveToApplications() {
        let alert = NSAlert()
        alert.messageText = L("In den Programme-Ordner verschieben?", "Move to Applications folder?")
        alert.informativeText = L("\(APP_NAME) läuft gerade direkt aus dem Installationsfenster (DMG) bzw. aus „Downloads“ – also wie von einem externen Laufwerk.\n\nDamit \(APP_NAME) wie ein normales Programm funktioniert (Launchpad, Spotlight, Updates), sollte es im Programme-Ordner liegen. Ein Klick genügt: \(APP_NAME) wird dorthin kopiert und neu gestartet. Deine Rezepte bleiben erhalten.",
                                  "\(APP_NAME) is currently running directly from the installer window (DMG) or from “Downloads” – like from an external drive.\n\nTo work like a normal app (Launchpad, Spotlight, updates), \(APP_NAME) should be in the Applications folder. One click is enough: \(APP_NAME) is copied there and restarted. Your recipes are kept.")
        alert.addButton(withTitle: L("In Programme verschieben", "Move to Applications"))
        alert.addButton(withTitle: L("Nicht jetzt", "Not Now"))
        alert.showsSuppressionButton = true
        alert.suppressionButton?.title = L("Nicht mehr fragen", "Don’t ask again")
        let resp = alert.runModal()
        if alert.suppressionButton?.state == .on { UserDefaults.standard.set(true, forKey: "skipMoveToApplications") }
        guard resp == .alertFirstButtonReturn else { return }

        let dest = standardAppPath
        let check = canReplaceApp(at: dest)
        if !check.ok {
            let a = NSAlert()
            a.alertStyle = .warning
            a.messageText = L("Verschieben nicht möglich", "Moving not possible")
            a.informativeText = check.reason + L("\n\nZiehe \(APP_NAME) bitte selbst in den Programme-Ordner – das Finder-Fenster öffnet sich gleich.", "\n\nPlease drag \(APP_NAME) into the Applications folder yourself – the Finder window opens now.")
            a.runModal()
            NSWorkspace.shared.activateFileViewerSelecting([Bundle.main.bundleURL])
            NSWorkspace.shared.open(URL(fileURLWithPath: "/Applications"))
            return
        }

        let src = Bundle.main.bundlePath
        let pid = ProcessInfo.processInfo.processIdentifier
        // Aus einer DMG gestartet → Laufwerk danach auswerfen
        var volume = ""
        if src.hasPrefix("/Volumes/") {
            let comps = src.split(separator: "/")
            if comps.count >= 2 { volume = "/Volumes/" + comps[1] }
        }
        let scriptPath = (NSTemporaryDirectory() as NSString).appendingPathComponent("easykitchen_move_\(pid).sh")
        let script = """
        #!/bin/bash
        exec </dev/null >/dev/null 2>&1
        for i in $(seq 1 80); do kill -0 \(pid) 2>/dev/null || break; sleep 0.1; done
        DEST="\(dest)"
        TMP="/Applications/.\(APP_NAME)-neu-$$.app"
        BAK="/Applications/.\(APP_NAME)-alt-$$.app"
        rm -rf "$TMP"
        if /usr/bin/ditto "\(src)" "$TMP"; then
          /usr/bin/xattr -cr "$TMP" 2>/dev/null || true
          if [ -e "$DEST" ]; then mv "$DEST" "$BAK" || { rm -rf "$TMP"; /usr/bin/open "\(src)"; exit 0; }; fi
          if mv "$TMP" "$DEST"; then rm -rf "$BAK"; else mv "$BAK" "$DEST" 2>/dev/null; fi
        fi
        rm -rf "$TMP" 2>/dev/null
        if [ -d "$DEST" ]; then
          /System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f "$DEST" 2>/dev/null || true
          /usr/bin/open "$DEST"
          \(volume.isEmpty ? "" : "sleep 2; /usr/bin/hdiutil detach \"\(volume)\" -quiet || true")
        else
          /usr/bin/open "\(src)"
        fi
        rm -f "\(scriptPath)"
        """
        do {
            try script.write(toFile: scriptPath, atomically: true, encoding: .utf8)
            let p = Process()
            p.executableURL = URL(fileURLWithPath: "/bin/bash")
            p.arguments = [scriptPath]
            p.standardInput = FileHandle.nullDevice
            p.standardOutput = FileHandle.nullDevice
            p.standardError = FileHandle.nullDevice
            try p.run()
            quitForUpdate()
        } catch {
            showAlert(L("Verschieben fehlgeschlagen: ", "Moving failed: ") + error.localizedDescription)
        }
    }

    func offerOpenNewerCopy(path: String, version: String) {
        let alert = NSAlert()
        alert.messageText = L("Neuere Version gefunden", "Newer version found")
        alert.informativeText = L("Du hast eine ältere Kopie von \(APP_NAME) (v\(currentAppVersion)) geöffnet:\n\(Bundle.main.bundlePath)\n\nDie aktuelle Version v\(version) liegt hier:\n\(path)\n\nTipp: Öffne \(APP_NAME) künftig aus dem Programme-Ordner und lösche die alte Kopie bzw. wirf die DMG aus.",
                                  "You opened an older copy of \(APP_NAME) (v\(currentAppVersion)):\n\(Bundle.main.bundlePath)\n\nThe current version v\(version) is here:\n\(path)\n\nTip: Open \(APP_NAME) from the Applications folder from now on and delete the old copy or eject the DMG.")
        alert.addButton(withTitle: L("Neue Version öffnen", "Open New Version"))
        alert.addButton(withTitle: L("Später", "Later"))
        if alert.runModal() == .alertFirstButtonReturn {
            let cfg = NSWorkspace.OpenConfiguration()
            cfg.createsNewApplicationInstance = true
            NSWorkspace.shared.openApplication(at: URL(fileURLWithPath: path), configuration: cfg) { _, _ in
                DispatchQueue.main.async { NSApp.terminate(nil) }
            }
        }
    }

    /// Automatische Installation nicht möglich → verständlich erklären und manuelle Installation anbieten.
    func offerManualInstall(reason: String) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            let hasDMG = FileManager.default.fileExists(atPath: self.keptUpdateDMG.path)
            let alert = NSAlert()
            alert.alertStyle = .warning
            alert.messageText = L("Update konnte nicht automatisch installiert werden", "The update could not be installed automatically")
            alert.informativeText = reason + self.L("\n\nSo klappt es:\n• Manuell installieren: Das Update-Fenster öffnet sich und \(APP_NAME) wird beendet. Ziehe dann „\(APP_NAME)“ auf „Applications“ und wähle „Ersetzen“.\n• Oder dauerhaft erlauben: Systemeinstellungen → Datenschutz & Sicherheit → App-Verwaltung → \(APP_NAME) einschalten. Danach klappen Updates wieder automatisch.\n\nDeine Rezepte bleiben in jedem Fall erhalten.",
                                                    "\n\nHow to fix it:\n• Install manually: the update window opens and \(APP_NAME) quits. Then drag “\(APP_NAME)” onto “Applications” and choose “Replace”.\n• Or allow it permanently: System Settings → Privacy & Security → App Management → turn on \(APP_NAME). Updates will then work automatically again.\n\nYour recipes are kept in any case.")
            alert.addButton(withTitle: hasDMG ? self.L("Manuell installieren", "Install Manually") : self.L("Download-Seite öffnen", "Open Download Page"))
            alert.addButton(withTitle: self.L("Systemeinstellungen öffnen", "Open System Settings"))
            alert.addButton(withTitle: self.L("Abbrechen", "Cancel"))
            switch alert.runModal() {
            case .alertFirstButtonReturn:
                if hasDMG {
                    NSWorkspace.shared.open(self.keptUpdateDMG)
                    // App beenden, damit Finder sie ersetzen darf
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) { NSApp.terminate(nil) }
                } else if let url = URL(string: self.releasesLatestURL) {
                    NSWorkspace.shared.open(url)
                }
            case .alertSecondButtonReturn:
                if let url = URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_AppBundles") {
                    NSWorkspace.shared.open(url)
                }
            default: break
            }
        }
    }

    /// Prüft VOR dem Beenden, ob die App an ihrem Ziel ersetzt werden darf (Schreibrechte, macOS-Schutz „App-Verwaltung“).
    func canReplaceApp(at dest: String) -> (ok: Bool, reason: String) {
        let fm = FileManager.default
        let parent = (dest as NSString).deletingLastPathComponent
        if !fm.isWritableFile(atPath: parent) {
            return (false, L("Für den Ordner „\(parent)“ fehlen die Schreibrechte (z. B. weil \(APP_NAME) von einem anderen Benutzer installiert wurde).", "There is no write permission for the folder “\(parent)” (e.g. because \(APP_NAME) was installed by another user)."))
        }
        if fm.fileExists(atPath: dest) {
            let probe = (dest as NSString).appendingPathComponent("Contents/.easykitchen-update-test")
            if !fm.createFile(atPath: probe, contents: Data()) {
                return (false, L("macOS erlaubt \(APP_NAME) nicht, sich selbst zu aktualisieren (Schutz „App-Verwaltung“).", "macOS does not allow \(APP_NAME) to update itself (“App Management” protection)."))
            }
            try? fm.removeItem(atPath: probe)
        }
        return (true, "")
    }

    /// Update-DMG für eine eventuelle manuelle Installation aufheben.
    func keepDMGForManualInstall(_ source: URL) {
        guard source.pathExtension.lowercased() == "dmg", source.path != keptUpdateDMG.path else { return }
        try? FileManager.default.removeItem(at: keptUpdateDMG)
        try? FileManager.default.copyItem(at: source, to: keptUpdateDMG)
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }

    func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply {
        if isTerminatingForUpdate { return .terminateNow }
        guard let webView = webView else { return .terminateNow }
        terminationReplySent = false
        let finish = { [weak self] in
            guard let self = self, !self.terminationReplySent else { return }
            self.terminationReplySent = true
            NSApp.reply(toApplicationShouldTerminate: true)
        }
        // Sicherheits-Timeout, damit das Beenden niemals hängen bleibt
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.35, execute: finish)
        webView.evaluateJavaScript("window.dispatchEvent(new Event('pagehide')); true") { _, _ in
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1, execute: finish)
        }
        return .terminateLater
    }

    // MARK: JS → Native

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        switch message.name {
        case "nativeStorage":
            if let json = message.body as? String { saveState(json) }
        case "nativeExport":
            guard let dict = message.body as? [String: Any],
                  let content = dict["content"] as? String else { return }
            let filename = (dict["filename"] as? String) ?? "easykitchen-backup.json"
            let toastText = (dict["toast"] as? String) ?? "Gespeichert ✓"
            let panel = NSSavePanel()
            panel.nameFieldStringValue = filename
            panel.allowedContentTypes = [contentType(forFilename: filename)]
            panel.beginSheetModal(for: window) { [weak self] resp in
                guard let self = self, resp == .OK, let url = panel.url else { return }
                do {
                    try content.write(to: url, atomically: true, encoding: .utf8)
                    self.toast(toastText)
                } catch {
                    self.showAlert(self.L("Datei konnte nicht gespeichert werden: ", "The file could not be saved: ") + error.localizedDescription)
                }
            }
        case "nativeImport":
            let panel = NSOpenPanel()
            panel.title = "EasyKitchen-Backup (.json) laden"
            panel.prompt = "Laden"
            panel.allowsMultipleSelection = false
            panel.canChooseDirectories = false
            panel.allowedContentTypes = [.json]
            panel.beginSheetModal(for: window) { [weak self] resp in
                guard let self = self, resp == .OK, let url = panel.url else { return }
                do {
                    let content = try String(contentsOf: url, encoding: .utf8)
                    self.webView.evaluateJavaScript("\(JS_NS).App && \(JS_NS).App.importBackupJSON(\(self.jsStringLiteral(content)))")
                } catch {
                    self.showAlert(self.L("Backup konnte nicht gelesen werden: ", "The backup could not be read: ") + error.localizedDescription)
                }
            }
        case "nativeExportPDF":
            exportPDF(dict: (message.body as? [String: Any]) ?? [:])
        case "nativeShareFile":
            guard let dict = message.body as? [String: Any],
                  let content = dict["content"] as? String,
                  let filename = dict["filename"] as? String else { return }
            let url = tempFileURL(filename)
            do {
                try content.write(to: url, atomically: true, encoding: .utf8)
                share(items: [url])
            } catch {
                showAlert(L("Datei konnte nicht vorbereitet werden: ", "The file could not be prepared: ") + error.localizedDescription)
            }
        case "nativeShareText":
            if let text = (message.body as? [String: Any])?["text"] as? String { share(items: [text]) }
        case "nativeShareImage":
            guard let dict = message.body as? [String: Any],
                  let b64 = dict["base64"] as? String,
                  let data = Data(base64Encoded: b64) else { return }
            let filename = (dict["filename"] as? String) ?? "Einkaufsliste.png"
            if (dict["action"] as? String) == "share" {
                let url = tempFileURL(filename)
                do { try data.write(to: url); share(items: [url]) }
                catch { showAlert(L("Bild konnte nicht vorbereitet werden: ", "The image could not be prepared: ") + error.localizedDescription) }
            } else {
                let panel = NSSavePanel()
                panel.nameFieldStringValue = filename
                panel.allowedContentTypes = [.png]
                panel.beginSheetModal(for: window) { [weak self] resp in
                    guard let self = self, resp == .OK, let url = panel.url else { return }
                    do { try data.write(to: url); self.toast(self.L("Bild gespeichert ✓", "Image saved ✓")); NSWorkspace.shared.activateFileViewerSelecting([url]) }
                    catch { self.showAlert(self.L("Bild konnte nicht gespeichert werden: ", "The image could not be saved: ") + error.localizedDescription) }
                }
            }
        case "nativeSetLanguage":
            if let d = message.body as? [String: Any], let lang = d["lang"] as? String, lang == "de" || lang == "en" {
                if UserDefaults.standard.string(forKey: "appLanguage") != lang {
                    UserDefaults.standard.set(lang, forKey: "appLanguage")
                    buildMenu()
                }
            }
        case "nativeSetAppearance":
            // „light“ / „dark“ erzwingen, sonst Systemeinstellung (auch für Dialoge & Teilen-Menü)
            switch message.body as? String {
            case "light": NSApp.appearance = NSAppearance(named: .aqua)
            case "dark": NSApp.appearance = NSAppearance(named: .darkAqua)
            default: NSApp.appearance = nil
            }
        case "nativeRecognize":
            recognize(dict: (message.body as? [String: Any]) ?? [:])
        case "nativeOpenURL":
            if let s = message.body as? String, let url = URL(string: s) { NSWorkspace.shared.open(url) }
        case "nativeCheckUpdate":
            let dict = message.body as? [String: Any]
            checkForUpdates(manual: (dict?["manual"] as? Bool) ?? false,
                            customToken: dict?["token"] as? String,
                            simulatedCurrentVersion: dict?["simulatedCurrentVersion"] as? String)
        case "nativePerformUpdate":
            performRemoteUpdate(dict: (message.body as? [String: Any]) ?? [:])
        case "nativeInstallLocalDMG":
            promptOrInstallLocalDMG(dict: (message.body as? [String: Any]) ?? [:])
        default:
            break
        }
    }

    // MARK: WKUIDelegate (alert / confirm / prompt / file input)

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        showAlert(message)
        completionHandler()
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let alert = NSAlert()
        alert.messageText = APP_NAME
        alert.informativeText = message
        alert.addButton(withTitle: "OK")
        alert.addButton(withTitle: "Abbrechen")
        completionHandler(alert.runModal() == .alertFirstButtonReturn)
    }

    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String,
                 defaultText: String?, initiatedByFrame frame: WKFrameInfo,
                 completionHandler: @escaping (String?) -> Void) {
        let alert = NSAlert()
        alert.messageText = APP_NAME
        alert.informativeText = prompt
        alert.addButton(withTitle: "OK")
        alert.addButton(withTitle: "Abbrechen")
        let input = NSTextField(frame: NSRect(x: 0, y: 0, width: 280, height: 24))
        input.stringValue = defaultText ?? ""
        alert.accessoryView = input
        completionHandler(alert.runModal() == .alertFirstButtonReturn ? input.stringValue : nil)
    }

    // <input type="file"> → Bildauswahl (Rezeptfotos) bzw. JSON (Backup)
    func webView(_ webView: WKWebView, runOpenPanelWith parameters: WKOpenPanelParameters,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping ([URL]?) -> Void) {
        let panel = NSOpenPanel()
        panel.allowsMultipleSelection = parameters.allowsMultipleSelection
        panel.canChooseDirectories = false
        var types: [UTType] = [.image, .json, .pdf, .plainText]
        if let ek = UTType(filenameExtension: "easykitchen") { types.append(ek) }
        panel.allowedContentTypes = types
        panel.beginSheetModal(for: window) { resp in
            completionHandler(resp == .OK ? panel.urls : nil)
        }
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        guard webView === self.webView else { return }
        webReady = true
        flushPendingOpenURLs()
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if webView !== self.webView { decisionHandler(.allow); return }
        if let url = navigationAction.request.url, url.scheme == "http" || url.scheme == "https" {
            NSWorkspace.shared.open(url)
            decisionHandler(.cancel)
            return
        }
        decisionHandler(.allow)
    }

    func showAlert(_ text: String) {
        let alert = NSAlert()
        alert.messageText = APP_NAME
        alert.informativeText = text
        alert.runModal()
    }

    func toast(_ text: String) {
        webView?.evaluateJavaScript("\(JS_NS).UI && \(JS_NS).UI.toast(\(jsStringLiteral(text)))")
    }

    func contentType(forFilename name: String) -> UTType {
        let ext = (name as NSString).pathExtension.lowercased()
        if ext == "json" { return .json }
        if ext == "pdf" { return .pdf }
        return UTType(filenameExtension: ext) ?? .data
    }

    func tempFileURL(_ filename: String) -> URL {
        let dir = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent("easykitchen_share_\(UUID().uuidString)", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let safe = filename.replacingOccurrences(of: "/", with: "-").replacingOccurrences(of: ":", with: "-")
        return dir.appendingPathComponent(safe)
    }

    /// macOS-Teilen-Menü (AirDrop, Nachrichten, Mail, …) unter dem Mauszeiger öffnen.
    func share(items: [Any]) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self, let view = self.webView, let win = self.window else { return }
            let picker = NSSharingServicePicker(items: items)
            var p = view.convert(win.mouseLocationOutsideOfEventStream, from: nil)
            if !view.bounds.contains(p) { p = NSPoint(x: view.bounds.midX, y: view.bounds.midY) }
            picker.show(relativeTo: NSRect(x: p.x - 1, y: p.y - 1, width: 2, height: 2), of: view, preferredEdge: .minY)
        }
    }

    // MARK: Dateien per Finder öffnen („Öffnen mit“, Doppelklick auf .easykitchen)

    func application(_ application: NSApplication, open urls: [URL]) {
        pendingOpenURLs.append(contentsOf: urls)
        if webReady { flushPendingOpenURLs() }
    }

    func flushPendingOpenURLs() {
        guard !pendingOpenURLs.isEmpty else { return }
        let urls = pendingOpenURLs
        pendingOpenURLs.removeAll()
        let files: [[String: Any]] = urls.compactMap { url in
            guard let data = try? Data(contentsOf: url) else { return nil }
            return ["name": url.lastPathComponent, "base64": data.base64EncodedString()]
        }
        sendJSONToJS(fn: "\(JS_NS).App.importFiles", payload: ["files": files])
        NSApp.activate(ignoringOtherApps: true)
    }

    // MARK: PDF-Export (HTML → paginierte A4-PDF, Rezeptdaten eingebettet)

    final class PDFJob: NSObject, WKNavigationDelegate {
        let html: String
        let embed: String
        let target: URL
        let share: Bool
        weak var owner: AppDelegate?
        var win: NSWindow!
        var web: WKWebView!

        init(html: String, embed: String, target: URL, share: Bool, owner: AppDelegate) {
            self.html = html; self.embed = embed; self.target = target; self.share = share; self.owner = owner
        }

        func start(baseURL: URL?) {
            // A4 bei 96 dpi; unsichtbares Fenster, damit WebKit korrekt layoutet
            let frame = NSRect(x: 0, y: 0, width: 794, height: 1123)
            win = NSWindow(contentRect: frame.offsetBy(dx: -20000, dy: -20000), styleMask: [.borderless], backing: .buffered, defer: false)
            win.isReleasedWhenClosed = false
            web = WKWebView(frame: frame)
            web.navigationDelegate = self
            win.contentView = web
            web.loadHTMLString(html, baseURL: baseURL)
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            // kurz warten, bis eingebettete Fotos dekodiert sind
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { [weak self] in self?.print() }
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { finish(false) }

        func print() {
            let info = NSPrintInfo()
            info.paperSize = NSSize(width: 595.28, height: 841.89)
            info.topMargin = 0; info.bottomMargin = 0; info.leftMargin = 0; info.rightMargin = 0
            info.horizontalPagination = .fit
            info.verticalPagination = .automatic
            info.isHorizontallyCentered = false
            info.isVerticallyCentered = false
            info.jobDisposition = .save
            info.dictionary()[NSPrintInfo.AttributeKey.jobSavingURL] = target
            let op = web.printOperation(with: info)
            op.showsPrintPanel = false
            op.showsProgressPanel = false
            op.view?.frame = web.bounds
            op.runModal(for: win, delegate: self, didRun: #selector(printDone(_:success:contextInfo:)), contextInfo: nil)
        }

        @objc func printDone(_ op: NSPrintOperation, success: Bool, contextInfo: UnsafeMutableRawPointer?) {
            // macOS kann diesen Rückruf auf einem Hintergrund-Thread liefern →
            // Fenster schließen, Teilen-Menü & Hinweise nur auf dem Haupt-Thread (sonst Absturz)
            DispatchQueue.main.async { [self] in completePrint(success: success) }
        }

        func completePrint(success: Bool) {
            if success, let doc = PDFDocument(url: target) {
                // leere Schlussseiten (knapper Überlauf) entfernen
                while doc.pageCount > 1, let last = doc.page(at: doc.pageCount - 1),
                      (last.string ?? "").trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
                      last.annotations.isEmpty {
                    doc.removePage(at: doc.pageCount - 1)
                }
                var attrs = doc.documentAttributes ?? [:]
                attrs[PDFDocumentAttribute.titleAttribute] = target.deletingPathExtension().lastPathComponent
                attrs[PDFDocumentAttribute.creatorAttribute] = APP_NAME
                if !embed.isEmpty {
                    attrs[PDFDocumentAttribute.keywordsAttribute] = ["EasyKitchen", "EKDATA:" + Data(embed.utf8).base64EncodedString()]
                }
                doc.documentAttributes = attrs
                _ = doc.write(to: target)
            }
            finish(success)
        }

        func finish(_ success: Bool) {
            guard Thread.isMainThread else {
                DispatchQueue.main.async { [self] in finish(success) }
                return
            }
            web?.navigationDelegate = nil
            win?.orderOut(nil)
            win?.contentView = nil
            web = nil
            owner?.pdfJobFinished(self, success: success)
        }
    }

    func exportPDF(dict: [String: Any]) {
        guard let html = dict["html"] as? String else { return }
        let filename = (dict["filename"] as? String) ?? "Rezept.pdf"
        let embed = (dict["embed"] as? String) ?? ""
        let wantsShare = (dict["action"] as? String) == "share"
        let baseURL = Bundle.main.resourceURL?.appendingPathComponent("app", isDirectory: true)

        let run: (URL) -> Void = { [weak self] url in
            guard let self = self else { return }
            let job = PDFJob(html: html, embed: embed, target: url, share: wantsShare, owner: self)
            self.pdfJobs.append(job)
            job.start(baseURL: baseURL)
        }
        if wantsShare {
            run(tempFileURL(filename))
        } else {
            let panel = NSSavePanel()
            panel.nameFieldStringValue = filename
            panel.allowedContentTypes = [.pdf]
            panel.beginSheetModal(for: window) { resp in
                guard resp == .OK, let url = panel.url else { return }
                run(url)
            }
        }
    }

    func pdfJobFinished(_ job: PDFJob, success: Bool) {
        pdfJobs.removeAll { $0 === job }
        guard success else {
            showAlert("Die PDF konnte nicht erstellt werden.")
            return
        }
        if job.share {
            share(items: [job.target])
        } else {
            toast("PDF gespeichert ✓")
            NSWorkspace.shared.activateFileViewerSelecting([job.target])
        }
    }

    // MARK: Import – Texterkennung (Vision) für Bilder & PDFs

    func recognize(dict: [String: Any]) {
        let jobId = (dict["id"] as? String) ?? ""
        let files = (dict["files"] as? [[String: Any]]) ?? []
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self = self else { return }
            if files.isEmpty { self.warmUpOCR(); return }
            var results: [[String: Any]] = []
            for f in files {
                let name = (f["name"] as? String) ?? "Datei"
                guard let b64 = f["base64"] as? String, let data = Data(base64Encoded: b64) else {
                    results.append(["name": name, "error": L("Datei konnte nicht gelesen werden.", "The file could not be read.")])
                    continue
                }
                results.append(self.recognizeFile(name: name, data: data))
            }
            self.sendJSONToJS(fn: "\(JS_NS).App.onRecognizeResult", payload: ["id": jobId, "results": results])
        }
    }

    func recognizeFile(name: String, data: Data) -> [String: Any] {
        let isPDF = name.lowercased().hasSuffix(".pdf") || data.starts(with: [0x25, 0x50, 0x44, 0x46])
        if isPDF {
            guard let doc = PDFDocument(data: data) else { return ["name": name, "error": L("PDF konnte nicht geöffnet werden.", "The PDF could not be opened.")] }
            // Von EasyKitchen erzeugte PDF? → exakte Rezeptdaten statt Texterkennung
            if let kw = doc.documentAttributes?[PDFDocumentAttribute.keywordsAttribute] {
                let words: [String] = (kw as? [String]) ?? [(kw as? String) ?? ""]
                for w in words {
                    if let r = w.range(of: "EKDATA:"),
                       let raw = Data(base64Encoded: String(w[r.upperBound...]).trimmingCharacters(in: .whitespaces)),
                       let json = String(data: raw, encoding: .utf8) {
                        return ["name": name, "kind": "easykitchen", "text": json]
                    }
                }
            }
            var texts: [String] = []
            for i in 0..<min(doc.pageCount, 30) {
                guard let page = doc.page(at: i) else { continue }
                let embedded = (page.string ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
                if embedded.count > 40 {
                    texts.append(embedded)
                } else if let cg = renderPage(page) {
                    texts.append(ocr(cgImage: cg))
                }
            }
            return ["name": name, "kind": "text", "text": texts.joined(separator: "\n")]
        }
        guard let img = NSImage(data: data),
              let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
            return ["name": name, "error": L("Dieses Bildformat wird nicht unterstützt.", "This image format is not supported.")]
        }
        return ["name": name, "kind": "text", "text": ocr(cgImage: cg)]
    }

    /// Lädt das Vision-Modell vorab (der erste Aufruf dauert sonst 20–30 s).
    func warmUpOCR() {
        let size = NSSize(width: 240, height: 60)
        let img = NSImage(size: size, flipped: false) { r in
            NSColor.white.setFill(); r.fill()
            ("Zutaten 200 g" as NSString).draw(at: NSPoint(x: 8, y: 18), withAttributes: [.font: NSFont.systemFont(ofSize: 22)])
            return true
        }
        if let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) { _ = ocr(cgImage: cg) }
    }

    func renderPage(_ page: PDFPage) -> CGImage? {
        let bounds = page.bounds(for: .mediaBox)
        let scale: CGFloat = 2.5
        let w = Int(bounds.width * scale), h = Int(bounds.height * scale)
        guard w > 0, h > 0, let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: 0,
                                                 space: CGColorSpaceCreateDeviceRGB(),
                                                 bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue) else { return nil }
        ctx.setFillColor(NSColor.white.cgColor)
        ctx.fill(CGRect(x: 0, y: 0, width: w, height: h))
        ctx.scaleBy(x: scale, y: scale)
        page.draw(with: .mediaBox, to: ctx)
        return ctx.makeImage()
    }

    /// Erkennt Text und setzt ihn zeilenweise zusammen (Spalten wie „200 g | Mehl“ landen in einer Zeile).
    func ocr(cgImage: CGImage) -> String {
        let req = VNRecognizeTextRequest()
        req.recognitionLevel = .accurate
        req.usesLanguageCorrection = true
        req.recognitionLanguages = ["de-DE", "en-US"]
        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        do { try handler.perform([req]) } catch { return "" }
        let obs = (req.results ?? []).compactMap { o -> (box: CGRect, text: String)? in
            guard let t = o.topCandidates(1).first?.string, !t.isEmpty else { return nil }
            return (o.boundingBox, t)
        }
        // nach Zeilen gruppieren (Vision: Ursprung unten links)
        let sorted = obs.sorted { $0.box.midY > $1.box.midY }
        var lines: [[(box: CGRect, text: String)]] = []
        for o in sorted {
            if let idx = lines.indices.last,
               let ref = lines[idx].first,
               abs(ref.box.midY - o.box.midY) < max(ref.box.height, o.box.height) * 0.55 {
                lines[idx].append(o)
            } else {
                lines.append([o])
            }
        }
        return lines.map { $0.sorted { $0.box.minX < $1.box.minX }.map { $0.text }.joined(separator: "  ") }
            .joined(separator: "\n")
    }

    // MARK: In-App Updater (GitHub Releases + gh CLI + lokaler DMG-Fallback)

    func sendJSONToJS(fn: String, payload: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: payload, options: []),
              let jsonStr = String(data: data, encoding: .utf8) else { return }
        DispatchQueue.main.async { [weak self] in
            self?.webView?.evaluateJavaScript("\(fn) && \(fn)(\(jsonStr))")
        }
    }

    func progress(_ stage: String, _ percent: Int, _ message: String) {
        sendJSONToJS(fn: "\(JS_NS).App.onUpdateProgress", payload: ["stage": stage, "percent": percent, "message": message])
    }

    func findGHBinary() -> String? {
        // Testschalter: simuliert einen Mac ohne GitHub-Anmeldung (wie bei Freunden)
        if ProcessInfo.processInfo.environment["EASYKITCHEN_NO_GH"] == "1" { return nil }
        let home = NSHomeDirectory()
        let candidates = ["/opt/homebrew/bin/gh", "/usr/local/bin/gh", "/usr/bin/gh", "\(home)/.local/bin/gh", "\(home)/bin/gh"]
        return candidates.first { FileManager.default.isExecutableFile(atPath: $0) }
    }

    func runProcess(_ launchPath: String, args: [String], timeout: TimeInterval = 20) -> (exitCode: Int32, stdout: String, stderr: String) {
        let proc = Process()
        proc.executableURL = URL(fileURLWithPath: launchPath)
        proc.arguments = args
        var env = ProcessInfo.processInfo.environment
        env["PATH"] = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
        env["GH_PROMPT_DISABLED"] = "1"
        env["NO_COLOR"] = "1"
        proc.environment = env
        proc.standardInput = FileHandle.nullDevice
        let outPipe = Pipe(), errPipe = Pipe()
        proc.standardOutput = outPipe
        proc.standardError = errPipe

        var outData = Data(), errData = Data()
        let group = DispatchGroup()
        group.enter()
        DispatchQueue.global().async { outData = outPipe.fileHandleForReading.readDataToEndOfFile(); group.leave() }
        group.enter()
        DispatchQueue.global().async { errData = errPipe.fileHandleForReading.readDataToEndOfFile(); group.leave() }

        do { try proc.run() } catch { return (-1, "", error.localizedDescription) }

        let waitSem = DispatchSemaphore(value: 0)
        proc.terminationHandler = { _ in waitSem.signal() }
        if waitSem.wait(timeout: .now() + timeout) == .timedOut {
            proc.terminate()
            return (-2, "", "Zeitüberschreitung nach \(Int(timeout))s")
        }
        _ = group.wait(timeout: .now() + 2)
        let out = String(data: outData, encoding: .utf8) ?? ""
        let err = String(data: errData, encoding: .utf8) ?? ""
        return (proc.terminationStatus, out.trimmingCharacters(in: .whitespacesAndNewlines), err.trimmingCharacters(in: .whitespacesAndNewlines))
    }

    func resolveGitHubToken(customToken: String?) -> (token: String?, source: String) {
        if let custom = customToken?.trimmingCharacters(in: .whitespacesAndNewlines), !custom.isEmpty {
            return (custom, "token")
        }
        if let ghPath = findGHBinary() {
            let res = runProcess(ghPath, args: ["auth", "token"])
            if res.exitCode == 0 && !res.stdout.isEmpty { return (res.stdout, "gh") }
        }
        return (nil, "none")
    }

    func normalizeVersion(_ v: String) -> [Int] {
        let cleaned = v.trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: "^[vV]+", with: "", options: .regularExpression)
        let core = cleaned.split(separator: "-").first.map(String.init) ?? cleaned
        return core.split(separator: ".").map { Int($0) ?? 0 }
    }

    func compareVersions(_ a: String, _ b: String) -> Int {
        let va = normalizeVersion(a), vb = normalizeVersion(b)
        for i in 0..<max(va.count, vb.count) {
            let na = i < va.count ? va[i] : 0
            let nb = i < vb.count ? vb[i] : 0
            if na != nb { return na > nb ? 1 : -1 }
        }
        return 0
    }

    func downloadsDMGInfo() -> (exists: Bool, path: String) {
        let dlDir = FileManager.default.urls(for: .downloadsDirectory, in: .userDomainMask).first
        guard let dmgURL = dlDir?.appendingPathComponent("\(APP_NAME).dmg"),
              FileManager.default.fileExists(atPath: dmgURL.path) else { return (false, "") }
        return (true, dmgURL.path)
    }

    func checkForUpdates(manual: Bool, customToken: String?, simulatedCurrentVersion: String?) {
        let localVer = (simulatedCurrentVersion?.isEmpty == false) ? simulatedCurrentVersion! : currentAppVersion
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self = self else { return }
            let dlInfo = self.downloadsDMGInfo()
            var releaseData: Data?
            var statusCode = 0
            var authSource = "none"

            let trimmedCustom = customToken?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            // Schnellster Weg für privates Repo: direkt über gh api
            if trimmedCustom.isEmpty, let ghPath = self.findGHBinary() {
                let apiRes = self.runProcess(ghPath, args: ["api", "repos/\(GITHUB_REPO)/releases/latest"], timeout: 10)
                if apiRes.exitCode == 0, let d = apiRes.stdout.data(using: .utf8), !d.isEmpty {
                    releaseData = d; statusCode = 200; authSource = "gh"
                }
            }

            if statusCode != 200 || releaseData == nil {
                let auth = self.resolveGitHubToken(customToken: customToken)
                authSource = auth.source
                if let url = URL(string: "https://api.github.com/repos/\(GITHUB_REPO)/releases/latest") {
                    var req = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 10)
                    req.setValue("application/vnd.github+json", forHTTPHeaderField: "Accept")
                    req.setValue("\(APP_NAME)-Updater/\(localVer)", forHTTPHeaderField: "User-Agent")
                    if let token = auth.token, !token.isEmpty {
                        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                    }
                    let sem = DispatchSemaphore(value: 0)
                    URLSession.shared.dataTask(with: req) { data, resp, _ in
                        if let http = resp as? HTTPURLResponse { statusCode = http.statusCode }
                        releaseData = data
                        sem.signal()
                    }.resume()
                    _ = sem.wait(timeout: .now() + 11)
                }
            }

            guard statusCode == 200,
                  let data = releaseData,
                  let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
                  let tagName = json["tag_name"] as? String else {
                self.sendJSONToJS(fn: "\(JS_NS).App.onUpdateCheckResult", payload: [
                    "ok": false, "manual": manual, "authSource": authSource,
                    "authRequired": [0, 401, 403, 404].contains(statusCode),
                    "statusCode": statusCode, "currentVersion": localVer,
                    "hasDownloadsDMG": dlInfo.exists, "downloadsDMGPath": dlInfo.path,
                    "releasePageUrl": self.releasesLatestURL
                ])
                return
            }

            let remoteVer = tagName.replacingOccurrences(of: "^[vV]+", with: "", options: .regularExpression)
            var assetApiUrl = ""
            var assetBrowserUrl = self.dmgLatestURL
            if let assets = json["assets"] as? [[String: Any]],
               let dmg = assets.first(where: { (($0["name"] as? String) ?? "").lowercased().hasSuffix(".dmg") }) {
                assetApiUrl = (dmg["url"] as? String) ?? ""
                assetBrowserUrl = (dmg["browser_download_url"] as? String) ?? assetBrowserUrl
            }

            self.sendJSONToJS(fn: "\(JS_NS).App.onUpdateCheckResult", payload: [
                "ok": true, "manual": manual, "authSource": authSource,
                "updateAvailable": self.compareVersions(remoteVer, localVer) > 0,
                "currentVersion": localVer, "latestVersion": remoteVer, "tagName": tagName,
                "releaseName": (json["name"] as? String) ?? tagName,
                "releaseNotes": (json["body"] as? String) ?? "",
                "htmlUrl": (json["html_url"] as? String) ?? self.releasesLatestURL,
                "assetApiUrl": assetApiUrl, "assetBrowserUrl": assetBrowserUrl,
                "hasDownloadsDMG": dlInfo.exists, "downloadsDMGPath": dlInfo.path
            ])
        }
    }

    /// Lädt die DMG über die gh CLI herunter. Gibt true zurück, wenn die Installation gestartet wurde.
    func downloadViaGH(tagName: String, percent: Int) -> Bool {
        guard let ghPath = findGHBinary() else { return false }
        progress("downloading", percent, L("Lade neue \(APP_NAME).dmg über GitHub CLI (gh) herunter…", "Downloading new \(APP_NAME).dmg via GitHub CLI (gh)…"))
        let tmpDir = URL(fileURLWithPath: NSTemporaryDirectory())
            .appendingPathComponent("easykitchen_gh_\(UUID().uuidString)", isDirectory: true)
        try? FileManager.default.createDirectory(at: tmpDir, withIntermediateDirectories: true)
        var args = ["release", "download"]
        if !tagName.isEmpty { args.append(tagName) }
        args.append(contentsOf: ["--repo", GITHUB_REPO, "--pattern", "*.dmg", "--dir", tmpDir.path, "--clobber"])
        let res = runProcess(ghPath, args: args, timeout: 60)
        let dmg = tmpDir.appendingPathComponent("\(APP_NAME).dmg")
        guard res.exitCode == 0, FileManager.default.fileExists(atPath: dmg.path) else { return false }
        progress("downloading", 82, L("Download abgeschlossen ✓ Bereite Installation vor…", "Download complete ✓ Preparing installation…"))
        installFromDMGOrApp(sourceURL: dmg, deleteSourceAfter: true)
        return true
    }

    func performRemoteUpdate(dict: [String: Any]) {
        let customToken = dict["token"] as? String
        let assetApiUrl = (dict["assetApiUrl"] as? String) ?? ""
        let assetBrowserUrl = (dict["assetBrowserUrl"] as? String) ?? dmgLatestURL
        let tagName = (dict["tagName"] as? String) ?? ""

        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self = self else { return }
            let trimmedCustom = customToken?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            if trimmedCustom.isEmpty && self.downloadViaGH(tagName: tagName, percent: 35) { return }

            let auth = self.resolveGitHubToken(customToken: customToken)
            self.pendingUpdateTag = tagName
            self.pendingUpdateToken = auth.token
            self.progress("downloading", 10, self.L("Verbinde mit GitHub Release & starte Download…", "Connecting to GitHub release & starting download…"))

            let targetUrlStr = (!assetApiUrl.isEmpty && auth.token != nil) ? assetApiUrl : assetBrowserUrl
            guard let downloadURL = URL(string: targetUrlStr) else {
                self.fallbackGHDownloadOrFail(tagName: tagName, reason: "Ungültige Download-URL")
                return
            }
            var req = URLRequest(url: downloadURL, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 60)
            req.setValue("\(APP_NAME)-Updater/\(self.currentAppVersion)", forHTTPHeaderField: "User-Agent")
            if targetUrlStr == assetApiUrl && !assetApiUrl.isEmpty {
                req.setValue("application/octet-stream", forHTTPHeaderField: "Accept")
            }
            if let token = auth.token, !token.isEmpty {
                req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            }
            let session = URLSession(configuration: .default, delegate: self, delegateQueue: nil)
            let task = session.downloadTask(with: req)
            self.activeDownloadTask = task
            task.resume()
        }
    }

    func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask,
                    didWriteData bytesWritten: Int64, totalBytesWritten: Int64,
                    totalBytesExpectedToWrite: Int64) {
        let loadedMB = Double(totalBytesWritten) / 1_048_576
        let totalMB = totalBytesExpectedToWrite > 0 ? Double(totalBytesExpectedToWrite) / 1_048_576 : 3
        let rawPct = totalBytesExpectedToWrite > 0 ? Int(Double(totalBytesWritten) / Double(totalBytesExpectedToWrite) * 82) : 45
        progress("downloading", max(5, min(82, rawPct)),
                 String(format: L("Lade \(APP_NAME).dmg herunter (%.1f / %.1f MB)…", "Downloading \(APP_NAME).dmg (%.1f / %.1f MB)…"), loadedMB, totalMB))
    }

    func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask, didFinishDownloadingTo location: URL) {
        if let http = downloadTask.response as? HTTPURLResponse, http.statusCode >= 400 {
            fallbackGHDownloadOrFail(tagName: pendingUpdateTag ?? "", reason: "HTTP \(http.statusCode)")
            return
        }
        let tmpDMG = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent("\(APP_NAME)-Update-\(UUID().uuidString).dmg")
        do {
            try FileManager.default.moveItem(at: location, to: tmpDMG)
            installFromDMGOrApp(sourceURL: tmpDMG, deleteSourceAfter: true)
        } catch {
            fallbackGHDownloadOrFail(tagName: pendingUpdateTag ?? "", reason: error.localizedDescription)
        }
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        if let error = error {
            fallbackGHDownloadOrFail(tagName: pendingUpdateTag ?? "", reason: error.localizedDescription)
        }
    }

    func fallbackGHDownloadOrFail(tagName: String, reason: String) {
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self = self else { return }
            if self.downloadViaGH(tagName: tagName, percent: 50) { return }
            self.progress("error", 0, self.L("Automatischer Download nicht möglich (\(reason)). Nutze unten „Direkt herunterladen“ und danach „Heruntergeladene DMG installieren“.", "Automatic download not possible (\(reason)). Use “Download directly” below and then “Install downloaded DMG”."))
        }
    }

    func promptOrInstallLocalDMG(dict: [String: Any]) {
        if (dict["useDownloads"] as? Bool) == true {
            let dl = downloadsDMGInfo()
            if dl.exists {
                installFromDMGOrApp(sourceURL: URL(fileURLWithPath: dl.path), deleteSourceAfter: false)
                return
            }
        }
        let panel = NSOpenPanel()
        panel.title = L("Heruntergeladene \(APP_NAME).dmg (oder \(APP_NAME).app) zum Aktualisieren wählen", "Choose the downloaded \(APP_NAME).dmg (or \(APP_NAME).app) to update")
        panel.prompt = "Installieren & neu starten"
        panel.allowsMultipleSelection = false
        panel.canChooseDirectories = false
        panel.directoryURL = FileManager.default.urls(for: .downloadsDirectory, in: .userDomainMask).first
        var types: [UTType] = [.diskImage, .applicationBundle]
        if let dmgType = UTType(filenameExtension: "dmg") { types.append(dmgType) }
        panel.allowedContentTypes = types
        panel.beginSheetModal(for: window) { [weak self] resp in
            guard let self = self, resp == .OK, let url = panel.url else { return }
            self.installFromDMGOrApp(sourceURL: url, deleteSourceAfter: false)
        }
    }

    func installFromDMGOrApp(sourceURL: URL, deleteSourceAfter: Bool) {
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self = self else { return }
            var mountPoint = ""
            var sourceAppPath = ""

            if sourceURL.pathExtension.lowercased() == "app" {
                sourceAppPath = sourceURL.path
            } else {
                self.progress("mounting", 86, self.L("Öffne Disk-Image im Hintergrund…", "Opening disk image in the background…"))
                mountPoint = (NSTemporaryDirectory() as NSString).appendingPathComponent("easykitchen_mnt_\(UUID().uuidString)")
                try? FileManager.default.createDirectory(atPath: mountPoint, withIntermediateDirectories: true)
                let attach = self.runProcess("/usr/bin/hdiutil", args: [
                    "attach", sourceURL.path, "-mountpoint", mountPoint, "-nobrowse", "-readonly", "-noautoopen", "-quiet"
                ])
                if attach.exitCode != 0 {
                    self.progress("error", 0, self.L("Disk-Image konnte nicht geöffnet werden: ", "The disk image could not be opened: ") + attach.stderr)
                    return
                }
                let candidate = (mountPoint as NSString).appendingPathComponent("\(APP_NAME).app")
                if FileManager.default.fileExists(atPath: candidate) {
                    sourceAppPath = candidate
                } else if let items = try? FileManager.default.contentsOfDirectory(atPath: mountPoint),
                          let firstApp = items.first(where: { $0.lowercased().hasSuffix(".app") }) {
                    sourceAppPath = (mountPoint as NSString).appendingPathComponent(firstApp)
                }
            }

            guard !sourceAppPath.isEmpty && FileManager.default.fileExists(atPath: sourceAppPath) else {
                if !mountPoint.isEmpty { _ = self.runProcess("/usr/bin/hdiutil", args: ["detach", mountPoint, "-force", "-quiet"]) }
                self.progress("error", 0, self.L("Keine gültige \(APP_NAME).app im Update-Paket gefunden.", "No valid \(APP_NAME).app found in the update package."))
                return
            }

            self.progress("installing", 96, self.L("Aktualisiere \(APP_NAME).app & starte neu…", "Updating \(APP_NAME).app & restarting…"))

            let currentBundlePath = Bundle.main.bundleURL.path
            // Aus DMG (/Volumes) oder von macOS „verschoben“ gestartet (App Translocation, schreibgeschützt)
            // → in den Programme-Ordner installieren statt an den aktuellen Ort
            let isTemporaryLocation = currentBundlePath.hasPrefix("/Volumes/") || currentBundlePath.contains("/AppTranslocation/")
            let destAppPath = isTemporaryLocation ? "/Applications/\(APP_NAME).app" : currentBundlePath
            let pid = ProcessInfo.processInfo.processIdentifier
            let scriptPath = (NSTemporaryDirectory() as NSString).appendingPathComponent("easykitchen_update_\(pid).sh")
            let cleanupSourceCmd = deleteSourceAfter ? "rm -rf \"\(sourceURL.path)\"" : ""
            let detachCmd = mountPoint.isEmpty ? "" : "/usr/bin/hdiutil detach \"\(mountPoint)\" -force -quiet || true\nrmdir \"\(mountPoint)\" 2>/dev/null || true"

            let newVersion = self.appVersion(atPath: sourceAppPath) ?? ""

            // Vorab prüfen, ob das Ersetzen erlaubt ist – sonst NICHT beenden (keine Update-Schleife)
            let check = self.canReplaceApp(at: destAppPath)
            if !check.ok {
                self.keepDMGForManualInstall(sourceURL)
                if !mountPoint.isEmpty { _ = self.runProcess("/usr/bin/hdiutil", args: ["detach", mountPoint, "-force", "-quiet"]) }
                if deleteSourceAfter { try? FileManager.default.removeItem(at: sourceURL) }
                self.progress("error", 0, self.L("Automatische Installation nicht möglich – siehe Hinweisfenster.", "Automatic installation not possible – see the message window."))
                self.offerManualInstall(reason: check.reason)
                return
            }
            // DMG vorsorglich aufheben, falls das Ersetzen doch scheitert (wird nach Erfolg gelöscht)
            self.keepDMGForManualInstall(sourceURL)

            let statusPath = self.updateStatusURL.path
            let keptDMGPath = self.keptUpdateDMG.path
            let parentDir = (destAppPath as NSString).deletingLastPathComponent
            let binaryPath = "\(destAppPath)/Contents/MacOS/\(APP_NAME)"
            let script = """
            #!/bin/bash
            # EasyKitchen-Update: alte App sauber beenden → neue Version einsetzen → genau EINMAL neu starten
            exec </dev/null >/dev/null 2>&1
            OLD=\(pid)
            DEST="\(destAppPath)"
            BIN="\(binaryPath)"

            # 1) Auf das Beenden der laufenden App warten (max. 8 s, normal < 2 s) – hängt sie, gezielt beenden
            for i in $(seq 1 80); do kill -0 "$OLD" 2>/dev/null || break; sleep 0.1; done
            if kill -0 "$OLD" 2>/dev/null; then kill -TERM "$OLD" 2>/dev/null; sleep 1.5; fi
            if kill -0 "$OLD" 2>/dev/null; then kill -KILL "$OLD" 2>/dev/null; sleep 0.5; fi
            # weitere Fenster/Instanzen derselben App ebenfalls schließen (verhindert Doppelstart)
            /usr/bin/pkill -TERM -f "$BIN" 2>/dev/null; sleep 0.5
            /usr/bin/pkill -KILL -f "$BIN" 2>/dev/null

            # 2) Neue Version sicher einsetzen: erst daneben kopieren & prüfen, dann tauschen.
            #    Scheitert etwas, bleibt die alte App intakt und erklärt beim nächsten Start, was zu tun ist.
            NEWVER="\(newVersion)"
            STATUS="\(statusPath)"
            TMP="\(parentDir)/.\(APP_NAME)-neu-$$.app"
            BAK="\(parentDir)/.\(APP_NAME)-alt-$$.app"
            ERRF="$(/usr/bin/mktemp -t easykitchen_err)"
            clean() { tr -d '"\\\\\\r' | tr '\\n' ' ' | cut -c1-300; }
            status() { printf '{"expected":"%s","ok":%s,"dest":"%s","error":"%s","dmg":"%s"}' "$NEWVER" "$1" "$DEST" "$(printf '%s' "$2" | clean)" "\(keptDMGPath)" > "$STATUS"; }
            fail() {
              status false "$1 $(cat "$ERRF" 2>/dev/null)"
              rm -rf "$TMP" 2>/dev/null
              \(detachCmd)
              /usr/bin/open "$DEST"
              rm -f "$ERRF" "\(scriptPath)"
              exit 0
            }
            rm -rf "$TMP" 2>/dev/null
            /usr/bin/ditto "\(sourceAppPath)" "$TMP" 2>"$ERRF" || fail "\(self.L("Die neue Version konnte nicht kopiert werden.", "The new version could not be copied."))"
            [ "$(/usr/bin/defaults read "$TMP/Contents/Info" CFBundleShortVersionString 2>/dev/null)" = "$NEWVER" ] || fail "\(self.L("Die neue Version ist unvollständig.", "The new version is incomplete."))"
            /usr/bin/xattr -cr "$TMP" 2>/dev/null || true
            if [ -e "$DEST" ]; then
              mv "$DEST" "$BAK" 2>"$ERRF" || fail "\(self.L("macOS hat das Ersetzen der alten Version blockiert.", "macOS blocked replacing the old version."))"
            fi
            if ! mv "$TMP" "$DEST" 2>"$ERRF"; then mv "$BAK" "$DEST" 2>/dev/null; fail "\(self.L("Die neue Version konnte nicht eingesetzt werden.", "The new version could not be installed."))"; fi
            rm -rf "$BAK" 2>/dev/null
            [ "$(/usr/bin/defaults read "$DEST/Contents/Info" CFBundleShortVersionString 2>/dev/null)" = "$NEWVER" ] || fail "\(self.L("Nach dem Ersetzen wurde eine falsche Version gefunden.", "A wrong version was found after replacing."))"
            touch "$DEST"
            /System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f "$DEST" 2>/dev/null || true
            status true ""
            rm -f "$ERRF"
            \(detachCmd)
            \(cleanupSourceCmd)

            # 3) Genau eine Instanz starten (zweiter Versuch, falls macOS die alte noch kurz „sieht“)
            /usr/bin/pgrep -f "$BIN" >/dev/null || /usr/bin/open "$DEST"
            sleep 3
            /usr/bin/pgrep -f "$BIN" >/dev/null || /usr/bin/open -n "$DEST"
            rm -f "\(scriptPath)"
            """

            do {
                try script.write(toFile: scriptPath, atomically: true, encoding: .utf8)
                try FileManager.default.setAttributes([.posixPermissions: 0o755], ofItemAtPath: scriptPath)
                let updater = Process()
                updater.executableURL = URL(fileURLWithPath: "/bin/bash")
                updater.arguments = [scriptPath]
                updater.standardInput = FileHandle.nullDevice
                updater.standardOutput = FileHandle.nullDevice
                updater.standardError = FileHandle.nullDevice
                try updater.run()
                self.quitForUpdate()
            } catch {
                self.progress("error", 0, self.L("Update-Installation fehlgeschlagen: ", "Update installation failed: ") + error.localizedDescription)
            }
        }
    }

    /// Für das Update: offene Änderungen speichern, dann sofort beenden.
    /// `_exit` überspringt Aufräum-Routinen, die sonst (z. B. mit laufenden Hintergrund-Threads) hängen können.
    func quitForUpdate() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { _exit(0) }
            self.isTerminatingForUpdate = true
            var done = false
            let finish = {
                if done { return }
                done = true
                // Testschalter: simuliert eine App, die sich nicht beendet (Hilfsskript muss eingreifen)
                if ProcessInfo.processInfo.environment["EASYKITCHEN_TEST_HANG"] == "1" { return }
                _exit(0)
            }
            // Sicherheitsnetz: spätestens nach 1,5 s beenden
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5, execute: finish)
            // Rezepte sichern (JS → nativeStorage), dann kurz warten, bis die Datei geschrieben ist
            self.webView?.evaluateJavaScript("window.dispatchEvent(new Event('pagehide')); true") { _, _ in
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.4, execute: finish)
            }
        }
    }

    // MARK: Menu

    @objc func reloadPage() {
        updateBootstrapScript(on: webView?.configuration.userContentController, with: nil)
        webView.reload()
    }

    @objc func revealData() { NSWorkspace.shared.activateFileViewerSelecting([storageURL]) }
    @objc func toggleFullScreenAction() { window.toggleFullScreen(nil) }
    @objc func checkForUpdatesMenuAction() {
        webView.evaluateJavaScript("\(JS_NS).App && \(JS_NS).App.triggerManualUpdateCheck()")
    }
    @objc func newRecipeMenuAction() {
        webView.evaluateJavaScript("\(JS_NS).App && \(JS_NS).App.openEditor()")
    }

    func buildMenu() {
        let main = NSMenu()

        let appItem = NSMenuItem()
        let appMenu = NSMenu()
        appMenu.addItem(withTitle: L("Über \(APP_NAME)", "About \(APP_NAME)"), action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: "")
        appMenu.addItem(withTitle: L("Nach Updates suchen…", "Check for Updates…"), action: #selector(checkForUpdatesMenuAction), keyEquivalent: "u")
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: L("Datenordner im Finder zeigen", "Show Data Folder in Finder"), action: #selector(revealData), keyEquivalent: "")
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: L("\(APP_NAME) ausblenden", "Hide \(APP_NAME)"), action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
        appMenu.addItem(withTitle: L("\(APP_NAME) beenden", "Quit \(APP_NAME)"), action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        appItem.submenu = appMenu
        main.addItem(appItem)

        let fileItem = NSMenuItem()
        let fileMenu = NSMenu(title: L("Ablage", "File"))
        fileMenu.addItem(withTitle: L("Neues Rezept", "New Recipe"), action: #selector(newRecipeMenuAction), keyEquivalent: "n")
        fileItem.submenu = fileMenu
        main.addItem(fileItem)

        let editItem = NSMenuItem()
        let editMenu = NSMenu(title: L("Bearbeiten", "Edit"))
        editMenu.addItem(withTitle: L("Widerrufen", "Undo"), action: Selector(("undo:")), keyEquivalent: "z")
        editMenu.addItem(withTitle: L("Wiederholen", "Redo"), action: Selector(("redo:")), keyEquivalent: "Z")
        editMenu.addItem(.separator())
        editMenu.addItem(withTitle: L("Ausschneiden", "Cut"), action: #selector(NSText.cut(_:)), keyEquivalent: "x")
        editMenu.addItem(withTitle: L("Kopieren", "Copy"), action: #selector(NSText.copy(_:)), keyEquivalent: "c")
        editMenu.addItem(withTitle: L("Einsetzen", "Paste"), action: #selector(NSText.paste(_:)), keyEquivalent: "v")
        editMenu.addItem(withTitle: L("Alles auswählen", "Select All"), action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")
        editItem.submenu = editMenu
        main.addItem(editItem)

        let viewItem = NSMenuItem()
        let viewMenu = NSMenu(title: L("Darstellung", "View"))
        viewMenu.addItem(withTitle: L("Neu laden", "Reload"), action: #selector(reloadPage), keyEquivalent: "r")
        let fs = NSMenuItem(title: L("Vollbild umschalten", "Toggle Full Screen"), action: #selector(toggleFullScreenAction), keyEquivalent: "f")
        fs.keyEquivalentModifierMask = [.control, .command]
        viewMenu.addItem(fs)
        viewItem.submenu = viewMenu
        main.addItem(viewItem)

        let windowItem = NSMenuItem()
        let windowMenu = NSMenu(title: L("Fenster", "Window"))
        windowMenu.addItem(withTitle: L("Minimieren", "Minimize"), action: #selector(NSWindow.performMiniaturize(_:)), keyEquivalent: "m")
        windowMenu.addItem(withTitle: L("Schließen", "Close"), action: #selector(NSWindow.performClose(_:)), keyEquivalent: "w")
        windowItem.submenu = windowMenu
        main.addItem(windowItem)

        NSApp.mainMenu = main
        NSApp.windowsMenu = windowMenu
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
