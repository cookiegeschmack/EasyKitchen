/*
 * EasyKitchen – Teilen & Exportieren.
 * • PDF im EasyKitchen-Layout (für alle lesbar; enthält die Rezeptdaten eingebettet,
 *   sodass andere EasyKitchen-Nutzer die PDF 1:1 importieren können)
 * • .easykitchen-Datei (direkter Import inkl. Foto)
 */
window.EasyKitchen = window.EasyKitchen || {};
(function (ns) {
  'use strict';

  const D = ns.Data, UI = ns.UI;
  const $ = UI.$, esc = UI.esc;
  const native = name => window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers[name];

  // ---------- PDF-Layout ----------

  const PRINT_CSS = `
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; background: #fff; }
    body {
      font: 11pt/1.5 -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #24211d; -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    .recipe { padding: 44px 52px 16px; }
    .recipe + .recipe { page-break-before: always; break-before: page; }
    .brand { display: flex; align-items: center; justify-content: space-between; padding-bottom: 12px; margin-bottom: 22px; border-bottom: 2px solid #3f9468; }
    .brand-left { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 12pt; }
    .brand-left img { width: 22px; height: 22px; }
    .brand-right { font-size: 8.5pt; color: #a29a8f; }
    .photo { width: 100%; height: 270px; border-radius: 14px; overflow: hidden; margin-bottom: 20px; background: #f3f0eb; }
    .photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
    h1 { font-size: 23pt; line-height: 1.2; margin: 0 0 10px; letter-spacing: -.01em; }
    .meta { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 24px; }
    .meta span { font-size: 9.5pt; color: #6e675e; background: #f3f0eb; padding: 3px 10px; border-radius: 6px; }
    .meta .dim { opacity: .3; background: none; padding: 0; }
    .cols { display: grid; grid-template-columns: 38% 1fr; gap: 30px; }
    h2 { font-size: 12.5pt; margin: 0 0 10px; color: #3f9468; text-transform: uppercase; letter-spacing: .05em; }
    ul.ing { list-style: none; margin: 0; padding: 0; }
    ul.ing li { display: flex; gap: 10px; padding: 6px 0; border-bottom: 1px solid #ece7df; break-inside: avoid; }
    ul.ing li:last-child { border-bottom: 0; }
    .amt { width: 112px; flex-shrink: 0; white-space: nowrap; color: #6e675e; font-variant-numeric: tabular-nums; }
    ol.steps { margin: 0; padding-left: 20px; }
    ol.steps li { padding: 0 0 9px 4px; break-inside: avoid; }
    ol.steps li::marker { color: #3f9468; font-weight: 700; }
    .muted { color: #a29a8f; }
    table.times { width: 100%; border-collapse: collapse; margin: 4px 0 14px; border-top: 1px solid #ece7df; border-bottom: 1px solid #ece7df; }
    table.times td { width: 33.33%; text-align: center; padding: 9px 6px; }
    table.times td + td { border-left: 1px solid #ece7df; }
    table.times span, .nutri td span { display: block; font-size: 9pt; color: #8a8178; }
    table.times strong { font-size: 12pt; font-weight: 600; }
    .nutri { margin-top: 26px; padding: 12px 14px 10px; border: 1px solid #ece7df; border-radius: 10px; break-inside: avoid; }
    .nutri h3 { font-size: 10pt; margin: 0 0 8px; color: #6e675e; text-transform: uppercase; letter-spacing: .05em; }
    .nutri h3 span { text-transform: none; letter-spacing: 0; font-weight: 400; color: #a29a8f; }
    .nutri table { width: 100%; border-collapse: collapse; }
    .nutri td { width: 25%; padding: 2px 0; }
    .nutri td strong { font-size: 11pt; font-weight: 600; }
    .nutri p { margin: 8px 0 0; font-size: 8pt; color: #a29a8f; }
    .nutri + .foot { margin-top: 14px; }
    .foot { margin-top: 30px; padding-top: 10px; border-top: 1px solid #ece7df; font-size: 8.5pt; color: #a29a8f; text-align: center; }
  `;

  function recipeSection(r, iconSrc, dateStr) {
    const steps = D.cleanSteps(r.steps).split('\n').filter(Boolean);
    const servings = `${r.servings} ${r.servings === 1 ? 'Portion' : 'Portionen'}`;
    return `
      <section class="recipe">
        <div class="brand">
          <div class="brand-left"><img src="${iconSrc}" alt="">EasyKitchen</div>
          <div class="brand-right">Rezept · ${esc(dateStr)}</div>
        </div>
        ${r.image ? `<div class="photo"><img src="${r.image}" alt=""></div>` : ''}
        <h1>${esc(r.title)}</h1>
        <table class="times"><tr>
          <td><span>Vorbereitung</span><strong>${r.prepTime ? esc(UI.fmtTime(r.prepTime)) : '–'}</strong></td>
          <td><span>Zubereitung</span><strong>${r.cookTime ? esc(UI.fmtTime(r.cookTime)) : '–'}</strong></td>
          <td><span>Gesamtzeit</span><strong>${r.time ? esc(UI.fmtTime(r.time)) : '–'}</strong></td>
        </tr></table>
        <div class="meta">
          ${ns.Classify ? `<span>${esc(ns.Classify.LABELS.course[ns.Classify.of(r).course])}</span>` : ''}
          ${ns.Classify && ns.Classify.of(r).veg ? '<span>🌱 Vegetarisch</span>' : ''}
          ${ns.Classify && ns.Classify.of(r).highProtein ? '<span>💪 High Protein</span>' : ''}
          <span>${esc(D.EFFORT[r.effort])}</span>
          <span>${'€'.repeat(r.cost)}<span class="dim">${'€'.repeat(3 - r.cost)}</span></span>
          <span>${esc(servings)}</span>
        </div>
        <div class="cols">
          <div>
            <h2>Zutaten</h2>
            <ul class="ing">
              ${r.ingredients.map(i => `<li><span class="amt">${esc(UI.fmtAmount(i))}</span><span>${esc(i.name)}</span></li>`).join('')}
            </ul>
          </div>
          <div>
            <h2>Zubereitung</h2>
            ${steps.length ? `<ol class="steps">${steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>` : '<p class="muted">Keine Zubereitung hinterlegt.</p>'}
          </div>
        </div>
        ${ns.Nutrition.renderPrintTable(r)}
        <div class="foot">Erstellt mit EasyKitchen – mit EasyKitchen lässt sich diese PDF direkt als Rezept importieren.</div>
      </section>`;
  }

  function buildPrintHTML(recipes, iconSrc) {
    const dateStr = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const title = recipes.length === 1 ? recipes[0].title : `EasyKitchen – ${recipes.length} Rezepte`;
    return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>${esc(title)}</title>
      <style>${PRINT_CSS}</style></head><body>
      ${recipes.map(r => recipeSection(r, iconSrc, dateStr)).join('')}
      </body></html>`;
  }

  // ---------- Dateinamen ----------

  function baseName(recipes) {
    if (recipes.length === 1) {
      const clean = recipes[0].title.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
      return clean || 'Rezept';
    }
    return `EasyKitchen-Rezepte (${recipes.length})`;
  }

  // ---------- Aktionen ----------

  function exportPDF(ids, action) {
    const recipes = ids.map(D.getRecipe).filter(Boolean);
    if (!recipes.length) return;
    const h = native('nativeExportPDF');
    if (h) {
      h.postMessage({
        html: buildPrintHTML(recipes, 'img/icon-128.png'),
        filename: baseName(recipes) + '.pdf',
        embed: D.exportShare(ids),
        action
      });
      UI.toast(action === 'share' ? 'PDF wird vorbereitet…' : 'PDF wird erstellt…');
      return;
    }
    // Browser: Druckansicht öffnen → „Als PDF sichern“
    const win = window.open('', '_blank');
    if (!win) { UI.toast('Bitte Pop-ups erlauben, um die PDF zu erstellen.'); return; }
    win.document.write(buildPrintHTML(recipes, new URL('img/icon-128.png', location.href).href));
    win.document.close();
    win.onload = () => setTimeout(() => win.print(), 200);
  }

  function shareFile(ids, action) {
    const recipes = ids.map(D.getRecipe).filter(Boolean);
    if (!recipes.length) return;
    const content = D.exportShare(ids);
    const filename = baseName(recipes) + '.easykitchen';
    if (action === 'share') {
      const h = native('nativeShareFile');
      if (h) { h.postMessage({ content, filename }); return; }
      const file = new File([content], filename, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: baseName(recipes) }).catch(() => {});
        return;
      }
    }
    const h = native('nativeExport');
    if (h) { h.postMessage({ content, filename, toast: 'EasyKitchen-Datei gespeichert ✓' }); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    UI.toast('EasyKitchen-Datei gespeichert ✓');
  }

  // ---------- Dialog ----------

  function openShareModal(ids) {
    ids = ids.filter(id => D.getRecipe(id));
    if (!ids.length) { UI.toast('Keine Rezepte zum Teilen.'); return; }
    const recipes = ids.map(D.getRecipe);
    const canShareNative = !!native('nativeShareFile');
    const label = recipes.length === 1 ? `„${recipes[0].title}“` : `${recipes.length} Rezepte`;

    $('share-card').innerHTML = `
      <div class="modal-head">
        <h2>Teilen &amp; exportieren</h2>
        <button type="button" class="icon-btn" data-close="share-modal" aria-label="Schließen">✕</button>
      </div>
      <div class="modal-body">
        <p class="muted share-sub">${esc(label)}</p>
        <div class="share-option">
          <div class="share-icon">📄</div>
          <div class="share-text">
            <strong>PDF</strong>
            <span>Im EasyKitchen-Layout zum Ansehen, Drucken und Weitergeben – für alle. EasyKitchen-Nutzer können die PDF außerdem direkt importieren.</span>
          </div>
          <div class="share-actions">
            ${canShareNative ? '<button type="button" class="btn btn-primary" data-share="pdf-share">Teilen…</button>' : ''}
            <button type="button" class="btn btn-secondary" data-share="pdf-save">${canShareNative ? 'Speichern' : 'PDF erstellen'}</button>
          </div>
        </div>
        <div class="share-option">
          <div class="share-icon"><img src="img/icon-128.png" alt=""></div>
          <div class="share-text">
            <strong>EasyKitchen-Datei</strong>
            <span>Für andere EasyKitchen-Nutzer: Doppelklick auf die Datei – und das Rezept ist inklusive Foto importiert.</span>
          </div>
          <div class="share-actions">
            <button type="button" class="btn ${canShareNative ? 'btn-primary' : 'btn-secondary'}" data-share="file-share">Teilen…</button>
            <button type="button" class="btn btn-secondary" data-share="file-save">Speichern</button>
          </div>
        </div>
      </div>`;

    $('share-card').querySelectorAll('[data-share]').forEach(b => b.addEventListener('click', () => {
      const act = b.dataset.share;
      if (act === 'pdf-share') exportPDF(ids, 'share');
      else if (act === 'pdf-save') exportPDF(ids, 'save');
      else if (act === 'file-share') shareFile(ids, 'share');
      else if (act === 'file-save') shareFile(ids, 'save');
    }));
    UI.openModal('share-modal');
  }

  ns.Share = { openShareModal, exportPDF, shareFile, buildPrintHTML };
})(window.EasyKitchen);
