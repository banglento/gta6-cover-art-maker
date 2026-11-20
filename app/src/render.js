/* Vice Cover — cover renderer. One function draws both the live preview and the
   full-size export; only the preview gets selection chrome. Classic script, window.VC. */
window.VC = window.VC || {};
(function () {
  'use strict';
  var VC = window.VC;

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  function drawPlaceholder(ctx, r) {
    var x = r[0], y = r[1], w = r[2], h = r[3];
    ctx.fillStyle = '#180f2b';
    ctx.fillRect(x, y, w, h);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.strokeStyle = 'rgba(255,61,129,0.10)';
    ctx.lineWidth = Math.max(6, Math.min(w, h) * 0.045);
    var step = Math.max(30, Math.min(w, h) * 0.17);
    ctx.beginPath();
    for (var i = -h; i < w + h; i += step) {
      ctx.moveTo(x + i, y + h);
      ctx.lineTo(x + i + h, y);
    }
    ctx.stroke();
    var fs = Math.max(15, Math.min(w, h) * 0.085);
    ctx.font = fs + 'px "Bebas Neue", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(164,147,196,0.8)';
    ctx.fillText('ADD A PHOTO', x + w / 2, y + h / 2);
    ctx.restore();
  }

  // Draw one panel: cover-fit photo with zoom / pan / flip, then grade + vignette.
  function drawPanel(ctx, r, photo, p, grade, t) {
    var x = r[0], y = r[1], w = r[2], h = r[3];
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    if (photo && photo.img) {
      var img = photo.img;
      var base = Math.max(w / img.width, h / img.height);
      var s = base * (p.zoom || 1);
      var dw = img.width * s, dh = img.height * s;
      var exX = Math.max(0, (dw - w) / 2);   // half the horizontal overflow
      var exY = Math.max(0, (dh - h) / 2);   // half the vertical overflow
      var ox = clamp(p.ox || 0, -1, 1);
      var oy = clamp(p.oy || 0, -1, 1);
      // Auto framing: bias toward the top where heads live — both when the panel
      // is much wider than the photo, and when a taller photo overflows vertically.
      if (p.auto) {
        if (w / h > (img.width / img.height) * 1.25) oy = 0.75;
        else if (img.height / img.width > h / w && exY > 0) oy = 0.75;
      }
      ctx.save();
      ctx.filter = grade.filter(t);
      ctx.translate(x, y);
      if (p.flip) { ctx.translate(w, 0); ctx.scale(-1, 1); }
      ctx.drawImage(img, -exX + ox * exX, -exY + oy * exY, dw, dh);
      ctx.restore();
      grade.overlays(ctx, r, t);
      VC.vignette(ctx, r, t);
    } else {
      drawPlaceholder(ctx, r);
    }
    ctx.restore();
  }

  // Manual per-character tracking so letter spacing works in every browser.
  function trackedWidth(ctx, text, tracking) {
    var sum = 0;
    for (var i = 0; i < text.length; i++) sum += ctx.measureText(text[i]).width;
    return sum + tracking * Math.max(0, text.length - 1);
  }
  function drawTracked(ctx, text, x, y, tracking, stroke) {
    var cx = x;
    for (var i = 0; i < text.length; i++) {
      if (stroke) ctx.strokeText(text[i], cx, y);
      else ctx.fillText(text[i], cx, y);
      cx += ctx.measureText(text[i]).width + tracking;
    }
  }

  function fillFor(ctx, cap, top, bottom) {
    if (cap.fill === 'sunset') {
      var gs = ctx.createLinearGradient(0, top, 0, bottom);
      gs.addColorStop(0, '#ffc93d');
      gs.addColorStop(0.5, '#ff8a3d');
      gs.addColorStop(1, '#ff2e88');
      return gs;
    }
    if (cap.fill === 'neon') {
      var gn = ctx.createLinearGradient(0, top, 0, bottom);
      gn.addColorStop(0, '#8ff6ff');
      gn.addColorStop(1, '#ff4fd8');
      return gn;
    }
    if (cap.fill === 'gold') {
      var gg = ctx.createLinearGradient(0, top, 0, bottom);
      gg.addColorStop(0, '#fff3b0');
      gg.addColorStop(1, '#ffb03a');
      return gg;
    }
    return '#ffffff';
  }

  function drawLettering(ctx, w, h, state) {
    var cap = state.caption;
    var title = (cap.title || '').toUpperCase();
    var tag = (cap.tagline || '').toUpperCase();
    if (!title && !tag) return;

    var family = cap.font === 'bebas' ? '"Bebas Neue"' : 'Anton';
    var size = Math.min(w, h) * 0.165 * (cap.scale || 1);
    var maxW = w * 0.88;
    var m = Math.round(Math.min(w, h) * 0.022);
    var baseline = h - Math.max(m, h * 0.048);
    var outline = cap.outline == null ? 1 : cap.outline;

    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;

    // Fit the title to the poster width.
    ctx.font = size + 'px ' + family + ', sans-serif';
    var trk = (cap.tracking || 0) * size;
    if (title) {
      var tw = trackedWidth(ctx, title, trk);
      if (tw > maxW) {
        size *= maxW / tw;
        ctx.font = size + 'px ' + family + ', sans-serif';
      }
    }
    trk = (cap.tracking || 0) * size;
    var titleW = title ? trackedWidth(ctx, title, trk) : 0;
    var titleX = (w - titleW) / 2;

    // Slant the whole lettering block (-0.12 shear pivoting on the title baseline).
    ctx.translate(0, baseline);
    ctx.transform(1, 0, -0.12, 1, 0, 0);
    ctx.translate(0, -baseline);

    var ts = size * 0.24;
    var ttrk = 0.34 * ts;
    var tagY = baseline - size;
    var titleFont = size + 'px ' + family + ', sans-serif';
    var tagFont = ts + 'px "Bebas Neue", sans-serif';
    ctx.font = tagFont;
    var tagW = tag ? trackedWidth(ctx, tag, ttrk) : 0;
    var tagX = (w - tagW) / 2;

    var off = size * 0.05;
    var capTop = baseline - size * 0.78;

    // Hard poster shadow.
    if (cap.shadow) {
      ctx.fillStyle = 'rgba(5,1,14,0.55)';
      if (tag) { ctx.font = tagFont; drawTracked(ctx, tag, tagX + off, tagY + off, ttrk, false); }
      if (title) { ctx.font = titleFont; drawTracked(ctx, title, titleX + off, baseline + off, trk, false); }
    }

    // Tagline: thin outline + fill.
    if (tag) {
      ctx.font = tagFont;
      if (outline > 0) {
        ctx.strokeStyle = '#0a0614';
        ctx.lineWidth = ts * 0.24 * Math.min(1, outline);
        drawTracked(ctx, tag, tagX, tagY, ttrk, true);
      }
      ctx.fillStyle = fillFor(ctx, cap, tagY - ts * 0.78, tagY);
      drawTracked(ctx, tag, tagX, tagY, ttrk, false);
    }

    // Title: heavy outline + fill (always at the full title size and face).
    if (title) {
      ctx.font = titleFont;
      if (outline > 0) {
        ctx.strokeStyle = '#0a0614';
        ctx.lineWidth = size * 0.105 * outline;
        drawTracked(ctx, title, titleX, baseline, trk, true);
      }
      ctx.fillStyle = fillFor(ctx, cap, capTop, baseline);
      drawTracked(ctx, title, titleX, baseline, trk, false);
    }
    ctx.restore();
  }

  VC.renderCover = function (canvas, state, opts) {
    opts = opts || {};
    var parts = state.size.split('x');
    var w = parseInt(parts[0], 10), h = parseInt(parts[1], 10);
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    var ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';

    var layout = VC.LAYOUTS[state.layout] || VC.LAYOUTS.full;
    var rects = layout.rects(w, h);
    var grade = VC.GRADES[state.grade] || VC.GRADES.sunset;
    var t = state.intensity == null ? 0.8 : state.intensity;

    // Frame colour behind the panels.
    ctx.fillStyle = state.frame === 'white' ? '#f4eee2' : '#0b0714';
    ctx.fillRect(0, 0, w, h);

    for (var i = 0; i < rects.length; i++) {
      var p = state.panels[i] || {};
      var photo = null;
      if (p.photoId != null) {
        for (var j = 0; j < state.photos.length; j++) {
          if (state.photos[j].id === p.photoId) { photo = state.photos[j]; break; }
        }
      }
      drawPanel(ctx, rects[i], photo, p, grade, t);
    }

    // Film grain over the whole canvas.
    VC.grain(ctx, w, h, t);

    var cap = state.caption || {};
    var hasCap = (cap.title && cap.title.trim()) || (cap.tagline && cap.tagline.trim());
    if (hasCap) {
      // Bottom scrim, clipped to the panels so frame margins stay clean.
      ctx.save();
      ctx.beginPath();
      for (var k = 0; k < rects.length; k++) {
        ctx.rect(rects[k][0], rects[k][1], rects[k][2], rects[k][3]);
      }
      ctx.clip();
      var g = ctx.createLinearGradient(0, h * 0.58, 0, h);
      g.addColorStop(0, 'rgba(6,1,16,0)');
      g.addColorStop(1, 'rgba(6,1,16,0.66)');
      ctx.fillStyle = g;
      ctx.fillRect(0, h * 0.58, w, h * 0.42);
      ctx.restore();
      drawLettering(ctx, w, h, state);
    }

    // Selection chrome — live preview only.
    if (opts.preview && rects.length > 1) {
      var sel = clamp(state.selected || 0, 0, rects.length - 1);
      var r = rects[sel];
      ctx.save();
      var lw = Math.max(3, Math.min(w, h) * 0.006);
      ctx.strokeStyle = '#ff3d81';
      ctx.lineWidth = lw;
      ctx.setLineDash([lw * 3, lw * 2]);
      ctx.strokeRect(r[0] + lw / 2, r[1] + lw / 2, r[2] - lw, r[3] - lw);
      ctx.setLineDash([]);
      var cs = Math.max(26, Math.min(w, h) * 0.055);
      var cx = r[0] + cs * 0.75, cy = r[1] + cs * 0.75;
      ctx.fillStyle = '#ff3d81';
      ctx.beginPath();
      ctx.arc(cx, cy, cs * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = (cs * 0.62) + 'px "Bebas Neue", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(sel + 1), cx, cy + cs * 0.04);
      ctx.restore();
    }
  };
})();
