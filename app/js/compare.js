/*
 * EasyKitchen – Vergleich zweier Rezepte (z. B. doppeltes Rezept beim Import).
 * Zeigt importiertes und vorhandenes Rezept nebeneinander, markiert die Unterschiede
 * und bietet an, das importierte trotzdem als neues Rezept zu übernehmen.
 */
window.EasyKitchen = window.EasyKitchen || {};
(function (ns) {
  'use strict';

  const D = ns.Data, UI = ns.UI;
  const $ = UI.$, esc = UI.esc;

  // ---------- Abgleich (längste gemeinsame Teilfolge) ----------
  function align(a, b, eq) {
    const n = a.length, m = b.length;
    const L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) L[i][j] = eq(a[i], b[j]) ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    }
    const ops = [];
    let i = 0, j = 0;
    while (i < n && j < m) {
      if (eq(a[i], b[j])) { ops.push({ a: a[i++], b: b[j++] }); }
      else if (L[i + 1][j] >= L[i][j + 1]) ops.push({ a: a[i++] });
      else ops.push({ b: b[j++] });
    }
    while (i < n) ops.push({ a: a[i++] });
    while (j < m) ops.push({ b: b[j++] });
    return ops;
  }

  /** Wort-genauer Vergleich zweier Texte → beide Seiten als HTML mit <mark> für Abweichungen. */
  function wordDiff(ta, tb) {
    // Wörter und Trennzeichen (Leerzeichen, Bindestriche, Satzzeichen) einzeln vergleichen
    const tok = t => String(t || '').split(/([\s\-–—,.;:!?()/]+)/).filter(x => x !== '');
    const key = w => (/^[\s\-–—,.;:!?()/]+$/.test(w) ? w.replace(/\s+/g, ' ') : (D.norm(w) || w));
    const ops = align(tok(ta), tok(tb), (x, y) => key(x) === key(y));
    const sideA = [], sideB = [];
    ops.forEach(o => {
      if (o.a !== undefined && o.b !== undefined) { sideA.push([o.a, false]); sideB.push([o.b, false]); }
      else if (o.a !== undefined) sideA.push([o.a, true]);
      else sideB.push([o.b, true]);
    });
    // aufeinanderfolgende Abweichungen (auch über Leerzeichen hinweg) zu einer Markierung zusammenfassen
    const render = parts => {
      let html = '', run = '', gap = '';
      const flush = () => { if (run) html += `<mark>${esc(run)}</mark>`; run = ''; };
      parts.forEach(([t, changed]) => {
        if (changed) { run += gap + t; gap = ''; }
        else if (run && /^\s+$/.test(t)) gap += t;
        else { flush(); html += esc(gap) + esc(t); gap = ''; }
      });
      flush();
      return html + esc(gap);
    };
    return [render(sideA), render(sideB)];
  }

  // ---------- Bausteine ----------
  function traits(r) {
    try { return ns.Classify.preview(r); } catch (e) { return {}; }
  }
  function kcal(r) {
    try { return Math.round(ns.Nutrition.calculate(r).perServing.kcal || 0); } catch (e) { return 0; }
  }
  const steps = r => D.cleanSteps(r.steps).split('\n').filter(Boolean);
  const amountText = ing => UI.fmtAmount(ing) || '';
  const ingKey = name => (ns.Planner ? ns.Planner.ingredientKey(name) : D.norm(name));

  /** Zutaten über ihren Grundnamen zuordnen (Reihenfolge des importierten Rezepts). */
  function pairIngredients(a, b) {
    const used = new Set();
    const rows = a.map(ia => {
      const k = ingKey(ia.name);
      let idx = b.findIndex((ib, i) => !used.has(i) && ingKey(ib.name) === k);
      if (idx < 0) idx = b.findIndex((ib, i) => !used.has(i) && D.norm(ib.name) === D.norm(ia.name));
      if (idx < 0) return { a: ia };
      used.add(idx);
      return { a: ia, b: b[idx] };
    });
    b.forEach((ib, i) => { if (!used.has(i)) rows.push({ b: ib }); });
    return rows;
  }

  /** Schritte abgleichen; nicht zuordenbare Nachbarn werden als „geändert“ gegenübergestellt. */
  function pairSteps(a, b) {
    const ops = align(a, b, (x, y) => D.norm(x) === D.norm(y));
    const rows = [];
    let onlyA = [], onlyB = [];
    const flush = () => {
      const n = Math.max(onlyA.length, onlyB.length);
      for (let i = 0; i < n; i++) rows.push({ a: onlyA[i], b: onlyB[i] });
      onlyA = []; onlyB = [];
    };
    ops.forEach(o => {
      if (o.a !== undefined && o.b !== undefined) { flush(); rows.push({ a: o.a, b: o.b, same: true }); }
      else if (o.a !== undefined) onlyA.push(o.a);
      else onlyB.push(o.b);
    });
    flush();
    return rows;
  }

  // ---------- Darstellung ----------
  let diffCount = 0;

  function cell(html, cls) { return `<td class="${cls || ''}">${html}</td>`; }
  const EMPTY = '<span class="cmp-none">—</span>';

  /** Zeile mit einfachem Wert (Text) – unterschiedliche Werte werden markiert. */
  function valueRow(label, va, vb) {
    const same = String(va) === String(vb);
    if (!same) diffCount++;
    return `<tr class="${same ? 'cmp-same' : 'cmp-row-diff'}"><th scope="row">${esc(label)}</th>
      ${cell(esc(va) || EMPTY, same ? '' : 'cmp-diff')}${cell(esc(vb) || EMPTY, same ? '' : 'cmp-diff')}</tr>`;
  }

  function section(label) { return `<tr class="cmp-section"><th colspan="3">${esc(label)}</th></tr>`; }

  function photo(r) { return r.image ? `<img class="cmp-photo" src="${r.image}" alt="">` : '<span class="cmp-none">kein Foto</span>'; }

  function buildTable(ra, rb) {
    diffCount = 0;
    const ta = traits(ra), tb = traits(rb);
    const L = ns.Classify.LABELS;
    const yes = v => (v ? 'Ja' : 'Nein');
    let html = '';

    // Allgemeines
    html += section('Allgemein');
    const tw = wordDiff(ra.title, rb.title);
    const titleSame = D.norm(ra.title) === D.norm(rb.title) && ra.title.trim() === rb.title.trim();
    if (!titleSame) diffCount++;
    html += `<tr class="${titleSame ? 'cmp-same' : 'cmp-row-diff'}"><th scope="row">Titel</th>
      ${cell(tw[0], titleSame ? '' : 'cmp-diff')}${cell(tw[1], titleSame ? '' : 'cmp-diff')}</tr>`;
    const photoSame = (ra.image || '') === (rb.image || '');
    if (!photoSame) diffCount++;
    html += `<tr class="${photoSame ? 'cmp-same' : 'cmp-row-diff'}"><th scope="row">Foto</th>
      ${cell(photo(ra), photoSame ? '' : 'cmp-diff')}${cell(photo(rb), photoSame ? '' : 'cmp-diff')}</tr>`;
    html += valueRow('Portionen', ra.servings || '', rb.servings || '');
    html += valueRow('Vorbereitung', UI.fmtTime(ra.prepTime || 0), UI.fmtTime(rb.prepTime || 0));
    html += valueRow('Zubereitung', UI.fmtTime(ra.cookTime || 0), UI.fmtTime(rb.cookTime || 0));
    html += valueRow('Aufwand', D.EFFORT[ra.effort] || '', D.EFFORT[rb.effort] || '');
    html += valueRow('Kosten', D.COST[ra.cost] || '', D.COST[rb.cost] || '');
    html += valueRow('Art', L.course[ta.course] || '', L.course[tb.course] || '');
    html += valueRow('Geschmack', L.taste[ta.taste] || '', L.taste[tb.taste] || '');
    html += valueRow('Vegetarisch', yes(ta.veg), yes(tb.veg));
    const ka = kcal(ra), kb = kcal(rb);
    html += valueRow('Kalorien / Portion', ka ? `${ka} kcal` : '', kb ? `${kb} kcal` : '');

    // Zutaten
    const ia = ra.ingredients || [], ib = rb.ingredients || [];
    html += section(`Zutaten (${ia.length} / ${ib.length})`);
    if ((ra.servings || 0) !== (rb.servings || 0)) {
      html += `<tr class="cmp-note"><td colspan="3">Hinweis: Die Mengen gelten für ${esc(ra.servings)} bzw. ${esc(rb.servings)} Portionen.</td></tr>`;
    }
    pairIngredients(ia, ib).forEach(p => {
      if (p.a && p.b) {
        const nameSame = p.a.name.trim() === p.b.name.trim();
        const amtSame = amountText(p.a) === amountText(p.b);
        const same = nameSame && amtSame;
        if (!same) diffCount++;
        const nd = nameSame ? [esc(p.a.name), esc(p.b.name)] : wordDiff(p.a.name, p.b.name);
        const amt = x => esc(amountText(x));
        const side = (name, ing) => `<span class="cmp-amt">${amtSame ? amt(ing) : `<mark>${amt(ing) || '–'}</mark>`}</span> ${name}`;
        html += `<tr class="${same ? 'cmp-same' : 'cmp-row-diff'}"><th scope="row"></th>
          ${cell(side(nd[0], p.a), same ? '' : 'cmp-diff')}${cell(side(nd[1], p.b), same ? '' : 'cmp-diff')}</tr>`;
      } else {
        diffCount++;
        const ing = p.a || p.b;
        const txt = `<span class="cmp-amt">${esc(amountText(ing))}</span> ${esc(ing.name)}`;
        html += `<tr class="cmp-row-diff"><th scope="row"></th>
          ${p.a ? cell(txt, 'cmp-add') : cell(EMPTY, 'cmp-gap')}${p.b ? cell(txt, 'cmp-old') : cell(EMPTY, 'cmp-gap')}</tr>`;
      }
    });
    if (!ia.length && !ib.length) html += `<tr class="cmp-same"><th></th><td colspan="2">${EMPTY}</td></tr>`;

    // Zubereitung
    const sa = steps(ra), sb = steps(rb);
    html += section(`Zubereitung (${sa.length} / ${sb.length} Schritte)`);
    let na = 0;
    pairSteps(sa, sb).forEach(p => {
      const label = p.a !== undefined ? `${++na}.` : '';
      if (p.same) {
        html += `<tr class="cmp-same"><th scope="row">${label}</th>${cell(esc(p.a))}${cell(esc(p.b))}</tr>`;
      } else if (p.a !== undefined && p.b !== undefined) {
        diffCount++;
        const w = wordDiff(p.a, p.b);
        html += `<tr class="cmp-row-diff"><th scope="row">${label}</th>${cell(w[0], 'cmp-diff')}${cell(w[1], 'cmp-diff')}</tr>`;
      } else {
        diffCount++;
        html += `<tr class="cmp-row-diff"><th scope="row">${label}</th>
          ${p.a !== undefined ? cell(esc(p.a), 'cmp-add') : cell(EMPTY, 'cmp-gap')}${p.b !== undefined ? cell(esc(p.b), 'cmp-old') : cell(EMPTY, 'cmp-gap')}</tr>`;
      }
    });
    if (!sa.length && !sb.length) html += `<tr class="cmp-same"><th></th><td colspan="2">${EMPTY}</td></tr>`;

    return html;
  }

  /**
   * Vergleich öffnen.
   * @param {object} imported  Rezept aus der Import-Datei
   * @param {object} existing  vorhandenes Rezept (oder doppelter Eintrag derselben Datei)
   * @param {object} [opts]    { inFile: bool, onImported(rec) }
   */
  function open(imported, existing, opts) {
    opts = opts || {};
    const table = buildTable(imported, existing);
    const n = diffCount;
    const rightLabel = opts.inFile ? 'Ebenfalls in der Datei' : 'Vorhanden';
    const summary = n
      ? `${n} ${n === 1 ? 'Unterschied' : 'Unterschiede'} gefunden – farbig markiert.`
      : 'Keine Unterschiede – die Rezepte sind inhaltlich gleich.';
    $('compare-card').innerHTML = `
      <div class="modal-head">
        <h2>Unterschiede ansehen</h2>
        <button type="button" class="icon-btn" data-close="compare-modal" aria-label="Schließen">✕</button>
      </div>
      <div class="modal-body">
        <div class="cmp-top">
          <p class="cmp-summary ${n ? '' : 'is-same'}">${esc(summary)}</p>
          ${n ? `<label class="cmp-only"><input type="checkbox" id="cmp-only-diff"> Nur Unterschiede zeigen</label>` : ''}
        </div>
        <div class="cmp-legend" aria-hidden="true">
          <span><i class="lg-diff"></i>abweichend</span>
          <span><i class="lg-add"></i>nur im importierten</span>
          <span><i class="lg-old"></i>nur im ${opts.inFile ? 'anderen' : 'vorhandenen'}</span>
        </div>
        <div class="cmp-scroll">
          <table class="cmp-table" id="cmp-table">
            <colgroup><col class="cmp-col-label"><col><col></colgroup>
            <thead><tr><th></th><th>Importiert</th><th>${esc(rightLabel)}</th></tr></thead>
            <tbody>${table}</tbody>
          </table>
        </div>
        <div class="cmp-import">
          <label for="cmp-name">Trotzdem übernehmen – Name des Rezepts</label>
          <input type="text" id="cmp-name" class="input" maxlength="120" value="${esc(imported.title)}">
          <p class="muted">Du kannst den Namen ändern oder gleich lassen.
            ${opts.inFile ? 'Das andere Rezept der Datei bleibt unverändert.'
              : '„Als neues Rezept importieren“ behält beide Fassungen. „Vorhandenes ersetzen“ überschreibt das vorhandene Rezept mit der importierten Fassung – Favorit und Wochenplan bleiben erhalten.'}</p>
        </div>
      </div>
      <div class="modal-foot">
        <button type="button" class="btn btn-ghost" data-close="compare-modal">Nicht importieren</button>
        ${opts.inFile ? '' : '<button type="button" class="btn btn-secondary" id="cmp-replace-btn">Vorhandenes ersetzen</button>'}
        <button type="button" class="btn btn-primary" id="cmp-import-btn">Als neues Rezept importieren</button>
      </div>`;

    const only = $('cmp-only-diff');
    if (only) only.addEventListener('change', () => $('cmp-table').classList.toggle('only-diff', only.checked));

    $('cmp-import-btn').addEventListener('click', () => {
      const name = $('cmp-name').value.trim() || imported.title;
      const now = Date.now();
      const rec = { ...imported, id: D.uid(), title: name, watch: false, createdAt: now, updatedAt: now };
      D.importRecipes([rec]);
      UI.closeModal('compare-modal');
      ns.App.renderList();
      UI.toast(`„${name}“ als neues Rezept importiert ✓`);
      if (opts.onImported) opts.onImported(rec, 'new');
    });

    // Vorhandenes Rezept durch die importierte Fassung ersetzen (gleiche ID → Favorit & Wochenplan bleiben)
    const rep = $('cmp-replace-btn');
    if (rep) rep.addEventListener('click', () => {
      const name = $('cmp-name').value.trim() || imported.title;
      if (!confirm(`„${existing.title}“ durch die importierte Fassung ersetzen?\n\nDie bisherige Fassung (Zutaten, Schritte, Foto …) wird überschrieben.`)) return;
      const rec = { ...imported, id: existing.id, title: name, watch: !!existing.watch,
        image: imported.image || existing.image || '', createdAt: existing.createdAt || Date.now(), updatedAt: Date.now() };
      D.importRecipes([rec]);
      UI.closeModal('compare-modal');
      ns.App.renderList();
      UI.toast(`„${name}“ ersetzt ✓`);
      if (opts.onImported) opts.onImported(rec, 'replace');
    });

    UI.openModal('compare-modal');
  }

  /** Anzahl der Unterschiede (für die Markierung in der Import-Liste). */
  function countDiffs(a, b) {
    try { buildTable(a, b); return diffCount; } catch (e) { return -1; }
  }

  ns.Compare = { open, countDiffs, wordDiff, pairIngredients, pairSteps };
})(window.EasyKitchen);
