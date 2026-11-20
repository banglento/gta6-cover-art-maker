/* Vice Cover — colour grades. Canvas-filter + composite-overlay presets, vignette and film grain.
   t is the intensity, 0..1. Overlays are clipped to the panel rect by the renderer. */
window.VC = window.VC || {};
(function () {
  'use strict';
  var VC = window.VC;

  function vGrad(ctx, r, stops) {
    var g = ctx.createLinearGradient(r[0], r[1], r[0], r[1] + r[3]);
    for (var i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]);
    return g;
  }
  function fillRect(ctx, r) { ctx.fillRect(r[0], r[1], r[2], r[3]); }

  VC.GRADES = {
    sunset: {
      label: 'Sunset',
      filter: function (t) {
        return 'saturate(' + (1 + 0.7 * t) + ') contrast(' + (1 + 0.3 * t) + ') brightness(' + (1 + 0.03 * t) + ')';
      },
      overlays: function (ctx, r, t) {
        ctx.save();
        // Warm sky-to-street wash.
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = vGrad(ctx, r, [
          [0, 'rgba(255,176,58,' + (0.75 * t) + ')'],
          [0.55, 'rgba(255,106,61,' + (0.5 * t) + ')'],
          [1, 'rgba(255,45,120,' + (0.6 * t) + ')']
        ]);
        fillRect(ctx, r);
        // Golden sun glow from the top-left corner.
        ctx.globalCompositeOperation = 'screen';
        var cx = r[0] + r[2] * 0.18, cy = r[1] + r[3] * 0.12;
        var rad = Math.max(r[2], r[3]) * 0.9;
        var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
        g.addColorStop(0, 'rgba(255,224,130,' + (0.45 * t) + ')');
        g.addColorStop(1, 'rgba(255,224,130,0)');
        ctx.fillStyle = g;
        fillRect(ctx, r);
        // Warm multiply + hue cast to unify the panel.
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = 'rgba(255,140,70,' + (0.24 * t) + ')';
        fillRect(ctx, r);
        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = 'rgba(255,110,40,' + (0.58 * t) + ')';
        fillRect(ctx, r);
        ctx.restore();
      }
    },

    neon: {
      label: 'Neon',
      filter: function (t) {
        return 'saturate(' + (1 + 0.8 * t) + ') contrast(' + (1 + 0.5 * t) + ') brightness(' + (1 - 0.38 * t) + ')';
      },
      overlays: function (ctx, r, t) {
        ctx.save();
        // Deep dusk base.
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = vGrad(ctx, r, [
          [0, 'rgba(20,10,64,' + (0.8 * t) + ')'],
          [1, 'rgba(64,6,76,' + (0.65 * t) + ')']
        ]);
        fillRect(ctx, r);
        // Cyan-to-magenta neon sweep.
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = vGrad(ctx, r, [
          [0, 'rgba(0,230,255,' + (0.22 * t) + ')'],
          [0.5, 'rgba(90,60,255,' + (0.06 * t) + ')'],
          [1, 'rgba(255,0,200,' + (0.26 * t) + ')']
        ]);
        fillRect(ctx, r);
        // Hot pink rim rising from the bottom edge.
        ctx.globalCompositeOperation = 'overlay';
        var g = ctx.createLinearGradient(r[0], r[1] + r[3], r[0], r[1] + r[3] * 0.45);
        g.addColorStop(0, 'rgba(255,40,200,' + (0.15 * t) + ')');
        g.addColorStop(1, 'rgba(255,40,200,0)');
        ctx.fillStyle = g;
        fillRect(ctx, r);
        ctx.restore();
      }
    },

    vice: {
      label: 'Vice City',
      filter: function (t) {
        return 'saturate(' + (1 + 0.4 * t) + ') contrast(' + (1 + 0.2 * t) + ')';
      },
      overlays: function (ctx, r, t) {
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = 'rgba(255,130,50,' + (0.26 * t) + ')';
        fillRect(ctx, r);
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = vGrad(ctx, r, [
          [0, 'rgba(255,160,70,' + (0.2 * t) + ')'],
          [1, 'rgba(255,90,120,' + (0.06 * t) + ')']
        ]);
        fillRect(ctx, r);
        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = 'rgba(255,140,60,' + (0.14 * t) + ')';
        fillRect(ctx, r);
        // LAST: teal shadow lift — the signature Vice City split-tone.
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = 'rgba(20,120,140,' + (0.62 * t) + ')';
        fillRect(ctx, r);
        ctx.restore();
      }
    }
  };

  VC.gradeOrder = ['sunset', 'neon', 'vice'];

  VC.vignette = function (ctx, r, t) {
    var cx = r[0] + r[2] / 2, cy = r[1] + r[3] / 2;
    var rad = Math.max(r[2], r[3]) * 0.78;
    var g = ctx.createRadialGradient(cx, cy, rad * 0.32, cx, cy, rad);
    g.addColorStop(0, 'rgba(6,1,18,0)');
    g.addColorStop(1, 'rgba(6,1,18,' + (0.55 * t) + ')');
    ctx.save();
    ctx.fillStyle = g;
    fillRect(ctx, r);
    ctx.restore();
  };

  // Deterministic 160x160 grain tile (seeded LCG), cached and drawn as a repeating
  // pattern — no per-pixel loops on the main canvas, so the live preview stays fast.
  var grainTile = null;
  function makeGrainTile() {
    var c = document.createElement('canvas');
    c.width = 160; c.height = 160;
    var x = c.getContext('2d');
    var id = x.createImageData(160, 160);
    var s = 1337 >>> 0;
    function rnd() {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    }
    for (var i = 0; i < id.data.length; i += 4) {
      var v = Math.round(90 + rnd() * 110);
      id.data[i] = v; id.data[i + 1] = v; id.data[i + 2] = v; id.data[i + 3] = 255;
    }
    x.putImageData(id, 0, 0);
    return c;
  }

  VC.grain = function (ctx, w, h, t) {
    if (!grainTile) grainTile = makeGrainTile();
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.035 + 0.025 * t;
    ctx.fillStyle = ctx.createPattern(grainTile, 'repeat');
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  };
})();
