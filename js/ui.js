/* Magic Sort — DOM rendering layer. */
(function (window) {
  "use strict";

  var GameState = window.MS.GameState;

  function $(sel) {
    return document.querySelector(sel);
  }

  function colorVar(i) {
    return "var(--c" + ((i % 10) + 1) + ")";
  }

  function showScreen(name) {
    var screens = document.querySelectorAll(".screen");
    for (var i = 0; i < screens.length; i++) {
      screens[i].hidden = screens[i].dataset.screen !== name;
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

  function renderTubes(level) {
    var tubesEl = document.getElementById("tubes");
    tubesEl.innerHTML = "";
    tubesEl.style.setProperty("--cap", level.capacity);

    for (var idx = 0; idx < level.tubes.length; idx++) {
      var tube = level.tubes[idx];
      var tubeEl = document.createElement("div");
      tubeEl.className = "tube";
      tubeEl.dataset.idx = String(idx);
      tubeEl.style.setProperty("--cap", level.capacity);
      if (level.lockedSet && level.lockedSet.has(idx)) {
        tubeEl.classList.add("locked");
      }
      if (GameState.isTubeComplete(level, idx)) {
        tubeEl.classList.add("completed");
      }
      var lastIdx = tube.length - 1;
      for (var p = 0; p < tube.length; p++) {
        var b = tube[p];
        var ballEl = document.createElement("div");
        ballEl.className = "ball";
        var hide = b.h && p !== lastIdx;
        if (hide) {
          ballEl.classList.add("hidden-ball");
        } else {
          ballEl.style.setProperty("--ball-color", colorVar(b.c));
        }
        tubeEl.appendChild(ballEl);
      }
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
    var balls = sel.querySelectorAll(".ball");
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

  function showWin(opts) {
    document.getElementById("win-moves").textContent = String(opts.moves);
    document.getElementById("win-level").textContent = String(opts.level);
    var stars = document.querySelectorAll("#win-stars .star");
    for (var i = 0; i < stars.length; i++) stars[i].classList.remove("on");
    showModal("win");
    for (var k = 0; k < stars.length; k++) {
      (function (idx) {
        setTimeout(function () {
          if (idx < opts.stars)
            document.querySelectorAll("#win-stars .star")[idx].classList.add("on");
        }, 220 + idx * 220);
      })(k);
    }
  }

  function showLose() {
    showModal("lose");
  }

  function highlightHint(src, dst) {
    var ts = document.querySelectorAll(".tube");
    for (var i = 0; i < ts.length; i++) ts[i].classList.remove("target-ok");
    var a = document.querySelector('.tube[data-idx="' + src + '"]');
    var b = document.querySelector('.tube[data-idx="' + dst + '"]');
    if (a) a.classList.add("selected");
    if (b) b.classList.add("target-ok");
    setTimeout(function () {
      if (a) a.classList.remove("selected");
      if (b) b.classList.remove("target-ok");
    }, 1300);
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
      }, 220);
    }, 1700);
  }

  function shake(idx) {
    var el = document.querySelector('.tube[data-idx="' + idx + '"]');
    if (!el) return;
    el.classList.remove("target-bad");
    void el.offsetWidth; // restart animation
    el.classList.add("target-bad");
    setTimeout(function () {
      el.classList.remove("target-bad");
    }, 420);
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
  };
})(window);
