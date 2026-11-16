/*
 * EasyKitchen – 1-Klick-In-App-Updater (übernommen von FinPilot).
 * Prüft beim Start das neueste GitHub-Release von cookiegeschmack/EasyKitchen.
 * macOS: Download & Installation nativ (gh CLI / Token / lokale DMG), danach Neustart.
 * Browser/Windows: Hinweis + Link zur Release-Seite.
 */
window.EasyKitchen = window.EasyKitchen || {};
(function (ns) {
  'use strict';

  const APP_FALLBACK_VERSION = '1.4.0';
  const REPO = 'cookiegeschmack/EasyKitchen';
  const RELEASE_PAGE = `https://github.com/${REPO}/releases/latest`;
  const SKIPPED_VER_KEY = 'easykitchen_skipped_update_version';
  const TOKEN_KEY = 'easykitchen_github_release_token';
  const NOTIFIED_KEY = 'easykitchen_update_notified_version';
  const LIVE_MS = 10 * 60 * 1000;          // während die App läuft: alle 10 Minuten auf neue Releases prüfen
  const FOCUS_MS = 5 * 60 * 1000;          // beim Zurückkehren ins Fenster, wenn die letzte Prüfung > 5 Min her ist
  const RETRY_MS = 5 * 60 * 1000;          // nach fehlgeschlagener Prüfung in 5 Minuten erneut
  const auto = { lastCheck: 0, lastOk: false, pending: false, retryTimer: null, started: false, reason: '' };

  const UI = ns.UI;
  const $ = UI.$;
  let lastInfo = null;

  const native = name => window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers[name];

  function currentVersion() {
    return String(window.__EK_VERSION__ || APP_FALLBACK_VERSION).replace(/^[vV]+/, '');
  }

  function savedToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (_) { return ''; }
  }

  function compareSemver(a, b) {
    const pa = String(a || '').replace(/^[vV]+/, '').split('-')[0].split('.').map(n => parseInt(n, 10) || 0);
    const pb = String(b || '').replace(/^[vV]+/, '').split('-')[0].split('.').map(n => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const na = pa[i] || 0, nb = pb[i] || 0;
      if (na !== nb) return na > nb ? 1 : -1;
    }
    return 0;
  }

  function setStatus(text) {
    const el = $('settings-update-status');
    if (el) el.textContent = text;
  }

  function syncVersionLabels(v) {
    v = v || currentVersion();
    const a = $('version-label'); if (a) a.textContent = 'v' + v;
    const b = $('settings-version'); if (b) b.textContent = 'v' + v;
    const c = $('topbar-version'); if (c) c.textContent = 'v' + v;
  }

  function openExternal(url) {
    const h = native('nativeOpenURL');
    if (h) h.postMessage(url);
    else window.open(url, '_blank', 'noopener');
  }

  function check(opts) {
    opts = opts || {};
    const manual = !!opts.manual;
    auto.lastCheck = Date.now();
    auto.pending = true;
    const simulatedCurrentVersion = opts.simulatedCurrentVersion || '';
    if (manual) setStatus('Prüfe GitHub auf eine neue Version…');

    const h = native('nativeCheckUpdate');
    if (h) {
      h.postMessage({ manual, token: savedToken(), simulatedCurrentVersion });
      return;
    }
    // Browser-Fallback (funktioniert nur bei öffentlichem Repo oder mit Token)
    const localVer = simulatedCurrentVersion || currentVersion();
    const headers = { Accept: 'application/vnd.github+json' };
    const tok = savedToken();
    if (tok) headers.Authorization = `Bearer ${tok}`;
    fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(json => {
        const tagName = json.tag_name || '';
        const latest = tagName.replace(/^[vV]+/, '');
        onCheckResult({
          ok: true, manual, authSource: tok ? 'token' : 'web',
          updateAvailable: compareSemver(latest, localVer) > 0,
          currentVersion: localVer, latestVersion: latest, tagName,
          releaseName: json.name || tagName, releaseNotes: json.body || '',
          htmlUrl: json.html_url || RELEASE_PAGE
        });
      })
      .catch(status => {
        onCheckResult({ ok: false, manual, authRequired: [401, 403, 404].includes(status), currentVersion: localVer, releasePageUrl: RELEASE_PAGE });
      });
  }

  function onCheckResult(res) {
    if (!res) return;
    lastInfo = res;
    auto.pending = false;
    auto.lastOk = !!res.ok;
    if (!res.ok && !res.manual) scheduleRetry();
    const pill = $('update-pill');
    const cur = res.currentVersion || currentVersion();
    syncVersionLabels(cur);

    if (res.ok && res.updateAvailable) {
      let skipped = '';
      try { skipped = localStorage.getItem(SKIPPED_VER_KEY) || ''; } catch (_) {}
      setStatus(`Neue Version v${res.latestVersion} verfügbar.`);
      if (pill && (res.manual || skipped !== res.latestVersion)) {
        $('update-pill-label').textContent = `Update auf v${res.latestVersion} verfügbar`;
        pill.hidden = false;
        $('topbar-version').classList.add('outdated');
      }
      if (res.manual) openModal(res);
      else if (auto.reason === 'start') maybeAnnounce(res, skipped);   // beim Start: Dialog einmal pro Version
      else announceQuietly(res, skipped);                              // während der Nutzung: nur Hinweis oben
    } else if (res.ok) {
      if (pill) pill.hidden = true;
      $('topbar-version').classList.remove('outdated');
      $('topbar-version').title = `v${cur} – aktuellste Version installiert (klicken, um erneut zu prüfen)`;
      setStatus(`Du hast die aktuellste Version (v${cur}).`);
      if (res.manual) UI.toast(`EasyKitchen ist auf dem neuesten Stand (v${cur}) ✓`);
    } else {
      setStatus('Update-Server nicht erreichbar (privates Repo: gh CLI anmelden oder DMG manuell wählen).');
      if (res.manual) openModal(res);
    }
  }

  // ---------- Automatische Prüfung (Start, Internet zurück, regelmäßig) ----------

  function isOnline() { return navigator.onLine !== false; }

  function autoCheck(reason) {
    if (auto.pending && Date.now() - auto.lastCheck < 30000) return;   // läuft noch (max. 30 s)
    if (!isOnline()) return;               // ohne Internet: warten, bis „online“ gemeldet wird
    clearTimeout(auto.retryTimer);
    auto.reason = reason;
    check({ manual: false, reason });
  }

  function scheduleRetry() {
    clearTimeout(auto.retryTimer);
    auto.retryTimer = setTimeout(() => autoCheck('retry'), RETRY_MS);
  }

  /** Neue Version beim automatischen Prüfen gefunden → Dialog einmal pro Version von selbst zeigen. */
  function maybeAnnounce(res, skipped) {
    let notified = '';
    try { notified = localStorage.getItem(NOTIFIED_KEY) || ''; } catch (_) {}
    if (skipped === res.latestVersion || notified === res.latestVersion) return;
    const show = () => {
      if (UI.topModal()) { setTimeout(show, 1500); return; }   // nicht über „Was ist neu“ o. Ä. legen
      try { localStorage.setItem(NOTIFIED_KEY, res.latestVersion); } catch (_) {}
      openModal(res);
    };
    show();
  }

  /** Während der Nutzung: kein Dialog, nur der Hinweis oben (LED) und einmalig eine kurze Meldung. */
  function announceQuietly(res, skipped) {
    if (skipped === res.latestVersion) return;
    let notified = '';
    try { notified = localStorage.getItem(NOTIFIED_KEY) || ''; } catch (_) {}
    if (notified === res.latestVersion) return;
    try { localStorage.setItem(NOTIFIED_KEY, res.latestVersion); } catch (_) {}
    UI.toast(`✨ Update v${res.latestVersion} ist verfügbar – oben auf den Hinweis klicken`);
  }

  function startAutoCheck() {
    if (auto.started) return;
    auto.started = true;
    // 1. Beim Start (kurz verzögert, damit die App zuerst fertig lädt)
    setTimeout(() => {
      if (isOnline()) autoCheck('start');
      else setStatus('Keine Internetverbindung – Update-Prüfung erfolgt automatisch, sobald du online bist.');
    }, 1200);
    // 2. Internet ist (wieder) da → prüfen, falls noch nicht erfolgreich geprüft
    window.addEventListener('online', () => { if (!auto.lastOk || Date.now() - auto.lastCheck > FOCUS_MS) autoCheck('online'); });
    // 3. Zurück im Fenster nach längerer Zeit / regelmäßig während die App läuft
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && Date.now() - auto.lastCheck > FOCUS_MS) autoCheck('focus');
    });
    // 4. Regelmäßig, solange die App läuft → neues Release erscheint oben, ohne Neustart
    setInterval(() => { if (Date.now() - auto.lastCheck >= LIVE_MS - 1000) autoCheck('interval'); }, 60 * 1000);
    window.addEventListener('focus', () => { if (Date.now() - auto.lastCheck > FOCUS_MS) autoCheck('focus'); });
  }

  function onProgress(prog) {
    if (!prog) return;
    const wrap = $('upd-progress'), fill = $('upd-fill'), txt = $('upd-text'), pct = $('upd-pct'), btn = $('upd-start');
    if (wrap) wrap.hidden = false;
    if (prog.stage === 'error') {
      if (txt) { txt.textContent = '⚠︎ ' + (prog.message || 'Update fehlgeschlagen.'); txt.classList.add('error'); }
      if (btn) { btn.disabled = false; btn.textContent = 'Erneut versuchen'; }
      return;
    }
    const p = Math.max(0, Math.min(100, Number(prog.percent || 0)));
    if (fill) fill.style.width = p + '%';
    if (pct) pct.textContent = p + ' %';
    if (txt) { txt.classList.remove('error'); txt.textContent = prog.message || 'Aktualisiere…'; }
    if (btn) { btn.disabled = true; btn.textContent = p >= 85 ? 'Installiere & starte neu…' : 'Lade Update…'; }
  }

  function installLocal(useDownloads) {
    const h = native('nativeInstallLocalDMG');
    if (h) h.postMessage({ useDownloads: !!useDownloads });
    else openExternal(RELEASE_PAGE);
  }

  function openModal(info) {
    info = info || lastInfo || { ok: false, currentVersion: currentVersion() };
    const card = $('update-card');
    const cur = info.currentVersion || currentVersion();
    const latest = info.latestVersion || '';
    const isNative = !!native('nativePerformUpdate');
    const ready = !!(info.ok && info.updateAvailable);
    const notes = (info.releaseNotes || '').trim() || 'Verbesserungen und Fehlerbehebungen. Deine Rezepte bleiben beim Update vollständig erhalten.';

    const progress = `
      <div class="upd-progress" id="upd-progress" hidden>
        <div class="upd-progress-row"><span id="upd-text">Starte Download…</span><span id="upd-pct">0 %</span></div>
        <div class="upd-bar"><div class="upd-fill" id="upd-fill"></div></div>
      </div>`;

    if (ready) {
      card.innerHTML = `
        <div class="modal-head">
          <h2>Neues Update verfügbar</h2>
          <button type="button" class="icon-btn" data-close="update-modal" aria-label="Schließen">✕</button>
        </div>
        <div class="modal-body">
          <p>Version <strong>v${UI.esc(latest)}</strong> ist da (installiert: v${UI.esc(cur)}). Deine Rezepte bleiben beim Update vollständig erhalten.</p>
          <div class="notes-box">${UI.esc(notes)}</div>
          ${progress}
        </div>
        <div class="modal-foot spread">
          <button type="button" class="btn btn-ghost" data-act="skip">Version überspringen</button>
          <div class="btn-row">
            <button type="button" class="btn btn-ghost" data-close="update-modal">Später</button>
            <button type="button" class="btn btn-primary" id="upd-start">${isNative ? 'Jetzt aktualisieren & neu starten' : 'Download-Seite öffnen'}</button>
          </div>
        </div>
        ${isNative ? '<div class="modal-subfoot"><button type="button" class="link-btn" data-act="local-dmg">Bereits heruntergeladene EasyKitchen.dmg auswählen</button></div>' : ''}`;
    } else {
      card.innerHTML = `
        <div class="modal-head">
          <h2>EasyKitchen aktualisieren</h2>
          <button type="button" class="icon-btn" data-close="update-modal" aria-label="Schließen">✕</button>
        </div>
        <div class="modal-body">
          <p>GitHub konnte nicht direkt abgefragt werden (privates Repository und keine angemeldete <code>gh</code> CLI). Du kannst trotzdem in zwei Schritten aktualisieren:</p>
          ${progress}
          <div class="stack">
            <button type="button" class="btn btn-secondary" data-act="open-github">1. Release-Seite im Browser öffnen &amp; DMG laden</button>
            ${info.hasDownloadsDMG ? '<button type="button" class="btn btn-primary" data-act="downloads-dmg">2. Gefundene ~/Downloads/EasyKitchen.dmg installieren</button>' : ''}
            ${isNative ? `<button type="button" class="btn ${info.hasDownloadsDMG ? 'btn-secondary' : 'btn-primary'}" data-act="local-dmg">2. Heruntergeladene EasyKitchen.dmg auswählen &amp; installieren</button>` : ''}
          </div>
        </div>
        <div class="modal-foot"><button type="button" class="btn btn-ghost" data-close="update-modal">Schließen</button></div>`;
    }

    const start = $('upd-start');
    if (start) {
      start.addEventListener('click', () => {
        const h = native('nativePerformUpdate');
        if (h) {
          onProgress({ stage: 'downloading', percent: 5, message: 'Starte Update…' });
          h.postMessage({ tagName: info.tagName || '', assetApiUrl: info.assetApiUrl || '', assetBrowserUrl: info.assetBrowserUrl || '', token: savedToken() });
        } else {
          openExternal(info.htmlUrl || RELEASE_PAGE);
        }
      });
    }
    card.querySelectorAll('[data-act]').forEach(btn => btn.addEventListener('click', () => {
      const act = btn.dataset.act;
      if (act === 'skip') {
        try { localStorage.setItem(SKIPPED_VER_KEY, latest); } catch (_) {}
        $('update-pill').hidden = true;
        UI.toast(`Version v${latest} wird übersprungen`);
        UI.closeModal('update-modal');
      } else if (act === 'local-dmg') installLocal(false);
      else if (act === 'downloads-dmg') installLocal(true);
      else if (act === 'open-github') openExternal(info.releasePageUrl || info.htmlUrl || RELEASE_PAGE);
    }));
    UI.openModal('update-modal');
  }

  ns.Updater = {
    currentVersion, check, onCheckResult, onProgress, openModal, syncVersionLabels, startAutoCheck,
    openPillOrCheck() { if (lastInfo) openModal(lastInfo); else check({ manual: true }); }
  };
})(window.EasyKitchen);
