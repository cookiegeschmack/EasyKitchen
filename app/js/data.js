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
    { id: 'prise',  label: 'Prise', plural: 'Prisen',          max: 5,    step: 1 },
    { id: 'bund',   label: 'Bund',           max: 5,    step: 0.5 },
    { id: 'dose',   label: 'Dose', plural: 'Dosen',           max: 5,    step: 1 },
    { id: 'pck',    label: 'Packung', plural: 'Packungen',        max: 5,    step: 0.5 },
    { id: 'zehe',   label: 'Zehe', plural: 'Zehen',           max: 10,   step: 1 },
    { id: 'tasse',  label: 'Tasse', plural: 'Tassen',          max: 5,    step: 0.25 },
    { id: 'becher', label: 'Becher',         max: 5,    step: 0.5 },
    { id: 'glas',   label: 'Glas', plural: 'Gläser',           max: 5,    step: 0.5 },
    { id: 'scheibe',label: 'Scheibe', plural: 'Scheiben',        max: 10,   step: 1 },
    { id: 'zweig',  label: 'Zweig', plural: 'Zweige',          max: 10,   step: 1 },
    { id: 'handvoll', label: 'Handvoll',     max: 5,    step: 0.5 },
    { id: 'msp',    label: 'Messerspitze', plural: 'Messerspitzen', max: 5, step: 1 },
    // frei benennbar (z. B. Blätter, Stangen, Tropfen) → Name steht in ingredient.customUnit
    { id: 'custom', label: 'Eigenes …',      max: 20,   step: 1 },
    { id: 'ng',     label: 'nach Geschmack', max: 0,    step: 0 }
  ];
  const UNIT_BY_ID = Object.fromEntries(UNITS.map(u => [u.id, u]));

  const EFFORT = { 1: 'Einfach', 2: 'Mittel', 3: 'Aufwendig' };
  const COST = { 1: 'Günstig', 2: 'Mittel', 3: 'Teuer' };

  const SHARE_FORMAT = 'easykitchen-recipes';

  let state = { version: 1, recipes: [], settings: {}, plan: { items: [], checked: [] }, drafts: [], updatedAt: 0 };
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
    // Mac-App: state.json ist immer maßgeblich (sonst könnte eine ältere Browser-Kopie
    // z. B. eine zurückgespielte state.json überschreiben). localStorage nur als Fallback.
    if (nativeState) state = nativeState;
    else if (localState) state = localState;
    state.recipes = state.recipes.map(normalizeRecipe);
    if (!state.settings || typeof state.settings !== 'object') state.settings = {};
    state.plan = normalizePlan(state.plan);
    state.drafts = (Array.isArray(state.drafts) ? state.drafts : []).filter(d => d && d.id && d.data);
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

  /**
   * Offensichtliche Einheiten-Verwechslung korrigieren: „500 l Milch“ / „250 kg Mehl“
   * meint in einem Rezept praktisch immer ml bzw. g (z. B. Einheit falsch ausgewählt).
   */
  const MIXUP_LIMIT = 30;
  function fixUnitMixup(ing) {
    if (ing.unit === 'l' && ing.amount >= MIXUP_LIMIT) return { ...ing, unit: 'ml' };
    if (ing.unit === 'kg' && ing.amount >= MIXUP_LIMIT) return { ...ing, unit: 'g' };
    return ing;
  }

  /** Zutat bereinigen; eigene Einheit braucht einen Namen, sonst wird daraus „Stück“. */
  function normalizeIngredient(i) {
    i = i || {};
    const out = {
      name: String(i.name || '').trim(),
      amount: Number.isFinite(Number(i.amount)) ? Number(i.amount) : 0,
      unit: UNIT_BY_ID[i.unit] ? i.unit : 'g'
    };
    if (out.unit === 'custom') {
      const cu = String(i.customUnit || '').replace(/\s+/g, ' ').trim().slice(0, 30);
      if (cu) out.customUnit = cu; else out.unit = 'stk';
    }
    return out;
  }

  function normalizeRecipe(r) {
    r = r || {};
    // Zeiten: Vorbereitung + Zubereitung = Gesamt. Ältere Rezepte hatten nur „time“ → wird zur Zubereitung.
    const hasSplit = r.prepTime != null || r.cookTime != null;
    const prepTime = hasSplit ? clampInt(r.prepTime, 0, 1440, 0) : 0;
    const cookTime = hasSplit ? clampInt(r.cookTime, 0, 1440, 0) : clampInt(r.time, 0, 1440, 30);
    return {
      id: r.id || uid(),
      title: String(r.title || '').trim(),
      image: typeof r.image === 'string' ? r.image : '',
      prepTime,
      cookTime,
      time: Math.min(2880, prepTime + cookTime),
      effort: clampInt(r.effort, 1, 3, 1),
      cost: clampInt(r.cost, 1, 3, 1),
      servings: clampInt(r.servings, 1, 50, 2),
      ingredients: (Array.isArray(r.ingredients) ? r.ingredients : [])
        .map(i => fixUnitMixup(normalizeIngredient(i)))
        .filter(i => i.name),
      steps: String(r.steps || ''),
      watch: !!r.watch,
      // Eigenschaften für Filter (leer = automatisch erkennen)
      // vor v1.5 gab es keine „Nachspeise“ – süße Nebenspeisen werden zu Nachspeisen
      course: r.course === 'side' && r.taste === 'sweet' ? 'dessert' : (['main', 'side', 'dessert'].includes(r.course) ? r.course : null),
      taste: r.taste === 'sweet' || r.taste === 'savory' ? r.taste : null,
      diet: r.diet === 'veg' || r.diet === 'nonveg' ? r.diet : 'auto',
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

  // ---------- Einstellungen ----------

  function getSetting(key, def) {
    return Object.prototype.hasOwnProperty.call(state.settings, key) ? state.settings[key] : def;
  }
  function setSetting(key, value) {
    state.settings[key] = value;
    persist();
  }

  // ---------- Backup & Teilen ----------

  function exportJSON() {
    return JSON.stringify({ app: 'EasyKitchen', exportedAt: new Date().toISOString(), ...state }, null, 2);
  }

  /** Teilbares Format (.easykitchen) – ohne persönliche Watchlist-Markierung. */
  function exportShare(ids) {
    const recipes = ids.map(getRecipe).filter(Boolean).map(r => {
      const { watch, ...rest } = r;
      return rest;
    });
    return JSON.stringify({ format: SHARE_FORMAT, version: 1, app: 'EasyKitchen', exportedAt: new Date().toISOString(), recipes });
  }

  /** Liest Rezepte aus einer .easykitchen-Datei, einem Backup oder eingebetteten PDF-Daten (ohne zu speichern). */
  function parseShare(text) {
    const obj = parse(text);
    if (!obj) return null;
    return obj.recipes.map(normalizeRecipe).filter(r => r.title && r.ingredients.length);
  }

  /** Vergleichsschlüssel für den Namen: Groß/Klein, Umlaute, Satzzeichen & Leerzeichen egal. */
  function titleKey(t) { return norm(t).replace(/\s+/g, ''); }

  /**
   * Teilt eine Import-Liste in neue und schon vorhandene Rezepte.
   * Doppelt = gleiche Kennung ODER gleicher Name (auch doppelt innerhalb der Datei).
   */
  function splitImport(list) {
    const byId = new Map(), byTitle = new Map();
    state.recipes.forEach(r => { byId.set(r.id, { r, inFile: false }); if (!byTitle.has(titleKey(r.title))) byTitle.set(titleKey(r.title), { r, inFile: false }); });
    const fresh = [], dupes = [];
    list.forEach(r => {
      const tk = titleKey(r.title);
      const hit = byId.get(r.id) || byTitle.get(tk);
      // Doppelte behalten ihr Gegenstück (vorhandenes Rezept bzw. früherer Eintrag derselben Datei) für den Vergleich
      if (hit) { dupes.push({ r, match: hit.r, inFile: hit.inFile }); return; }
      fresh.push(r);
      byId.set(r.id, { r, inFile: true });
      if (!byTitle.has(tk)) byTitle.set(tk, { r, inFile: true });
    });
    return { fresh, dupes };
  }

  /** Übernimmt Rezepte: bekannte IDs werden aktualisiert (Watchlist bleibt), neue ergänzt. */
  function importRecipes(list) {
    let added = 0, updated = 0;
    list.map(normalizeRecipe).forEach(rec => {
      const idx = state.recipes.findIndex(r => r.id === rec.id);
      if (idx >= 0) {
        rec.watch = state.recipes[idx].watch || rec.watch;
        state.recipes[idx] = rec;
        updated++;
      } else {
        state.recipes.unshift(rec);
        added++;
      }
    });
    persist();
    return { added, updated };
  }

  function importJSON(text) {
    const list = parseShare(text);
    if (!list) throw new Error('Keine gültige EasyKitchen-Datei.');
    return importRecipes(list);
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

  // Füllwörter in der Suche („Tomaten und Zwiebeln“) sind keine Zutaten
  const SEARCH_STOPWORDS = new Set(['und', 'oder', 'mit', 'ohne', 'sowie', 'plus', 'auch', 'aber', 'die', 'der', 'das', 'den', 'dem',
    'ein', 'eine', 'einen', 'etwas', 'and', 'or', 'with']);
  function parseTerms(query) {
    const seen = new Set();
    const words = String(query || '').split(/[,;&+\s]+/).map(norm).filter(Boolean);
    // englische Zweiwort-Begriffe zusammenhalten („olive oil“, „bell pepper“, „spring onion“)
    const FN = window.EasyKitchen.FoodNames;
    const merged = [];
    for (let i = 0; i < words.length; i++) {
      if (FN && words[i + 1] && FN.isPhrase(words[i] + ' ' + words[i + 1])) { merged.push(words[i] + ' ' + words[i + 1]); i++; }
      else merged.push(words[i]);
    }
    return merged.filter(t => t.length >= 2 && !SEARCH_STOPWORDS.has(t) && !seen.has(t) && seen.add(t));
  }

  // Endungen, die aus einer Zutat ein eigenständiges Produkt machen:
  // „Tomaten|mark“, „Paprika|pulver“, „Zitronen|saft“, „Hähnchen|brühe“, „Reis|essig“ …
  const PRODUCT_SUFFIXES = ['mark', 'pulver', 'saft', 'sauce', 'sosse', 'sose', 'bruhe', 'fond', 'essig', 'ol',
    'starke', 'wein', 'gras', 'melisse', 'flocken', 'mus', 'ketchup', 'paste', 'sirup', 'nudel', 'mehl', 'kerne',
    'korner', 'samen', 'chips', 'gewurz', 'aroma', 'likor', 'tee', 'würfel', 'wurfel', 'pesto', 'creme', 'aufstrich',
    'schale', 'abrieb', 'konfiture', 'marmelade', 'gelee', 'granulat', 'extrakt', 'milch', 'butter', 'kase', 'reis'];
  // Zusammengesetzte Wörter, die trotz gleicher Endung etwas anderes sind
  const DISTINCT_COMPOUNDS = ['fruhlingszwiebel', 'lauchzwiebel', 'gewurzgurke', 'essiggurke', 'salzgurke',
    'buttermilch', 'kokosmilch', 'mandelmilch', 'hafermilch', 'sojamilch', 'reismilch', 'kondensmilch', 'erdnussbutter',
    'kakaobutter', 'muskatnuss', 'kokosnuss', 'sojasahne', 'hafersahne', 'kokossahne', 'kokosjoghurt', 'sojajoghurt',
    'blumenkohl', 'rosenkohl', 'kohlrabi', 'sauerkraut', 'kokosflocken', 'kokosol', 'zuckerschote', 'zuckerschoten',
    'paprikapulver', 'chilipulver', 'currypulver', 'knoblauchpulver', 'zwiebelpulver', 'backpulver', 'puddingpulver',
    'vanillepuddingpulver', 'senfkorner', 'pfefferkorner', 'cashewmus', 'apfelmus', 'mandelmus', 'nussmus', 'sesammus'];
  const LINKS = /^(en|n|es|s|e)/;   // Fugenelemente: Tomate-n-mark, Zitrone-n-gras, Hähnchen-s-…

  function singular(w) {
    if (w.length > 5) return w.replace(/(en|er|n|e|s)$/, '');
    if (w.length > 4) return w.replace(/(n|e|s)$/, '');
    return w;
  }

  /** Ist das Wort (zusammengesetzt) ein eigenständiges Produkt, obwohl es mit dem Suchwort beginnt? */
  function isProductCompound(word, base) {
    const raw = word.slice(base.length);
    if (!raw) return false;
    // mit und ohne Fugenelement prüfen („tomaten|sosse“, „reis|essig“, „kartoffel|starke“)
    const rems = [raw, raw.replace(LINKS, '')];
    return rems.some(rem => PRODUCT_SUFFIXES.some(sfx => rem.startsWith(sfx)));
  }

  function isDistinct(word) {
    const sw = singular(word);
    return DISTINCT_COMPOUNDS.some(d => word === d || sw === singular(d) || word.startsWith(d));
  }

  /** Passt ein Suchwort zu einem einzelnen Wort (Plural, Komposita – aber keine fremden Produkte)? */
  const IRREGULAR = { eier: 'ei' };
  function wordMatches(term, word) {
    if (!word) return false;
    if (word === term || (IRREGULAR[term] || term) === (IRREGULAR[word] || word)) return true;
    const st = stem(term);
    const bases = st.length >= 3 ? [term, st] : [term];
    // Wortanfang: „zwiebel“ → „zwiebeln“, „zwiebelringe“ – aber nicht „tomaten|mark“
    for (const b of bases) {
      if (word.startsWith(b)) {
        if (word.length - b.length <= 2) return true;                 // nur Plural/Endung
        if (isDistinct(word)) return false;                            // z. B. „lauch|zwiebel“ für „lauch“
        return !isProductCompound(word, b);
      }
    }
    // Wortende: „kirschtomaten“ für „tomaten“, „rinderhackfleisch“ für „hackfleisch“ – aber nicht „frühlings|zwiebel“
    if (term.length >= 4) {
      const ws = singular(word);
      if (bases.some(b => word.endsWith(b) || ws.endsWith(b))) return !isDistinct(word);
    }
    return false;
  }

  function termMatches(term, text) {
    const t = norm(text);
    if (!t) return false;
    if (term.includes(' ')) return t.includes(term);              // Wortgruppen wie „rote zwiebel“
    const words = t.split(' ');
    if (words.some(w => wordMatches(term, w))) return true;
    // Zutat steckt im Suchwort (z. B. Suche „Rinderhack“, Zutat „Hack“)
    return words.some(w => w.length >= 4 && (term.endsWith(w) || term.startsWith(w)) &&
      !isProductCompound(term, w) && !isDistinct(term));
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
    const FN = window.EasyKitchen.FoodNames;
    terms.forEach(term => {
      let hit = false;
      // Suchwort + Übersetzungen (englisch ↔ deutsch)
      const variants = [term].concat(FN ? FN.alternatives(term) : []);
      const any = text => variants.some(v => termMatches(v, text));
      recipe.ingredients.forEach((ing, i) => {
        if (any(ing.name)) { matchedIngredients.add(i); hit = true; }
      });
      if (any(recipe.title)) { hit = true; titleHits++; }
      if (hit) matchedTerms.push(term);
    });
    const score = matchedTerms.length * 10 + matchedIngredients.size * 2 + titleHits;
    return { score, matchedTerms, matchedIngredients };
  }

  // ---------- Zubereitungsschritte: Nummerierung erkennen & entfernen ----------
  // Die App nummeriert Schritte selbst – vorhandene Nummern würden doppelt erscheinen („1. 1. …“).
  const CIRCLED = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
  // „1.“ „1)“ „(1)“ „1:“ „1.)“ „1 –“ – aber nicht „1.5 kg“ oder „2:30 Std“
  const NUM_PREFIX = /^\(?\d{1,2}\s*(?:\.\)|\.(?!\d)|\)|:(?!\d)|\s[-–—](?=\s))\s*/;

  /** Entfernt Nummerierung am Zeilenanfang. Liefert { text, numbered }. */
  function stripStepNumber(line) {
    let l = String(line || '').trim();
    const before = l;
    l = l.replace(/^(\d)️?⃣\s*/, '');                                   // 1️⃣
    l = l.replace(new RegExp('^[' + CIRCLED + ']\\s*'), '');                        // ①
    l = l.replace(/^(?:(?:arbeits|zubereitungs)?schritt|step)\s*\d{1,2}(?:\s*(?:\/|von|of)\s*\d{1,2})?\s*[:.)\-–—]?\s*/i, '');   // „Schritt 3:“, „Schritt 3 von 5“
    l = l.replace(/^\d{1,2}\s*\.\s*schritt\s*[:\-–—]?\s*/i, '');                  // „3. Schritt:“
    let prev;
    do { prev = l; l = l.replace(NUM_PREFIX, ''); } while (l !== prev && l);      // „1. 2. 3. Text“
    return { text: l.trim(), numbered: l !== before };
  }

  /** Teilt „1. Teig rühren. 2. Backen. 3. …“ (alles in einer Zeile) in einzelne Schritte. */
  function splitInlineSteps(line) {
    const re = /(?:^|\s)\(?(\d{1,2})[.)](?!\d)\s+/g;
    const marks = [];
    let m;
    while ((m = re.exec(line))) marks.push({ n: Number(m[1]), at: m.index + (m[0].startsWith(' ') ? 1 : 0) });
    if (marks.length < 2) return [line];
    // nur, wenn die Nummern fortlaufend sind (1, 2, 3 …) und zwischen ihnen Text steht
    for (let i = 1; i < marks.length; i++) if (marks[i].n !== marks[i - 1].n + 1) return [line];
    const parts = marks.map((mk, i) => line.slice(mk.at, i + 1 < marks.length ? marks[i + 1].at : undefined).trim());
    if (parts.slice(0, -1).some(p => stripStepNumber(p).text.length < 3)) return [line];   // „1. 2. 3. Text“ → anders behandeln
    const head = line.slice(0, marks[0].at).trim();
    return (head ? [head] : []).concat(parts);
  }

  /** Bereinigt Zubereitungstext: eine Zeile pro Schritt, ohne eigene Nummerierung. */
  function cleanSteps(text) {
    let lines = String(text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    lines = lines.flatMap(splitInlineSteps);
    // reine Schrittmarken in eigener Zeile („3“, „(3)“, „3.“, „Schritt 3“) weglassen
    lines = lines.filter(l => !/^(?:(?:schritt|step)\s*)?\(?\d{1,2}[.):]?\)?$/i.test(l) && !/^(?:(?:arbeits|zubereitungs)?schritt|step)(?:\s*\d{1,2}(?:\s*(?:\/|von|of)\s*\d{1,2})?)?\s*[:.)]?$/i.test(l) && !/^[①-⑳]$/.test(l) && !/^\d\uFE0F?\u20E3$/.test(l));
    lines = lines.map(l => stripStepNumber(l.replace(/^[•·▪●○◦■□☐✓✔*>\-–—]+\s*/, '')).text).filter(Boolean);
    // Nummern ohne Punkt („1 Zwiebel schneiden“, „2 Anbraten“) nur entfernen, wenn ALLE Zeilen
    // fortlaufend 1, 2, 3 … beginnen – sonst sind es Mengen („2 Eier verquirlen“).
    if (lines.length >= 2 && lines.every((l, i) => new RegExp('^' + (i + 1) + '\\s+\\S').test(l))) {
      lines = lines.map((l, i) => l.replace(new RegExp('^' + (i + 1) + '\\s+'), ''));
    }
    return lines.join('\n');
  }

  // ---------- Entwürfe (nicht gespeicherte Rezepte aus dem Editor) ----------
  function getDrafts() {
    return state.drafts.slice().sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
  }
  function getDraft(id) { return state.drafts.find(d => d.id === id) || null; }
  /** Speichert/aktualisiert einen Entwurf. sourceId = bearbeitetes Rezept (null = neues Rezept). */
  function saveDraft(draft) {
    const d = { id: draft.id || ('d_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)),
      sourceId: draft.sourceId || null, savedAt: Date.now(), data: draft.data || {} };
    const i = state.drafts.findIndex(x => x.id === d.id);
    if (i >= 0) state.drafts[i] = d; else state.drafts.push(d);
    persist();
    return d;
  }
  function deleteDraft(id) {
    state.drafts = state.drafts.filter(d => d.id !== id);
    persist();
  }
  /** Sofort auf die Festplatte schreiben (z. B. beim Beenden der App). */
  function flushNow() { clearTimeout(nativeTimer); flushNative(); }

  // ---------- Wocheneinkaufsplaner ----------

  function normalizePlan(p) {
    p = p && typeof p === 'object' ? p : {};
    return {
      items: (Array.isArray(p.items) ? p.items : [])
        .filter(i => i && i.id)
        .map(i => ({ id: String(i.id), servings: clampInt(i.servings, 1, 50, 2) })),
      checked: Array.isArray(p.checked) ? p.checked.map(String) : []
    };
  }

  /** Geplante Rezepte (gelöschte Rezepte fallen automatisch heraus). */
  function getPlan() {
    return state.plan.items
      .map(i => ({ ...i, recipe: getRecipe(i.id) }))
      .filter(i => i.recipe);
  }
  function isPlanned(id) { return state.plan.items.some(i => i.id === id); }
  function togglePlan(id) {
    const r = getRecipe(id);
    if (!r) return false;
    if (isPlanned(id)) state.plan.items = state.plan.items.filter(i => i.id !== id);
    else state.plan.items.push({ id, servings: getServingsPref(id) });
    persist();
    return isPlanned(id);
  }
  function setPlanServings(id, servings) {
    const it = state.plan.items.find(i => i.id === id);
    if (!it) return;
    it.servings = clampInt(servings, 1, 50, it.servings);
    persist();
  }
  // ---------- Portionspräferenz (pro Rezept, ändert das Rezept nicht) ----------
  function getServingsPref(id) {
    const r = getRecipe(id);
    const map = state.settings.servingsPref || {};
    const v = Number(map[id]);
    return Number.isFinite(v) && v >= 1 ? v : (r ? r.servings : 2);
  }
  function setServingsPref(id, n) {
    const r = getRecipe(id);
    if (!r) return;
    const map = { ...(state.settings.servingsPref || {}) };
    n = clampInt(n, 1, 50, r.servings);
    if (n === r.servings) delete map[id]; else map[id] = n;
    state.settings.servingsPref = map;
    persist();
  }

  function clearPlan() { state.plan = { items: [], checked: [] }; persist(); }
  function isChecked(key) { return state.plan.checked.includes(key); }
  function toggleChecked(key) {
    if (isChecked(key)) state.plan.checked = state.plan.checked.filter(k => k !== key);
    else state.plan.checked.push(key);
    persist();
  }
  function clearChecked() { state.plan.checked = []; persist(); }

  function subscribe(fn) { listeners.push(fn); }

  ns.Data = {
    norm, stem, fixUnitMixup, cleanSteps, stripStepNumber, splitInlineSteps,
    getServingsPref, setServingsPref, getDrafts, getDraft, saveDraft, deleteDraft, flushNow,
    getPlan, isPlanned, togglePlan, setPlanServings, clearPlan, isChecked, toggleChecked, clearChecked,
    UNITS, UNIT_BY_ID, EFFORT, COST,
    SHARE_FORMAT, init, getRecipes, getRecipe, saveRecipe, deleteRecipe, toggleWatch,
    exportJSON, importJSON, exportShare, parseShare, importRecipes, splitImport, getSetting, setSetting, parseTerms, matchRecipe, subscribe, hasNativeStorage, uid
  };
})(window.EasyKitchen);
