// main.js — editor state, UI wiring, photo loading, panel drag/zoom, export
// and the deterministic ?shot= screenshot modes. Classic script (no modules)
// so the app also works straight off file:// with the network off.
window.VC = window.VC || {};

(function () {
  const SIZES = ['1080x1080', '1080x1350', '1920x1080'];
  const SAMPLES = {
    boulevard: { url: 'samples/boulevard.jpg', name: 'Boulevard' },
    pier: { url: 'samples/pier.jpg', name: 'Pier' },
  };
  const CAPTION_PRESETS = [
    ['SUNSET HEIST', 'EVERY CITY HAS A PRICE'],
    ['NEON GETAWAY', 'ONE NIGHT. ONE SCORE.'],
    ['BOULEVARD QUEEN', 'THE COAST IS HER RUNWAY'],
    ['LAST RIDE OUT', 'GAS FULL. WINDOWS DOWN.'],
    ['MIDNIGHT RUN', 'THE HEAT NEVER SLEEPS'],
    ['PALM CITY LIMITS', 'WELCOME TO THE HEAT'],
  ];

  const S = {
    layout: 'grid4',
    size: '1920x1080',
    grade: 'sunset',
    intensity: 0.8,
    frame: 'black',
    photos: [], // {id, name, url, img}
    panels: [], // {photoId, zoom, ox, oy, flip, auto}
    selected: 0,
    caption: {
      title: 'SUNSET HEIST',
      subtitle: 'EVERY CITY HAS A PRICE',
      font: 'anton',
      scale: 1,
      tracking: 0.02,
      outline: 1,
      shadow: true,
      fill: 'white',
    },
  };

  let nextId = 1;
  const $ = (id) => document.getElementById(id);
  const preview = $('preview');
  let raf = 0;

  function render() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => VC.renderCover(preview, S, { preview: true }));
  }

  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function fmtBytes(n) {
    return n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  }

  // ---- panels ----
  function newPanel(photoId) {
    return { photoId: photoId || null, zoom: 1.06, ox: 0, oy: 0, flip: false, auto: true };
  }

  function syncPanels() {
    const n = VC.LAYOUTS[S.layout].count;
    while (S.panels.length < n) S.panels.push(newPanel(S.photos[0] ? S.photos[0].id : null));
    S.panels.length = n;
    S.selected = clamp(S.selected, 0, n - 1);
  }

  function panelRects() {
    const [w, h] = S.size.split('x').map(Number);
    return VC.LAYOUTS[S.layout].rects(w, h);
  }

  // ---- photos ----
  function addPhoto(url, name) {
    const existing = S.photos.find((p) => p.url === url);
    if (existing) return Promise.resolve(existing);
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const photo = { id: 'p' + nextId++, name, url, img };
        S.photos.push(photo);
        // fill any empty panels; a brand-new first photo fills them all
        let used = false;
        for (const p of S.panels) {
          if (!p.photoId || !S.photos.some((ph) => ph.id === p.photoId)) {
            p.photoId = photo.id;
            p.auto = true;
            used = true;
          }
        }
        if (!used && S.panels.length === 1) S.panels[0].photoId = photo.id;
        resolve(photo);
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }

  function removePhoto(id) {
    const i = S.photos.findIndex((p) => p.id === id);
    if (i === -1) return;
    const photo = S.photos[i];
    if (photo.url.startsWith('blob:')) URL.revokeObjectURL(photo.url);
    S.photos.splice(i, 1);
    const fallback = S.photos[0] ? S.photos[0].id : null;
    for (const p of S.panels) if (p.photoId === id) { p.photoId = fallback; p.auto = true; }
    buildThumbs();
    buildPanelBar();
    render();
  }

  function assignToSelected(photoId) {
    const p = S.panels[S.selected];
    if (!p) return;
    p.photoId = photoId;
    p.auto = true;
    buildThumbs();
    buildPanelBar();
    render();
  }

  // ---- export ----
  async function exportPNG() {
    const [w, h] = S.size.split('x').map(Number);
    const c = document.createElement('canvas');
    VC.renderCover(c, S, { preview: false });
    let blob;
    try {
      blob = await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('encode failed'))), 'image/png'));
    } catch (err) {
      // file:// pages taint the canvas with local images; the preview still
      // works there, but pixels can only be exported over http(s)
      $('status').textContent = 'Export needs a local server: run `node serve.ts` and open http://localhost:8080 (file:// blocks canvas export).';
      return null;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vice-cover-${w}x${h}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    $('status').textContent = `Exported ${w}\u00d7${h} PNG \u00b7 ${fmtBytes(blob.size)} \u00b7 saved to your downloads`;
    window.__VC.lastExport = { blob, w, h };
    return blob;
  }

  // ---- UI builders ----
  function buildThumbs() {
    const wrap = $('thumbs');
    wrap.innerHTML = '';
    const sel = S.panels[S.selected];
    for (const ph of S.photos) {
      const chip = document.createElement('button');
      chip.className = 'thumb' + (sel && sel.photoId === ph.id ? ' active' : '');
      chip.title = 'Use in selected panel';
      const im = document.createElement('img');
      im.src = ph.url;
      im.alt = ph.name;
      const label = document.createElement('span');
      label.textContent = ph.name;
      const x = document.createElement('span');
      x.className = 'thumb-x';
      x.textContent = '\u00d7';
      x.title = 'Remove photo';
      x.addEventListener('click', (e) => { e.stopPropagation(); removePhoto(ph.id); });
      chip.append(im, label, x);
      chip.addEventListener('click', () => assignToSelected(ph.id));
      wrap.appendChild(chip);
    }
    $('photoEmpty').style.display = S.photos.length ? 'none' : '';
  }

  function buildPanelBar() {
    const p = S.panels[S.selected];
    const n = S.panels.length;
    $('panelLabel').textContent = n > 1 ? `Panel ${S.selected + 1} / ${n}` : 'Photo';
    const sel = $('panelPhoto');
    sel.innerHTML = '';
    for (const ph of S.photos) {
      const o = document.createElement('option');
      o.value = ph.id;
      o.textContent = ph.name;
      sel.appendChild(o);
    }
    if (!S.photos.length) {
      const o = document.createElement('option');
      o.textContent = 'no photo yet';
      sel.appendChild(o);
    }
    sel.value = p && p.photoId ? p.photoId : '';
    $('panelZoom').value = p ? p.zoom : 1;
    $('zoomVal').textContent = p ? p.zoom.toFixed(2) + '\u00d7' : '';
    $('panelPanX').value = p ? p.ox : 0;
    $('panelPanY').value = p ? p.oy : 0;
    $('flipBtn').classList.toggle('on', !!(p && p.flip));
  }

  function markActive(containerId, attr, value) {
    for (const b of $(containerId).querySelectorAll('button')) {
      b.classList.toggle('active', b.getAttribute(attr) === value);
    }
  }

  function syncCaptionUI() {
    $('capTitle').value = S.caption.title;
    $('capTag').value = S.caption.subtitle;
    $('capScale').value = S.caption.scale;
    $('capTracking').value = S.caption.tracking;
    $('capOutline').value = S.caption.outline;
    $('capShadow').checked = S.caption.shadow;
    markActive('fontPicker', 'data-font', S.caption.font);
    markActive('fillPicker', 'data-fill', S.caption.fill);
  }

  function syncAllUI() {
    markActive('layoutPicker', 'data-layout', S.layout);
    markActive('sizePicker', 'data-size', S.size);
    markActive('gradePicker', 'data-grade', S.grade);
    markActive('framePicker', 'data-frame', S.frame);
    $('intensity').value = S.intensity;
    $('intensityVal').textContent = Math.round(S.intensity * 100) + '%';
    $('exportBtn').textContent = `Export PNG \u00b7 ${S.size.replace('x', '\u00d7')}`;
    syncCaptionUI();
    buildThumbs();
    buildPanelBar();
  }

  // ---- shuffle ----
  function shuffle() {
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    S.layout = pick(VC.layoutOrder);
    S.grade = pick(VC.gradeOrder);
    S.intensity = 0.65 + Math.random() * 0.35;
    const [t, tag] = pick(CAPTION_PRESETS);
    S.caption.title = t;
    S.caption.subtitle = tag;
    S.caption.fill = pick(['white', 'white', 'sunset', 'neon']);
    S.frame = pick(['black', 'black', 'white']);
    syncPanels();
    if (S.photos.length) {
      for (const p of S.panels) {
        p.photoId = pick(S.photos).id;
        p.zoom = 1 + Math.random() * 0.6;
        p.ox = (Math.random() - 0.5) * 1.2;
        p.oy = (Math.random() - 0.5) * 1.2;
        p.flip = Math.random() < 0.3;
        p.auto = false;
      }
    }
    syncAllUI();
    render();
  }

  // ---- pointer interaction on the preview ----
  let drag = null;

  function canvasPoint(e) {
    const b = preview.getBoundingClientRect();
    return {
      x: ((e.clientX - b.left) / b.width) * preview.width,
      y: ((e.clientY - b.top) / b.height) * preview.height,
      sx: preview.width / b.width,
      sy: preview.height / b.height,
    };
  }

  function overflowFor(panel, r) {
    const ph = S.photos.find((p) => p.id === panel.photoId);
    if (!ph || !ph.img.naturalWidth) return { overX: 0, overY: 0 };
    const base = Math.max(r[2] / ph.img.naturalWidth, r[3] / ph.img.naturalHeight);
    const dw = ph.img.naturalWidth * base * panel.zoom;
    const dh = ph.img.naturalHeight * base * panel.zoom;
    return { overX: Math.max(0, (dw - r[2]) / 2), overY: Math.max(0, (dh - r[3]) / 2) };
  }

  preview.addEventListener('pointerdown', (e) => {
    const pt = canvasPoint(e);
    const rects = panelRects();
    let hit = -1;
    rects.forEach((r, i) => {
      if (pt.x >= r[0] && pt.x <= r[0] + r[2] && pt.y >= r[1] && pt.y <= r[1] + r[3]) hit = i;
    });
    if (hit === -1) return;
    S.selected = hit;
    const panel = S.panels[hit];
    const { overX, overY } = overflowFor(panel, rects[hit]);
    drag = { i: hit, x: e.clientX, y: e.clientY, ox: panel.ox, oy: panel.oy, overX, overY, sx: pt.sx, sy: pt.sy, moved: false };
    preview.setPointerCapture(e.pointerId);
    buildThumbs();
    buildPanelBar();
    render();
  });

  preview.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const panel = S.panels[drag.i];
    const dx = (e.clientX - drag.x) * drag.sx;
    const dy = (e.clientY - drag.y) * drag.sy;
    if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true;
    if (drag.moved) {
      panel.auto = false;
      if (drag.overX > 0) panel.ox = clamp(drag.ox + dx / drag.overX, -1, 1);
      if (drag.overY > 0) panel.oy = clamp(drag.oy + dy / drag.overY, -1, 1);
      $('panelPanX').value = panel.ox;
      $('panelPanY').value = panel.oy;
      render();
    }
  });

  const endDrag = () => { drag = null; };
  preview.addEventListener('pointerup', endDrag);
  preview.addEventListener('pointercancel', endDrag);

  preview.addEventListener('wheel', (e) => {
    e.preventDefault();
    const panel = S.panels[S.selected];
    if (!panel) return;
    panel.zoom = clamp(panel.zoom * Math.exp(-e.deltaY * 0.0012), 1, 3);
    panel.auto = false;
    $('panelZoom').value = panel.zoom;
    $('zoomVal').textContent = panel.zoom.toFixed(2) + '\u00d7';
    render();
  }, { passive: false });

  // ---- wire up controls ----
  function bind() {
    $('layoutPicker').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-layout]');
      if (!b) return;
      S.layout = b.dataset.layout;
      syncPanels();
      syncAllUI();
      render();
    });
    $('sizePicker').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-size]');
      if (!b) return;
      S.size = b.dataset.size;
      syncAllUI();
      render();
    });
    $('gradePicker').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-grade]');
      if (!b) return;
      S.grade = b.dataset.grade;
      syncAllUI();
      render();
    });
    $('framePicker').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-frame]');
      if (!b) return;
      S.frame = b.dataset.frame;
      syncAllUI();
      render();
    });
    $('intensity').addEventListener('input', () => {
      S.intensity = Number($('intensity').value);
      $('intensityVal').textContent = Math.round(S.intensity * 100) + '%';
      render();
    });

    $('fileInput').addEventListener('change', async () => {
      const files = Array.from($('fileInput').files || []);
      for (const f of files) await addPhoto(URL.createObjectURL(f), f.name.replace(/\.[^.]+$/, ''));
      $('fileInput').value = '';
      syncAllUI();
      render();
    });
    for (const key of Object.keys(SAMPLES)) {
      $('sample-' + key).addEventListener('click', async () => {
        await addPhoto(SAMPLES[key].url, SAMPLES[key].name);
        syncAllUI();
        render();
      });
    }

    $('capTitle').addEventListener('input', () => { S.caption.title = $('capTitle').value; render(); });
    $('capTag').addEventListener('input', () => { S.caption.subtitle = $('capTag').value; render(); });
    $('presetChips').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-preset]');
      if (!b) return;
      const [t, tag] = CAPTION_PRESETS[Number(b.dataset.preset)];
      S.caption.title = t;
      S.caption.subtitle = tag;
      syncCaptionUI();
      render();
    });
    $('fontPicker').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-font]');
      if (!b) return;
      S.caption.font = b.dataset.font;
      syncCaptionUI();
      render();
    });
    $('fillPicker').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-fill]');
      if (!b) return;
      S.caption.fill = b.dataset.fill;
      syncCaptionUI();
      render();
    });
    $('capScale').addEventListener('input', () => { S.caption.scale = Number($('capScale').value); render(); });
    $('capTracking').addEventListener('input', () => { S.caption.tracking = Number($('capTracking').value); render(); });
    $('capOutline').addEventListener('input', () => { S.caption.outline = Number($('capOutline').value); render(); });
    $('capShadow').addEventListener('change', () => { S.caption.shadow = $('capShadow').checked; render(); });

    $('panelPhoto').addEventListener('change', () => assignToSelected($('panelPhoto').value));
    $('panelZoom').addEventListener('input', () => {
      const p = S.panels[S.selected];
      p.zoom = Number($('panelZoom').value);
      p.auto = false;
      $('zoomVal').textContent = p.zoom.toFixed(2) + '\u00d7';
      render();
    });
    $('panelPanX').addEventListener('input', () => {
      const p = S.panels[S.selected];
      p.ox = Number($('panelPanX').value);
      p.auto = false;
      render();
    });
    $('panelPanY').addEventListener('input', () => {
      const p = S.panels[S.selected];
      p.oy = Number($('panelPanY').value);
      p.auto = false;
      render();
    });
    $('flipBtn').addEventListener('click', () => {
      const p = S.panels[S.selected];
      p.flip = !p.flip;
      buildPanelBar();
      render();
    });
    $('resetBtn').addEventListener('click', () => {
      const p = S.panels[S.selected];
      p.zoom = 1.06; p.ox = 0; p.oy = 0; p.flip = false; p.auto = true;
      buildPanelBar();
      render();
    });
    $('fillAllBtn').addEventListener('click', () => {
      const src = S.panels[S.selected];
      for (const p of S.panels) { p.photoId = src.photoId; p.auto = true; }
      buildThumbs();
      render();
    });

    $('shuffleBtn').addEventListener('click', shuffle);
    $('exportBtn').addEventListener('click', () => { exportPNG(); });
  }

  // ---- screenshot / deep-link params ----
  async function applyParams() {
    const q = new URLSearchParams(location.search);
    const shot = q.get('shot');
    if (shot === 'cover') document.body.classList.add('shot-cover');

    if (q.get('size') && SIZES.includes(q.get('size'))) S.size = q.get('size');
    if (q.get('grade') && VC.GRADES[q.get('grade')]) S.grade = q.get('grade');
    if (q.get('intensity') !== null && Number.isFinite(Number(q.get('intensity')))) {
      S.intensity = clamp(Number(q.get('intensity')), 0, 1);
    }
    if (q.get('frame') === 'white' || q.get('frame') === 'black') S.frame = q.get('frame');
    if (q.get('caption')) S.caption.title = q.get('caption');
    if (q.get('tagline')) S.caption.subtitle = q.get('tagline');
    if (q.get('font') === 'bebas' || q.get('font') === 'anton') S.caption.font = q.get('font');
    if (q.get('fill') && ['white', 'sunset', 'neon', 'gold'].includes(q.get('fill'))) S.caption.fill = q.get('fill');
    if (q.get('scale')) S.caption.scale = clamp(Number(q.get('scale')) || 1, 0.5, 1.8);
    if (q.get('tracking')) S.caption.tracking = clamp(Number(q.get('tracking')) || 0, 0, 0.15);
    if (q.get('outline')) S.caption.outline = clamp(Number(q.get('outline')), 0, 2);

    const names = (q.get('photos') || q.get('photo') || (shot === 'cover' ? 'boulevard' : ''))
      .split(',').map((s) => s.trim()).filter((s) => SAMPLES[s]);
    for (const n of names) await addPhoto(SAMPLES[n].url, SAMPLES[n].name);

    if (q.get('layout') && VC.LAYOUTS[q.get('layout')]) {
      S.layout = q.get('layout');
    } else if (names.length && shot === 'cover') {
      S.layout = names.length === 1 ? 'full' : names.length === 2 ? 'split2' : names.length === 3 ? 'strip3' : 'grid4';
    }
    syncPanels();

    // Deterministic composition whenever photos are named (both shot modes):
    // round-robin the photos, alternate mirror + zoom for rhythm, and give the
    // grid a tight "detail" crop so panels read as different vignettes.
    const explicit = !!(q.get('photos') || q.get('photo'));
    if ((explicit || shot === 'cover') && S.photos.length) {
      composePanels();
    } else if (shot !== 'cover') {
      // friendly first load: one sample, already composed
      await addPhoto(SAMPLES.boulevard.url, SAMPLES.boulevard.name);
      composePanels();
    }
    S.selected = 0;
  }

  function composePanels() {
    const n = S.photos.length;
    S.panels.forEach((p, i) => {
      p.photoId = S.photos[i % n].id;
      p.auto = true;
      p.ox = 0;
      p.oy = 0;
      p.flip = i % 2 === 1;
      p.zoom = i % 2 === 1 ? 1.45 : 1.06;
    });
    // Repeated photos become establishing/detail vignettes (palm sunset sky,
    // rod reel) rather than duplicate faces, so each panel tells a different beat.
    if (S.layout === 'grid4' && S.panels.length === 4) {
      const d = S.panels[2];
      d.zoom = 3; d.oy = 1; d.ox = -0.9; d.auto = false;
      const e = S.panels[3];
      if (n >= 2) { e.zoom = 2.3; e.oy = -0.8; e.ox = -0.4; e.auto = false; }
      else { e.zoom = 1.35; e.oy = -0.3; e.auto = false; }
    }
    if (S.layout === 'strip3' && S.panels.length === 3) {
      const d = S.panels[2];
      d.zoom = 3; d.oy = 1; d.ox = -0.9; d.auto = false;
    }
  }

  // ---- boot ----
  async function boot() {
    bind();
    await applyParams();
    try {
      await Promise.all([
        document.fonts.load('400 100px "Anton"'),
        document.fonts.load('400 100px "Bebas Neue"'),
      ]);
      await document.fonts.ready;
    } catch (e) { /* fall back to system fonts */ }
    syncAllUI();
    VC.renderCover(preview, S, { preview: true });
    document.fonts.ready.then(() => render());
    $('status').textContent = 'Drag a panel to reframe it \u00b7 scroll to zoom \u00b7 everything stays on your device';
    requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
  }

  window.__VC = {
    state: S,
    render: () => VC.renderCover(preview, S, { preview: true }),
    exportPNG,
    addSample: async (name) => {
      if (!SAMPLES[name]) return null;
      const ph = await addPhoto(SAMPLES[name].url, SAMPLES[name].name);
      syncAllUI();
      render();
      return ph;
    },
    presets: CAPTION_PRESETS,
    lastExport: null,
    ready: null,
  };
  window.__VC.ready = boot();
})();