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
      </li>`).join('') : `<li class="plan-empty">Wähle oben die Rezepte für deine Woche aus (oder tippe bei einem Rezept auf <strong>🛒</strong>) – hier legst du dann die Portionen fest.</li>`;
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

  /** Eine Zeile: Menge zuerst („2 Zehen Knoblauch“), ohne feste Menge „Salz (nach Bedarf)“. */
  function itemLine(i) {
    const amt = amountText(i);
    if (!amt) return i.name;
    if (amt === 'nach Bedarf') return `${i.name} (nach Bedarf)`;
    return `${amt} ${i.name}`;
  }

  function listText() {
    const plan = D.getPlan();
    const lines = ['🛒 Einkaufsliste (EasyKitchen)', ''];
    lines.push('Für: ' + plan.map(p => `${p.recipe.title} (${p.servings} P.)`).join(', '), '');
    grouped().forEach(g => {
      lines.push(`${g.icon} ${g.label}`);
      g.items.forEach(i => lines.push(`${D.isChecked(i.key) ? '☑' : '☐'} ${itemLine(i)}`));
      lines.push('');
    });
    return lines.join('\n').trim();
  }

  function shareText() {
    const text = listText();
    const h = native('nativeShareText');
    if (h) { h.postMessage({ text }); return; }
    if (navigator.share) { navigator.share({ title: 'Einkaufsliste', text }).catch(() => {}); return; }
    copyList();
  }

  // ---------- Als Bild (PNG) ----------

  const IMG_TONES = {
    mint: ['#d8f3e6', '#2c8a5d'], rose: ['#fde1ea', '#b84470'], sky: ['#dcedfb', '#2f6fa8'],
    butter: ['#fff2c6', '#9a7414'], peach: ['#ffe4da', '#c25a3f'], lavender: ['#ebe3fc', '#6a52b8']
  };
  const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Arial, sans-serif';

  // Ältere macOS-Versionen (WebKit < Safari 16) kennen ctx.roundRect nicht → einfache Nachbildung
  if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      r = Math.min(Number(r) || 0, w / 2, h / 2);
      this.moveTo(x + r, y);
      this.arcTo(x + w, y, x + w, y + h, r);
      this.arcTo(x + w, y + h, x, y + h, r);
      this.arcTo(x, y + h, x, y, r);
      this.arcTo(x, y, x + w, y, r);
      this.closePath();
      return this;
    };
  }

  function wrapLines(ctx, text, maxW) {
    const words = String(text).split(' ');
    const lines = [];
    let line = '';
    words.forEach(w => {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
      else line = test;
    });
    if (line) lines.push(line);
    return lines;
  }

  function fitText(ctx, text, maxW) {
    if (ctx.measureText(text).width <= maxW) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
    return t + '…';
  }

  /** Zeichnet die Einkaufsliste als hochformatiges Bild (1080 px breit) im hellen Pastell-Stil. */
  function renderImage() {
    const W = 1080, PAD = 64, ROW = 58, inner = W - PAD * 2;
    const groups = grouped();
    const plan = D.getPlan();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = `400 28px ${FONT}`;
    const recipeLines = wrapLines(ctx, 'Für: ' + plan.map(p => `${p.recipe.title} (${p.servings} P.)`).join(' · '), inner);
    const itemCount = groups.reduce((n, g) => n + g.items.length, 0);
    const H = PAD + 40 + 76 + recipeLines.length * 38 + 30 + groups.length * (64 + 14) + itemCount * ROW + 70 + PAD;
    canvas.width = W; canvas.height = H;

    ctx.fillStyle = '#fbf8fc'; ctx.fillRect(0, 0, W, H);
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, '#dff3e7'); grad.addColorStop(.55, '#eee8fd'); grad.addColorStop(1, '#e2f1fc');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, 14);

    let y = PAD;
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#2c7a51'; ctx.font = `700 26px ${FONT}`;
    ctx.fillText('EasyKitchen', PAD, y);
    ctx.fillStyle = '#a59fb4'; ctx.font = `400 26px ${FONT}`; ctx.textAlign = 'right';
    ctx.fillText(new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }), W - PAD, y);
    ctx.textAlign = 'left';
    y += 40;
    ctx.fillStyle = '#2d2838'; ctx.font = `800 60px ${FONT}`;
    ctx.fillText('Einkaufsliste', PAD, y);
    y += 76;
    ctx.fillStyle = '#6c6580'; ctx.font = `400 28px ${FONT}`;
    recipeLines.forEach(l => { ctx.fillText(l, PAD, y); y += 38; });
    y += 30;

    groups.forEach(g => {
      const [bg, fg] = IMG_TONES[g.tone] || IMG_TONES.sky;
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.roundRect(PAD, y, inner, 52, 14); ctx.fill();
      ctx.fillStyle = fg; ctx.font = `700 28px ${FONT}`; ctx.textBaseline = 'middle';
      ctx.fillText(`${g.icon}  ${g.label}`, PAD + 20, y + 27);
      ctx.textAlign = 'right'; ctx.font = `600 24px ${FONT}`;
      ctx.fillText(String(g.items.length), W - PAD - 20, y + 27);
      ctx.textAlign = 'left';
      y += 64;
      g.items.forEach((i, idx) => {
        const done = D.isChecked(i.key);
        const cy = y + ROW / 2;
        // Kästchen
        ctx.lineWidth = 3; ctx.strokeStyle = done ? '#3f9468' : '#b9b2c6';
        ctx.fillStyle = done ? '#3f9468' : '#ffffff';
        ctx.beginPath(); ctx.roundRect(PAD + 8, cy - 15, 30, 30, 8); ctx.fill(); ctx.stroke();
        if (done) {
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.beginPath();
          ctx.moveTo(PAD + 15, cy); ctx.lineTo(PAD + 21, cy + 7); ctx.lineTo(PAD + 32, cy - 7); ctx.stroke();
        }
        // Menge zuerst, dann Zutat
        const amt = amountText(i);
        let x = PAD + 58;
        if (amt && amt !== 'nach Bedarf') {
          ctx.font = `700 30px ${FONT}`; ctx.fillStyle = done ? '#a59fb4' : '#2d2838';
          ctx.fillText(amt, x, cy);
          x += ctx.measureText(amt).width + 14;
        }
        ctx.font = `400 30px ${FONT}`; ctx.fillStyle = done ? '#a59fb4' : '#2d2838';
        const name = amt === 'nach Bedarf' ? `${i.name} (nach Bedarf)` : i.name;
        const shown = fitText(ctx, name, W - PAD - x);
        ctx.fillText(shown, x, cy);
        if (done) {
          ctx.strokeStyle = '#a59fb4'; ctx.lineWidth = 2; ctx.beginPath();
          ctx.moveTo(PAD + 58, cy + 1); ctx.lineTo(x + ctx.measureText(shown).width, cy + 1); ctx.stroke();
        }
        if (idx < g.items.length - 1) {
          ctx.fillStyle = '#efe9f4'; ctx.fillRect(PAD + 58, y + ROW - 1, inner - 58, 2);
        }
        y += ROW;
      });
      ctx.textBaseline = 'top';
      y += 14;
    });

    y += 26;
    ctx.fillStyle = '#a59fb4'; ctx.font = `400 22px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText('Erstellt mit EasyKitchen', W / 2, y);
    ctx.textAlign = 'left';
    return canvas.toDataURL('image/png');
  }

  function exportImage(action) {
    const dataUrl = renderImage();
    const base64 = dataUrl.split(',')[1];
    const filename = 'Einkaufsliste.png';
    const h = native('nativeShareImage');
    if (h) { h.postMessage({ base64, filename, action }); return; }
    if (action === 'share' && navigator.canShare) {
      const bin = atob(base64); const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const file = new File([bytes], filename, { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) { navigator.share({ files: [file], title: 'Einkaufsliste' }).catch(() => {}); return; }
    }
    const a = document.createElement('a');
    a.href = dataUrl; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    UI.toast('Bild gespeichert ✓');
  }

  // ---------- Export-Dialog ----------

  function openExportModal() {
    const isNative = !!native('nativeShareText');
    const canShare = isNative || !!navigator.share;
    const opt = (icon, title, text, buttons) => `
      <div class="share-option">
        <div class="share-icon">${icon}</div>
        <div class="share-text"><strong>${title}</strong><span>${text}</span></div>
        <div class="share-actions">${buttons}</div>
      </div>`;
    $('share-card').innerHTML = `
      <div class="modal-head">
        <h2>Einkaufsliste teilen</h2>
        <button type="button" class="icon-btn" data-close="share-modal" aria-label="Schließen">✕</button>
      </div>
      <div class="modal-body">
        ${opt('💬', 'Als Text', 'Für WhatsApp, Nachrichten, Notizen, AirDrop & Co. – Menge zuerst, nach Bereichen sortiert.',
          `${canShare ? '<button type="button" class="btn btn-primary" data-exp="text-share">Teilen…</button>' : ''}
           <button type="button" class="btn btn-secondary" data-exp="text-copy">Kopieren</button>`)}
        ${opt('🖼', 'Als Bild', 'Übersichtliches Bild im Handy-Format – praktisch zum Weiterschicken oder für den Sperrbildschirm.',
          `<button type="button" class="btn ${canShare ? 'btn-secondary' : 'btn-primary'}" data-exp="img-share">Teilen…</button>
           <button type="button" class="btn btn-secondary" data-exp="img-save">Speichern</button>`)}
        ${opt('📄', 'Als PDF', 'Zum Ausdrucken, mit Kästchen zum Abhaken.',
          `${isNative ? '<button type="button" class="btn btn-secondary" data-exp="pdf-share">Teilen…</button>' : ''}
           <button type="button" class="btn btn-secondary" data-exp="pdf-save">${isNative ? 'Speichern' : 'PDF erstellen'}</button>`)}
      </div>`;
    $('share-card').querySelectorAll('[data-exp]').forEach(b => b.addEventListener('click', () => {
      const a = b.dataset.exp;
      if (a === 'text-share') shareText();
      else if (a === 'text-copy') copyList();
      else if (a === 'img-share') exportImage('share');
      else if (a === 'img-save') exportImage('save');
      else if (a === 'pdf-share') exportPDF('share');
      else if (a === 'pdf-save') exportPDF('save');
    }));
    UI.openModal('share-modal');
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
      .brand { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #3f9468; padding-bottom: 10px; margin-bottom: 18px; font-weight: 700; }
      .brand img { width: 20px; height: 20px; vertical-align: -4px; margin-right: 6px; }
      .brand span { font-weight: 400; font-size: 9pt; color: #a59fb3; }
      h1 { font-size: 20pt; margin: 0 0 6px; }
      .recipes { color: #6f6880; font-size: 10pt; margin-bottom: 18px; }
      .cols { columns: 2; column-gap: 34px; }
      section { break-inside: avoid; margin-bottom: 14px; }
      h2 { font-size: 10.5pt; text-transform: uppercase; letter-spacing: .05em; color: #2c7a51; margin: 0 0 6px; }
      ul { list-style: none; margin: 0; padding: 0; }
      li { display: flex; gap: 8px; padding: 4px 0; border-bottom: 1px solid #efe9f4; }
      .box { width: 11px; height: 11px; border: 1.5px solid #a59fb3; border-radius: 3px; margin-top: 4px; flex-shrink: 0; }
      .amt { min-width: 92px; font-weight: 600; white-space: nowrap; }
      li.done { color: #a59fb3; text-decoration: line-through; }
    </style></head><body><div class="page">
      <div class="brand"><div><img src="img/icon-128.png" alt="">EasyKitchen</div><span>Einkaufsliste · ${esc(date)}</span></div>
      <h1>Einkaufsliste für die Woche</h1>
      <div class="recipes">${plan.map(p => `${esc(p.recipe.title)} (${p.servings} P.)`).join(' · ')}</div>
      <div class="cols">
        ${grouped().map(g => `<section><h2>${esc(g.label)}</h2><ul>${g.items.map(i => `
          <li class="${D.isChecked(i.key) ? 'done' : ''}"><span class="box"></span><span class="amt">${esc(amountText(i))}</span><span>${esc(i.name)}</span></li>`).join('')}</ul></section>`).join('')}
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
        else if (a === 'export') openExportModal();
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
    renderBadge();
  }

  ns.Planner = { open, render, renderBadge, wire, buildList, amountText, categorize, ingredientKey, toneOf, listText, renderImage, openExportModal };
})(window.EasyKitchen);
