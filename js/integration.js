/* Magic Sort — host integration via `postMessage`.
 *
 * Outgoing events to parent window (host page / mobile WebView shell):
 *   { source: "magic-sort", type, payload }
 *
 * Types:
 *   ready          — engine is loaded
 *   levelStart     — { id }
 *   levelComplete  — { id, moves, stars, bestMoves }
 *   levelFail      — { id, moves, reason }
 *   move           — { id, src, dst, moves }
 *   progress       — { lastLevel, levels }
 *
 * Incoming messages (from parent → game):
 *   { target: "magic-sort", type, payload }
 *
 * Types:
 *   startLevel     — { id }       jump to specific level
 *   showMenu       — go back to menu
 *   resetProgress  — wipe all local progress
 *   setSettings    — { sound, vibrate, dark }
 */
(function (window) {
  "use strict";

  var NS = "magic-sort";
  var listeners = [];

  function emit(type, payload) {
    var msg = { source: NS, type: type, payload: payload || {} };
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(msg, "*");
      }
    } catch (e) {
      /* sandboxed: ignore */
    }
    try {
      window.dispatchEvent(
        new CustomEvent("magicSort:" + type, { detail: msg }),
      );
    } catch (e) {
      /* very old browser */
    }
  }

  function listen(handler) {
    listeners.push(handler);
  }

  window.addEventListener("message", function (e) {
    var data = e && e.data;
    if (!data || typeof data !== "object") return;
    if (data.target !== NS) return;
    for (var i = 0; i < listeners.length; i++) {
      try {
        listeners[i](data);
      } catch (err) {
        /* don't let one listener kill the rest */
      }
    }
  });

  window.MS = window.MS || {};
  window.MS.Integration = { emit: emit, listen: listen, NS: NS };
})(window);
