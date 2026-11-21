/* Vice Cover — editor state, UI wiring, photo loading, panel drag/zoom, PNG export
   and deterministic ?shot= modes. Classic script on window.VC, no modules, no network. */
(function () {
  'use strict';
  var VC = window.VC = window.VC || {};
  function $(s) { return document.querySelector(s); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  var SIZES = ['1080x1080', '1080x1350', '1920x1080'];
  var FILLS = ['white', 'sunset', 'neon', 'gold'];
  var PRESETS = [
    { title: 'SUNSET HEIST', tag: 'EVERY CITY HAS A PRICE' },
    { title: 'NEON GETAWAY', tag: 'ONE NIGHT. ONE SCORE.' },
    { title: 'BOULEVARD QUEEN', tag: 'THE COAST IS HER RUNWAY' },
    { title: 'LAST RIDE OUT', tag: 'GAS FULL. WINDOWS DOWN.' },
    { title: 'MIDNIGHT RUN', tag: 'THE HEAT NEVER SLEEPS' },
    { title: 'PALM CITY LIMITS', tag: 'WELCOME TO THE HEAT' }
  ];
  var SAMPLES = { boulevard: 'samples/boulevard.jpg', pier: 'samples/pier.jpg' };

  var state = {
    layout: 'grid4',
    size: '1920x1080',
    grade: 'sunset',
    intensity: 0.8,
    frame: 'black',
    caption: {
      title: 'SUNSET HEIST', tagline: 'EVERY CITY HAS A PRICE',
      font: 'anton', scale: 1, tracking: 0.02, outline: 1, shadow: true, fill: 'white'
    },
    photos: [],
    panels: [],
    selected: 0
  };
  var photoSeq = 0;
  var preview = $('#preview');

  /* ---------- rendering ---------- */
  function renderNow() { VC.renderCover(preview, state, { preview: true }); }
  var rafId = 0;
  function render() {
    if (rafId) return;
    rafId = requestAnimationFrame(function () { rafId = 0; renderNow(); });
  }
  function setStatus(msg) { $('#status').textContent = msg; }

  /* ---------- panels & photos ---------- */
  function syncPanels() {
    var n = VC.LAYOUTS[state.layout].count;
    while (state.panels.length < n) {
      state.panels.push({ photoId: null, zoom: 1.06, ox: 0, oy: 0, flip: false, auto: true });
    }
    state.panels.length = n;
    if (state.selected >= n) state.selected = n - 1;
    if (state.selected < 0) state.selected = 0;
  }
  function curPanel() { return state.panels[state.selected]; }
  function photoById(id) {
    for (var i = 0; i < state.photos.length; i++) if (state.photos[i].id === id) return state.photos[i];
    return null;
  }
  function assignPhoto(photo) {
    if (state.photos.length === 1) {
      for (var i = 0; i < state.panels.length; i++) state.panels[i].photoId = photo.id;
      return;
    }
    var filled = false;
    for (var j = 0; j < state.panels.length; j++) {
      if (state.panels[j].photoId == null) { state.panels[j].photoId = photo.id; filled = true; }
    }
    if (!filled) curPanel().photoId = photo.id;
  }
  function loadImage(src) {
    return new Promise(function (res, rej) {
      var im = new Image();
      im.onload = function () { res(im); };
      im.onerror = function () { rej(new Error('Could not load ' + src)); };
      im.src = src;
    });
  }
  function loadSample(key) {
    return loadImage(SAMPLES[key]).then(function (img) {
      var photo = { id: ++photoSeq, name: key, img: img, url: SAMPLES[key], sample: key };
      state.photos.push(photo);
      return photo;
    });
  }
  function addSample(key) {
    if (!SAMPLES[key]) return Promise.resolve(null);
    var existing = null;
    for (var i = 0; i < state.photos.length; i++) if (state.photos[i].sample === key) existing = state.photos[i];
    var p = existing ? Promise.resolve(existing) : loadSample(key);
    return p.then(function (photo) {
      assignPhoto(photo);
      refreshThumbs(); syncPanelBar(); renderNow();
      setStatus('Sample loaded: ' + key);
      return photo;
    });
  }
  function removePhoto(id) {
    var ph = photoById(id);
    if (!ph) return;
    if (ph.url && ph.url.indexOf('blob:') === 0) URL.revokeObjectURL(ph.url);
    state.photos = state.photos.filter(function (p) { return p.id !== id; });
    state.panels.forEach(function (p) { if (p.photoId === id) p.photoId = null; });
    refreshThumbs(); syncPanelBar(); renderNow();
  }

  /* ---------- thumbnails ---------- */
  function refreshThumbs() {
    var box = $('#thumbs');
    box.textContent = '';
    $('#photoEmpty').style.display = state.photos.length ? 'none' : '';
    state.photos.forEach(function (ph) {
      var chip = document.createElement('div');
      chip.className = 'thumb';
      chip.title = 'Use "' + ph.name + '" in the selected panel';
      var im = document.createElement('img');
      im.src = ph.url; im.alt = ph.name;
      var nm = document.createElement('span');
      nm.className = 'tname'; nm.textContent = ph.name;
      var x = document.createElement('button');
      x.className = 'tx'; x.type = 'button'; x.textContent = '×'; x.title = 'Remove photo';
      x.addEventListener('click', function (e) { e.stopPropagation(); removePhoto(ph.id); });
      chip.addEventListener('click', function () {
        curPanel().photoId = ph.id;
        syncPanelBar(); renderNow();
        setStatus('Panel ' + (state.selected + 1) + ' → ' + ph.name);
      });
      chip.appendChild(im); chip.appendChild(nm); chip.appendChild(x);
      box.appendChild(chip);
    });
  }

  /* ---------- panel bar ---------- */
  function syncPanelBar() {
    var p = curPanel();
    var n = state.panels.length;
    $('#panelLabel').textContent = 'Panel ' + (state.selected + 1) + ' / ' + n;
    var sel = $('#panelPhoto');
    sel.textContent = '';
    var empty = document.createElement('option');
    empty.value = ''; empty.textContent = '— empty —';
    sel.appendChild(empty);
    state.photos.forEach(function (ph) {
      var o = document.createElement('option');
      o.value = String(ph.id); o.textContent = ph.name;
      sel.appendChild(o);
    });
    sel.value = p.photoId == null ? '' : String(p.photoId);
    $('#panelZoom').value = p.zoom;
    $('#zoomVal').textContent = p.zoom.toFixed(2) + '×';
    $('#panelPanX').value = p.ox;
    $('#panelPanY').value = p.oy;
    $('#flipBtn').classList.toggle('active', !!p.flip);
  }

  /* ---------- UI sync ---------- */
  function markSeg(container, attr, value) {
    var btns = container.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('active', btns[i].getAttribute(attr) === String(value));
    }
  }
  function syncUI() {
    markSeg($('#sizePicker'), 'data-size', state.size);
    markSeg($('#layoutPicker'), 'data-layout', state.layout);
    markSeg($('#framePicker'), 'data-frame', state.frame);
    markSeg($('#fontPicker'), 'data-font', state.caption.font);
    markSeg($('#fillPicker'), 'data-fill', state.caption.fill);
    markSeg($('#gradePicker'), 'data-grade', state.grade);
    $('#capTitle').value = state.caption.title;
    $('#capTag').value = state.caption.tagline;
    $('#capScale').value = state.caption.scale;
    $('#capScaleVal').textContent = state.caption.scale.toFixed(2);
    $('#capTracking').value = state.caption.tracking;
    $('#capTrackingVal').textContent = state.caption.tracking.toFixed(3);
    $('#capOutline').value = state.caption.outline;
    $('#capOutlineVal').textContent = state.caption.outline.toFixed(2);
    $('#capShadow').checked = !!state.caption.shadow;
    $('#intensity').value = state.intensity;
    $('#intensityVal').textContent = Math.round(state.intensity * 100) + '%';
    var chips = $('#presetChips').querySelectorAll('button');
    for (var i = 0; i < chips.length; i++) {
      var pr = PRESETS[parseInt(chips[i].getAttribute('data-preset'), 10)];
      chips[i].classList.toggle('active', !!pr && pr.title === state.caption.title.toUpperCase());
    }
    syncPanelBar();
  }
  function bindSeg(container, attr, cb) {
    container.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b || !container.contains(b)) return;
      cb(b.getAttribute(attr));
    });
  }

  /* ---------- controls ---------- */
  function bindControls() {
    bindSeg($('#sizePicker'), 'data-size', function (v) {
      if (SIZES.indexOf(v) === -1) return;
      state.size = v; syncUI(); renderNow();
      setStatus('Size ' + v.replace('x', '×'));
    });
    bindSeg($('#layoutPicker'), 'data-layout', function (v) {
      if (!VC.LAYOUTS[v]) return;
      state.layout = v; syncPanels(); syncUI(); renderNow();
    });
    bindSeg($('#framePicker'), 'data-frame', function (v) {
      state.frame = v; syncUI(); renderNow();
    });
    bindSeg($('#fontPicker'), 'data-font', function (v) {
      state.caption.font = v; syncUI(); renderNow();
    });
    bindSeg($('#fillPicker'), 'data-fill', function (v) {
      if (FILLS.indexOf(v) === -1) return;
      state.caption.fill = v; syncUI(); renderNow();
    });
    bindSeg($('#gradePicker'), 'data-grade', function (v) {
      if (!VC.GRADES[v]) return;
      state.grade = v; syncUI(); renderNow();
    });
    $('#presetChips').addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      var pr = PRESETS[parseInt(b.getAttribute('data-preset'), 10)];
      if (!pr) return;
      state.caption.title = pr.title;
      state.caption.tagline = pr.tag;
      syncUI(); renderNow();
    });
    $('#capTitle').addEventListener('input', function () {
      state.caption.title = this.value; syncUI(); render();
    });
    $('#capTag').addEventListener('input', function () {
      state.caption.tagline = this.value; syncUI(); render();
    });
    $('#capScale').addEventListener('input', function () {
      state.caption.scale = parseFloat(this.value);
      $('#capScaleVal').textContent = state.caption.scale.toFixed(2); render();
    });
    $('#capTracking').addEventListener('input', function () {
      state.caption.tracking = parseFloat(this.value);
      $('#capTrackingVal').textContent = state.caption.tracking.toFixed(3); render();
    });
    $('#capOutline').addEventListener('input', function () {
      state.caption.outline = parseFloat(this.value);
      $('#capOutlineVal').textContent = state.caption.outline.toFixed(2); render();
    });
    $('#capShadow').addEventListener('change', function () {
      state.caption.shadow = this.checked; render();
    });
    $('#intensity').addEventListener('input', function () {
      state.intensity = parseFloat(this.value);
      $('#intensityVal').textContent = Math.round(state.intensity * 100) + '%'; render();
    });

    $('#fileInput').addEventListener('change', function () {
      var files = Array.prototype.slice.call(this.files || []);
      var input = this;
      var chain = Promise.resolve();
      files.forEach(function (f) {
        chain = chain.then(function () {
          if (!f.type || f.type.indexOf('image/') !== 0) return;
          var url = URL.createObjectURL(f);
          return loadImage(url).then(function (img) {
            var photo = { id: ++photoSeq, name: f.name.replace(/\.[^.]+$/, ''), img: img, url: url };
            state.photos.push(photo);
            assignPhoto(photo);
          }).catch(function () {
            URL.revokeObjectURL(url);
            setStatus('Could not read ' + f.name);
          });
        });
      });
      chain.then(function () {
        input.value = '';
        refreshThumbs(); syncPanelBar(); renderNow();
        if (files.length) setStatus(files.length + ' photo' + (files.length > 1 ? 's' : '') + ' added · nothing leaves your device');
      });
    });
    $('#sample-boulevard').addEventListener('click', function () { addSample('boulevard'); });
    $('#sample-pier').addEventListener('click', function () { addSample('pier'); });

    $('#panelPhoto').addEventListener('change', function () {
      curPanel().photoId = this.value === '' ? null : parseInt(this.value, 10);
      renderNow();
    });
    $('#panelZoom').addEventListener('input', function () {
      curPanel().zoom = parseFloat(this.value);
      $('#zoomVal').textContent = curPanel().zoom.toFixed(2) + '×'; render();
    });
    $('#panelPanX').addEventListener('input', function () {
      var p = curPanel(); p.ox = parseFloat(this.value); p.auto = false; render();
    });
    $('#panelPanY').addEventListener('input', function () {
      var p = curPanel(); p.oy = parseFloat(this.value); p.auto = false; render();
    });
    $('#flipBtn').addEventListener('click', function () {
      var p = curPanel(); p.flip = !p.flip; syncPanelBar(); renderNow();
    });
    $('#resetBtn').addEventListener('click', function () {
      var p = curPanel();
      p.zoom = 1.06; p.ox = 0; p.oy = 0; p.flip = false; p.auto = true;
      syncPanelBar(); renderNow();
    });
    $('#fillAllBtn').addEventListener('click', function () {
      var src = curPanel();
      state.panels.forEach(function (p) {
        p.photoId = src.photoId; p.zoom = src.zoom; p.ox = src.ox; p.oy = src.oy;
        p.flip = src.flip; p.auto = src.auto;
      });
      renderNow();
      setStatus('Panel ' + (state.selected + 1) + ' framing used in all panels');
    });
    $('#shuffleBtn').addEventListener('click', shuffle);
    $('#exportBtn').addEventListener('click', exportPNG);

    /* ----- pointer drag: select a panel, pan its crop ----- */
    var drag = null;
    function canvasXY(e) {
      var b = preview.getBoundingClientRect();
      return [(e.clientX - b.left) * (preview.width / b.width),
              (e.clientY - b.top) * (preview.height / b.height)];
    }
    function panelAt(x, y) {
      var parts = state.size.split('x');
      var rects = VC.LAYOUTS[state.layout].rects(parseInt(parts[0], 10), parseInt(parts[1], 10));
      for (var i = 0; i < rects.length; i++) {
        var r = rects[i];
        if (x >= r[0] && x <= r[0] + r[2] && y >= r[1] && y <= r[1] + r[3]) return i;
      }
      return -1;
    }
    function overflowFor(i) {
      var p = state.panels[i];
      var ph = photoById(p.photoId);
      if (!ph) return [0, 0];
      var parts = state.size.split('x');
      var r = VC.LAYOUTS[state.layout].rects(parseInt(parts[0], 10), parseInt(parts[1], 10))[i];
      var base = Math.max(r[2] / ph.img.width, r[3] / ph.img.height);
      var s = base * p.zoom;
      return [Math.max(0, (ph.img.width * s - r[2]) / 2),
              Math.max(0, (ph.img.height * s - r[3]) / 2)];
    }
    preview.addEventListener('pointerdown', function (e) {
      var xy = canvasXY(e);
      var i = panelAt(xy[0], xy[1]);
      if (i < 0) return;
      state.selected = i;
      var p = curPanel();
      var ex = overflowFor(i);
      drag = { i: i, x0: xy[0], y0: xy[1], ox0: p.ox, oy0: p.oy, exX: ex[0], exY: ex[1], moved: false };
      preview.setPointerCapture(e.pointerId);
      preview.classList.add('dragging');
      syncPanelBar(); renderNow();
      e.preventDefault();
    });
    preview.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var xy = canvasXY(e);
      var dx = xy[0] - drag.x0, dy = xy[1] - drag.y0;
      if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 2) return;
      drag.moved = true;
      var p = state.panels[drag.i];
      p.auto = false;
      if (drag.exX > 0) p.ox = clamp(drag.ox0 + (dx / drag.exX) * (p.flip ? -1 : 1), -1, 1);
      if (drag.exY > 0) p.oy = clamp(drag.oy0 + dy / drag.exY, -1, 1);
      syncPanelBar(); render();
    });
    function endDrag() {
      if (!drag) return;
      drag = null;
      preview.classList.remove('dragging');
    }
    preview.addEventListener('pointerup', endDrag);
    preview.addEventListener('pointercancel', endDrag);
    preview.addEventListener('wheel', function (e) {
      e.preventDefault();
      var xy = canvasXY(e);
      var i = panelAt(xy[0], xy[1]);
      if (i >= 0 && i !== state.selected) { state.selected = i; syncPanelBar(); }
      var p = curPanel();
      p.zoom = clamp(p.zoom * Math.exp(-e.deltaY * 0.0012), 1, 3);
      syncPanelBar(); render();
    }, { passive: false });
  }

  /* ---------- shuffle ---------- */
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function shuffle() {
    state.layout = pick(VC.layoutOrder);
    state.grade = pick(VC.gradeOrder);
    state.intensity = Math.round((0.65 + Math.random() * 0.35) * 100) / 100;
    var pr = pick(PRESETS);
    state.caption.title = pr.title;
    state.caption.tagline = pr.tag;
    state.caption.fill = Math.random() < 2 / 3 ? 'white' : pick(['sunset', 'neon', 'gold']);
    state.frame = Math.random() < 2 / 3 ? 'black' : 'white';
    syncPanels();
    if (state.photos.length) {
      state.panels.forEach(function (p) {
        p.photoId = pick(state.photos).id;
        p.zoom = Math.round((1 + Math.random() * 1.2) * 100) / 100;
        p.ox = Math.round((Math.random() * 1.6 - 0.8) * 100) / 100;
        p.oy = Math.round((Math.random() * 1.6 - 0.8) * 100) / 100;
        p.flip = Math.random() < 0.35;
        p.auto = false;
      });
    }
    state.selected = 0;
    syncUI(); renderNow();
    setStatus('Shuffled · ' + VC.LAYOUTS[state.layout].label + ' layout · ' + VC.GRADES[state.grade].label + ' grade');
  }

  /* ---------- export ---------- */
  function exportPNG() {
    if (location.protocol === 'file:') {
      setStatus('Export needs a local server: run `node serve.ts` and open http://localhost:8080 (file:// blocks canvas export).');
      return;
    }
    var parts = state.size.split('x');
    var w = parseInt(parts[0], 10), h = parseInt(parts[1], 10);
    var c = document.createElement('canvas');
    VC.renderCover(c, state, {});
    c.toBlob(function (blob) {
      if (!blob) { setStatus('Export failed — the canvas could not be encoded.'); return; }
      VC.lastExport = blob;
      if (window.__VC) window.__VC.lastExport = blob;
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'vice-cover-' + w + 'x' + h + '.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      setStatus('Exported ' + w + '×' + h + ' PNG · ' + Math.round(blob.size / 1024) + ' KB · saved to your downloads');
    }, 'image/png');
  }

  /* ---------- query params & deterministic composition ---------- */
  function num(v, a, b, fallback) {
    var n = parseFloat(v);
    return isNaN(n) ? fallback : clamp(n, a, b);
  }
  function applyParams() {
    var q = new URLSearchParams(location.search);
    var shot = q.get('shot');
    if (shot === 'cover') document.body.classList.add('shot-cover');
    if (SIZES.indexOf(q.get('size')) !== -1) state.size = q.get('size');
    if (VC.GRADES[q.get('grade')]) state.grade = q.get('grade');
    if (q.get('intensity') != null) state.intensity = num(q.get('intensity'), 0, 1, state.intensity);
    if (q.get('frame') === 'white' || q.get('frame') === 'black') state.frame = q.get('frame');
    if (q.get('caption') != null) state.caption.title = q.get('caption');
    if (q.get('tagline') != null) state.caption.tagline = q.get('tagline');
    if (q.get('font') === 'anton' || q.get('font') === 'bebas') state.caption.font = q.get('font');
    if (FILLS.indexOf(q.get('fill')) !== -1) state.caption.fill = q.get('fill');
    if (q.get('scale') != null) state.caption.scale = num(q.get('scale'), 0.5, 1.6, 1);
    if (q.get('tracking') != null) state.caption.tracking = num(q.get('tracking'), 0, 0.12, 0.02);
    if (q.get('outline') != null) state.caption.outline = num(q.get('outline'), 0, 2, 1);
    if (VC.LAYOUTS[q.get('layout')]) state.layout = q.get('layout');
    var list = q.get('photos') || q.get('photo') || '';
    var names = list.split(',').map(function (s) { return s.trim(); })
      .filter(function (n) { return !!SAMPLES[n]; });
    return { shot: shot, names: names };
  }
  function composeDeterministic() {
    syncPanels();
    if (!state.photos.length) return;
    state.panels.forEach(function (p, i) {
      p.photoId = state.photos[i % state.photos.length].id;
      var odd = ((i + 1) % 2) === 1;      // panel numbers are 1-based
      p.flip = odd;
      p.zoom = odd ? 1.45 : 1.06;
      p.ox = 0; p.oy = 0; p.auto = true;
    });
    if (state.layout === 'grid4') {
      var p3 = state.panels[2];
      p3.zoom = 3; p3.oy = 1; p3.ox = -0.9; p3.auto = false;
      var p4 = state.panels[3];
      if (state.photos.length >= 2) { p4.zoom = 2.3; p4.oy = -0.8; p4.ox = -0.4; }
      else { p4.zoom = 1.35; p4.oy = -0.3; p4.ox = 0; }
      p4.auto = false;
    }
    if (state.layout === 'strip3') {
      var s3 = state.panels[2];
      s3.zoom = 3; s3.oy = 1; s3.ox = -0.9; s3.auto = false;
    }
    state.selected = 0;
  }

  /* ---------- boot ---------- */
  /* Startup: wires the controls, applies any ?shot= params, loads fonts and
     sample photos, then paints the first frame and signals readiness. */
  function boot() {
    bindControls();
    var params = applyParams();
    syncPanels();
    window.__VC = {
      state: state, render: renderNow, exportPNG: exportPNG, addSample: addSample,
      presets: PRESETS, lastExport: null, ready: false
    };
    var fonts = Promise.all([
      document.fonts.load('16px Anton'),
      document.fonts.load('16px "Bebas Neue"')
    ]).catch(function () {});
    var photosReady;
    if (params.names.length) {
      photosReady = Promise.all(params.names.map(loadSample));
    } else if (params.shot !== 'cover') {
      photosReady = loadSample('boulevard').then(function () {});
    } else {
      photosReady = Promise.resolve();
    }
    Promise.all([fonts, photosReady]).then(function () {
      if (params.names.length || params.shot !== 'cover') composeDeterministic();
      syncUI(); refreshThumbs(); renderNow();
      document.fonts.ready.then(function () { renderNow(); });
      window.__VC.ready = true;
      setStatus('Drag a panel to reframe it · scroll to zoom · everything stays on your device');
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { window.__shotReady = true; });
      });
    }).catch(function (err) {
      syncUI(); refreshThumbs(); renderNow();
      setStatus('Startup problem: ' + (err && err.message ? err.message : err));
      window.__shotReady = true;
    });
  }
  boot();
})();
