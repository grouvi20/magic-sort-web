/* Magic Sort — DOM rendering layer + animation orchestration. */
(function (window) {
  "use strict";

  var GameState = window.MS.GameState;

  function $(sel) {
    return document.querySelector(sel);
  }

  function colorVar(i) {
    return "var(--c" + ((i % 10) + 1) + ")";
  }

  function glowVar(i) {
    return "var(--g" + ((i % 10) + 1) + ")";
  }

  function showScreen(name) {
    var screens = document.querySelectorAll(".screen");
    for (var i = 0; i < screens.length; i++) {
      var s = screens[i];
      var match = s.dataset.screen === name;
      s.hidden = !match;
      if (match) {
        // Restart screen-in animation
        s.style.animation = "none";
        // force reflow then re-apply
        void s.offsetWidth;
        s.style.animation = "";
      }
    }
    document.getElementById("app").dataset.screen = name;
  }

  function renderLevels(progress, totalLevels, onSelect) {
    var grid = document.getElementById("levels-grid");
    grid.innerHTML = "";
    for (var n = 1; n <= totalLevels; n++) {
      var cell = document.createElement("button");
      cell.className = "level-cell";
      cell.dataset.level = String(n);
      cell.style.setProperty("--d", ((n - 1) * 18) + "ms");
      var lv = progress.levels[n];
      var unlocked = n <= progress.lastLevel;
      if (!unlocked) cell.classList.add("locked");
      if (lv && lv.completed) cell.classList.add("completed");
      var num = document.createElement("span");
      num.textContent = String(n);
      cell.appendChild(num);
      if (lv && lv.completed) {
        var stars = document.createElement("div");
        stars.className = "stars";
        for (var s = 0; s < 3; s++) {
          var st = document.createElement("span");
          st.className = "star" + (s < (lv.stars || 0) ? " on" : "");
          stars.appendChild(st);
        }
        cell.appendChild(stars);
      }
      if (unlocked) {
        (function (level) {
          cell.addEventListener("click", function () {
            onSelect(level);
          });
        })(n);
      }
      grid.appendChild(cell);
    }
  }

  function makeBall(b, opts) {
    opts = opts || {};
    var ballEl = document.createElement("div");
    ballEl.className = "ball";
    if (opts.noAnim) ballEl.classList.add("no-anim");
    if (b.h && opts.hidden) {
      ballEl.classList.add("hidden-ball");
    } else {
      ballEl.style.setProperty("--ball-color", colorVar(b.c));
      ballEl.style.setProperty("--ball-glow", glowVar(b.c));
    }
    return ballEl;
  }

  function renderTubes(level, opts) {
    opts = opts || {};
    var tubesEl = document.getElementById("tubes");
    tubesEl.innerHTML = "";

    for (var idx = 0; idx < level.tubes.length; idx++) {
      var tube = level.tubes[idx];
      var tubeEl = document.createElement("div");
      tubeEl.className = "tube";
      tubeEl.dataset.idx = String(idx);
      tubeEl.style.setProperty("--cap", level.capacity);
      // staggered appearance for the initial render only
      if (opts.stagger) tubeEl.style.setProperty("--d", (idx * 45) + "ms");
      else tubeEl.style.setProperty("--d", "0ms");
      if (level.lockedSet && level.lockedSet.has(idx)) {
        tubeEl.classList.add("locked");
      }
      if (GameState.isTubeComplete(level, idx)) {
        tubeEl.classList.add("completed");
      }

      var ballsWrap = document.createElement("div");
      ballsWrap.className = "tube-balls";
      var lastIdx = tube.length - 1;
      for (var p = 0; p < tube.length; p++) {
        var b = tube[p];
        var hide = b.h && p !== lastIdx;
        var ballEl = makeBall(b, { hidden: hide, noAnim: !opts.stagger });
        ballsWrap.appendChild(ballEl);
      }
      tubeEl.appendChild(ballsWrap);

      // Glass overlay — the tube artwork rendered ABOVE the balls so the
      // outline + highlights appear on top of them, making the balls look
      // like they're physically inside the glass. Tube PNG has a fully
      // transparent interior, so balls remain visible through it.
      var glassEl = document.createElement("div");
      glassEl.className = "tube-glass";
      tubeEl.appendChild(glassEl);

      tubesEl.appendChild(tubeEl);
    }
  }

  function setSelected(idx) {
    var tubes = document.querySelectorAll(".tube");
    for (var i = 0; i < tubes.length; i++) {
      tubes[i].classList.toggle("selected", Number(tubes[i].dataset.idx) === idx);
    }
    var lifted = document.querySelectorAll(".ball.lifted");
    for (var j = 0; j < lifted.length; j++) lifted[j].classList.remove("lifted");
    if (idx == null) return;
    var sel = document.querySelector('.tube[data-idx="' + idx + '"]');
    if (!sel) return;
    var balls = sel.querySelectorAll(".tube-balls .ball");
    if (balls.length) balls[balls.length - 1].classList.add("lifted");
  }

  function setMoves(used, limit) {
    document.getElementById("moves").textContent = String(used);
    document.getElementById("move-limit").textContent = limit
      ? "/ " + limit
      : "";
  }

  function setLevelNum(n) {
    document.getElementById("level-num").textContent = String(n);
  }

  function showModal(name) {
    var modals = document.querySelectorAll(".modal");
    for (var i = 0; i < modals.length; i++) {
      modals[i].hidden = modals[i].dataset.modal !== name;
    }
  }

  function hideModals() {
    var modals = document.querySelectorAll(".modal");
    for (var i = 0; i < modals.length; i++) modals[i].hidden = true;
  }

  /* === Confetti === */
  var CONFETTI_COLORS = [
    "var(--neon-1)", "var(--neon-2)", "var(--neon-3)",
    "var(--neon-4)", "var(--neon-ok)", "var(--c1)", "var(--c5)",
  ];

  function spawnConfetti(count) {
    var box = document.getElementById("confetti");
    if (!box) return;
    box.innerHTML = "";
    var W = box.clientWidth || window.innerWidth;
    count = count || 80;
    for (var i = 0; i < count; i++) {
      var p = document.createElement("i");
      var startX = Math.random() * W;
      var driftX = (Math.random() - 0.5) * W * 0.6;
      var rot = (Math.random() * 1200 - 600) + "deg";
      var dur = (1.6 + Math.random() * 1.6).toFixed(2) + "s";
      var delay = (Math.random() * 0.4).toFixed(2) + "s";
      var size = 6 + Math.random() * 6;
      var color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      p.style.left = startX + "px";
      p.style.width = size + "px";
      p.style.height = (size * 1.6) + "px";
      p.style.setProperty("--xs", "0px");
      p.style.setProperty("--xe", driftX + "px");
      p.style.setProperty("--rot", rot);
      p.style.setProperty("--dur", dur);
      p.style.setProperty("--delay", delay);
      p.style.setProperty("--cc", color);
      box.appendChild(p);
    }
    // Auto-clear after the longest possible duration so it doesn't block clicks.
    setTimeout(function () {
      if (box.firstChild === p || true) box.innerHTML = "";
    }, 4500);
  }

  function showWin(opts) {
    document.getElementById("win-moves").textContent = String(opts.moves);
    document.getElementById("win-level").textContent = String(opts.level);
    var stars = document.querySelectorAll("#win-stars .star");
    for (var i = 0; i < stars.length; i++) stars[i].classList.remove("on");
    showModal("win");
    spawnConfetti(110);
    for (var k = 0; k < stars.length; k++) {
      (function (idx) {
        setTimeout(function () {
          if (idx < opts.stars) {
            var s = document.querySelectorAll("#win-stars .star")[idx];
            if (s) s.classList.add("on");
          }
        }, 260 + idx * 220);
      })(k);
    }
  }

  function showLose() {
    showModal("lose");
  }

  function highlightHint(src, dst) {
    var ts = document.querySelectorAll(".tube");
    for (var i = 0; i < ts.length; i++) {
      ts[i].classList.remove("target-ok");
      ts[i].classList.remove("selected");
    }
    var a = document.querySelector('.tube[data-idx="' + src + '"]');
    var b = document.querySelector('.tube[data-idx="' + dst + '"]');
    if (a) a.classList.add("selected");
    if (b) b.classList.add("target-ok");
    setTimeout(function () {
      if (a) a.classList.remove("selected");
      if (b) b.classList.remove("target-ok");
    }, 1400);
  }

  var toastTimer = null;
  function toast(msg) {
    var t = document.getElementById("toast");
    t.textContent = msg;
    t.hidden = false;
    requestAnimationFrame(function () {
      t.classList.add("show");
    });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      t.classList.remove("show");
      setTimeout(function () {
        t.hidden = true;
      }, 240);
    }, 1700);
  }

  function shake(idx) {
    var el = document.querySelector('.tube[data-idx="' + idx + '"]');
    if (!el) return;
    el.classList.remove("target-bad");
    void el.offsetWidth;
    el.classList.add("target-bad");
    setTimeout(function () {
      el.classList.remove("target-bad");
    }, 460);
  }

  function emitBurst(tubeEl) {
    if (!tubeEl) return;
    var b = document.createElement("span");
    b.className = "burst";
    tubeEl.appendChild(b);
    setTimeout(function () {
      if (b.parentNode) b.parentNode.removeChild(b);
    }, 750);
  }

  /* === Move animation (FLIP-style flying ball) === */

  /* Capture the top `count` balls of source tube — call BEFORE state mutation. */
  function captureMove(srcIdx, count) {
    var src = document.querySelector('.tube[data-idx="' + srcIdx + '"]');
    if (!src) return [];
    var balls = src.querySelectorAll(".tube-balls .ball");
    var arr = [];
    var n = Math.min(count, balls.length);
    for (var i = 0; i < n; i++) {
      // top -> bottom order: top ball last
      var el = balls[balls.length - 1 - i];
      var r = el.getBoundingClientRect();
      arr.push({
        x: r.left,
        y: r.top,
        w: r.width,
        h: r.height,
        color: el.style.getPropertyValue("--ball-color"),
        glow: el.style.getPropertyValue("--ball-glow"),
        wasHidden: el.classList.contains("hidden-ball"),
      });
      // visually hide it instantly so it doesn't double-render with the flying ball
      el.classList.add("invisible");
    }
    return arr;
  }

  /* Animate flight from captured positions to dst tube top, then reveal landed balls. */
  function flyBalls(captured, dstIdx, onDone) {
    var dst = document.querySelector('.tube[data-idx="' + dstIdx + '"]');
    if (!dst || !captured || captured.length === 0) {
      if (onDone) onDone();
      return;
    }

    var dstBalls = dst.querySelectorAll(".tube-balls .ball");
    var count = captured.length;
    // The freshly-arrived balls are the last `count` in dst tube.
    var dstNew = [];
    for (var i = 0; i < count; i++) {
      // top ball is last; we landed in order: bottom-most lands first.
      // captured was in order [top, top-1, ...] from src. After applyMove they
      // arrive at dst in reverse (top of src goes to top of dst). So:
      // - captured[0] (was src top) lands at dst top      = dstBalls[len-1]
      // - captured[1] lands one below                     = dstBalls[len-2]
      var dstBall = dstBalls[dstBalls.length - 1 - i];
      if (dstBall) {
        dstBall.classList.add("invisible");
        dstBall.classList.add("no-anim");
        dstNew.push(dstBall);
      }
    }

    var pending = captured.length;
    if (pending === 0) {
      if (onDone) onDone();
      return;
    }

    captured.forEach(function (info, i) {
      var dstBall = dstNew[i];
      if (!dstBall) {
        pending--;
        if (pending === 0 && onDone) onDone();
        return;
      }
      var dstRect = dstBall.getBoundingClientRect();
      var fb = document.createElement("div");
      fb.className = "flying-ball";
      fb.style.left = info.x + "px";
      fb.style.top = info.y + "px";
      fb.style.width = info.w + "px";
      fb.style.height = info.h + "px";
      if (info.color) fb.style.setProperty("--ball-color", info.color);
      else fb.style.setProperty("--ball-color", "var(--c1)");
      if (info.glow) fb.style.setProperty("--ball-glow", info.glow);
      document.body.appendChild(fb);

      var dx = dstRect.left - info.x;
      var dy = dstRect.top - info.y;
      var arcHeight = Math.max(70, 50 + Math.abs(dx) * 0.18);

      var keyframes = [
        { transform: "translate(0, 0) scale(1)" },
        {
          transform:
            "translate(" + (dx * 0.5) + "px, " + (Math.min(dy, 0) - arcHeight) + "px) scale(1.04)",
          offset: 0.45,
        },
        {
          transform:
            "translate(" + dx + "px, " + (dy - 6) + "px) scaleY(1.12) scaleX(0.93)",
          offset: 0.86,
        },
        {
          transform:
            "translate(" + dx + "px, " + dy + "px) scaleY(0.94) scaleX(1.04)",
          offset: 1,
        },
      ];

      var animation = fb.animate(keyframes, {
        duration: 360,
        delay: i * 60,
        easing: "cubic-bezier(0.4, 0.0, 0.25, 1)",
        fill: "forwards",
      });

      animation.onfinish = function () {
        fb.remove();
        dstBall.classList.remove("invisible");
        dstBall.classList.remove("no-anim");
        // restart landing animation
        dstBall.style.animation = "none";
        void dstBall.offsetWidth;
        dstBall.style.animation = "";

        pending--;
        if (pending === 0) {
          // tube completion burst (if applicable)
          if (dst.classList.contains("completed")) {
            emitBurst(dst);
          }
          if (onDone) onDone();
        }
      };
    });
  }

  /* === Button ripple === */
  function bindRipples() {
    document.body.addEventListener("pointerdown", function (e) {
      var btn = e.target.closest(".btn");
      if (!btn) return;
      if (btn.disabled) return;
      var rect = btn.getBoundingClientRect();
      var size = Math.max(rect.width, rect.height) * 1.4;
      var x = e.clientX - rect.left - size / 2;
      var y = e.clientY - rect.top - size / 2;
      var r = document.createElement("span");
      r.className = "ripple";
      r.style.width = size + "px";
      r.style.height = size + "px";
      r.style.left = x + "px";
      r.style.top = y + "px";
      btn.appendChild(r);
      setTimeout(function () {
        if (r.parentNode) r.parentNode.removeChild(r);
      }, 580);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindRipples);
  } else {
    bindRipples();
  }

  window.MS = window.MS || {};
  window.MS.UI = {
    $: $,
    showScreen: showScreen,
    renderLevels: renderLevels,
    renderTubes: renderTubes,
    setSelected: setSelected,
    setMoves: setMoves,
    setLevelNum: setLevelNum,
    showModal: showModal,
    hideModals: hideModals,
    showWin: showWin,
    showLose: showLose,
    highlightHint: highlightHint,
    toast: toast,
    shake: shake,
    captureMove: captureMove,
    flyBalls: flyBalls,
    emitBurst: emitBurst,
    spawnConfetti: spawnConfetti,
  };
})(window);
