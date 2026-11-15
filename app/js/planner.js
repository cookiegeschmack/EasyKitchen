/*
 * EasyKitchen – Wocheneinkaufsplaner.
 * Rezepte für die Woche auswählen → eine gemeinsame Einkaufsliste:
 * gleiche Zutaten werden zusammengefasst (g/kg und ml/l werden umgerechnet),
 * Mengen auf die geplanten Portionen skaliert und nach Supermarkt-Bereichen sortiert.
 */
window.EasyKitchen = window.EasyKitchen || {};
(function (ns) {
  'use strict';

  const D = ns.Data, UI = ns.UI;
  const $ = UI.$, esc = UI.esc;
  const native = name => window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers[name];

  // ---------- Kategorien (Reihenfolge = Weg durch den Supermarkt) ----------
  const CATEGORIES = [
    { id: 'gemuese', label: 'Obst & Gemüse', icon: '🥕', tone: 'mint',
      keys: 'zwiebel|schalotte|knoblauch|tomate|kirschtomate|paprika|karotte|mohre|mohrrube|kartoffel|susskartoffel|salat|rucola|feldsalat|gurke|zucchini|aubergine|pilz|champignon|egerling|spinat|lauch|porree|sellerie|staudensellerie|brokkoli|broccoli|blumenkohl|rosenkohl|kohl|wirsing|kurbis|avocado|ingwer|chili|peperoni|zitrone|limette|apfel|banane|beere|erdbeere|himbeere|heidelbeere|orange|mandarine|birne|mango|ananas|petersilie|schnittlauch|basilikum|koriander|dill|krauter|thymian|rosmarin|minze|salbei|suppengrun|fruhlingszwiebel|lauchzwiebel|spargel|fenchel|radieschen|rote bete|bohnen grun|grune bohnen|erbsen frisch' },
    { id: 'fleisch', label: 'Fleisch & Fisch', icon: '🥩', tone: 'rose',
      keys: 'fleisch|hack|hackfleisch|rind|rinder|schwein|hahnchen|huhn|huhner|pute|puten|lamm|speck|bacon|schinken|wurst|salami|chorizo|lachs|fisch|thunfisch|garnele|shrimps|kabeljau|seelachs|forelle|roulade|steak|schnitzel|filet|keule|schenkel|gulasch|mett|pancetta' },
    { id: 'kuehl', label: 'Milchprodukte & Eier', icon: '🥛', tone: 'sky',
      keys: 'milch|sahne|schlagsahne|schmand|creme fraiche|saure sahne|joghurt|quark|skyr|kase|gouda|emmentaler|bergkase|cheddar|parmesan|pecorino|mozzarella|burrata|feta|schafskase|halloumi|frischkase|mascarpone|ricotta|butter|margarine|ei|eier|eigelb|tofu' },
    { id: 'vorrat', label: 'Nudeln, Reis & Backen', icon: '🌾', tone: 'butter',
      keys: 'nudel|nudeln|spaghetti|pasta|penne|tagliatelle|fusilli|farfalle|makkaroni|lasagne|lasagneplatten|spatzle|gnocchi|reis|couscous|bulgur|quinoa|haferflocken|mehl|zucker|puderzucker|vanillezucker|honig|sirup|starke|speisestarke|backpulver|hefe|trockenhefe|natron|brot|toast|brotchen|baguette|tortilla|wrap|paniermehl|semmelbrosel|blatterteig|pizzateig|teig|linsen|kichererbsen|kidneybohnen|bohnen|nusse|mandeln|walnusse|haselnusse|cashew|pinienkerne|sesam|schokolade|kakao|rosinen' },
    { id: 'konserven', label: 'Konserven, Saucen & Brühe', icon: '🥫', tone: 'peach',
      keys: 'gehackte tomaten|passierte tomaten|geschalte tomaten|passata|tomatenmark|kokosmilch|bruhe|fond|bouillon|senf|dijon|ketchup|mayonnaise|sojasosse|sojasauce|essig|balsamico|pesto|currypaste|ajvar|gewurzgurke|essiggurke|oliven|kapern|mais|sauerkraut|worcestersosse|fischsosse|tahini|erdnussbutter' },
    { id: 'gewuerze', label: 'Gewürze & Öle', icon: '🧂', tone: 'lavender',
      keys: 'salz|pfeffer|ol|olivenol|rapsol|sonnenblumenol|sesamol|pulver|paprikapulver|currypulver|chilipulver|curry|zimt|muskat|oregano|majoran|lorbeer|kreuzkummel|kurkuma|kummel|nelke|piment|wacholder|gewurz|vanille|chiliflocken|cayennepfeffer|garam masala|butterschmalz|schmalz|ghee|kokosol' },
    { id: 'getraenke', label: 'Getränke', icon: '🍷', tone: 'lavender',
      keys: 'wein|rotwein|weisswein|bier|saft|orangensaft|apfelsaft|wasser|sekt|sherry|portwein' },
    { id: 'sonstiges', label: 'Sonstiges', icon: '🛒', tone: 'sky', keys: '' }
  ];
  // spezifische Bereiche zuerst prüfen (z. B. „Kokosmilch“ vor „Milch“, „Paprikapulver“ vor „Paprika“)
  const MATCH_ORDER = ['getraenke', 'konserven', 'gewuerze', 'fleisch', 'kuehl', 'vorrat', 'gemuese'];
  let catIndex = null;

  function buildCatIndex() {
    catIndex = MATCH_ORDER.map(id => {
      const c = CATEGORIES.find(x => x.id === id);
      return { id, keys: c.keys.split('|').map(k => D.norm(k)).filter(Boolean) };
    });
  }

  function categorize(name, unit) {
    if (!catIndex) buildCatIndex();
    const n = D.norm(String(name || '').replace(/\(.*?\)/g, ' '));
    const words = n.split(' ');
    let cat = null;
    // 1. Durchgang: exakte Wörter & Wortgruppen („Olivenöl“, „Gewürzgurke“, „Kokosmilch“)
    for (const { id, keys } of catIndex) {
      if (keys.some(k => (k.includes(' ') ? n.includes(k) : words.includes(k)))) { cat = id; break; }
    }
    // 2. Durchgang: Wortanfang/-ende (Komposita, Plural)
    if (!cat) {
      outer: for (const { id, keys } of catIndex) {
        for (const k of keys) {
          if (k.includes(' ')) continue;
          for (const w of words) {
            if (k.length >= 4 && (w.startsWith(k) || w.endsWith(k))) { cat = id; break outer; }
            if (k === 'ol' && w.endsWith('ol') && w.length > 3) { cat = id; break outer; }   // „Rapsöl“ usw.
          }
        }
      }
    }
    cat = cat || 'sonstiges';
    // Aus der Dose / dem Glas → Konservenregal
    if ((unit === 'dose' || unit === 'glas') && ['gemuese', 'vorrat', 'sonstiges'].includes(cat)) cat = 'konserven';
    return cat;
  }

  // ---------- Zusammenführen ----------

  /** Gleiche Zutat erkennen: Klammern/Zusätze weg, Umlaute vereinheitlichen, Plural grob entfernen. */
  function ingredientKey(name) {
    const base = D.norm(String(name || '').replace(/\(.*?\)/g, ' ').split(',')[0]);
    return base.split(' ').map(w => {
      if (w === 'eier') return 'ei';
      if (/^knoblauchzehen?$/.test(w)) return 'knoblauch';
      if (w.length > 4) return w.replace(/(en|n|e|s)$/, '');
      return w;
    }).join(' ');
  }

  function displayName(name) {
    return String(name || '').replace(/\(.*?\)/g, '').split(',')[0].replace(/\s+/g, ' ').trim();
  }

  // Einheiten, die sich umrechnen lassen
  const FAMILY = { g: ['mass', 1], kg: ['mass', 1000], ml: ['vol', 1], l: ['vol', 1000] };

  function buildList() {
    const plan = D.getPlan();
    const map = new Map();
    plan.forEach(({ recipe, servings }) => {
      const factor = servings / Math.max(1, recipe.servings || 1);
      recipe.ingredients.forEach(ing => {
        const key = ingredientKey(ing.name);
        if (!key) return;
        let it = map.get(key);
        if (!it) {
          it = { key, name: displayName(ing.name).replace(/^Knoblauchzehen?$/i, 'Knoblauch'), cat: categorize(ing.name, ing.unit), mass: 0, vol: 0, units: {}, toTaste: false, recipes: [] };
          map.set(key, it);
        }
        if (!it.recipes.includes(recipe.title)) it.recipes.push(recipe.title);
        const amount = (Number(ing.amount) || 0) * factor;
        if (ing.unit === 'ng' || !amount) { it.toTaste = true; return; }
        const fam = FAMILY[ing.unit];
        if (fam) it[fam[0]] += amount * fam[1];
        else it.units[ing.unit] = (it.units[ing.unit] || 0) + amount;
      });
    });
    return [...map.values()];
  }

  function roundNice(v, unitId) {
    // Stückige Einheiten auf halbe Einheiten aufrunden, sonst sinnvoll runden
    if (['stk', 'dose', 'pck', 'becher', 'glas', 'bund', 'zehe', 'scheibe', 'zweig'].includes(unitId)) return Math.ceil(v * 2) / 2;
    if (v >= 100) return Math.round(v / 5) * 5;
    if (v >= 10) return Math.round(v);
    return Math.round(v * 10) / 10;
  }

  function amountText(it) {
    const parts = [];
    if (it.mass) parts.push(it.mass >= 1000 ? `${UI.fmtNum(Math.round(it.mass / 50) / 20)} kg` : `${UI.fmtNum(roundNice(it.mass, 'g'))} g`);
    if (it.vol) parts.push(it.vol >= 1000 ? `${UI.fmtNum(Math.round(it.vol / 50) / 20)} l` : `${UI.fmtNum(roundNice(it.vol, 'ml'))} ml`);
    Object.entries(it.units).forEach(([u, v]) => {
      const unit = D.UNIT_BY_ID[u];
      const n = roundNice(v, u);
      parts.push(`${UI.fmtNum(n)} ${n > 1 && unit.plural ? unit.plural : unit.label}`);
    });
    if (!parts.length) return it.toTaste ? 'nach Bedarf' : '';
    return parts.join(' + ');
  }

  function grouped() {
    const items = buildList();
    return CATEGORIES.map(c => ({
      ...c,
      items: items.filter(i => i.cat === c.id)
        .sort((a, b) => (D.isChecked(a.key) - D.isChecked(b.key)) || a.name.localeCompare(b.name, 'de'))
    })).filter(c => c.items.length);
  }

  // ---------- Darstellung ----------

  function renderBadge() {
    const n = D.getPlan().length;
    const b = $('plan-count');
    b.textContent = n;
    b.hidden = !n;
  }

  function render() {
    renderBadge();
    if (UI.topModal() !== 'plan-modal' && $('plan-modal').hidden) return;
    const plan = D.getPlan();

    // Linke Spalte: Rezepte der Woche
    $('plan-recipes').innerHTML = plan.length ? plan.map(({ recipe: r, servings }) => `
      <li class="plan-item">
        <span class="plan-thumb tone-${toneOf(r.id)}">${r.image ? `<img src="${r.image}" alt="">` : esc(r.title.charAt(0).toUpperCase())}</span>
        <span class="plan-info">
          <button type="button" class="plan-title" data-plan-open="${esc(r.id)}">${esc(r.title)}</button>
          <span class="plan-serv">
            <button type="button" class="step-btn" data-plan-serv="${esc(r.id)}" data-delta="-1" aria-label="Weniger Portionen">−</button>
            <span>${servings} ${servings === 1 ? 'Portion' : 'Portionen'}</span>
            <button type="button" class="step-btn" data-plan-serv="${esc(r.id)}" data-delta="1" aria-label="Mehr Portionen">+</button>
          </span>
        </span>
        <button type="button" class="icon-btn" data-plan-remove="${esc(r.id)}" title="Aus dem Wochenplan entfernen" aria-label="Entfernen">✕</button>
      </li>`).join('') : `<li class="plan-empty">Noch keine Rezepte geplant. Wähle unten Rezepte aus oder tippe bei einem Rezept auf <strong>🛒</strong>.</li>`;
    $('plan-summary').textContent = plan.length
      ? `${plan.length} ${plan.length === 1 ? 'Rezept' : 'Rezepte'} · ${plan.reduce((s, p) => s + p.servings, 0)} Portionen`
      : '';

    renderPicker();

    // Rechte Spalte: Einkaufsliste
    const groups = grouped();
    const total = groups.reduce((s, g) => s + g.items.length, 0);
    const done = groups.reduce((s, g) => s + g.items.filter(i => D.isChecked(i.key)).length, 0);
    $('shop-progress').textContent = total ? `${done} von ${total} erledigt` : '';
    $('shop-actions').hidden = !total;
    $('shop-list').innerHTML = total ? groups.map(g => `
      <section class="shop-group">
        <h4 class="shop-cat tone-${g.tone}"><span>${g.icon}</span>${esc(g.label)}<span class="shop-cat-count">${g.items.length}</span></h4>
        <ul>
          ${g.items.map(i => {
            const checked = D.isChecked(i.key);
            const amt = amountText(i);
            return `
            <li class="shop-item ${checked ? 'done' : ''}">
              <label>
                <input type="checkbox" data-shop-key="${esc(i.key)}" ${checked ? 'checked' : ''}>
                <span class="shop-text">
                  <span class="shop-main"><strong>${esc(i.name)}</strong>${amt ? `<span class="shop-amt">${esc(amt)}</span>` : ''}</span>
                  ${i.recipes.length > 1 ? `<span class="shop-for">für ${i.recipes.map(esc).join(', ')}</span>` : ''}
                </span>
              </label>
            </li>`;
          }).join('')}
        </ul>
      </section>`).join('') : `
      <div class="shop-empty">
        <div class="empty-icon">🛒</div>
        <p>Sobald du Rezepte für die Woche auswählst, entsteht hier automatisch deine Einkaufsliste – gleiche Zutaten werden zusammengefasst.</p>
      </div>`;
  }

  function renderPicker() {
    const q = D.norm($('plan-picker-search').value);
    const all = D.getRecipes()
      .filter(r => !q || D.norm(r.title).includes(q) || r.ingredients.some(i => D.norm(i.name).includes(q)))
      .sort((a, b) => (Number(D.isPlanned(b.id)) - Number(D.isPlanned(a.id))) || (Number(b.watch) - Number(a.watch)) || a.title.localeCompare(b.title, 'de'));
    $('plan-picker-list').innerHTML = all.length ? all.map(r => `
      <li>
        <label class="${D.isPlanned(r.id) ? 'on' : ''}">
          <input type="checkbox" data-plan-toggle="${esc(r.id)}" ${D.isPlanned(r.id) ? 'checked' : ''}>
          <span class="picker-title">${r.watch ? '<span class="picker-star">★</span>' : ''}${esc(r.title)}</span>
          <span class="picker-meta">${esc(UI.fmtTime(r.time))}</span>
        </label>
      </li>`).join('') : '<li class="picker-empty muted">Keine passenden Rezepte.</li>';
  }

  function toneOf(id) {
    let h = 0;
    for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return ['peach', 'mint', 'lavender', 'sky', 'butter', 'rose'][h % 6];
  }

  // ---------- Export ----------

  function listText() {
    const plan = D.getPlan();
    const lines = ['Einkaufsliste – EasyKitchen', ''];
    lines.push('Rezepte: ' + plan.map(p => `${p.recipe.title} (${p.servings} P.)`).join(', '), '');
    grouped().forEach(g => {
      lines.push(g.label.toUpperCase());
      g.items.forEach(i => {
        const amt = amountText(i);
        lines.push(`${D.isChecked(i.key) ? '☑' : '☐'} ${i.name}${amt ? ' – ' + amt : ''}`);
      });
      lines.push('');
    });
    return lines.join('\n').trim();
  }

  function copyList() {
    const text = listText();
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); UI.toast('Einkaufsliste kopiert ✓'); } catch (_) { UI.toast('Kopieren nicht möglich'); }
      ta.remove();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => UI.toast('Einkaufsliste kopiert ✓'), fallback);
    } else fallback();
  }

  function printHTML() {
    const plan = D.getPlan();
    const date = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>Einkaufsliste</title><style>
      @page { size: A4; margin: 0; }
      body { margin: 0; font: 11pt/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #2d2838; }
      .page { padding: 40px 50px 20px; }
      .brand { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ec7a62; padding-bottom: 10px; margin-bottom: 18px; font-weight: 700; }
      .brand img { width: 20px; height: 20px; vertical-align: -4px; margin-right: 6px; }
      .brand span { font-weight: 400; font-size: 9pt; color: #a59fb3; }
      h1 { font-size: 20pt; margin: 0 0 6px; }
      .recipes { color: #6f6880; font-size: 10pt; margin-bottom: 18px; }
      .cols { columns: 2; column-gap: 34px; }
      section { break-inside: avoid; margin-bottom: 14px; }
      h2 { font-size: 10.5pt; text-transform: uppercase; letter-spacing: .05em; color: #c4553d; margin: 0 0 6px; }
      ul { list-style: none; margin: 0; padding: 0; }
      li { display: flex; gap: 8px; padding: 4px 0; border-bottom: 1px solid #efe9f4; }
      .box { width: 11px; height: 11px; border: 1.5px solid #a59fb3; border-radius: 3px; margin-top: 4px; flex-shrink: 0; }
      .amt { margin-left: auto; color: #6f6880; white-space: nowrap; padding-left: 8px; }
      li.done { color: #a59fb3; text-decoration: line-through; }
    </style></head><body><div class="page">
      <div class="brand"><div><img src="img/icon-128.png" alt="">EasyKitchen</div><span>Einkaufsliste · ${esc(date)}</span></div>
      <h1>Einkaufsliste für die Woche</h1>
      <div class="recipes">${plan.map(p => `${esc(p.recipe.title)} (${p.servings} P.)`).join(' · ')}</div>
      <div class="cols">
        ${grouped().map(g => `<section><h2>${esc(g.label)}</h2><ul>${g.items.map(i => `
          <li class="${D.isChecked(i.key) ? 'done' : ''}"><span class="box"></span><span>${esc(i.name)}</span><span class="amt">${esc(amountText(i))}</span></li>`).join('')}</ul></section>`).join('')}
      </div>
    </div></body></html>`;
  }

  function exportPDF(action) {
    const h = native('nativeExportPDF');
    if (h) {
      h.postMessage({ html: printHTML(), filename: 'Einkaufsliste.pdf', embed: '', action });
      UI.toast(action === 'share' ? 'Einkaufsliste wird vorbereitet…' : 'PDF wird erstellt…');
      return;
    }
    const win = window.open('', '_blank');
    if (!win) { UI.toast('Bitte Pop-ups erlauben, um die PDF zu erstellen.'); return; }
    win.document.write(printHTML().replace('src="img/icon-128.png"', `src="${new URL('img/icon-128.png', location.href).href}"`));
    win.document.close();
    win.onload = () => setTimeout(() => win.print(), 200);
  }

  // ---------- Verdrahtung ----------

  function open() {
    $('plan-picker-search').value = '';
    UI.openModal('plan-modal');
    render();
  }

  function wire() {
    $('plan-btn').addEventListener('click', open);
    $('plan-picker-search').addEventListener('input', renderPicker);
    $('plan-modal').addEventListener('click', e => {
      const t = e.target;
      const serv = t.closest('[data-plan-serv]');
      if (serv) {
        const it = D.getPlan().find(p => p.id === serv.dataset.planServ);
        if (it) D.setPlanServings(it.id, it.servings + Number(serv.dataset.delta));
        render(); return;
      }
      const rm = t.closest('[data-plan-remove]');
      if (rm) { D.togglePlan(rm.dataset.planRemove); render(); ns.App.renderList(); return; }
      const op = t.closest('[data-plan-open]');
      if (op) { ns.App.openDetail(op.dataset.planOpen); return; }
      const act = t.closest('[data-shop-act]');
      if (act) {
        const a = act.dataset.shopAct;
        if (a === 'copy') copyList();
        else if (a === 'pdf') exportPDF('save');
        else if (a === 'share') exportPDF('share');
        else if (a === 'uncheck') { D.clearChecked(); render(); }
        else if (a === 'new-week' && confirm('Neue Woche starten? Alle geplanten Rezepte und Häkchen werden entfernt.')) {
          D.clearPlan(); render(); ns.App.renderList();
        }
      }
    });
    $('plan-modal').addEventListener('change', e => {
      const tog = e.target.closest('[data-plan-toggle]');
      if (tog) { D.togglePlan(tog.dataset.planToggle); render(); ns.App.renderList(); return; }
      const chk = e.target.closest('[data-shop-key]');
      if (chk) { D.toggleChecked(chk.dataset.shopKey); render(); }
    });
    if (!native('nativeShareFile')) {
      const s = $('plan-modal').querySelector('[data-shop-act="share"]');
      if (s) s.hidden = true;
    }
    renderBadge();
  }

  ns.Planner = { open, render, renderBadge, wire, buildList, amountText, categorize, ingredientKey, toneOf, listText };
})(window.EasyKitchen);
