/**
 * Subway Surfers - Modern UI Controller
 * Manages: Start Menu, HUD, Pause, Game Over, Settings
 * Minimal intrusion into game core (main.js)
 */

// Global pause flag - used by main.js render loop
var gamePaused = false;

(function () {
  'use strict';

  // ===== State =====
  var currentScreen = 'start';   // 'start' | 'playing' | 'paused' | 'gameover' | 'howto' | 'settings'
  var gameAudio = null;
  var crashAudio = null;
  var hudInterval = null;
  var countdownTimer = null;

  // ===== DOM refs =====
  var $ = function (sel) { return document.querySelector(sel); };
  var screens = {
    start:    $('#start-screen'),
    howto:    $('#howto-screen'),
    settings: $('#settings-screen'),
    pause:    $('#pause-overlay'),
    gameover: $('#gameover-overlay'),
    hud:      $('#hud'),
  };

  // ===== Screen Switcher =====
  function showScreen(name) {
    currentScreen = name;
    Object.keys(screens).forEach(function (k) {
      if (screens[k]) {
        if (k === name) screens[k].classList.remove('hidden');
        else screens[k].classList.add('hidden');
      }
    });
  }

  function showHUD() {
    screens.hud.classList.add('visible');
  }
  function hideHUD() {
    screens.hud.classList.remove('visible');
  }

  // ===== Countdown before game start =====
  function runCountdown(cb) {
    var overlay = $('#countdown-overlay');
    var numEl = $('#countdown-number');
    var count = 3;
    overlay.style.display = 'flex';
    numEl.textContent = count;

    var tick = function () {
      count--;
      if (count > 0) {
        numEl.textContent = count;
        // re-trigger animation
        numEl.style.animation = 'none';
        void numEl.offsetWidth;
        numEl.style.animation = '';
      } else if (count === 0) {
        numEl.textContent = 'GO!';
        numEl.style.animation = 'none';
        void numEl.offsetWidth;
        numEl.style.animation = '';
        setTimeout(function () {
          overlay.style.display = 'none';
          if (cb) cb();
        }, 600);
      }
    };

    countdownTimer = setInterval(tick, 800);
  }

  // ===== Audio helpers =====
  function setVolume(vol) {
    gameAudio = document.getElementById('music');
    crashAudio = document.getElementById('crash');
    if (gameAudio) gameAudio.volume = vol;
    if (crashAudio) crashAudio.volume = vol;
    localStorage.setItem('ss_volume', String(vol));
  }
  function getVolume() {
    var v = localStorage.getItem('ss_volume');
    return v === null ? 0.5 : parseFloat(v);
  }

  // ===== HUD updater (polls game state) =====
  function startHUDUpdate() {
    stopHUDUpdate();
    var lastScore = -1, lastCoins = -1;
    var scoreEl = $('#hud-score');
    var coinEl = $('#hud-coins');
    var pBoots = $('#power-boots');
    var pFly = $('#power-fly');
    var pHover = $('#power-hover');

    hudInterval = setInterval(function () {
      if (typeof score !== 'undefined' && score !== lastScore) {
        lastScore = score;
        if (scoreEl) scoreEl.textContent = Math.floor(score);
      }
      if (typeof coins_collected !== 'undefined' && coins_collected !== lastCoins) {
        lastCoins = coins_collected;
        if (coinEl) coinEl.textContent = coins_collected;
      }
      // Power-ups
      if (typeof player !== 'undefined') {
        if (pBoots)  pBoots.classList.toggle('active', !!player.jumping_boots);
        if (pFly)    pFly.classList.toggle('active', !!player.fly_boost);
        if (pHover)  pHover.classList.toggle('active', !!player.hoverboard);
      }
    }, 100);
  }
  function stopHUDUpdate() {
    if (hudInterval) { clearInterval(hudInterval); hudInterval = null; }
  }

  // ===== Public: Start Game =====
  window.uiStartGame = function () {
    showScreen('playing');
    hideHUD();

    // If main.js not loaded yet, load it first
    if (typeof main !== 'function') {
      var s = document.createElement('script');
      s.src = './main.js';
      s.onload = function () {
        runCountdown(function () {
          showHUD();
          startHUDUpdate();
        });
      };
      document.body.appendChild(s);
    } else {
      // Game already initialized once: reload page to reset state
      // (simpler than trying to reset 1000+ game objects)
      location.reload();
    }
  };

  // ===== Public: Pause =====
  window.uiPauseGame = function () {
    if (currentScreen !== 'playing') return;
    gamePaused = true;
    if (gameAudio) gameAudio.pause();
    showScreen('pause');
  };

  // ===== Public: Resume =====
  window.uiResumeGame = function () {
    showScreen('playing');
    showHUD();
    if (gameAudio) gameAudio.play().catch(function () {});
    // Small delay then unpause so user has time to prepare
    setTimeout(function () {
      gamePaused = false;
    }, 100);
  };

  // ===== Public: Restart =====
  window.uiRestartGame = function () {
    location.reload();
  };

  // ===== Public: Game Over callback (injected into main.js) =====
  window.uiGameOver = function (won, finalScore, finalCoins) {
    gamePaused = true;
    stopHUDUpdate();
    hideHUD();

    var title = $('#result-title');
    var scoreV = $('#result-score');
    var coinV = $('#result-coins');

    if (title) {
      title.textContent = won ? 'YOU WON!' : 'GAME OVER';
      title.className = 'result-title ' + (won ? 'win' : 'lose');
    }
    if (scoreV) scoreV.textContent = Math.floor(finalScore);
    if (coinV) coinV.textContent = finalCoins;

    showScreen('gameover');
  };

  // ===== Event bindings =====
  document.addEventListener('DOMContentLoaded', function () {
    // Start screen buttons
    var btnStart = $('#btn-start');
    var btnHowto = $('#btn-howto');
    var btnSettings = $('#btn-settings');
    var btnPause = $('#hud-pause');
    var btnResume = $('#btn-resume');
    var btnRestartPause = $('#btn-restart-pause');
    var btnMenuPause = $('#btn-menu-pause');
    var btnRestartOver = $('#btn-restart-over');
    var btnMenuOver = $('#btn-menu-over');
    var btnHowtoBack = $('#btn-howto-back');
    var btnSettingsBack = $('#btn-settings-back');
    var volSlider = $('#volume-slider');

    if (btnStart)  btnStart.onclick = function () { uiStartGame(); };
    if (btnHowto)  btnHowto.onclick = function () { showScreen('howto'); };
    if (btnSettings) btnSettings.onclick = function () { showScreen('settings'); };
    if (btnPause)  btnPause.onclick = function () { uiPauseGame(); };
    if (btnResume) btnResume.onclick = function () { uiResumeGame(); };
    if (btnRestartPause) btnRestartPause.onclick = function () { uiRestartGame(); };
    if (btnMenuPause) btnMenuPause.onclick = function () { location.reload(); };
    if (btnRestartOver) btnRestartOver.onclick = function () { uiRestartGame(); };
    if (btnMenuOver) btnMenuOver.onclick = function () { location.reload(); };
    if (btnHowtoBack) btnHowtoBack.onclick = function () { showScreen('start'); };
    if (btnSettingsBack) btnSettingsBack.onclick = function () { showScreen('start'); };

    // Volume
    var volValue = $('#volume-value');
    if (volSlider) {
      volSlider.value = getVolume() * 100;
      if (volValue) volValue.textContent = Math.round(volSlider.value) + '%';
      volSlider.oninput = function () {
        setVolume(volSlider.value / 100);
        if (volValue) volValue.textContent = Math.round(volSlider.value) + '%';
      };
    }

    // ESC to pause/resume
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (currentScreen === 'playing') uiPauseGame();
        else if (currentScreen === 'paused') uiResumeGame();
      }
    });

    // Init volume
    setVolume(getVolume());
  });

})();
