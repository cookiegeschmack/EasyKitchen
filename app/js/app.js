/* EasyKitchen – App-Logik: Rezeptliste, Suche, Filter, Editor, Detailansicht. */
window.EasyKitchen = window.EasyKitchen || {};
(function (ns) {
  'use strict';

  const D = ns.Data, UI = ns.UI, U = ns.Updater;
  const $ = UI.$, esc = UI.esc;

  const view = { tab: 'all', query: '', time: 0, effort: 0, cost: 0, sort: 'match' };

  // =========================================================================
  // Liste & Suche
  // =========================================================================

  function filteredRecipes() {
    const terms = D.parseTerms(view.query);
    let list = D.getRecipes().map(r => ({ r, m: D.matchRecipe(r, terms) }));

    if (view.tab === 'watch') list = list.filter(x => x.r.watch);
    if (terms.length) list = list.filter(x => x.m.matchedTerms.length > 0);
    if (view.time) list = list.filter(x => x.r.time > 0 && x.r.time <= view.time);
    if (view.effort) list = list.filter(x => x.r.effort === view.effort);
    if (view.cost) list = list.filter(x => x.r.cost === view.cost);

    const byName = (a, b) => a.r.title.localeCompare(b.r.title, 'de');
    const sorters = {
      match: (a, b) => (b.m.score - a.m.score) || (terms.length ? (a.r.time - b.r.time) : (b.r.updatedAt - a.r.updatedAt)),
      time: (a, b) => (a.r.time - b.r.time) || byName(a, b),
      name: byName,
      new: (a, b) => b.r.createdAt - a.r.createdAt
    };
    list.sort(sorters[view.sort] || sorters.match);
    return { list, terms };
  }

  function metaChips(r) {
    return `
      <span class="meta">⏱ ${esc(UI.fmtTime(r.time))}</span>
      <span class="meta">${esc(D.EFFORT[r.effort])}</span>
      <span class="meta">${'€'.repeat(r.cost)}<span class="meta-dim">${'€'.repeat(3 - r.cost)}</span></span>`;
  }

  function cardHTML(r, m, terms) {
    const img = r.image
      ? `<img src="${r.image}" alt="" loading="lazy">`
      : `<div class="card-noimg">${esc((r.title || '?').trim().charAt(0).toUpperCase())}</div>`;

    let ingLine;
    if (terms.length) {
      const have = r.ingredients.filter((_, i) => m.matchedIngredients.has(i));
      const rest = r.ingredients.length - have.length;
      ingLine = `
        <div class="match-line">
          ${have.length ? `<span class="match-badge">✓ ${have.length} von ${r.ingredients.length} Zutaten da</span>` : '<span class="match-badge soft">Treffer im Namen</span>'}
        </div>
        <div class="ing-preview">
          ${have.map(i => `<span class="ing-tag have">${esc(i.name)}</span>`).join('')}
          ${rest > 0 ? `<span class="ing-more">+ ${rest} weitere</span>` : ''}
        </div>`;
    } else {
      const shown = r.ingredients.slice(0, 5);
      const rest = r.ingredients.length - shown.length;
      ingLine = `
        <div class="ing-preview">
          ${shown.map(i => `<span class="ing-tag">${esc(i.name)}</span>`).join('')}
          ${rest > 0 ? `<span class="ing-more">+ ${rest}</span>` : ''}
        </div>`;
    }

    return `
      <article class="card" data-id="${esc(r.id)}" tabindex="0">
        <div class="card-img">
          ${img}
          <button type="button" class="watch-btn ${r.watch ? 'on' : ''}" data-watch="${esc(r.id)}"
                  title="${r.watch ? 'Von der Watchlist entfernen' : 'Auf die Watchlist'}" aria-label="Watchlist umschalten">${r.watch ? '★' : '☆'}</button>
        </div>
        <div class="card-body">
          <h3 class="card-title">${esc(r.title)}</h3>
          <div class="card-meta">${metaChips(r)}</div>
          ${ingLine}
        </div>
      </article>`;
  }

  function renderList() {
    const all = D.getRecipes();
    $('count-all').textContent = all.length;
    $('count-watch').textContent = all.filter(r => r.watch).length;

    const { list, terms } = filteredRecipes();
    const grid = $('recipe-grid');
    const empty = $('empty-state');
    const filtersActive = !!(view.time || view.effort || view.cost);
    $('reset-filters').hidden = !filtersActive && !view.query;

    grid.innerHTML = list.map(x => cardHTML(x.r, x.m, terms)).join('');

    // Ergebnis-Info
    const base = view.tab === 'watch' ? 'auf deiner Watchlist' : 'in deinen Rezepten';
    let info = '';
    if (terms.length) info = `${list.length} ${list.length === 1 ? 'Rezept' : 'Rezepte'} mit „${terms.join('“, „')}“ ${base}`;
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
    } else if (view.tab === 'watch' && !all.some(r => r.watch) && !terms.length && !filtersActive) {
      empty.innerHTML = `
        <div class="empty-icon">☆</div>
        <h2>Deine Watchlist ist leer</h2>
        <p>Markiere Rezepte mit dem Stern, die du bald kochen möchtest.</p>`;
    } else {
      empty.innerHTML = `
        <div class="empty-icon">🔍</div>
        <h2>Nichts gefunden</h2>
        <p>Kein Rezept passt zu deiner Suche bzw. deinen Filtern.</p>
        <button type="button" class="btn btn-secondary" data-act="reset">Suche &amp; Filter zurücksetzen</button>`;
    }
  }

  function resetFilters() {
    view.query = ''; view.time = 0; view.effort = 0; view.cost = 0;
    $('search-input').value = '';
    $('search-clear').hidden = true;
    document.querySelectorAll('.chips').forEach(group => {
      group.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c.dataset.value === '0'));
    });
    renderList();
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
    const steps = r.steps.split(/\n+/).map(s => s.trim()).filter(Boolean);

    $('detail-card').innerHTML = `
      ${r.image ? `<div class="detail-hero"><img src="${r.image}" alt=""></div>` : ''}
      <div class="modal-head">
        <h2>${esc(r.title)}</h2>
        <button type="button" class="icon-btn" data-close="detail-modal" aria-label="Schließen">✕</button>
      </div>
      <div class="modal-body">
        <div class="card-meta detail-meta">
          ${metaChips(r)}
          <span class="meta">${r.servings} ${r.servings === 1 ? 'Portion' : 'Portionen'}</span>
        </div>
        <div class="detail-cols">
          <section>
            <h3>Zutaten</h3>
            <ul class="ing-table">
              ${r.ingredients.map((i, idx) => `
                <li class="${m.matchedIngredients.has(idx) ? 'have' : ''}">
                  <span class="ing-amt">${esc(UI.fmtAmount(i))}</span>
                  <span class="ing-name">${esc(i.name)}</span>
                </li>`).join('')}
            </ul>
          </section>
          <section>
            <h3>Zubereitung</h3>
            ${steps.length
              ? `<ol class="steps">${steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>`
              : '<p class="muted">Keine Zubereitung hinterlegt.</p>'}
          </section>
        </div>
      </div>
      <div class="modal-foot spread">
        <button type="button" class="btn btn-danger-ghost" data-act="delete">Löschen</button>
        <div class="btn-row">
          <button type="button" class="btn btn-secondary" data-act="watch">${r.watch ? '★ Auf der Watchlist' : '☆ Zur Watchlist'}</button>
          <button type="button" class="btn btn-primary" data-act="edit">Bearbeiten</button>
        </div>
      </div>`;
    UI.openModal('detail-modal');
  }

  // =========================================================================
  // Editor
  // =========================================================================

  const editor = { id: null, image: '', effort: 1, cost: 1 };

  function unitOptions(selected) {
    return D.UNITS.map(u => `<option value="${u.id}" ${u.id === selected ? 'selected' : ''}>${esc(u.label)}</option>`).join('');
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
        <input type="text" class="input ing-name-input" placeholder="Zutat, z. B. Rindfleisch" value="${esc(ing.name)}" maxlength="80">
        <button type="button" class="icon-btn ing-del" title="Zutat entfernen" aria-label="Zutat entfernen">✕</button>
      </div>
      <div class="ing-amount">
        <button type="button" class="step-btn" data-step="-1" aria-label="Weniger">−</button>
        <input type="range" class="ing-range" aria-label="Menge Regler">
        <button type="button" class="step-btn" data-step="1" aria-label="Mehr">+</button>
        <input type="number" class="input input-num ing-amount-input" min="0" step="any" aria-label="Menge">
        <select class="select ing-unit" aria-label="Einheit">${unitOptions(ing.unit)}</select>
      </div>`;
    $('ing-list').appendChild(row);

    const range = row.querySelector('.ing-range');
    const num = row.querySelector('.ing-amount-input');
    const unitSel = row.querySelector('.ing-unit');

    const applyUnit = (amount) => {
      const unit = D.UNIT_BY_ID[unitSel.value];
      const noAmount = unit.id === 'ng';
      row.classList.toggle('no-amount', noAmount);
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
    unitSel.addEventListener('change', () => applyUnit(Number(num.value) || 0));
    row.querySelector('.ing-del').addEventListener('click', () => {
      row.remove();
      if (!$('ing-list').children.length) addIngredientRow();
    });
    row.querySelector('.ing-name-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); addIngredientRow(null, true); }
    });
    if (focus) row.querySelector('.ing-name-input').focus();
  }

  function readIngredients() {
    return [...$('ing-list').querySelectorAll('.ing-row')].map(row => ({
      name: row.querySelector('.ing-name-input').value.trim(),
      amount: Number(row.querySelector('.ing-amount-input').value) || 0,
      unit: row.querySelector('.ing-unit').value
    })).filter(i => i.name);
  }

  function setSegment(name, value) {
    editor[name] = value;
    document.querySelectorAll(`.segmented[data-seg="${name}"] button`).forEach(b =>
      b.classList.toggle('active', Number(b.dataset.value) === value));
  }

  function setPhoto(dataUrl) {
    editor.image = dataUrl || '';
    const img = $('photo-preview');
    img.hidden = !editor.image;
    if (editor.image) img.src = editor.image; else img.removeAttribute('src');
    $('photo-placeholder').hidden = !!editor.image;
    $('photo-remove').hidden = !editor.image;
    $('photo-drop').classList.toggle('has-photo', !!editor.image);
  }

  async function handlePhotoFile(file) {
    if (!file) return;
    try {
      setPhoto(await UI.readImageFile(file));
    } catch (e) {
      UI.toast(e.message);
    }
  }

  function setTime(v) {
    v = Math.max(0, Math.min(1440, Math.round(Number(v) || 0)));
    $('ed-time').value = v;
    $('ed-time-range').value = Math.min(180, v);
  }

  function openEditor(id) {
    const r = id ? D.getRecipe(id) : null;
    editor.id = r ? r.id : null;
    $('editor-title').textContent = r ? 'Rezept bearbeiten' : 'Neues Rezept';
    $('ed-title').value = r ? r.title : '';
    $('ed-title').classList.remove('invalid');
    $('ed-steps').value = r ? r.steps : '';
    $('ed-servings').value = r ? r.servings : 2;
    $('ed-watch').checked = r ? r.watch : view.tab === 'watch';
    $('ing-error').hidden = true;
    setTime(r ? r.time : 30);
    setSegment('effort', r ? r.effort : 1);
    setSegment('cost', r ? r.cost : 1);
    setPhoto(r ? r.image : '');
    $('ing-list').innerHTML = '';
    (r && r.ingredients.length ? r.ingredients : [null]).forEach(i => addIngredientRow(i));
    UI.closeModal('detail-modal');
    UI.openModal('editor-modal');
    $('ed-title').focus();
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
    const existing = editor.id ? D.getRecipe(editor.id) : null;
    const saved = D.saveRecipe({
      ...(existing || {}),
      id: editor.id || undefined,
      title,
      image: editor.image,
      time: Number($('ed-time').value) || 0,
      effort: editor.effort,
      cost: editor.cost,
      servings: Number($('ed-servings').value) || 1,
      ingredients,
      steps: $('ed-steps').value.trim(),
      watch: $('ed-watch').checked
    });
    UI.closeModal('editor-modal');
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
  // Verdrahtung
  // =========================================================================

  function wire() {
    // Tabs
    document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
      view.tab = t.dataset.view;
      document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x === t));
      renderList();
    }));

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
    document.querySelectorAll('.chips').forEach(group => {
      group.addEventListener('click', e => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        group.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c === chip));
        view[group.dataset.filter] = Number(chip.dataset.value);
        renderList();
      });
    });
    $('sort-select').addEventListener('change', e => { view.sort = e.target.value; renderList(); });
    $('reset-filters').addEventListener('click', resetFilters);

    // Karten
    $('recipe-grid').addEventListener('click', e => {
      const w = e.target.closest('[data-watch]');
      if (w) {
        e.stopPropagation();
        const on = D.toggleWatch(w.dataset.watch);
        UI.toast(on ? 'Zur Watchlist hinzugefügt ★' : 'Von der Watchlist entfernt');
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

    // Detail-Aktionen
    $('detail-card').addEventListener('click', e => {
      const b = e.target.closest('[data-act]');
      if (!b || !detailId) return;
      const act = b.dataset.act;
      if (act === 'edit') openEditor(detailId);
      else if (act === 'watch') {
        const on = D.toggleWatch(detailId);
        UI.toast(on ? 'Zur Watchlist hinzugefügt ★' : 'Von der Watchlist entfernt');
        renderList();
        openDetail(detailId);
      } else if (act === 'delete') {
        const r = D.getRecipe(detailId);
        if (r && confirm(`„${r.title}“ wirklich löschen?`)) {
          D.deleteRecipe(detailId);
          UI.closeModal('detail-modal');
          UI.toast('Rezept gelöscht');
          renderList();
        }
      }
    });

    // Neues Rezept
    $('new-recipe-btn').addEventListener('click', () => openEditor());

    // Editor
    $('editor-form').addEventListener('submit', saveEditor);
    $('add-ing-btn').addEventListener('click', () => addIngredientRow(null, true));
    $('ed-time-range').addEventListener('input', e => { $('ed-time').value = e.target.value; });
    $('ed-time').addEventListener('input', e => {
      $('ed-time-range').value = Math.min(180, Number(e.target.value) || 0);
    });
    document.querySelectorAll('.segmented').forEach(seg => seg.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (b) setSegment(seg.dataset.seg, Number(b.dataset.value));
    }));
    document.querySelectorAll('[data-serv]').forEach(b => b.addEventListener('click', () => {
      const inp = $('ed-servings');
      inp.value = Math.max(1, Math.min(50, (Number(inp.value) || 1) + Number(b.dataset.serv)));
    }));

    // Foto
    const drop = $('photo-drop');
    const photoInput = $('photo-input');
    drop.addEventListener('click', e => { if (!e.target.closest('#photo-remove')) photoInput.click(); });
    drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); photoInput.click(); } });
    photoInput.addEventListener('change', () => { handlePhotoFile(photoInput.files[0]); photoInput.value = ''; });
    $('photo-remove').addEventListener('click', e => { e.stopPropagation(); setPhoto(''); });
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

  function init() {
    D.init();
    wire();
    renderList();
    U.syncVersionLabels();
    setTimeout(() => U.check({ manual: false }), 1200);
  }

  ns.App = {
    openEditor, openDetail, renderList, importBackupJSON, exportBackup,
    // Von der nativen Bridge (main.swift) aufgerufen:
    onUpdateCheckResult: res => U.onCheckResult(res),
    onUpdateProgress: p => U.onProgress(p),
    triggerManualUpdateCheck: v => U.check({ manual: true, simulatedCurrentVersion: v || '' })
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.EasyKitchen);
