/*
 * EasyKitchen – Datenschicht.
 * Speichert Rezepte nativ (macOS: ~/Library/Application Support/EasyKitchen/state.json)
 * über die WKWebView-Bridge und zusätzlich im localStorage (Browser / Windows).
 */
window.EasyKitchen = window.EasyKitchen || {};
(function (ns) {
  'use strict';

  const STORAGE_KEY = 'easykitchen_state_v1';

  // Einheiten inkl. Regler-Bereich (max wächst automatisch mit, wenn mehr eingetippt wird)
  const UNITS = [
    { id: 'g',      label: 'g',              max: 1000, step: 10 },
    { id: 'kg',     label: 'kg',             max: 5,    step: 0.1 },
    { id: 'ml',     label: 'ml',             max: 1000, step: 10 },
    { id: 'l',      label: 'l',              max: 5,    step: 0.1 },
    { id: 'stk',    label: 'Stück',          max: 20,   step: 1 },
    { id: 'el',     label: 'EL',             max: 10,   step: 0.5 },
    { id: 'tl',     label: 'TL',             max: 10,   step: 0.5 },
    { id: 'prise',  label: 'Prise',          max: 5,    step: 1 },
    { id: 'bund',   label: 'Bund',           max: 5,    step: 0.5 },
    { id: 'dose',   label: 'Dose',           max: 5,    step: 1 },
    { id: 'pck',    label: 'Packung',        max: 5,    step: 0.5 },
    { id: 'zehe',   label: 'Zehe',           max: 10,   step: 1 },
    { id: 'tasse',  label: 'Tasse',          max: 5,    step: 0.25 },
    { id: 'ng',     label: 'nach Geschmack', max: 0,    step: 0 }
  ];
  const UNIT_BY_ID = Object.fromEntries(UNITS.map(u => [u.id, u]));

  const EFFORT = { 1: 'Einfach', 2: 'Mittel', 3: 'Aufwendig' };
  const COST = { 1: 'Günstig', 2: 'Mittel', 3: 'Teuer' };

  let state = { version: 1, recipes: [], updatedAt: 0 };
  const listeners = [];
  let pendingNative = null;
  let nativeTimer = null;

  // ---------- Laden / Speichern ----------

  function parse(text) {
    if (!text || typeof text !== 'string') return null;
    try {
      const obj = JSON.parse(text);
      return obj && Array.isArray(obj.recipes) ? obj : null;
    } catch (_) { return null; }
  }

  function init() {
    const nativeState = parse(window.__EK_NATIVE_STATE__);
    let localState = null;
    try { localState = parse(localStorage.getItem(STORAGE_KEY)); } catch (_) {}
    // Native Datei ist maßgeblich; bei mehreren Quellen gewinnt der neueste Stand
    const candidates = [nativeState, localState].filter(Boolean);
    candidates.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    if (candidates[0]) state = candidates[0];
    state.recipes = state.recipes.map(normalizeRecipe);
  }

  function persist() {
    state.updatedAt = Date.now();
    const serialized = JSON.stringify(state);
    try { localStorage.setItem(STORAGE_KEY, serialized); } catch (e) {
      // Speicher voll (z. B. viele Fotos im Browser) – nativ wird trotzdem gespeichert
      console.warn('localStorage Speicherung fehlgeschlagen:', e);
    }
    pendingNative = serialized;
    clearTimeout(nativeTimer);
    nativeTimer = setTimeout(flushNative, 60);
    listeners.forEach(fn => { try { fn(state); } catch (e) { console.error(e); } });
  }

  function flushNative() {
    if (pendingNative == null) return;
    try {
      const h = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.nativeStorage;
      if (h) h.postMessage(pendingNative);
    } catch (e) { console.warn('Native Storage Bridge Fehler:', e); }
    pendingNative = null;
  }
  window.addEventListener('pagehide', flushNative);
  window.addEventListener('beforeunload', flushNative);
  document.addEventListener('visibilitychange', flushNative);

  function hasNativeStorage() {
    return !!(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.nativeStorage);
  }

  // ---------- Rezepte ----------

  function uid() {
    return 'r_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function clampInt(v, min, max, def) {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
  }

  function normalizeRecipe(r) {
    r = r || {};
    return {
      id: r.id || uid(),
      title: String(r.title || '').trim(),
      image: typeof r.image === 'string' ? r.image : '',
      time: clampInt(r.time, 0, 1440, 30),
      effort: clampInt(r.effort, 1, 3, 1),
      cost: clampInt(r.cost, 1, 3, 1),
      servings: clampInt(r.servings, 1, 50, 2),
      ingredients: (Array.isArray(r.ingredients) ? r.ingredients : [])
        .map(i => ({
          name: String((i && i.name) || '').trim(),
          amount: Number.isFinite(Number(i && i.amount)) ? Number(i.amount) : 0,
          unit: UNIT_BY_ID[i && i.unit] ? i.unit : 'g'
        }))
        .filter(i => i.name),
      steps: String(r.steps || ''),
      watch: !!r.watch,
      createdAt: r.createdAt || Date.now(),
      updatedAt: r.updatedAt || Date.now()
    };
  }

  function getRecipes() { return state.recipes; }
  function getRecipe(id) { return state.recipes.find(r => r.id === id) || null; }

  function saveRecipe(raw) {
    const rec = normalizeRecipe(raw);
    rec.updatedAt = Date.now();
    const idx = state.recipes.findIndex(r => r.id === rec.id);
    if (idx >= 0) {
      rec.createdAt = state.recipes[idx].createdAt;
      state.recipes[idx] = rec;
    } else {
      state.recipes.unshift(rec);
    }
    persist();
    return rec;
  }

  function deleteRecipe(id) {
    state.recipes = state.recipes.filter(r => r.id !== id);
    persist();
  }

  function toggleWatch(id) {
    const r = getRecipe(id);
    if (!r) return false;
    r.watch = !r.watch;
    persist();
    return r.watch;
  }

  // ---------- Backup ----------

  function exportJSON() {
    return JSON.stringify({ app: 'EasyKitchen', exportedAt: new Date().toISOString(), ...state }, null, 2);
  }

  /** Führt ein Backup zusammen: bekannte IDs werden aktualisiert, neue ergänzt. */
  function importJSON(text) {
    const obj = parse(text);
    if (!obj) throw new Error('Keine gültige EasyKitchen-Backup-Datei.');
    let added = 0, updated = 0;
    obj.recipes.map(normalizeRecipe).forEach(rec => {
      const idx = state.recipes.findIndex(r => r.id === rec.id);
      if (idx >= 0) { state.recipes[idx] = rec; updated++; }
      else { state.recipes.push(rec); added++; }
    });
    persist();
    return { added, updated };
  }

  // ---------- Suche ----------

  /** Kleinbuchstaben, Umlaute vereinheitlicht (ä→a usw.), nur Buchstaben/Ziffern. */
  function norm(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/ß/g, 'ss')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9 ]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** Grober Wortstamm, damit „Tomaten“ auch „Tomate“ findet. */
  function stem(w) {
    if (w.length > 5) return w.replace(/(en|er|n|e|s)$/, '');
    if (w.length > 4) return w.replace(/(n|e|s)$/, '');
    return w;
  }

  function parseTerms(query) {
    const seen = new Set();
    return String(query || '')
      .split(/[,;\s]+/)
      .map(norm)
      .filter(t => t.length >= 2 && !seen.has(t) && seen.add(t));
  }

  function termMatches(term, text) {
    const t = norm(text);
    if (!t) return false;
    if (t.includes(term)) return true;
    const st = stem(term);
    if (st.length >= 3 && t.includes(st)) return true;
    // Zutat steckt im Suchwort (z. B. Suche „Rinderhack“, Zutat „Hack“)
    return t.length >= 3 && term.includes(t);
  }

  /**
   * Bewertet ein Rezept gegen die Suchbegriffe.
   * Ein Treffer reicht – das Rezept muss nicht alle Zutaten abdecken.
   */
  function matchRecipe(recipe, terms) {
    if (!terms.length) return { score: 0, matchedTerms: [], matchedIngredients: new Set() };
    const matchedTerms = [];
    const matchedIngredients = new Set();
    let titleHits = 0;
    terms.forEach(term => {
      let hit = false;
      recipe.ingredients.forEach((ing, i) => {
        if (termMatches(term, ing.name)) { matchedIngredients.add(i); hit = true; }
      });
      if (termMatches(term, recipe.title)) { hit = true; titleHits++; }
      if (hit) matchedTerms.push(term);
    });
    const score = matchedTerms.length * 10 + matchedIngredients.size * 2 + titleHits;
    return { score, matchedTerms, matchedIngredients };
  }

  function subscribe(fn) { listeners.push(fn); }

  ns.Data = {
    UNITS, UNIT_BY_ID, EFFORT, COST,
    init, getRecipes, getRecipe, saveRecipe, deleteRecipe, toggleWatch,
    exportJSON, importJSON, parseTerms, matchRecipe, subscribe, hasNativeStorage, uid
  };
})(window.EasyKitchen);
