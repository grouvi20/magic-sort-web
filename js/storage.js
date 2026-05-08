/* Magic Sort — local persistence (progress, settings) */
(function (window) {
  "use strict";

  var KEY = "magicSort.v1";
  var DEFAULTS = {
    progress: { lastLevel: 1, levels: {} },
    settings: { sound: true, vibrate: true, dark: true },
  };

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function load() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return clone(DEFAULTS);
      var parsed = JSON.parse(raw);
      return {
        progress: Object.assign({}, DEFAULTS.progress, parsed.progress || {}, {
          levels: Object.assign(
            {},
            DEFAULTS.progress.levels,
            (parsed.progress && parsed.progress.levels) || {},
          ),
        }),
        settings: Object.assign({}, DEFAULTS.settings, parsed.settings || {}),
      };
    } catch (e) {
      return clone(DEFAULTS);
    }
  }

  function persist(state) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      /* storage may be disabled in private mode / sandboxed iframe */
    }
  }

  var cache = load();

  var Storage = {
    all: function () {
      return cache;
    },
    getProgress: function () {
      return cache.progress;
    },
    getSettings: function () {
      return cache.settings;
    },
    saveLevelResult: function (n, result) {
      var prev = cache.progress.levels[n] || {
        stars: 0,
        bestMoves: Infinity,
        completed: false,
      };
      cache.progress.levels[n] = {
        stars: Math.max(prev.stars, result.stars || 0),
        bestMoves: Math.min(
          prev.bestMoves,
          result.moves != null ? result.moves : Infinity,
        ),
        completed: true,
      };
      cache.progress.lastLevel = Math.max(cache.progress.lastLevel, n + 1);
      persist(cache);
    },
    saveSettings: function (patch) {
      cache.settings = Object.assign({}, cache.settings, patch);
      persist(cache);
    },
    setProgress: function (patch) {
      cache.progress = Object.assign({}, cache.progress, patch);
      persist(cache);
    },
    reset: function () {
      cache = clone(DEFAULTS);
      persist(cache);
    },
  };

  window.MS = window.MS || {};
  window.MS.Storage = Storage;
})(window);
