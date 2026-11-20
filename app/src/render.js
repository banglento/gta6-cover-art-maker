// render.js — the cover renderer. Draws the panel grid, graded photos, grain
// and the poster lettering (huge slanted condensed capitals, black outline,
// white or gradient fill, tracked-out tagline). One function renders both the
// live preview and the full-size export; only the preview gets selection chrome.
window.VC = window.VC || {};

(function () {
  const FONT_STACK = { anton: '"Anton", sans-serif', bebas: '"Bebas Neue", sans-serif' };

  function photoById(state, id) {
    return state.photos.find((p) => p.id === id) || null;
  }

  // ---- tracked text helpers (manual letter-spacing so it works everywhere) ----
  function trackedWidth(ctx, text, tr) {
    let w = 0;
    for (const ch of text) w += ctx.measureText(ch).width;
    return w + tr * Math.max(0, text.length - 1);
  }

  function paintTracked(ctx, text, x, y, tr, doStroke, doFill) {
    let cx = x;
    if (doStroke) {
      for (const ch of text) {
        ctx.strokeText(ch, cx, y);
        cx += ctx.measureText(ch).width + tr;
      }
    }
    cx = x;
    if (doFill) {
      for (const ch of text) {
        ctx.fillText(ch, cx, y);
        cx += ctx.measureText(ch).width + tr;
      }
    }
  }

  // ---- photo drawing ----
  function drawPanelPhoto(ctx, img, r, panel, gradeKey, t) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const base = Math.max(r[2] / iw, r[3] / ih);
    const scale = base * panel.zoom;
    const dw = iw * scale;
    const dh = ih * scale;
    const overX = Math.max(0, (dw - r[2]) / 2);
    const overY = Math.max(0, (dh - r[3]) / 2);
    // "auto" framing biases tall photos toward the top so faces stay in wide
    // panels (positive oy moves the visible window up the source photo).
    let ox = panel.ox;
    let oy = panel.oy;
    if (panel.auto) {
      ox = 0;
      oy = overY > 0 && r[2] / r[3] > (iw / ih) * 1.25 ? 0.75 : 0;
    }
    const dx = r[0] + (r[2] - dw) / 2 + ox * overX;
    const dy = r[1] + (r[3] - dh) / 2 + oy * overY;

    ctx.save();
    ctx.beginPath();
    ctx.rect(r[0], r[1], r[2], r[3]);
    ctx.clip();
    if (panel.flip) {
      ctx.translate(r[0] + r[2] / 2, 0);
      ctx.scale(-1, 1);
      ctx.translate(-(r[0] + r[2] / 2), 0);
    }
    const grade = VC.GRADES[gradeKey] || VC.GRADES.sunset;
    ctx.filter = grade.filter(t);
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.filter = 'none';
    grade.overlays(ctx, r, t);
    VC.vignette(ctx, r, t);
    ctx.restore();
  }

  function drawPlaceholder(ctx, r) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(r[0], r[1], r[2], r[3]);
    ctx.clip();
    const g = ctx.createLinearGradient(r[0], r[1], r[0] + r[2], r[1] + r[3]);
    g.addColorStop(0, '#221436');
    g.addColorStop(1, '#150c24');
    ctx.fillStyle = g;
    ctx.fillRect(r[0], r[1], r[2], r[3]);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = Math.max(2, r[2] * 0.004);
    for (let x = r[0] - r[3]; x < r[0] + r[2]; x += r[2] * 0.08) {
      ctx.beginPath();
      ctx.moveTo(x, r[1] + r[3]);
      ctx.lineTo(x + r[3], r[1]);
      ctx.stroke();
    }
    const fs = Math.max(16, Math.min(r[2], r[3]) * 0.07);
    ctx.font = `${fs}px ${FONT_STACK.bebas}`;
    ctx.fillStyle = 'rgba(240,230,255,0.4)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ADD A PHOTO', r[0] + r[2] / 2, r[1] + r[3] / 2);
    ctx.restore();
  }

  // ---- lettering ----
  function titleFill(ctx, c, size) {
    if (c.fill === 'sunset') {
      const g = ctx.createLinearGradient(0, -size * 0.82, 0, size * 0.04);
      g.addColorStop(0, '#ffc93d');
      g.addColorStop(0.5, '#ff8a3d');
      g.addColorStop(1, '#ff2e88');
      return g;
    }
    if (c.fill === 'neon') {
      const g = ctx.createLinearGradient(0, -size * 0.82, 0, size * 0.04);
      g.addColorStop(0, '#8ff6ff');
      g.addColorStop(1, '#ff4fd8');
      return g;
    }
    if (c.fill === 'gold') {
      const g = ctx.createLinearGradient(0, -size * 0.82, 0, size * 0.04);
      g.addColorStop(0, '#fff3b0');
      g.addColorStop(1, '#ffb03a');
      return g;
    }
    return '#ffffff';
  }

  function drawLettering(ctx, w, h, state, frameMargin) {
    const c = state.caption;
    const title = (c.title || '').toUpperCase();
    const tag = (c.subtitle || '').toUpperCase();
    if (!title && !tag) return;

    const base = Math.min(w, h);
    const maxW = w * 0.88;
    let size = base * 0.165 * c.scale;
    const tr = c.tracking * size;
    ctx.font = `${size}px ${FONT_STACK[c.font] || FONT_STACK.anton}`;
    if (title) {
      const tw = trackedWidth(ctx, title, tr);
      if (tw > maxW) {
        size *= maxW / tw;
        ctx.font = `${size}px ${FONT_STACK[c.font] || FONT_STACK.anton}`;
      }
    }
    const finalTr = c.tracking * size;
    const bottomPad = Math.max(frameMargin, h * 0.048);
    const baseline = h - bottomPad;
    const slant = 0.12;

    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;

    if (title) {
      const tw = trackedWidth(ctx, title, finalTr);
      ctx.save();
      ctx.translate(w / 2, baseline);
      ctx.transform(1, 0, -slant, 1, 0, 0);
      const x = -tw / 2;
      // hard poster shadow
      if (c.shadow) {
        const off = size * 0.05;
        ctx.fillStyle = 'rgba(5,1,14,0.55)';
        paintTracked(ctx, title, x + off, off, finalTr, false, true);
      }
      // black outline, then fill
      if (c.outline > 0) {
        ctx.lineWidth = size * 0.105 * c.outline;
        ctx.strokeStyle = '#0a0614';
        paintTracked(ctx, title, x, 0, finalTr, true, false);
      }
      ctx.fillStyle = titleFill(ctx, c, size);
      paintTracked(ctx, title, x, 0, finalTr, false, true);
      ctx.restore();
    }

    if (tag) {
      const ts = Math.max(13, size * 0.24);
      const ttr = ts * 0.34;
      ctx.font = `${ts}px ${FONT_STACK.bebas}`;
      const ttw = trackedWidth(ctx, tag, ttr);
      const tagBaseline = title ? baseline - size * 0.98 : baseline;
      ctx.save();
      ctx.translate(w / 2, tagBaseline);
      ctx.transform(1, 0, -slant, 1, 0, 0);
      const x = -ttw / 2;
      if (c.outline > 0) {
        ctx.lineWidth = ts * 0.24 * Math.min(1, c.outline);
        ctx.strokeStyle = '#0a0614';
        paintTracked(ctx, tag, x, 0, ttr, true, false);
      }
      ctx.fillStyle = '#ffffff';
      paintTracked(ctx, tag, x, 0, ttr, false, true);
      ctx.restore();
    }
    ctx.restore();
  }

  // ---- main entry ----
  // opts: { preview: bool } — preview draws the selected-panel highlight.
  VC.renderCover = function (canvas, state, opts) {
    opts = opts || {};
    const [w, h] = state.size.split('x').map(Number);
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    const ctx = canvas.getContext('2d');
    const layout = VC.LAYOUTS[state.layout] || VC.LAYOUTS.full;
    const rects = layout.rects(w, h);
    const t = state.intensity;
    const frameMargin = state.layout === 'full' ? 0 : Math.round(Math.min(w, h) * 0.022);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
    ctx.fillStyle = state.frame === 'white' ? '#f4eee2' : '#0b0714';
    ctx.fillRect(0, 0, w, h);

    rects.forEach((r, i) => {
      const panel = state.panels[i];
      const photo = panel ? photoById(state, panel.photoId) : null;
      if (photo && photo.img && photo.img.complete && photo.img.naturalWidth > 0) {
        drawPanelPhoto(ctx, photo.img, r, panel, state.grade, t);
      } else {
        drawPlaceholder(ctx, r);
      }
    });

    VC.grain(ctx, w, h, t);
    // bottom scrim so the lettering always reads, even over pale photos;
    // clipped to each panel so frame margins and gutters stay clean
    if ((state.caption.title || '').trim() || (state.caption.subtitle || '').trim()) {
      const scrim = ctx.createLinearGradient(0, h * 0.58, 0, h);
      scrim.addColorStop(0, 'rgba(6,1,16,0)');
      scrim.addColorStop(1, 'rgba(6,1,16,0.66)');
      ctx.save();
      ctx.beginPath();
      for (const r of rects) ctx.rect(r[0], r[1], r[2], r[3]);
      ctx.clip();
      ctx.fillStyle = scrim;
      ctx.fillRect(0, h * 0.58, w, h * 0.42);
      ctx.restore();
    }
    drawLettering(ctx, w, h, state, frameMargin);

    if (opts.preview && rects.length > 1) {
      const r = rects[Math.min(state.selected, rects.length - 1)];
      if (r) {
        ctx.save();
        ctx.strokeStyle = '#ff3d81';
        ctx.lineWidth = Math.max(3, w * 0.0025);
        ctx.setLineDash([ctx.lineWidth * 3, ctx.lineWidth * 2]);
        ctx.strokeRect(r[0] + ctx.lineWidth / 2, r[1] + ctx.lineWidth / 2, r[2] - ctx.lineWidth, r[3] - ctx.lineWidth);
        ctx.setLineDash([]);
        const chip = Math.max(22, w * 0.022);
        ctx.fillStyle = '#ff3d81';
        ctx.fillRect(r[0], r[1], chip * 1.35, chip);
        ctx.fillStyle = '#fff';
        ctx.font = `${chip * 0.68}px ${FONT_STACK.anton}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(state.selected + 1), r[0] + chip * 0.675, r[1] + chip * 0.54);
        ctx.restore();
      }
    }
    return rects;
  };
})();