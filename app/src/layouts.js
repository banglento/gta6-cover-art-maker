// layouts.js — panel geometry for the four cover layouts.
// Each layout returns a list of rects [x, y, w, h] in canvas pixels for a given
// export size. Non-full-bleed layouts leave a frame margin and gutters between
// panels, the way multi-panel game posters are built.
window.VC = window.VC || {};

(function () {
  const round = Math.round;

  function metrics(w, h) {
    const m = round(Math.min(w, h) * 0.022); // outer frame margin
    const g = round(Math.min(w, h) * 0.016); // gutter between panels
    return { m, g, iw: w - m * 2, ih: h - m * 2 };
  }

  VC.LAYOUTS = {
    full: {
      label: 'Full bleed',
      count: 1,
      rects(w, h) {
        return [[0, 0, w, h]];
      },
    },

    split2: {
      label: 'Two-panel split',
      count: 2,
      rects(w, h) {
        const { m, g, iw, ih } = metrics(w, h);
        if (w >= h) {
          const pw = (iw - g) / 2;
          return [
            [m, m, pw, ih],
            [m + pw + g, m, pw, ih],
          ];
        }
        const ph = (ih - g) / 2;
        return [
          [m, m, iw, ph],
          [m, m + ph + g, iw, ph],
        ];
      },
    },

    strip3: {
      label: 'Comic strip',
      count: 3,
      rects(w, h) {
        const { m, g, iw, ih } = metrics(w, h);
        if (h > w) {
          // portrait: one hero panel on top, two below
          const ph = (ih - g) * 0.58;
          const pw = (iw - g) / 2;
          return [
            [m, m, iw, ph],
            [m, m + ph + g, pw, ih - ph - g],
            [m + pw + g, m + ph + g, pw, ih - ph - g],
          ];
        }
        // landscape / square: hero left, two stacked right
        const pw = (iw - g) * 0.58;
        const ph = (ih - g) / 2;
        return [
          [m, m, pw, ih],
          [m + pw + g, m, iw - pw - g, ph],
          [m + pw + g, m + ph + g, iw - pw - g, ph],
        ];
      },
    },

    grid4: {
      label: 'Four-panel grid',
      count: 4,
      rects(w, h) {
        const { m, g, iw, ih } = metrics(w, h);
        const pw = (iw - g) / 2;
        const ph = (ih - g) / 2;
        return [
          [m, m, pw, ph],
          [m + pw + g, m, pw, ph],
          [m, m + ph + g, pw, ph],
          [m + pw + g, m + ph + g, pw, ph],
        ];
      },
    },
  };

  VC.layoutOrder = ['full', 'split2', 'strip3', 'grid4'];
})();