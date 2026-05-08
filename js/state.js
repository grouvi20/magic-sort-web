/* Magic Sort — pure game state and rules.
 *
 * A "Level" object as consumed by these helpers:
 *   {
 *     capacity:  number        max balls per tube
 *     tubes:     Ball[][]      bottom -> top
 *     lockedSet: Set<number>   tube indices that are blocked (no in/out)
 *   }
 *
 *  Ball: { c: number, h: boolean }
 */
(function (window) {
  "use strict";

  function topBall(tube) {
    return tube.length === 0 ? null : tube[tube.length - 1];
  }

  function topColor(tube) {
    var b = topBall(tube);
    return b ? b.c : null;
  }

  /* size of the same-color run at the top of `tube` */
  function topRunSize(tube) {
    if (tube.length === 0) return 0;
    var c = tube[tube.length - 1].c;
    var n = 0;
    for (var i = tube.length - 1; i >= 0; i--) {
      if (tube[i].c === c) n++;
      else break;
    }
    return n;
  }

  function canMove(level, src, dst) {
    if (src === dst) return { ok: false };
    if (level.lockedSet) {
      if (level.lockedSet.has(src) || level.lockedSet.has(dst))
        return { ok: false, reason: "locked" };
    }
    var A = level.tubes[src];
    var B = level.tubes[dst];
    if (!A || !B) return { ok: false };
    if (A.length === 0) return { ok: false };
    if (B.length >= level.capacity) return { ok: false };
    var srcTop = topColor(A);
    var dstTop = topColor(B);
    if (B.length !== 0 && dstTop !== srcTop) return { ok: false };
    var free = level.capacity - B.length;
    var run = topRunSize(A);
    var count = Math.min(free, run);
    return { ok: count > 0, count: count, color: srcTop };
  }

  function applyMove(level, src, dst, count) {
    var A = level.tubes[src];
    var B = level.tubes[dst];
    for (var i = 0; i < count; i++) {
      var b = A.pop();
      // Reveal hidden ball during transit (it's now visible).
      b.h = false;
      B.push(b);
    }
    // After popping, new top of A becomes visible.
    var newTop = topBall(A);
    if (newTop) newTop.h = false;
  }

  function isTubeComplete(level, idx) {
    var t = level.tubes[idx];
    if (t.length !== level.capacity) return false;
    var c = t[0].c;
    for (var i = 1; i < t.length; i++) if (t[i].c !== c) return false;
    return true;
  }

  function isWon(level) {
    for (var i = 0; i < level.tubes.length; i++) {
      var t = level.tubes[i];
      if (t.length === 0) continue;
      if (t.length !== level.capacity) return false;
      var c = t[0].c;
      for (var j = 1; j < t.length; j++) if (t[j].c !== c) return false;
    }
    return true;
  }

  /* Find a "useful" move to suggest as a hint. Heuristic:
   *   +3  pour into a tube that already has matching color (consolidates)
   *   +1  pour into an empty tube (only if source is mixed)
   *   -2  if it would empty a perfectly sorted tube
   *
   *  Returns { src, dst } or null. */
  function findHint(level) {
    var N = level.tubes.length;
    var best = null;

    function tubeIsPure(t) {
      if (t.length === 0) return true;
      var c = t[0].c;
      for (var k = 1; k < t.length; k++) if (t[k].c !== c) return false;
      return true;
    }

    for (var s = 0; s < N; s++) {
      var srcTube = level.tubes[s];
      if (srcTube.length === 0) continue;
      var srcPure = tubeIsPure(srcTube);
      for (var d = 0; d < N; d++) {
        if (s === d) continue;
        var r = canMove(level, s, d);
        if (!r.ok) continue;
        var dstTube = level.tubes[d];
        var score = 0;
        if (dstTube.length > 0 && topColor(dstTube) === r.color) score += 3;
        if (dstTube.length === 0 && !srcPure) score += 1;
        if (srcPure && srcTube.length === level.capacity) score -= 2;
        if (!best || score > best.score) {
          best = { src: s, dst: d, score: score };
        }
      }
    }
    return best;
  }

  window.MS = window.MS || {};
  window.MS.GameState = {
    canMove: canMove,
    applyMove: applyMove,
    isWon: isWon,
    isTubeComplete: isTubeComplete,
    topColor: topColor,
    topBall: topBall,
    topRunSize: topRunSize,
    findHint: findHint,
  };
})(window);
