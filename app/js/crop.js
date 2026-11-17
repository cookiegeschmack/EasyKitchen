/*
 * EasyKitchen – Foto zuschneiden.
 * Bildausschnitt verschieben (ziehen) und zoomen (Regler / Mausrad / Trackpad),
 * mit Live-Vorschau, wie das Foto auf der Rezeptkarte und in der Rezeptansicht aussieht.
 */
window.EasyKitchen = window.EasyKitchen || {};
(function (ns) {
  'use strict';

  const UI = ns.UI;
  const $ = UI.$;
  const RATIO = 16 / 10;            // wie die Rezeptkarten
  const OUT_W = 1200, OUT_H = 750;  // gespeichertes Bild

  let st = null;       // { img, iw, ih, W, H, s0, zoom, x, y, resolve }

  function frameSize() {
    const f = $('crop-frame');
    const r = f.getBoundingClientRect();
    return { W: r.width, H: r.width / RATIO };
  }

  function clamp() {
    const s = st.s0 * st.zoom;
    const w = st.iw * s, h = st.ih * s;
    st.x = Math.min(0, Math.max(st.W - w, st.x));
    st.y = Math.min(0, Math.max(st.H - h, st.y));
  }

  /** Bild im Rahmen und in den Vorschauen positionieren. */
  function render() {
    if (!st || !st.W) return;
    clamp();
    const s = st.s0 * st.zoom;
    const place = (img, k, dy) => {
      img.style.width = `${st.iw * s * k}px`;
      img.style.height = `${st.ih * s * k}px`;
      img.style.transform = `translate(${st.x * k}px, ${st.y * k + (dy || 0)}px)`;
    };
    place($('crop-img'), 1);
    // Vorschau „Karte“: gleiches Seitenverhältnis wie der Rahmen
    const card = $('crop-prev-card');
    const kc = card.clientWidth / st.W;
    place(card.querySelector('img'), kc);
    // Vorschau „Rezeptansicht“: breiter Streifen, zeigt die Mitte des Ausschnitts (wie object-fit: cover)
    const hero = $('crop-prev-hero');
    const kh = hero.clientWidth / st.W;
    place(hero.querySelector('img'), kh, (hero.clientHeight - st.H * kh) / 2);
    $('crop-zoom').value = st.zoom;
  }

  function setZoom(z, cx, cy) {
    z = Math.max(1, Math.min(4, z));
    // um den Punkt (cx, cy) im Rahmen zoomen – sonst um die Mitte
    if (cx == null) { cx = st.W / 2; cy = st.H / 2; }
    const old = st.s0 * st.zoom, neu = st.s0 * z;
    st.x = cx - (cx - st.x) * (neu / old);
    st.y = cy - (cy - st.y) * (neu / old);
    st.zoom = z;
    render();
  }

  function layout() {
    if (!st) return;
    const { W, H } = frameSize();
    if (!W) return;                       // Dialog noch nicht sichtbar
    const first = !st.W;
    // bei Größenänderung relativen Ausschnitt beibehalten
    const k = first ? 1 : W / st.W;
    st.x *= k; st.y *= k;
    st.W = W; st.H = H;
    st.s0 = Math.max(W / st.iw, H / st.ih);
    if (first) {                          // Start: Bild mittig
      st.x = (W - st.iw * st.s0 * st.zoom) / 2;
      st.y = (H - st.ih * st.s0 * st.zoom) / 2;
    }
    $('crop-frame').style.height = `${H}px`;
    // Rezeptansicht: Titelbild ist ca. 2,9 : 1 (760 × 260)
    const hero = $('crop-prev-hero');
    hero.style.height = `${Math.round(hero.clientWidth / 2.9)}px`;
    render();
  }

  function result() {
    const canvas = document.createElement('canvas');
    canvas.width = OUT_W; canvas.height = OUT_H;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, OUT_W, OUT_H);
    const k = OUT_W / st.W;
    const s = st.s0 * st.zoom;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(st.img, st.x * k, st.y * k, st.iw * s * k, st.ih * s * k);
    return canvas.toDataURL('image/jpeg', 0.86);
  }

  function finish(value) {
    const r = st && st.resolve;
    st = null;
    UI.closeModal('crop-modal', true);
    if (r) r(value);
  }

  /**
   * Zuschneide-Dialog öffnen.
   * @returns Promise → zugeschnittenes Bild (data-URL), das Original (bei „Ganzes Foto“) oder null (Abbrechen)
   */
  function open(dataUrl) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        st = { img, iw: img.naturalWidth, ih: img.naturalHeight, W: 0, H: 0, s0: 1, zoom: 1, x: 0, y: 0, resolve, src: dataUrl };
        ['crop-img'].forEach(id => { $(id).src = dataUrl; });
        document.querySelectorAll('#crop-modal .crop-prev img').forEach(i => { i.src = dataUrl; });
        UI.openModal('crop-modal');
        requestAnimationFrame(() => layout());
        setTimeout(layout, 60);          // falls requestAnimationFrame gedrosselt ist
      };
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
  }

  function wire() {
    const frame = $('crop-frame');
    let drag = null;
    frame.addEventListener('pointerdown', e => {
      if (!st || e.button !== 0) return;
      e.preventDefault();
      frame.setPointerCapture(e.pointerId);
      drag = { px: e.clientX, py: e.clientY, x: st.x, y: st.y };
      frame.classList.add('grabbing');
    });
    frame.addEventListener('pointermove', e => {
      if (!drag || !st) return;
      st.x = drag.x + (e.clientX - drag.px);
      st.y = drag.y + (e.clientY - drag.py);
      render();
    });
    const end = () => { drag = null; frame.classList.remove('grabbing'); };
    frame.addEventListener('pointerup', end);
    frame.addEventListener('pointercancel', end);
    // Mausrad / Trackpad-Pinch zoomt
    frame.addEventListener('wheel', e => {
      if (!st) return;
      e.preventDefault();
      const r = frame.getBoundingClientRect();
      setZoom(st.zoom * Math.exp(-e.deltaY * 0.0025), e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });
    $('crop-zoom').addEventListener('input', e => { if (st) setZoom(Number(e.target.value)); });
    $('crop-reset').addEventListener('click', () => {
      if (!st) return;
      st.zoom = 1;
      st.x = (st.W - st.iw * st.s0) / 2;
      st.y = (st.H - st.ih * st.s0) / 2;
      render();
    });
    $('crop-apply').addEventListener('click', () => { if (st) finish(result()); });
    $('crop-original').addEventListener('click', () => { if (st) finish(st.src); });
    $('crop-cancel').addEventListener('click', () => finish(null));
    // Schließen über ✕ / Hintergrund / Esc = Abbrechen
    UI.setCloseGuard('crop-modal', () => { if (st) { finish(null); return false; } return true; });
    window.addEventListener('resize', layout);
    // Rahmenbreite kann sich nach dem Öffnen ändern (Scrollleiste, Fenstergröße) → neu ausrichten
    if (window.ResizeObserver) new ResizeObserver(() => layout()).observe(frame);
  }

  ns.Crop = { open, wire };
})(window.EasyKitchen);
