/* EasyKitchen – kleine UI-Helfer (Toast, Modals, Formatierung, Bilder). */
window.EasyKitchen = window.EasyKitchen || {};
(function (ns) {
  'use strict';

  const $ = id => document.getElementById(id);

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  let toastTimer = null;
  function toast(msg) {
    const el = $('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
  }

  // ---------- Modals ----------
  const openStack = [];

  function openModal(id) {
    const el = $(id);
    if (!el) return;
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add('open'));
    if (!openStack.includes(id)) openStack.push(id);
    document.body.classList.add('modal-open');
  }

  function closeModal(id) {
    const el = $(id);
    if (!el) return;
    el.classList.remove('open');
    el.hidden = true;
    const i = openStack.indexOf(id);
    if (i >= 0) openStack.splice(i, 1);
    if (!openStack.length) document.body.classList.remove('modal-open');
  }

  function topModal() { return openStack[openStack.length - 1] || null; }

  // ---------- Formatierung ----------
  function fmtNum(n) {
    if (!Number.isFinite(n)) return '';
    return Number(n.toFixed(2)).toLocaleString('de-DE', { maximumFractionDigits: 2 });
  }

  function fmtAmount(ing) {
    const unit = ns.Data.UNIT_BY_ID[ing.unit];
    if (!unit || unit.id === 'ng') return 'nach Geschmack';
    if (!ing.amount) return '';
    return `${fmtNum(ing.amount)} ${ing.amount > 1 && unit.plural ? unit.plural : unit.label}`;
  }

  function fmtTime(min) {
    if (!min) return '–';
    if (min < 60) return `${min} Min`;
    const h = Math.floor(min / 60), m = min % 60;
    return m ? `${h} Std ${m} Min` : `${h} Std`;
  }

  // ---------- Bilder ----------
  /** Liest eine Bilddatei ein und verkleinert sie (max. 1200 px, JPEG), damit die Daten schlank bleiben. */
  function readImageFile(file, maxSide = 1200) {
    return new Promise((resolve, reject) => {
      if (!file || !/^image\//.test(file.type || '') && !/\.(jpe?g|png|gif|webp|heic|heif|bmp|tiff?)$/i.test(file.name || '')) {
        reject(new Error('Bitte eine Bilddatei auswählen.'));
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Bild konnte nicht gelesen werden.'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Dieses Bildformat wird nicht unterstützt.'));
        img.onload = () => {
          const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
          const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  ns.UI = { $, esc, toast, openModal, closeModal, topModal, fmtNum, fmtAmount, fmtTime, readImageFile };
})(window.EasyKitchen);
