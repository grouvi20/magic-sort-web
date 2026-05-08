/* Magic Sort — level generation.
 *
 * Each level is uniquely seeded by its number. We build the initial board
 * by:
 *   1. Creating a flat list of `colors * capacity` balls and shuffling it
 *      with Fisher–Yates.
 *   2. Distributing the shuffled list into `colors` filled tubes.
 *   3. Adding `empty` empty tubes.
 *   4. Rejecting shuffles that look already-sorted / trivial and reshuffling
 *      with a different seed.
 *
 * Random shuffles with 2 empty tubes and capacity 4 are solvable in
 * practice in the vast majority of cases; we accept the small risk of an
 * unsolvable seed in exchange for a simple, fast generator. Players have
 * Hint, Undo and Restart available at any time.
 *
 * A level definition produced by `generate(n)`:
 *   {
 *     id, colors, capacity, empty,
 *     tubes:     Ball[][]      bottom -> top
 *     locked:    number[]      indices of tubes that start locked
 *     moveLimit: number | null
 *   }
 *  Ball: { c: number, h: boolean }
 */
(function (window) {
  "use strict";

  var COLOR_COUNT = 10;

  function mulberry32(a) {
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function ball(c, h) {
    return { c: c, h: !!h };
  }

  function paramsForLevel(n) {
    var colors;
    var empty = 2;
    var capacity = 4;

    if (n <= 3) colors = 3;
    else if (n <= 7) colors = 4;
    else if (n <= 12) colors = 5;
    else if (n <= 18) colors = 6;
    else if (n <= 25) colors = 7;
    else if (n <= 32) colors = 8;
    else if (n <= 40) colors = 9;
    else colors = Math.min(COLOR_COUNT, 9 + Math.floor((n - 40) / 8));

    if (n >= 50) capacity = 5;

    var features = {
      hidden: n >= 8 && n % 4 === 0,
      lock: n >= 12 && n % 5 === 0,
      moveLimit: n >= 18 && n % 6 === 0,
    };

    return { colors: colors, empty: empty, capacity: capacity, features: features };
  }

  function shuffleAllBalls(colors, capacity, rng) {
    var flat = [];
    for (var c = 0; c < colors; c++) {
      for (var i = 0; i < capacity; i++) flat.push(c);
    }
    for (var k = flat.length - 1; k > 0; k--) {
      var j = Math.floor(rng() * (k + 1));
      var tmp = flat[k];
      flat[k] = flat[j];
      flat[j] = tmp;
    }
    var tubes = [];
    for (var t = 0; t < colors; t++) {
      var tube = [];
      for (var p = 0; p < capacity; p++) {
        tube.push(ball(flat[t * capacity + p]));
      }
      tubes.push(tube);
    }
    return tubes;
  }

  function isPureFull(tube, capacity) {
    if (tube.length !== capacity) return false;
    var c = tube[0].c;
    for (var i = 1; i < tube.length; i++) if (tube[i].c !== c) return false;
    return true;
  }

  function shuffleQuality(tubes, capacity) {
    var fullSorted = 0;
    var mixed = 0;
    for (var i = 0; i < tubes.length; i++) {
      var t = tubes[i];
      if (t.length === 0) continue;
      if (isPureFull(t, capacity)) {
        fullSorted++;
        continue;
      }
      var c = t[0].c;
      for (var j = 1; j < t.length; j++) {
        if (t[j].c !== c) {
          mixed++;
          break;
        }
      }
    }
    return { fullSorted: fullSorted, mixed: mixed };
  }

  function applyHidden(tubes, rng, density) {
    for (var t = 0; t < tubes.length; t++) {
      var tube = tubes[t];
      // never hide the visible top — that ball IS exposed at start
      for (var p = 0; p < tube.length - 1; p++) {
        if (rng() < density) tube[p].h = true;
      }
    }
  }

  function generate(n) {
    var p = paramsForLevel(n);
    var seed = (n * 9973 + 137) >>> 0;

    var tubes;
    var attempts = 0;
    while (true) {
      var rng = mulberry32((seed + attempts * 7919) >>> 0);
      tubes = shuffleAllBalls(p.colors, p.capacity, rng);
      var q = shuffleQuality(tubes, p.capacity);
      var minMixed = Math.min(p.colors, p.colors >= 4 ? 3 : 2);
      if (q.fullSorted === 0 && q.mixed >= minMixed) break;
      attempts++;
      if (attempts > 30) break;
    }

    for (var e = 0; e < p.empty; e++) tubes.push([]);

    if (p.features.hidden) {
      applyHidden(tubes, mulberry32((seed + 0xabc) >>> 0), 0.4);
    }

    var locked = [];
    if (p.features.lock) {
      // pick the last empty tube as a locked one (shrinks usable workspace)
      for (var i = tubes.length - 1; i >= 0; i--) {
        if (tubes[i].length === 0) {
          locked.push(i);
          break;
        }
      }
    }

    var moveLimit = null;
    if (p.features.moveLimit) {
      moveLimit = Math.round(p.colors * p.capacity * 1.7 + p.empty * 2);
    }

    return {
      id: n,
      colors: p.colors,
      capacity: p.capacity,
      empty: p.empty,
      tubes: tubes,
      locked: locked,
      moveLimit: moveLimit,
    };
  }

  window.MS = window.MS || {};
  window.MS.Levels = {
    generate: generate,
    paramsForLevel: paramsForLevel,
    MAX_COLOR: COLOR_COUNT,
  };
})(window);
