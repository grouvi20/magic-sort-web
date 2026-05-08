/* Magic Sort — input wiring.
 *
 * Tap-to-tap interaction (click on tube A, then click on tube B). This works
 * identically with mouse and touch and is much more accessible on small
 * screens than drag-and-drop. We also support a tiny drag fallback so users
 * who *do* drag get reasonable behavior.
 */
(function (window) {
  "use strict";

  function attach(onTubeTap) {
    var root = document.getElementById("tubes");
    if (!root) return;

    var dragging = null;

    root.addEventListener("pointerdown", function (e) {
      var t = e.target.closest(".tube");
      if (!t) return;
      dragging = {
        idx: Number(t.dataset.idx),
        x: e.clientX,
        y: e.clientY,
        moved: false,
      };
    });

    root.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      if (Math.hypot(e.clientX - dragging.x, e.clientY - dragging.y) > 10) {
        dragging.moved = true;
      }
    });

    root.addEventListener("pointerup", function (e) {
      if (!dragging) return;
      var d = dragging;
      dragging = null;
      var endTube = document.elementFromPoint(e.clientX, e.clientY);
      if (endTube) endTube = endTube.closest(".tube");
      if (d.moved && endTube) {
        var dstIdx = Number(endTube.dataset.idx);
        if (dstIdx !== d.idx) {
          onTubeTap(d.idx);
          onTubeTap(dstIdx);
          return;
        }
      }
      onTubeTap(d.idx);
    });

    root.addEventListener("pointercancel", function () {
      dragging = null;
    });
  }

  window.MS = window.MS || {};
  window.MS.Input = { attach: attach };
})(window);
