// grade.js — canvas colour grading: per-panel filter + composite overlays,
// vignette and a deterministic film-grain pass. Three presets (sunset, neon,
// vice city) scaled by an intensity value t in [0, 1]. No per-pixel loops, so
// live preview stays fast even at 1920x1080.
window.VC = window.VC || {};

(function () {
  function lin(ctx, r, x0, y0, x1, y1, stops) {
    const g = ctx.createLinearGradient(r[0] + x0 * r[2], r[1] + y0 * r[3], r[0] + x1 * r[2], r[1] + y1 * r[3]);
    for (const [o, c] of stops) g.addColorStop(o, c);
    return g;
  }

  function pass(ctx, r, comp, style) {
    ctx.globalCompositeOperation = comp;
    ctx.fillStyle = style;
    ctx.fillRect(r[0], r[1], r[2], r[3]);
    ctx.globalCompositeOperation = 'source-over';
  }

  VC.GRADES = {
    sunset: {
      label: 'Sunset',
      filter: (t) => `saturate(${1 + 0.7 * t}) contrast(${1 + 0.3 * t}) brightness(${1 + 0.03 * t})`,
      overlays(ctx, r, t) {
        if (t <= 0) return;
        // warm sky-to-street gradient, punched in with overlay
        pass(ctx, r, 'overlay', lin(ctx, r, 0, 0, 0, 1, [
          [0, `rgba(255,176,58,${0.75 * t})`],
          [0.55, `rgba(255,106,61,${0.5 * t})`],
          [1, `rgba(255,45,120,${0.6 * t})`],
        ]));
        // golden glow from the top-left, like a low sun
        const g = ctx.createRadialGradient(
          r[0] + r[2] * 0.18, r[1] + r[3] * 0.12, 0,
          r[0] + r[2] * 0.18, r[1] + r[3] * 0.12, Math.max(r[2], r[3]) * 0.9,
        );
        g.addColorStop(0, `rgba(255,224,130,${0.45 * t})`);
        g.addColorStop(1, 'rgba(255,224,130,0)');
        pass(ctx, r, 'screen', g);
        // warm multiply to tie shadows together
        pass(ctx, r, 'multiply', `rgba(255,140,70,${0.24 * t})`);
        // hue-unifying cast so cool source photos join the sunset palette
        pass(ctx, r, 'color', `rgba(255,110,40,${0.58 * t})`);
      },
    },

    neon: {
      label: 'Neon',
      // night first: darken hard, then let the cyan/magenta accents glow
      filter: (t) => `saturate(${1 + 0.8 * t}) contrast(${1 + 0.5 * t}) brightness(${1 - 0.38 * t})`,
      overlays(ctx, r, t) {
        if (t <= 0) return;
        // deep dusk base
        pass(ctx, r, 'multiply', lin(ctx, r, 0, 0, 0, 1, [
          [0, `rgba(20,10,64,${0.8 * t})`],
          [1, `rgba(64,6,76,${0.65 * t})`],
        ]));
        // glowing cyan sky / magenta street against the dark base — kept
        // subtle so the screen blend doesn't lift the night back to midtones
        pass(ctx, r, 'screen', lin(ctx, r, 0, 0, 0.25, 1, [
          [0, `rgba(0,230,255,${0.22 * t})`],
          [0.5, `rgba(90,60,255,${0.06 * t})`],
          [1, `rgba(255,0,200,${0.26 * t})`],
        ]));
        // hot pink rim from the bottom edge
        pass(ctx, r, 'overlay', lin(ctx, r, 0, 1, 0, 0.55, [
          [0, `rgba(255,40,200,${0.15 * t})`],
          [1, 'rgba(255,40,200,0)'],
        ]));
      },
    },

    vice: {
      label: 'Vice City',
      filter: (t) => `saturate(${1 + 0.4 * t}) contrast(${1 + 0.2 * t})`,
      overlays(ctx, r, t) {
        if (t <= 0) return;
        // warm the midtones and highlights first
        pass(ctx, r, 'overlay', `rgba(255,130,50,${0.26 * t})`);
        pass(ctx, r, 'screen', lin(ctx, r, 0, 0, 0, 1, [
          [0, `rgba(255,160,70,${0.2 * t})`],
          [1, `rgba(255,90,120,${0.06 * t})`],
        ]));
        pass(ctx, r, 'color', `rgba(255,140,60,${0.14 * t})`);
        // then lift the shadows toward teal LAST so the warm passes can't
        // cancel it (screen adds light, so dark pixels go visibly teal)
        pass(ctx, r, 'screen', `rgba(20,120,140,${0.62 * t})`);
      },
    },
  };

  VC.gradeOrder = ['sunset', 'neon', 'vice'];

  // Per-panel vignette, scaled by intensity.
  VC.vignette = function (ctx, r, t) {
    const cx = r[0] + r[2] / 2;
    const cy = r[1] + r[3] / 2;
    const rad = Math.max(r[2], r[3]) * 0.78;
    const g = ctx.createRadialGradient(cx, cy, rad * 0.32, cx, cy, rad);
    g.addColorStop(0, 'rgba(6,1,18,0)');
    g.addColorStop(1, `rgba(6,1,18,${0.55 * t})`);
    ctx.fillStyle = g;
    ctx.fillRect(r[0], r[1], r[2], r[3]);
  };

  // Deterministic grain tile (seeded PRNG so screenshots reproduce exactly).
  let grainCanvas = null;
  function grainTile() {
    if (grainCanvas) return grainCanvas;
    const c = document.createElement('canvas');
    c.width = 160;
    c.height = 160;
    const g = c.getContext('2d');
    const img = g.createImageData(160, 160);
    let seed = 1337;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 90 + rnd() * 110;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    grainCanvas = c;
    return c;
  }

  VC.grain = function (ctx, w, h, t) {
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.035 + 0.025 * t;
    ctx.fillStyle = ctx.createPattern(grainTile(), 'repeat');
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  };
})();