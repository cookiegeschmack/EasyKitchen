/* EasyKitchen – App-Logik: Rezeptliste, Suche, Filter, Editor, Detailansicht. */
window.EasyKitchen = window.EasyKitchen || {};
(function (ns) {
  'use strict';

  const D = ns.Data, UI = ns.UI, U = ns.Updater;
  const $ = UI.$, esc = UI.esc;

  const view = { fav: false, veg: false, protein: false, course: 0, taste: 0, query: '', time: 0, effort: 0, cost: 0, sort: 'match' };
  const CL = () => ns.Classify;
  const T = s => ns.I18n.tr(s);
  const SORT_LABELS = { match: 'Passend zur Suche', time: 'Gesamtzeit', name: 'Name (A–Z)', new: 'Neueste zuerst', fav: 'Favoriten zuerst' };
  let visibleIds = [];

  // =========================================================================
  // Liste & Suche
  // =========================================================================

  function filteredRecipes() {
    const terms = D.parseTerms(view.query);
    let list = D.getRecipes().map(r => ({ r, m: D.matchRecipe(r, terms) }));

    if (view.fav) list = list.filter(x => x.r.watch);
    if (view.veg) list = list.filter(x => CL().of(x.r).veg);
    if (view.protein) list = list.filter(x => CL().of(x.r).highProtein);
    if (view.course) list = list.filter(x => CL().of(x.r).course === view.course);
    if (view.taste) list = list.filter(x => CL().of(x.r).taste === view.taste);
    // UND-Suche: jede eingegebene Zutat muss im Rezept vorkommen
    const partial = terms.length > 1 ? list.filter(x => x.m.matchedTerms.length > 0).length : 0;
    if (terms.length) list = list.filter(x => x.m.matchedTerms.length === terms.length);
    if (view.time) list = list.filter(x => x.r.time > 0 && x.r.time <= view.time);
    if (view.effort) list = list.filter(x => x.r.effort === view.effort);
    if (view.cost) list = list.filter(x => x.r.cost === view.cost);

    const byName = (a, b) => a.r.title.localeCompare(b.r.title, 'de');
    const sorters = {
      match: (a, b) => (b.m.score - a.m.score) || (terms.length ? (a.r.time - b.r.time) : (b.r.updatedAt - a.r.updatedAt)),
      time: (a, b) => (a.r.time - b.r.time) || byName(a, b),
      name: byName,
      new: (a, b) => b.r.createdAt - a.r.createdAt,
      fav: (a, b) => (Number(b.r.watch) - Number(a.r.watch)) || (b.m.score - a.m.score) || byName(a, b)
    };
    list.sort(sorters[view.sort] || sorters.match);
    return { list, terms, partial };
  }

  function metaChips(r) {
    const c = CL().of(r);
    return `${c.veg ? '<span class="meta meta-veg" title="Vegetarisch">🌱</span>' : ''}${c.highProtein ? '<span class="meta meta-protein" title="High Protein">💪</span>' : ''}
      <span class="meta">⏱ ${esc(UI.fmtTime(r.time))}</span>
      <span class="meta">${esc(D.EFFORT[r.effort])}</span>
      <span class="meta">${'€'.repeat(r.cost)}<span class="meta-dim">${'€'.repeat(3 - r.cost)}</span></span>`;
  }

  function cardHTML(r, m, terms) {
    const img = r.image
      ? `<img src="${r.image}" alt="" loading="lazy">`
      : `<div class="card-noimg tone-${ns.Planner.toneOf(r.id)}">${esc((r.title || '?').trim().charAt(0).toUpperCase())}</div>`;

    let ingLine;
    if (terms.length) {
      const have = r.ingredients.filter((_, i) => m.matchedIngredients.has(i));
      const rest = r.ingredients.length - have.length;
      ingLine = `
        <div class="match-line">
          ${have.length ? `<span class="match-badge">✓ ${have.length} von ${r.ingredients.length} Zutaten da</span>` : '<span class="match-badge soft">Treffer im Namen</span>'}
        </div>
        <div class="ing-preview">
          ${have.map(i => `<span class="ing-tag have" translate="no">${esc(i.name)}</span>`).join('')}
          ${rest > 0 ? `<span class="ing-more">+ ${rest} weitere</span>` : ''}
        </div>`;
    } else {
      const shown = r.ingredients.slice(0, 5);
      const rest = r.ingredients.length - shown.length;
      ingLine = `
        <div class="ing-preview">
          ${shown.map(i => `<span class="ing-tag" translate="no">${esc(i.name)}</span>`).join('')}
          ${rest > 0 ? `<span class="ing-more">+ ${rest}</span>` : ''}
        </div>`;
    }

    return `
      <article class="card" data-id="${esc(r.id)}" tabindex="0">
        <div class="card-img">
          ${img}
          <button type="button" class="plan-toggle ${D.isPlanned(r.id) ? 'on' : ''}" data-plan="${esc(r.id)}"
                  title="${D.isPlanned(r.id) ? 'Aus dem Wochenplan entfernen' : 'Zum Wochenplan hinzufügen'}" aria-label="Wochenplan umschalten"><svg viewBox="0 0 20 20" width="17" height="17" aria-hidden="true"><path d="M2.5 3h2l1.6 9.2a1.5 1.5 0 0 0 1.5 1.3h6.9a1.5 1.5 0 0 0 1.5-1.2L17.5 6.5H5.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8" cy="16.6" r="1.2" fill="currentColor"/><circle cx="14.2" cy="16.6" r="1.2" fill="currentColor"/></svg>${D.isPlanned(r.id) ? '<span class="plan-check">✓</span>' : ''}</button>
          <button type="button" class="watch-btn ${r.watch ? 'on' : ''}" data-watch="${esc(r.id)}"
                  title="${r.watch ? 'Favorit entfernen' : 'Als Favorit markieren'}" aria-label="Favorit umschalten">${r.watch ? '★' : '☆'}</button>
        </div>
        <div class="card-body">
          <h3 class="card-title" translate="no">${esc(r.title)}</h3>
          <div class="card-meta">${metaChips(r)}</div>
          ${ingLine}
        </div>
      </article>`;
  }

  function renderList() {
    const all = D.getRecipes();
    $('count-fav').textContent = all.filter(r => r.watch).length;
    ns.Planner.renderBadge();
    renderDraftsButton();
    renderDaily();

    const { list, terms, partial } = filteredRecipes();
    const grid = $('recipe-grid');
    const empty = $('empty-state');
    const filtersActive = !!(view.time || view.effort || view.cost || view.fav || view.veg || view.protein || view.course || view.taste);
    $('reset-filters').hidden = !filtersActive && !view.query;

    grid.innerHTML = list.map(x => cardHTML(x.r, x.m, terms)).join('');
    visibleIds = list.map(x => x.r.id);
    const exp = $('export-list-btn');
    exp.hidden = !list.length;
    $('export-list-label').textContent = list.length === 1 ? 'Teilen / PDF' : `${list.length} teilen / PDF`;
    exp.title = list.length === 1 ? 'Angezeigtes Rezept teilen oder als PDF speichern' : `Alle ${list.length} angezeigten Rezepte teilen oder als PDF speichern`;

    // Ergebnis-Info
    const base = view.fav ? 'unter deinen Favoriten' : 'in deinen Rezepten';
    let info = '';
    const termText = `„${terms.slice(0, -1).join('“, „')}${terms.length > 1 ? '“ und „' : ''}${terms[terms.length - 1] || ''}“`;
    if (terms.length) info = `${list.length} ${list.length === 1 ? 'Rezept' : 'Rezepte'} mit ${terms.length > 1 ? 'allen Zutaten: ' : ''}${termText} ${base}`;
    else if (filtersActive) info = `${list.length} ${list.length === 1 ? 'Rezept' : 'Rezepte'} ${base}`;
    $('result-info').textContent = list.length || terms.length || filtersActive ? info : '';

    // Leerzustände
    if (list.length) { empty.hidden = true; return; }
    empty.hidden = false;
    if (!all.length) {
      empty.innerHTML = `
        <div class="empty-icon">🍳</div>
        <h2>Noch keine Rezepte</h2>
        <p>Leg dein erstes Rezept an – mit Zutaten, Zubereitung und optional einem Foto.</p>
        <button type="button" class="btn btn-primary" data-act="new">＋ Erstes Rezept anlegen</button>`;
    } else if (view.fav && !all.some(r => r.watch)) {
      empty.innerHTML = `
        <div class="empty-icon">☆</div>
        <h2>Noch keine Favoriten</h2>
        <p>Markiere deine Lieblingsrezepte mit dem Stern – dann findest du sie hier.</p>
        <button type="button" class="btn btn-secondary" data-act="reset">Alle Rezepte zeigen</button>`;
    } else {
      empty.innerHTML = `
        <div class="empty-icon">🔍</div>
        <h2>Nichts gefunden</h2>
        <p>${terms.length > 1
          ? `Kein Rezept enthält alle gesuchten Zutaten (${esc(termText)}).${partial ? ` ${partial} ${partial === 1 ? 'Rezept enthält' : 'Rezepte enthalten'} zumindest einen Teil davon – entferne eine Zutat aus der Suche, um ${partial === 1 ? 'es' : 'sie'} zu sehen.` : ''}`
          : 'Kein Rezept passt zu deiner Suche bzw. deinen Filtern.'}</p>
        <button type="button" class="btn btn-secondary" data-act="reset">Suche &amp; Filter zurücksetzen</button>`;
    }
  }

  function resetFilters() {
    view.query = ''; view.time = 0; view.effort = 0; view.cost = 0; view.fav = false;
    view.veg = false; view.protein = false; view.course = 0; view.taste = 0;
    document.querySelectorAll('[data-toggle]').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
    $('fav-filter').classList.remove('active');
    $('fav-filter').setAttribute('aria-pressed', 'false');
    $('search-input').value = '';
    $('search-clear').hidden = true;
    document.querySelectorAll('.chips').forEach(group => {
      group.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c.dataset.value === '0'));
    });
    renderList();
  }

  /** Zeiten-Tabelle: Vorbereitung | Zubereitung | Gesamt */
  function timeTableHTML(r) {
    const cell = (label, v, en) => `<div><span data-en="${en}">${label}</span><strong>${v ? esc(UI.fmtTime(v)) : '–'}</strong></div>`;
    return `<div class="time-table">${cell('Vorbereitung', r.prepTime, 'Prep time')}${cell('Zubereitung', r.cookTime, 'Cook time')}${cell('Gesamtzeit', r.time, 'Total time')}</div>`;
  }

  // =========================================================================
  // Detailansicht
  // =========================================================================

  let detailId = null;

  function openDetail(id) {
    const r = D.getRecipe(id);
    if (!r) return;
    detailId = id;
    const terms = D.parseTerms(view.query);
    const m = D.matchRecipe(r, terms);
    const steps = D.cleanSteps(r.steps).split('\n').filter(Boolean);   // ohne doppelte Nummern
    const pref = D.getServingsPref(id);

    $('detail-card').innerHTML = `
      ${r.image ? `<div class="detail-hero"><img src="${r.image}" alt=""></div>` : ''}
      <div class="modal-head">
        <h2 translate="no">${esc(r.title)}</h2>
        <button type="button" class="icon-btn" data-close="detail-modal" aria-label="Schließen">✕</button>
      </div>
      <div class="modal-body">
        ${timeTableHTML(r)}
        <div class="card-meta detail-meta">
          <span class="meta">${esc(CL().LABELS.course[CL().of(r).course])}</span>
          <span class="meta">${esc(CL().LABELS.taste[CL().of(r).taste])}</span>
          ${CL().of(r).veg ? '<span class="meta meta-veg">🌱 Vegetarisch</span>' : ''}
          ${CL().of(r).highProtein ? '<span class="meta meta-protein">💪 High Protein</span>' : ''}
          <span class="meta">${esc(D.EFFORT[r.effort])}</span>
          <span class="meta">${'€'.repeat(r.cost)}<span class="meta-dim">${'€'.repeat(3 - r.cost)}</span></span>
        </div>
        <div class="detail-cols">
          <section>
            <h3>Zutaten</h3>
            <div class="serv-ctrl">
              <button type="button" class="step-btn" data-serv-step="-1" aria-label="Weniger Portionen">−</button>
              <input type="range" id="serv-range" min="1" max="${Math.max(12, r.servings * 3)}" step="1" value="${pref}" aria-label="Portionen">
              <button type="button" class="step-btn" data-serv-step="1" aria-label="Mehr Portionen">+</button>
              <span class="serv-label" id="serv-label"></span>
              <button type="button" class="link-btn serv-reset" id="serv-reset" hidden>Original (${r.servings})</button>
            </div>
            <ul class="ing-table" id="detail-ings"></ul>
          </section>
          <section>
            <h3>Zubereitung</h3>
            ${steps.length
              ? `<ol class="steps" translate="no">${steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>`
              : '<p class="muted">Keine Zubereitung hinterlegt.</p>'}
          </section>
        </div>
        <section class="nutri-section">
          <h3>Nährwerte <span class="muted">· Richtwerte pro Portion</span></h3>
          ${ns.Nutrition.renderBars(r)}
        </section>
      </div>
      <div class="modal-foot spread">
        <button type="button" class="btn btn-danger-ghost" data-act="delete">Löschen</button>
        <div class="btn-row">
          <button type="button" class="btn btn-secondary ${D.isPlanned(r.id) ? 'is-planned' : ''}" data-act="plan">${D.isPlanned(r.id) ? '✓ Im Wochenplan' : '🛒 Zum Wochenplan'}</button>
          <button type="button" class="btn btn-secondary" data-act="share">⇪ Teilen</button>
          <button type="button" class="btn btn-secondary ${r.watch ? 'is-fav' : ''}" data-act="watch">${r.watch ? '★ Favorit' : '☆ Als Favorit'}</button>
          <button type="button" class="btn btn-primary" data-act="edit">Bearbeiten</button>
        </div>
      </div>`;
    renderDetailIngredients(r, m, pref);
    UI.openModal('detail-modal');
  }

  /** Zutatenliste für die gewählte Portionszahl (Rezept bleibt unverändert). */
  function renderDetailIngredients(r, m, servings) {
    const factor = servings / Math.max(1, r.servings);
    $('detail-ings').innerHTML = r.ingredients.map((i, idx) => `
      <li class="${m && m.matchedIngredients.has(idx) ? 'have' : ''}">
        <span class="ing-amt">${esc(UI.fmtScaled(i, factor))}</span>
        <span class="ing-name" translate="no">${esc(i.name)}</span>
      </li>`).join('');
    $('serv-label').textContent = `${servings} ${servings === 1 ? 'Portion' : 'Portionen'}`;
    $('serv-range').value = servings;
    $('serv-reset').hidden = servings === r.servings;
    $('detail-ings').classList.toggle('scaled', servings !== r.servings);
  }

  let servSaveTimer = null;
  function setDetailServings(n) {
    const r = D.getRecipe(detailId);
    if (!r) return;
    n = Math.max(1, Math.min(50, Math.round(n)));
    const range = $('serv-range');
    if (n > Number(range.max)) range.max = n;
    renderDetailIngredients(r, D.matchRecipe(r, D.parseTerms(view.query)), n);
    clearTimeout(servSaveTimer);
    servSaveTimer = setTimeout(() => D.setServingsPref(r.id, n), 250);   // als Präferenz merken
  }

  // =========================================================================
  // Editor
  // =========================================================================

  const editor = { id: null, draftId: null, initial: '', image: '', effort: 1, cost: 1, course: 'main', taste: 'savory', diet: 'auto' };

  function unitOptions(selected) {
    return D.UNITS.map(u => `<option value="${u.id}" ${u.id === selected ? 'selected' : ''}>${esc(ns.I18n.unitOptionLabel(u))}</option>`).join('');
  }

  function sliderMaxFor(unit, amount) {
    let max = unit.max;
    while (amount > max) max *= 2;
    return max;
  }

  function addIngredientRow(ing, focus) {
    ing = ing || { name: '', amount: 0, unit: 'g' };
    const row = document.createElement('div');
    row.className = 'ing-row';
    row.innerHTML = `
      <div class="ing-top">
        <button type="button" class="ing-handle" title="Ziehen zum Verschieben (oder Pfeiltasten ↑/↓)" aria-label="Zutat verschieben">⠿</button>
        <input type="text" class="input ing-name-input" placeholder="Zutat, z. B. Rindfleisch" value="${esc(ing.name)}" maxlength="80">
        <button type="button" class="icon-btn ing-del" title="Zutat entfernen" aria-label="Zutat entfernen">✕</button>
      </div>
      <div class="ing-amount">
        <button type="button" class="step-btn" data-step="-1" aria-label="Weniger">−</button>
        <input type="range" class="ing-range" aria-label="Menge Regler">
        <button type="button" class="step-btn" data-step="1" aria-label="Mehr">+</button>
        <input type="number" class="input input-num ing-amount-input" min="0" step="any" aria-label="Menge">
        <select class="select ing-unit" aria-label="Einheit">${unitOptions(ing.unit)}</select>
        <input type="text" class="input ing-unit-custom" placeholder="z. B. Blätter" maxlength="30" aria-label="Eigene Einheit" value="${esc(ing.customUnit || '')}">
      </div>`;
    $('ing-list').appendChild(row);

    const range = row.querySelector('.ing-range');
    const num = row.querySelector('.ing-amount-input');
    const unitSel = row.querySelector('.ing-unit');
    const customInp = row.querySelector('.ing-unit-custom');

    const applyUnit = (amount) => {
      const unit = D.UNIT_BY_ID[unitSel.value];
      const noAmount = unit.id === 'ng';
      row.classList.toggle('no-amount', noAmount);
      row.classList.toggle('has-custom', unit.id === 'custom');
      if (noAmount) return;
      range.step = unit.step;
      range.min = 0;
      range.max = sliderMaxFor(unit, amount);
      range.value = amount;
      num.step = unit.step;
      num.value = amount ? Number(amount.toFixed(2)) : '';
    };
    const setAmount = (v) => {
      const unit = D.UNIT_BY_ID[unitSel.value];
      v = Math.max(0, Math.round(v / unit.step) * unit.step);
      v = Number(v.toFixed(2));
      if (v > Number(range.max)) range.max = sliderMaxFor(unit, v);
      range.value = v;
      num.value = v || '';
    };

    applyUnit(Number(ing.amount) || 0);

    range.addEventListener('input', () => { num.value = Number(range.value) || ''; });
    num.addEventListener('input', () => {
      const v = Math.max(0, Number(num.value.replace ? num.value.replace(',', '.') : num.value) || 0);
      const unit = D.UNIT_BY_ID[unitSel.value];
      if (v > Number(range.max)) range.max = sliderMaxFor(unit, v);
      range.value = v;
    });
    row.querySelectorAll('[data-step]').forEach(b => b.addEventListener('click', () => {
      const unit = D.UNIT_BY_ID[unitSel.value];
      setAmount((Number(num.value) || 0) + Number(b.dataset.step) * unit.step);
    }));
    // Einheit wechseln rechnet passende Mengen um (500 ml → 0,5 l, 1,2 kg → 1200 g) statt „500 l“
    let lastUnit = unitSel.value;
    const FACT = { g: ['m', 1], kg: ['m', 1000], ml: ['v', 1], l: ['v', 1000] };
    unitSel.addEventListener('change', () => {
      let v = Number(num.value) || 0;
      const a = FACT[lastUnit], b = FACT[unitSel.value];
      if (v && a && b && a[0] === b[0]) v = Number((v * a[1] / b[1]).toFixed(3));
      lastUnit = unitSel.value;
      applyUnit(v);
      if (unitSel.value === 'custom') { customInp.focus(); customInp.select(); }
    });
    wireRowHandle(row);
    row.querySelector('.ing-del').addEventListener('click', () => {
      row.remove();
      if (!$('ing-list').children.length) addIngredientRow();
    });
    row.querySelector('.ing-name-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); addIngredientRow(null, true); }
    });
    if (focus) row.querySelector('.ing-name-input').focus();
  }

  // ---------- Zutaten verschieben & sortieren ----------
  function wireRowHandle(row) {
    const handle = row.querySelector('.ing-handle');
    const list = $('ing-list');
    // Ziehen mit Maus/Trackpad: Zeile wird „angehoben“ und folgt dem Zeiger,
    // eine Linie zeigt, wo sie beim Loslassen eingesetzt wird.
    handle.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      e.preventDefault();
      try { handle.setPointerCapture(e.pointerId); } catch (err) { /* z. B. synthetische Ereignisse */ }
      const scroller = list.closest('.modal-body');
      const startY = e.clientY;
      const startScroll = scroller ? scroller.scrollTop : 0;
      const others = () => [...list.querySelectorAll('.ing-row')].filter(r => r !== row);
      const line = document.createElement('div');
      line.className = 'ing-drop-line';
      line.hidden = true;
      list.appendChild(line);
      row.classList.add('lifted');
      document.body.classList.add('ing-dragging');
      let target = null;           // Zeile, vor der eingesetzt wird (null = ans Ende)
      let lastY = startY;
      let scrollTimer = null;

      const update = () => {
        const scrolled = scroller ? scroller.scrollTop - startScroll : 0;
        row.style.transform = `translateY(${lastY - startY + scrolled}px) scale(1.02)`;
        const rows = others();
        target = rows.find(r => { const b = r.getBoundingClientRect(); return lastY < b.top + b.height / 2; }) || null;
        // Position unverändert → keine Linie
        const unchanged = target ? target === row.nextElementSibling : rows.every(r => r.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING);
        line.hidden = unchanged;
        if (unchanged) return;
        const gap = 5;
        const top = target
          ? target.offsetTop - gap
          : rows[rows.length - 1].offsetTop + rows[rows.length - 1].offsetHeight + gap;
        line.style.top = `${top - 1.5}px`;
      };
      // am oberen/unteren Rand automatisch weiterscrollen
      const autoScroll = () => {
        clearInterval(scrollTimer);
        if (!scroller) return;
        const b = scroller.getBoundingClientRect();
        const dir = lastY < b.top + 50 ? -1 : lastY > b.bottom - 50 ? 1 : 0;
        if (dir) scrollTimer = setInterval(() => { scroller.scrollTop += dir * 10; update(); }, 16);
      };
      const move = ev => { lastY = ev.clientY; update(); autoScroll(); };
      const up = () => {
        clearInterval(scrollTimer);
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', up);
        handle.removeEventListener('pointercancel', up);
        line.remove();
        document.body.classList.remove('ing-dragging');
        // sanft an den neuen Platz setzen
        const before = row.getBoundingClientRect().top;
        row.style.transform = '';
        if (target) { if (target !== row.nextElementSibling) list.insertBefore(row, target); }
        else list.appendChild(row);
        const after = row.getBoundingClientRect().top;
        row.classList.remove('lifted');
        row.animate([{ transform: `translateY(${before - after}px) scale(1.02)` }, { transform: 'none' }], { duration: 160, easing: 'ease-out' });
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', up);
      handle.addEventListener('pointercancel', up);
      update();
    });
    // Tastatur: ↑/↓ verschiebt die Zutat
    handle.addEventListener('keydown', e => {
      if (e.key === 'ArrowUp' && row.previousElementSibling) { e.preventDefault(); list.insertBefore(row, row.previousElementSibling); handle.focus(); }
      if (e.key === 'ArrowDown' && row.nextElementSibling) { e.preventDefault(); list.insertBefore(row.nextElementSibling, row); handle.focus(); }
    });
  }

  /** Große Mengen zuerst, Gewürze/Kleinmengen („Prise“, „nach Geschmack“) ans Ende. */
  function sortIngredientRows() {
    const list = $('ing-list');
    const SMALL = ['ng', 'prise', 'msp', 'tropfen'];
    const rows = [...list.querySelectorAll('.ing-row')].map((row, idx) => {
      const ing = {
        name: row.querySelector('.ing-name-input').value.trim(),
        amount: Number(row.querySelector('.ing-amount-input').value) || 0,
        unit: row.querySelector('.ing-unit').value
      };
      const spice = SMALL.includes(ing.unit) || ns.Planner.categorize(ing.name, ing.unit) === 'gewuerze';
      return { row, idx, empty: !ing.name, spice, g: ns.Nutrition.estimateGrams(ing) };
    });
    rows.sort((a, b) => (a.empty - b.empty) || (a.spice - b.spice) || (b.g - a.g) || (a.idx - b.idx));
    rows.forEach(r => list.appendChild(r.row));
    UI.toast('Zutaten sortiert – große Mengen zuerst, Gewürze am Ende ✓');
  }

  function readIngredients() {
    return [...$('ing-list').querySelectorAll('.ing-row')].map(row => {
      const ing = {
        name: row.querySelector('.ing-name-input').value.trim(),
        amount: Number(row.querySelector('.ing-amount-input').value) || 0,
        unit: row.querySelector('.ing-unit').value
      };
      if (ing.unit === 'custom') {
        ing.customUnit = row.querySelector('.ing-unit-custom').value.trim();
        if (!ing.customUnit) ing.unit = 'stk';     // ohne Namen → Stück
      }
      return ing;
    }).filter(i => i.name);
  }

  function setSegment(name, value) {
    editor[name] = value;
    document.querySelectorAll(`.segmented[data-seg="${name}"] button`).forEach(b =>
      b.classList.toggle('active', String(b.dataset.value) === String(value)));
    if (name === 'diet') updateVegHint();
  }

  function setPhoto(dataUrl) {
    editor.image = dataUrl || '';
    const img = $('photo-preview');
    img.hidden = !editor.image;
    if (editor.image) img.src = editor.image; else img.removeAttribute('src');
    $('photo-placeholder').hidden = !!editor.image;
    $('photo-remove').hidden = !editor.image;
    $('photo-crop').hidden = !editor.image;
    $('photo-drop').classList.toggle('has-photo', !!editor.image);
  }

  async function handlePhotoFile(file) {
    if (!file) return;
    try {
      // etwas größer einlesen, damit beim Zuschneiden genug Auflösung bleibt
      const src = await UI.readImageFile(file, 1800);
      const cropped = await ns.Crop.open(src);
      if (cropped == null) return;               // abgebrochen → altes Foto bleibt
      editor.photoSource = src;
      setPhoto(cropped);
    } catch (e) {
      UI.toast(e.message);
    }
  }

  function setTimes(prep, cook) {
    const clamp = v => Math.max(0, Math.min(1440, Math.round(Number(v) || 0)));
    $('ed-prep').value = clamp(prep);
    $('ed-prep-range').value = Math.min(120, clamp(prep));
    $('ed-cook').value = clamp(cook);
    $('ed-cook-range').value = Math.min(180, clamp(cook));
    updateTotal();
  }

  function updateTotal() {
    const t = (Number($('ed-prep').value) || 0) + (Number($('ed-cook').value) || 0);
    $('ed-total').textContent = t ? UI.fmtTime(t) : '–';
  }

  function updateVegHint() {
    const el = $('ed-veg-hint');
    if (!el) return;
    if (editor.diet !== 'auto') { el.textContent = ''; return; }
    const isVeg = !readIngredients().some(i => CL().isMeatIngredient(i.name));
    el.textContent = `(erkannt: ${isVeg ? 'ja' : 'nein'})`;
  }

  let nutriTimer = null;
  function updateEditorNutrition() {
    updateVegHint();
    clearTimeout(nutriTimer);
    nutriTimer = setTimeout(() => {
      $('ed-nutrition').innerHTML = ns.Nutrition.renderBars({
        ingredients: readIngredients(),
        servings: Number($('ed-servings').value) || 1
      });
    }, 120);
  }

  /**
   * Öffnet den Editor. opts.draft füllt ein neues Rezept vor (z. B. aus dem Import),
   * opts.source zeigt den erkannten Originaltext zum Vergleichen an.
   */
  function openEditor(id, opts) {
    opts = opts || {};
    const existing = id ? D.getRecipe(id) : null;
    // Entwurf/Import füllt den Editor vor; bei Entwürfen eines vorhandenen Rezepts bleibt dessen ID erhalten
    const r = opts.draft ? { ingredients: [], ...opts.draft } : existing;
    editor.id = existing ? existing.id : null;
    editor.draftId = opts.draftId || null;
    $('editor-title').textContent = opts.draftId ? 'Entwurf weiter bearbeiten'
      : existing ? 'Rezept bearbeiten' : (opts.draft ? 'Importiertes Rezept prüfen' : 'Neues Rezept');
    $('editor-notice').hidden = !opts.source;
    $('editor-source').textContent = opts.source || '';
    if ($('editor-notice').querySelector('details')) $('editor-notice').querySelector('details').open = false;
    $('ed-title').value = r ? r.title : '';
    $('ed-title').classList.remove('invalid');
    $('ed-steps').value = r ? r.steps : '';
    $('ed-servings').value = r ? r.servings : 2;
    $('ed-watch').checked = r ? !!r.watch : view.fav;
    $('ing-error').hidden = true;
    if (r) setTimes(r.prepTime != null ? r.prepTime : 0, r.cookTime != null ? r.cookTime : r.time);
    else setTimes(0, 30);
    setSegment('effort', r ? r.effort : 1);
    setSegment('cost', r ? r.cost : 1);
    const guess = r ? CL().preview(r) : { course: 'main', taste: 'savory' };
    setSegment('course', (r && r.course) || guess.course);
    setSegment('taste', (r && r.taste) || guess.taste);
    setSegment('diet', (r && r.diet) || 'auto');
    setPhoto(r ? (r.image || '') : '');
    editor.photoSource = r ? (r.image || '') : '';
    $('ing-list').innerHTML = '';
    (r && r.ingredients.length ? r.ingredients : [null]).forEach(i => addIngredientRow(i));
    updateEditorNutrition();
    // Ausgangsstand merken → beim Verlassen nur nachfragen, wenn sich etwas geändert hat.
    // Ein frisch importierter Entwurf gilt immer als ungespeichert.
    editor.initial = opts.draft && !opts.draftId ? '' : JSON.stringify(editorData());
    UI.closeModal('detail-modal');
    UI.openModal('editor-modal');
    $('ed-title').focus();
  }

  /** Aktueller Inhalt des Editors (für Entwürfe und den Änderungs-Vergleich). */
  function editorData() {
    return {
      title: $('ed-title').value.trim(),
      image: editor.image || '',
      prepTime: Number($('ed-prep').value) || 0,
      cookTime: Number($('ed-cook').value) || 0,
      effort: editor.effort, cost: editor.cost,
      course: editor.course, taste: editor.taste, diet: editor.diet,
      servings: Number($('ed-servings').value) || 1,
      ingredients: readIngredients(),
      steps: $('ed-steps').value,
      watch: $('ed-watch').checked
    };
  }

  function editorIsEmpty(d) { return !d.title && !d.ingredients.length && !d.steps.trim() && !d.image; }

  function editorIsDirty() {
    const d = editorData();
    if (editorIsEmpty(d) && !editor.id) return false;
    return JSON.stringify(d) !== editor.initial;
  }

  function saveEditorAsDraft(silent) {
    const d = D.saveDraft({ id: editor.draftId, sourceId: editor.id, data: editorData() });
    editor.draftId = d.id;
    renderDraftsButton();
    if (!silent) UI.toast('Als Entwurf gespeichert – oben unter „Entwürfe“ ✓');
    return d;
  }

  // ---------- Entwürfe ----------
  function renderDraftsButton() {
    const n = D.getDrafts().length;
    $('drafts-btn').hidden = !n;
    $('drafts-count').textContent = n;
  }

  function fmtSavedAt(ts) {
    const d = new Date(ts), now = new Date();
    const loc = ns.I18n.locale();
    const time = d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });
    return d.toDateString() === now.toDateString() ? T(`heute, ${time}`) : `${d.toLocaleDateString(loc)}, ${time}`;
  }

  function openDrafts() {
    const list = D.getDrafts();
    $('drafts-list').innerHTML = list.length ? list.map(d => {
      const src = d.sourceId && D.getRecipe(d.sourceId);
      const n = (d.data.ingredients || []).length;
      return `
        <li class="draft-item">
          <div class="draft-info">
            ${d.data.title ? `<strong translate="no">${esc(d.data.title)}</strong>` : '<strong>Ohne Titel</strong>'}
            <span class="muted">${src ? `<span translate="no">${esc(T('Änderungen an „' + src.title + '“'))}</span> · ` : 'Neues Rezept · '}${n} ${n === 1 ? 'Zutat' : 'Zutaten'} · ${esc(fmtSavedAt(d.savedAt))}</span>
          </div>
          <div class="btn-row">
            <button type="button" class="btn btn-ghost btn-sm" data-draft-del="${esc(d.id)}">Löschen</button>
            <button type="button" class="btn btn-primary btn-sm" data-draft-open="${esc(d.id)}">Weiter bearbeiten</button>
          </div>
        </li>`;
    }).join('') : '<li class="muted">Keine Entwürfe vorhanden.</li>';
    UI.openModal('drafts-modal');
  }

  function saveEditor(e) {
    e.preventDefault();
    const title = $('ed-title').value.trim();
    const ingredients = readIngredients();
    let ok = true;
    $('ed-title').classList.toggle('invalid', !title);
    if (!title) ok = false;
    $('ing-error').hidden = ingredients.length > 0;
    if (!ingredients.length) ok = false;
    if (!ok) {
      UI.toast(!title ? 'Bitte gib dem Rezept einen Namen.' : 'Bitte mindestens eine Zutat eintragen.');
      (!title ? $('ed-title') : $('ing-list').querySelector('.ing-name-input')).focus();
      return;
    }
    const fixed = ingredients.filter(i => D.fixUnitMixup(i).unit !== i.unit);
    if (fixed.length) UI.toast(`Einheit korrigiert: ${fixed.map(i => `${UI.fmtNum(i.amount)} ${i.unit === 'l' ? 'l → ml' : 'kg → g'} ${i.name}`).join(', ')}`);
    const existing = editor.id ? D.getRecipe(editor.id) : null;
    const saved = D.saveRecipe({
      ...(existing || {}),
      id: editor.id || undefined,
      title,
      image: editor.image,
      prepTime: Number($('ed-prep').value) || 0,
      cookTime: Number($('ed-cook').value) || 0,
      effort: editor.effort,
      cost: editor.cost,
      course: editor.course,
      taste: editor.taste,
      diet: editor.diet,
      servings: Number($('ed-servings').value) || 1,
      ingredients,
      steps: D.cleanSteps($('ed-steps').value),
      watch: $('ed-watch').checked
    });
    if (editor.draftId) { D.deleteDraft(editor.draftId); editor.draftId = null; renderDraftsButton(); }
    UI.closeModal('editor-modal', true);
    UI.toast(existing ? 'Rezept aktualisiert ✓' : 'Rezept gespeichert ✓');
    renderList();
    openDetail(saved.id);
  }

  // =========================================================================
  // Backup
  // =========================================================================

  function exportBackup() {
    const content = D.exportJSON();
    const filename = `easykitchen-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const h = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.nativeExport;
    if (h) { h.postMessage({ content, filename }); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    UI.toast('Backup gespeichert ✓');
  }

  function importBackupJSON(text) {
    try {
      const res = D.importJSON(text);
      renderList();
      UI.toast(`Backup geladen: ${res.added} neu, ${res.updated} aktualisiert ✓`);
    } catch (e) {
      alert(e.message);
    }
  }

  // =========================================================================
  // Rezept(e) des Tages – Diashow über der Liste (unabhängig von Suche & Filtern)
  // =========================================================================

  const DAILY_MS = 10000;
  const daily = { key: '', picks: [], index: 0, elapsed: 0, hover: false, timer: null };

  // Fortschritt per Timer (nicht per CSS-Animation): pausiert bei Maus darüber,
  // offenem Dialog oder verstecktem Fenster und läuft danach weiter.
  function startDailyTimer() {
    clearInterval(daily.timer);
    daily.elapsed = 0;
    if (daily.picks.length < 2) return;
    let last = performance.now();
    daily.timer = setInterval(() => {
      const now = performance.now();
      const delta = Math.min(now - last, 500);   // nach Pausen/Schlaf nicht springen
      last = now;
      if (daily.hover || document.hidden || UI.topModal()) return;
      daily.elapsed += delta;
      const bar = $('daily-bar');
      if (bar) bar.style.width = Math.min(100, daily.elapsed / DAILY_MS * 100) + '%';
      if (daily.elapsed >= DAILY_MS) nextDaily(1);
    }, 100);
  }

  /** Anzahl Tagesrezepte nach Gesamtzahl: unter 30 → 1, ab 30 → 2, ab 40 → 3. */
  function dailySlots(n) {
    if (!n) return 0;
    if (n >= 40) return 3;
    if (n >= 30) return 2;
    return 1;
  }

  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  // Deterministischer Zufall pro Tag: gleiche Auswahl den ganzen Tag, morgen eine neue
  function dayHash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  function pickDaily(all) {
    const slots = dailySlots(all.length);
    const day = todayKey();
    const order = list => list.slice().sort((a, b) => dayHash(day + a.id) - dayHash(day + b.id));
    // Favoriten zuerst; reichen sie nicht, wird mit weiteren Rezepten aufgefüllt
    // ausschließlich Hauptspeisen
    const mains = all.filter(r => CL().of(r).course === 'main');
    const favs = order(mains.filter(r => r.watch));
    const rest = order(mains.filter(r => !r.watch));
    return favs.concat(rest).slice(0, slots);
  }

  function renderDaily() {
    const box = $('daily');
    const picks = pickDaily(D.getRecipes());
    const key = todayKey() + '|' + picks.map(r => r.id + ':' + r.updatedAt + ':' + r.watch).join(',');
    if (!picks.length) { box.hidden = true; daily.key = ''; clearInterval(daily.timer); return; }
    if (key === daily.key) return;               // unverändert → Diashow nicht neu starten
    const keepId = daily.picks[daily.index] && daily.picks[daily.index].id;
    daily.key = key;
    daily.picks = picks;
    const keep = picks.findIndex(r => r.id === keepId);
    daily.index = keep >= 0 ? keep : 0;
    box.hidden = false;
    box.classList.toggle('single', picks.length === 1);
    showDailySlide();
  }

  function showDailySlide() {
    const box = $('daily');
    const r = daily.picks[daily.index];
    if (!r) return;
    const multi = daily.picks.length > 1;
    const title = multi ? `${daily.picks.length} Rezepte des Tages` : 'Rezept des Tages';
    const thumb = r.image
      ? `<img src="${r.image}" alt="">`
      : `<span class="daily-initial">${esc(r.title.charAt(0).toUpperCase())}</span>`;
    box.innerHTML = `
      <div class="daily-head">
        <span class="daily-title">✨ ${title}</span>
        ${multi ? `<span class="daily-dots">${daily.picks.map((_, i) => `<button type="button" class="daily-dot ${i === daily.index ? 'on' : ''}" data-daily-go="${i}" aria-label="Rezept ${i + 1}"></button>`).join('')}</span>` : ''}
        ${multi ? '<button type="button" class="daily-skip" data-daily-next title="Nächstes Rezept">Nächstes ›</button>' : ''}
      </div>
      <button type="button" class="daily-slide" data-daily-open="${esc(r.id)}">
        <span class="daily-thumb tone-${ns.Planner.toneOf(r.id)}">${thumb}</span>
        <span class="daily-text">
          <strong class="daily-name" translate="no">${esc(r.title)}</strong>
          <span class="daily-meta">⏱ ${esc(UI.fmtTime(r.time))} · ${esc(D.EFFORT[r.effort])}${r.watch ? ' · ★ Favorit' : ''}</span>
        </span>
        <span class="daily-open">Ansehen ›</span>
      </button>
      ${multi ? '<div class="daily-progress"><div class="daily-bar" id="daily-bar"></div></div>' : ''}`;
    startDailyTimer();
  }

  function nextDaily(step) {
    if (daily.picks.length < 2) return;
    if (daily.key && !daily.key.startsWith(todayKey() + '|')) { daily.key = ''; renderDaily(); return; } // neuer Tag
    daily.index = (daily.index + step + daily.picks.length) % daily.picks.length;
    showDailySlide();
  }

  function wireDaily() {
    $('daily').addEventListener('mouseenter', () => { daily.hover = true; });
    $('daily').addEventListener('mouseleave', () => { daily.hover = false; });
    $('daily').addEventListener('click', e => {
      if (e.target.closest('[data-daily-next]')) { nextDaily(1); return; }
      const go = e.target.closest('[data-daily-go]');
      if (go) { daily.index = Number(go.dataset.dailyGo); showDailySlide(); return; }
      const open = e.target.closest('[data-daily-open]');
      if (open) openDetail(open.dataset.dailyOpen);
    });
  }

  // =========================================================================
  // Verdrahtung
  // =========================================================================

  function wire() {
    // Favoriten-Filter
    $('fav-filter').addEventListener('click', () => {
      view.fav = !view.fav;
      $('fav-filter').classList.toggle('active', view.fav);
      $('fav-filter').setAttribute('aria-pressed', String(view.fav));
      renderList();
    });

    // Schalter: Vegetarisch / High Protein
    document.querySelectorAll('[data-toggle]').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.toggle;
      view[k] = !view[k];
      b.classList.toggle('active', view[k]);
      b.setAttribute('aria-pressed', String(view[k]));
      renderList();
    }));

    // Version oben → Update-Prüfung
    $('topbar-version').addEventListener('click', () => U.check({ manual: true }));

    // Sortieren (Icon-Menü)
    const sortBtn = $('sort-btn'), sortMenu = $('sort-menu');
    const setSortMenu = open => { sortMenu.hidden = !open; sortBtn.setAttribute('aria-expanded', String(open)); };
    const syncSort = () => {
      sortMenu.querySelectorAll('[data-sort]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.sort === view.sort)));
      sortBtn.title = `Sortieren: ${SORT_LABELS[view.sort]}`;
      $('sort-dot').hidden = view.sort === 'match';
    };
    sortBtn.addEventListener('click', e => { e.stopPropagation(); setSortMenu(sortMenu.hidden); });
    sortMenu.addEventListener('click', e => {
      const b = e.target.closest('[data-sort]');
      if (!b) return;
      view.sort = b.dataset.sort;
      syncSort();
      setSortMenu(false);
      renderList();
    });
    document.addEventListener('click', e => { if (!e.target.closest('.sort-wrap')) setSortMenu(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !sortMenu.hidden) { setSortMenu(false); e.stopPropagation(); } }, true);
    syncSort();

    // Rezepte des Tages
    wireDaily();

    // Suche
    const search = $('search-input');
    search.addEventListener('input', () => {
      view.query = search.value;
      $('search-clear').hidden = !search.value;
      renderList();
    });
    $('search-clear').addEventListener('click', () => {
      search.value = ''; view.query = '';
      $('search-clear').hidden = true;
      renderList();
      search.focus();
    });

    // Filter-Chips
    document.querySelectorAll('.chips[data-filter]').forEach(group => {
      group.addEventListener('click', e => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        group.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c === chip));
        const v = chip.dataset.value;
        view[group.dataset.filter] = v === '0' ? 0 : (/^\d+$/.test(v) ? Number(v) : v);
        renderList();
      });
    });
    $('reset-filters').addEventListener('click', resetFilters);

    // Karten
    $('recipe-grid').addEventListener('click', e => {
      const pl = e.target.closest('[data-plan]');
      if (pl) {
        e.stopPropagation();
        const on = D.togglePlan(pl.dataset.plan);
        UI.toast(on ? 'Zum Wochenplan hinzugefügt 🛒' : 'Aus dem Wochenplan entfernt');
        renderList();
        return;
      }
      const w = e.target.closest('[data-watch]');
      if (w) {
        e.stopPropagation();
        const on = D.toggleWatch(w.dataset.watch);
        UI.toast(on ? 'Als Favorit markiert ★' : 'Favorit entfernt');
        renderList();
        return;
      }
      const card = e.target.closest('.card');
      if (card) openDetail(card.dataset.id);
    });
    $('recipe-grid').addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.target.classList.contains('card')) openDetail(e.target.dataset.id);
    });
    $('empty-state').addEventListener('click', e => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      if (b.dataset.act === 'new') openEditor();
      if (b.dataset.act === 'reset') resetFilters();
    });

    // Portionsregler in der Detailansicht
    $('detail-card').addEventListener('input', e => {
      if (e.target.id === 'serv-range') setDetailServings(Number(e.target.value));
    });
    $('detail-card').addEventListener('click', e => {
      const st = e.target.closest('[data-serv-step]');
      if (st) { setDetailServings(Number($('serv-range').value) + Number(st.dataset.servStep)); return; }
      if (e.target.closest('#serv-reset')) { const r = D.getRecipe(detailId); if (r) setDetailServings(r.servings); }
    });

    // Detail-Aktionen
    $('detail-card').addEventListener('click', e => {
      const b = e.target.closest('[data-act]');
      if (!b || !detailId) return;
      const act = b.dataset.act;
      if (act === 'edit') openEditor(detailId);
      else if (act === 'share') ns.Share.openShareModal([detailId]);
      else if (act === 'plan') {
        const on = D.togglePlan(detailId);
        UI.toast(on ? 'Zum Wochenplan hinzugefügt 🛒' : 'Aus dem Wochenplan entfernt');
        renderList();
        ns.Planner.render();
        openDetail(detailId);
      }
      else if (act === 'watch') {
        const on = D.toggleWatch(detailId);
        UI.toast(on ? 'Als Favorit markiert ★' : 'Favorit entfernt');
        renderList();
        openDetail(detailId);
      } else if (act === 'delete') {
        const r = D.getRecipe(detailId);
        if (r && confirm(T(`„${r.title}“ wirklich löschen?`))) {
          D.deleteRecipe(detailId);
          UI.closeModal('detail-modal');
          UI.toast('Rezept gelöscht');
          renderList();
        }
      }
    });

    // Editor: beim Wegklicken / Esc / ✕ / Abbrechen nachfragen, statt Eingaben zu verlieren
    UI.setCloseGuard('editor-modal', () => {
      if (!editorIsDirty()) return true;
      const r = editor.id && D.getRecipe(editor.id);
      $('leave-text').textContent = r
        ? `Deine Änderungen an „${r.title}“ sind noch nicht gespeichert. Als Entwurf sichern? Du findest ihn dann oben unter „Entwürfe“.`
        : 'Möchtest du deine Eingaben als Entwurf speichern? Du findest ihn dann oben unter „Entwürfe“ und kannst später weitermachen.';
      UI.openModal('leave-modal');
      $('leave-draft').focus();
      return false;
    });
    $('leave-draft').addEventListener('click', () => {
      saveEditorAsDraft();
      UI.closeModal('leave-modal', true);
      UI.closeModal('editor-modal', true);
    });
    $('leave-discard').addEventListener('click', () => {
      UI.closeModal('leave-modal', true);
      UI.closeModal('editor-modal', true);
    });
    $('ed-save-draft').addEventListener('click', () => {
      const d = editorData();
      if (editorIsEmpty(d)) { UI.toast('Bitte zuerst etwas eintragen – ein leerer Entwurf wird nicht gespeichert.'); $('ed-title').focus(); return; }
      saveEditorAsDraft();
      UI.closeModal('editor-modal', true);
    });
    $('leave-continue').addEventListener('click', () => { UI.closeModal('leave-modal', true); $('ed-title').focus(); });

    // Entwürfe
    $('drafts-btn').addEventListener('click', openDrafts);
    $('drafts-list').addEventListener('click', e => {
      const op = e.target.closest('[data-draft-open]');
      if (op) {
        const d = D.getDraft(op.dataset.draftOpen);
        if (!d) return;
        UI.closeModal('drafts-modal');
        openEditor(d.sourceId && D.getRecipe(d.sourceId) ? d.sourceId : null, { draft: d.data, draftId: d.id });
        return;
      }
      const del = e.target.closest('[data-draft-del]');
      if (del && confirm(T('Diesen Entwurf wirklich löschen?'))) {
        D.deleteDraft(del.dataset.draftDel);
        renderDraftsButton();
        if (D.getDrafts().length) openDrafts(); else UI.closeModal('drafts-modal');
      }
    });
    // App wird beendet, während der Editor offen ist → Eingaben automatisch als Entwurf sichern
    window.addEventListener('pagehide', () => {
      if (!$('editor-modal').hidden && editorIsDirty()) { saveEditorAsDraft(true); D.flushNow(); }
    });

    // Neues Rezept, Import, Teilen
    $('new-recipe-btn').addEventListener('click', () => openEditor());
    $('import-recipe-btn').addEventListener('click', () => ns.Importer.openImportModal());
    $('export-list-btn').addEventListener('click', () => ns.Share.openShareModal(visibleIds));
    $('whatsnew-btn').addEventListener('click', () => { UI.closeModal('settings-modal'); showWhatsNew(true); });
    ns.Importer.wire();
    ns.Planner.wire();

    // Editor
    $('editor-form').addEventListener('submit', saveEditor);
    $('add-ing-btn').addEventListener('click', () => addIngredientRow(null, true));
    $('sort-ing-btn').addEventListener('click', sortIngredientRows);
    [['ed-prep', 120], ['ed-cook', 180]].forEach(([id, max]) => {
      $(id + '-range').addEventListener('input', e => { $(id).value = e.target.value; updateTotal(); });
      $(id).addEventListener('input', e => {
        $(id + '-range').value = Math.min(max, Number(e.target.value) || 0);
        updateTotal();
      });
    });
    // Nährwerte live neu berechnen, sobald sich Zutaten oder Portionen ändern
    ['input', 'change', 'click'].forEach(ev => $('ing-list').addEventListener(ev, updateEditorNutrition));
    $('ed-servings').addEventListener('input', updateEditorNutrition);
    $('add-ing-btn').addEventListener('click', updateEditorNutrition);
    document.querySelectorAll('.segmented[data-seg]').forEach(seg => seg.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (b) setSegment(seg.dataset.seg, /^\d+$/.test(b.dataset.value) ? Number(b.dataset.value) : b.dataset.value);
      if (b && seg.dataset.seg === 'course' && b.dataset.value === 'dessert') setSegment('taste', 'sweet');
    }));
    document.querySelectorAll('[data-serv]').forEach(b => b.addEventListener('click', () => {
      const inp = $('ed-servings');
      inp.value = Math.max(1, Math.min(50, (Number(inp.value) || 1) + Number(b.dataset.serv)));
      updateEditorNutrition();
    }));

    // Foto
    const drop = $('photo-drop');
    const photoInput = $('photo-input');
    drop.addEventListener('click', e => { if (!e.target.closest('#photo-remove')) photoInput.click(); });
    drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); photoInput.click(); } });
    photoInput.addEventListener('change', () => { handlePhotoFile(photoInput.files[0]); photoInput.value = ''; });
    $('photo-remove').addEventListener('click', e => { e.stopPropagation(); setPhoto(''); editor.photoSource = ''; });
    // Zuschneiden: vom Originalfoto dieser Sitzung aus (sonst vom aktuellen Foto)
    $('photo-crop').addEventListener('click', async e => {
      e.stopPropagation();
      const cropped = await ns.Crop.open(editor.photoSource || editor.image);
      if (cropped) setPhoto(cropped);
    });
    ns.Crop.wire();
    ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('drag'); }));
    drop.addEventListener('drop', e => handlePhotoFile(e.dataTransfer.files[0]));
    // Bild aus der Zwischenablage einfügen, solange der Editor offen ist
    document.addEventListener('paste', e => {
      if (UI.topModal() !== 'editor-modal') return;
      const item = [...(e.clipboardData ? e.clipboardData.items : [])].find(i => i.type.startsWith('image/'));
      if (item) { e.preventDefault(); handlePhotoFile(item.getAsFile()); }
    });

    // Einstellungen & Backup
    $('settings-btn').addEventListener('click', () => UI.openModal('settings-modal'));
    $('lang-seg').addEventListener('click', e => {
      const b = e.target.closest('[data-lang-choice]');
      if (!b) return;
      ns.I18n.setPreference(b.dataset.langChoice);
      renderLanguageSeg();
    });
    renderLanguageSeg();
    $('theme-seg').addEventListener('click', e => {
      const b = e.target.closest('[data-theme-choice]');
      if (!b) return;
      D.setSetting('theme', b.dataset.themeChoice);
      applyTheme(b.dataset.themeChoice);
    });
    $('check-update-btn').addEventListener('click', () => U.check({ manual: true }));
    $('update-pill').addEventListener('click', () => U.openPillOrCheck());
    $('export-btn').addEventListener('click', exportBackup);
    $('import-btn').addEventListener('click', () => {
      const h = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.nativeImport;
      if (h) h.postMessage({}); else $('import-input').click();
    });
    $('import-input').addEventListener('change', e => {
      const f = e.target.files[0];
      if (!f) return;
      f.text().then(importBackupJSON);
      e.target.value = '';
    });
    $('storage-info').textContent = D.hasNativeStorage()
      ? 'Deine Rezepte liegen lokal auf diesem Mac unter ~/Library/Application Support/EasyKitchen/state.json (App-Menü → „Datenordner im Finder zeigen“).'
      : 'Deine Rezepte liegen lokal im Speicher dieses Browsers. Bitte regelmäßig ein Backup speichern.';

    // Modals schließen
    document.addEventListener('click', e => {
      const c = e.target.closest('[data-close]');
      if (c) UI.closeModal(c.dataset.close);
    });

    // Tastatur
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && UI.topModal()) { UI.closeModal(UI.topModal()); return; }
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') { e.preventDefault(); openEditor(); }
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f' && !UI.topModal()) { e.preventDefault(); search.focus(); search.select(); }
      else if (e.key === '/' && !typing && !UI.topModal()) { e.preventDefault(); search.focus(); }
    });
  }

  // =========================================================================
  // „Was ist neu“ nach jedem Update
  // =========================================================================

  function cmpVer(a, b) {
    const pa = String(a || '0').split('.').map(n => parseInt(n, 10) || 0);
    const pb = String(b || '0').split('.').map(n => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0) ? 1 : -1;
    }
    return 0;
  }

  function showWhatsNew(manual) {
    const cur = U.currentVersion();
    const log = ns.CHANGELOG || [];
    const last = D.getSetting('lastSeenVersion', null);
    let entries;
    if (manual) entries = log.slice(0, 3);
    else if (last) entries = log.filter(e => cmpVer(e.version, last) > 0 && cmpVer(e.version, cur) <= 0);
    else entries = log.filter(e => e.version === cur);
    if (!manual && last !== cur) D.setSetting('lastSeenVersion', cur);
    if (!entries.length) return;

    const en = ns.I18n.lang === 'en';
    const fmtDate = d => { const p = String(d || '').split('-'); return p.length !== 3 ? '' : en ? `${p[2]}/${p[1]}/${p[0]}` : `${p[2]}.${p[1]}.${p[0]}`; };
    const loc = e => (en && e.en ? e.en : e);
    $('whatsnew-card').innerHTML = `
      <div class="whatsnew-head">
        <img src="img/icon-128.png" alt="">
        <div>
          <h2>Was ist neu${manual ? '' : ` in v${esc(entries[0].version)}`}?</h2>
          <p class="muted">${manual ? 'Die letzten Neuerungen in EasyKitchen' : last ? 'EasyKitchen wurde aktualisiert – das ist dazugekommen:' : 'Willkommen! Das steckt in dieser Version:'}</p>
        </div>
      </div>
      <div class="modal-body whatsnew-body">
        ${entries.map(e => `
          <section class="whatsnew-entry">
            <div class="whatsnew-ver"><span class="version-chip">v${esc(e.version)}</span> <strong translate="no">${esc(loc(e).title || '')}</strong> <span class="muted small">${esc(fmtDate(e.date))}</span></div>
            <ul translate="no">${(loc(e).items || []).map(i => `<li>${esc(i)}</li>`).join('')}</ul>
          </section>`).join('')}
      </div>
      <div class="modal-foot">
        <button type="button" class="btn btn-primary" data-close="whatsnew-modal" id="whatsnew-ok">Alles klar</button>
      </div>`;
    UI.openModal('whatsnew-modal');
    $('whatsnew-ok').focus();
  }

  // =========================================================================
  // Darstellung: System / Hell / Dunkel
  // =========================================================================

  // ---------- Sprache ----------
  function renderLanguageSeg() {
    const p = ns.I18n.preference;
    document.querySelectorAll('[data-lang-choice]').forEach(b => {
      const on = b.dataset.langChoice === p;
      b.classList.toggle('active', on);
      b.setAttribute('aria-checked', on ? 'true' : 'false');
    });
  }

  function applyTheme(choice) {
    choice = ['light', 'dark'].includes(choice) ? choice : 'system';
    if (choice === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', choice);
    document.querySelectorAll('[data-theme-choice]').forEach(b => {
      const on = b.dataset.themeChoice === choice;
      b.classList.toggle('active', on);
      b.setAttribute('aria-checked', String(on));
    });
    const h = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.nativeSetAppearance;
    if (h) h.postMessage(choice);
  }

  function init() {
    D.init();
    ns.I18n.init();
    ns.I18n.onChange(() => {
      renderList();
      U.syncVersionLabels();
      if (ns.Planner.render && !$('plan-modal').hidden) ns.Planner.render();
      if (detailId && !$('detail-modal').hidden) renderDetailIngredients(D.getRecipe(detailId), D.matchRecipe(D.getRecipe(detailId), D.parseTerms(view.query)), Number($('serv-range').value) || 1);
      renderLanguageSeg();
    });
    applyTheme(D.getSetting('theme', 'system'));
    wire();
    renderList();
    U.syncVersionLabels();
    setTimeout(() => showWhatsNew(false), 400);
    U.startAutoCheck();
  }

  ns.App = {
    openEditor, openDetail, renderList, importBackupJSON, exportBackup, showWhatsNew,
    importFiles: payload => ns.Importer.handleFiles((payload && payload.files) || []),
    onRecognizeResult: res => ns.Importer.onRecognizeResult(res),
    // Von der nativen Bridge (main.swift) aufgerufen:
    onUpdateCheckResult: res => U.onCheckResult(res),
    onUpdateProgress: p => U.onProgress(p),
    triggerManualUpdateCheck: v => U.check({ manual: true, simulatedCurrentVersion: v || '' })
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.EasyKitchen);
