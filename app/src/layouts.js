/* Vice Cover — panel layouts. Each layout returns [x, y, w, h] rects in canvas pixels. */
window.VC = window.VC || {};
(function () {
  'use strict';
  var VC = window.VC;

  // Shared frame geometry: outer margin + gutter between panels.
  function dims(w, h) {
    var m = Math.round(Math.min(w, h) * 0.022);
    var g = Math.round(Math.min(w, h) * 0.016);
    return { m: m, g: g, iw: w - 2 * m, ih: h - 2 * m };
  }

  VC.LAYOUTS = {
    full: {
      label: 'Full',
      count: 1,
      rects: function (w, h) {
        return [[0, 0, w, h]];
      }
    },
    split2: {
      label: 'Split',
      count: 2,
      rects: function (w, h) {
        var d = dims(w, h);
        if (w >= h) {
          var pw = (d.iw - d.g) / 2;
          return [[d.m, d.m, pw, d.ih], [d.m + pw + d.g, d.m, pw, d.ih]];
        }
        var ph = (d.ih - d.g) / 2;
        return [[d.m, d.m, d.iw, ph], [d.m, d.m + ph + d.g, d.iw, ph]];
      }
    },
    strip3: {
      label: 'Strip',
      count: 3,
      rects: function (w, h) {
        var d = dims(w, h);
        if (h > w) {
          // Portrait: one hero panel on top, two below.
          var hh = (d.ih - d.g) * 0.58;
          var bh = d.ih - d.g - hh;
          var bw = (d.iw - d.g) / 2;
          return [
            [d.m, d.m, d.iw, hh],
            [d.m, d.m + hh + d.g, bw, bh],
            [d.m + bw + d.g, d.m + hh + d.g, bw, bh]
          ];
        }
        // Landscape / square: hero left, two stacked on the right.
        var hw = (d.iw - d.g) * 0.58;
        var rw = d.iw - d.g - hw;
        var rh = (d.ih - d.g) / 2;
        return [
          [d.m, d.m, hw, d.ih],
          [d.m + hw + d.g, d.m, rw, rh],
          [d.m + hw + d.g, d.m + rh + d.g, rw, rh]
        ];
      }
    },
    grid4: {
      label: 'Grid',
      count: 4,
      rects: function (w, h) {
        var d = dims(w, h);
        var pw = (d.iw - d.g) / 2;
        var ph = (d.ih - d.g) / 2;
        return [
          [d.m, d.m, pw, ph],
          [d.m + pw + d.g, d.m, pw, ph],
          [d.m, d.m + ph + d.g, pw, ph],
          [d.m + pw + d.g, d.m + ph + d.g, pw, ph]
        ];
      }
    }
  };

  VC.layoutOrder = ['full', 'split2', 'strip3', 'grid4'];
})();
