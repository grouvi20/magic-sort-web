/* Magic Sort — application controller (glue between state, UI, input, host). */
(function (window) {
  "use strict";

  var Storage = window.MS.Storage;
  var Levels = window.MS.Levels;
  var GameState = window.MS.GameState;
  var UI = window.MS.UI;
  var Input = window.MS.Input;
  var Integration = window.MS.Integration;

  var TOTAL_LEVELS = 60;
  var current = null;

  function $(sel) {
    return document.querySelector(sel);
  }

  function init() {
    applySettingsToDom();
    bindUI();
    UI.showScreen("menu");
    Integration.emit("ready", { totalLevels: TOTAL_LEVELS });
  }

  function applySettingsToDom() {
    var s = Storage.getSettings();
    document.body.classList.toggle("theme-light", !s.dark);
    var sound = $("#setting-sound");
    var vibrate = $("#setting-vibrate");
    var dark = $("#setting-dark");
    if (sound) sound.checked = !!s.sound;
    if (vibrate) vibrate.checked = !!s.vibrate;
    if (dark) dark.checked = !!s.dark;
  }

  function bindUI() {
    document.body.addEventListener("click", function (e) {
      var t = e.target.closest("[data-action]");
      if (!t) return;
      handleAction(t.dataset.action);
    });

    var sound = $("#setting-sound");
    var vibrate = $("#setting-vibrate");
    var dark = $("#setting-dark");
    if (sound)
      sound.addEventListener("change", function (e) {
        Storage.saveSettings({ sound: e.target.checked });
      });
    if (vibrate)
      vibrate.addEventListener("change", function (e) {
        Storage.saveSettings({ vibrate: e.target.checked });
      });
    if (dark)
      dark.addEventListener("change", function (e) {
        Storage.saveSettings({ dark: e.target.checked });
        applySettingsToDom();
      });

    document.addEventListener("keydown", function (e) {
      if (!current) return;
      if (e.key === "z" || e.key === "Z" || e.key === "Backspace") undo();
      else if (e.key === "h" || e.key === "H") hint();
      else if (e.key === "r" || e.key === "R") restart();
      else if (e.key === "Escape") backToMenu();
    });

    Input.attach(onTubeTap);

    Integration.listen(function (msg) {
      switch (msg.type) {
        case "startLevel":
          if (msg.payload && msg.payload.id) startLevel(Number(msg.payload.id));
          break;
        case "showMenu":
          backToMenu();
          break;
        case "resetProgress":
          Storage.reset();
          applySettingsToDom();
          UI.toast("Прогресс сброшен");
          break;
        case "setSettings":
          if (msg.payload) {
            Storage.saveSettings(msg.payload);
            applySettingsToDom();
          }
          break;
      }
    });

    window.addEventListener("orientationchange", function () {
      if (current) UI.renderTubes(current.level);
    });
    window.addEventListener("resize", function () {
      if (current) UI.renderTubes(current.level);
    });
  }

  function handleAction(action) {
    switch (action) {
      case "play": {
        var p = Storage.getProgress();
        startLevel(Math.min(p.lastLevel, TOTAL_LEVELS));
        break;
      }
      case "levels":
        openLevels();
        break;
      case "settings":
        UI.showScreen("settings");
        break;
      case "back":
      case "back-to-menu":
        backToMenu();
        break;
      case "next-level":
        startLevel((current && current.id ? current.id : 0) + 1);
        break;
      case "restart":
        restart();
        break;
      case "undo":
        undo();
        break;
      case "hint":
        hint();
        break;
      case "reset-progress":
        if (window.confirm("Сбросить весь прогресс?")) {
          Storage.reset();
          applySettingsToDom();
          UI.toast("Прогресс сброшен");
        }
        break;
    }
  }

  function backToMenu() {
    current = null;
    UI.hideModals();
    UI.showScreen("menu");
  }

  function openLevels() {
    UI.renderLevels(Storage.getProgress(), TOTAL_LEVELS, startLevel);
    UI.showScreen("levels");
  }

  function startLevel(n) {
    if (!n || n < 1) n = 1;
    if (n > TOTAL_LEVELS) {
      UI.toast("Ты прошёл все уровни. Молодец!");
      backToMenu();
      return;
    }
    var def = Levels.generate(n);
    var level = {
      id: n,
      capacity: def.capacity,
      tubes: cloneTubes(def.tubes),
      lockedSet: new Set(def.locked || []),
      moveLimit: def.moveLimit,
    };
    current = {
      id: n,
      level: level,
      selected: null,
      history: [],
      moves: 0,
      hintsUsed: 0,
      undosUsed: 0,
    };
    UI.hideModals();
    UI.setLevelNum(n);
    UI.setMoves(0, level.moveLimit);
    UI.renderTubes(level, { stagger: true });
    UI.showScreen("game");
    Integration.emit("levelStart", { id: n });
  }

  function cloneTubes(tubes) {
    var out = [];
    for (var i = 0; i < tubes.length; i++) {
      var t = [];
      for (var j = 0; j < tubes[i].length; j++) {
        t.push({ c: tubes[i][j].c, h: !!tubes[i][j].h });
      }
      out.push(t);
    }
    return out;
  }

  function snapshot(level) {
    return JSON.stringify({
      tubes: level.tubes,
      locked: Array.from(level.lockedSet),
    });
  }

  function restoreSnapshot(level, snap) {
    var data = JSON.parse(snap);
    level.tubes = data.tubes;
    level.lockedSet = new Set(data.locked);
  }

  function maybeUnlockTubes(level) {
    // unlock when the player has produced at least one fully-sorted tube
    if (!level.lockedSet || level.lockedSet.size === 0) return false;
    var unlocked = false;
    for (var i = 0; i < level.tubes.length; i++) {
      if (level.lockedSet.has(i)) continue;
      if (GameState.isTubeComplete(level, i)) {
        level.lockedSet.clear();
        unlocked = true;
        UI.toast("Замок снят!");
        break;
      }
    }
    return unlocked;
  }

  function onTubeTap(idx) {
    if (!current) return;
    if (current.animating) return;
    var level = current.level;
    if (level.lockedSet && level.lockedSet.has(idx)) {
      UI.toast("Контейнер заблокирован");
      UI.shake(idx);
      return;
    }
    if (current.selected == null) {
      if (level.tubes[idx].length === 0) return;
      current.selected = idx;
      UI.setSelected(idx);
      return;
    }
    if (current.selected === idx) {
      current.selected = null;
      UI.setSelected(null);
      return;
    }
    var move = GameState.canMove(level, current.selected, idx);
    if (!move.ok) {
      UI.shake(idx);
      // re-target if user clicked another non-empty tube
      if (level.tubes[idx].length > 0) {
        current.selected = idx;
        UI.setSelected(idx);
      } else {
        current.selected = null;
        UI.setSelected(null);
      }
      return;
    }

    current.history.push(snapshot(level));
    var fromIdx = current.selected;
    current.selected = null;

    // Capture src ball positions BEFORE state mutation (for FLIP animation).
    var captured = UI.captureMove(fromIdx, move.count);

    GameState.applyMove(level, fromIdx, idx, move.count);
    current.moves++;

    UI.setMoves(current.moves, level.moveLimit);
    UI.renderTubes(level);
    Integration.emit("move", {
      id: current.id,
      src: fromIdx,
      dst: idx,
      moves: current.moves,
    });

    current.animating = true;
    UI.flyBalls(captured, idx, function () {
      current.animating = false;
      var unlocked = maybeUnlockTubes(level);
      if (unlocked) UI.renderTubes(level);

      if (GameState.isWon(level)) {
        // Brief delay so the player sees the final ball land
        setTimeout(finishWin, 240);
        return;
      }
      if (level.moveLimit && current.moves >= level.moveLimit) {
        setTimeout(function () { finishLose("moveLimit"); }, 200);
      }
    });
  }

  function undo() {
    if (!current) return;
    if (current.history.length === 0) {
      UI.toast("Нечего отменять");
      return;
    }
    restoreSnapshot(current.level, current.history.pop());
    current.moves = Math.max(0, current.moves - 1);
    current.undosUsed++;
    current.selected = null;
    UI.setMoves(current.moves, current.level.moveLimit);
    UI.renderTubes(current.level);
  }

  function hint() {
    if (!current) return;
    var h = GameState.findHint(current.level);
    if (!h) {
      UI.toast("Подсказок нет — отмени ход");
      return;
    }
    current.hintsUsed++;
    UI.highlightHint(h.src, h.dst);
  }

  function restart() {
    if (!current) return;
    startLevel(current.id);
  }

  function computeStars() {
    var stars = 3;
    if (current.undosUsed > 0) stars--;
    if (current.hintsUsed > 0) stars--;
    return Math.max(1, stars);
  }

  function finishWin() {
    var stars = computeStars();
    Storage.saveLevelResult(current.id, {
      stars: stars,
      moves: current.moves,
    });
    var prog = Storage.getProgress();
    Integration.emit("levelComplete", {
      id: current.id,
      moves: current.moves,
      stars: stars,
      bestMoves: prog.levels[current.id].bestMoves,
    });
    Integration.emit("progress", prog);
    UI.showWin({
      level: current.id,
      moves: current.moves,
      stars: stars,
    });
  }

  function finishLose(reason) {
    Integration.emit("levelFail", {
      id: current.id,
      moves: current.moves,
      reason: reason || "unknown",
    });
    UI.showLose();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
