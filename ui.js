/**
 * Subway Surfers - Modern UI Controller
 * Manages: Start Menu, HUD, Pause, Game Over, Settings, High Scores
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
  var themeFlashTimer = null;
  var scorePopTimer = null;

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
    var hs = $('#hud-highscore');
    if (hs) hs.classList.add('visible');
  }
  function hideHUD() {
    screens.hud.classList.remove('visible');
    var hs = $('#hud-highscore');
    if (hs) hs.classList.remove('visible');
  }

  // ===== Countdown =====
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

  // ===== Audio System =====
  function getAudioSettings() {
    var raw = localStorage.getItem('ss_audio');
    if (!raw) return { music: 0.5, sfx: 0.5 };
    try { return JSON.parse(raw); } catch (e) { return { music: 0.5, sfx: 0.5 }; }
  }
  function saveAudioSettings(obj) {
    localStorage.setItem('ss_audio', JSON.stringify(obj));
  }
  function applyAudio() {
    var s = getAudioSettings();
    gameAudio = document.getElementById('music');
    crashAudio = document.getElementById('crash');
    if (gameAudio) gameAudio.volume = s.music;
    if (crashAudio) crashAudio.volume = s.sfx;
  }

  // ===== High Score =====
  function getHighScore() {
    var v = localStorage.getItem('ss_highscore');
    return v === null ? 0 : parseInt(v, 10);
  }
  function setHighScore(val) {
    var cur = getHighScore();
    if (val > cur) {
      localStorage.setItem('ss_highscore', String(Math.floor(val)));
      return true;
    }
    return false;
  }
  function updateHighScoreDisplay() {
    var el = $('#hud-highscore-val');
    if (el) el.textContent = getHighScore();
  }

  // ===== Theme Indicator =====
  function flashTheme(name) {
    var el = $('#hud-theme');
    if (!el) return;
    el.textContent = name;
    el.className = 'visible ' + (name.indexOf('City') !== -1 ? 'city' : 'neon');
    if (themeFlashTimer) clearTimeout(themeFlashTimer);
    themeFlashTimer = setTimeout(function () {
      el.classList.remove('visible');
    }, 1500);
  }

  // ===== Score Pop Animation =====
  function popScore(el) {
    if (!el) return;
    el.classList.remove('score-pop');
    void el.offsetWidth;
    el.classList.add('score-pop');
    if (scorePopTimer) clearTimeout(scorePopTimer);
    scorePopTimer = setTimeout(function () {
      el.classList.remove('score-pop');
    }, 400);
  }

  // ===== HUD updater =====
  function startHUDUpdate() {
    stopHUDUpdate();
    var lastScore = -1, lastCoins = -1, lastTheme = -1;
    var scoreEl = $('#hud-score');
    var coinEl = $('#hud-coins');
    var pBoots = $('#power-boots');
    var pFly = $('#power-fly');
    var pHover = $('#power-hover');
    updateHighScoreDisplay();

    hudInterval = setInterval(function () {
      // Score
      if (typeof score !== 'undefined' && score !== lastScore) {
        lastScore = score;
        if (scoreEl) {
          scoreEl.textContent = Math.floor(score);
          popScore(scoreEl);
        }
      }
      // Coins
      if (typeof coins_collected !== 'undefined' && coins_collected !== lastCoins) {
        lastCoins = coins_collected;
        if (coinEl) {
          coinEl.textContent = coins_collected;
          popScore(coinEl);
        }
      }
      // Theme
      if (typeof theme !== 'undefined' && theme !== lastTheme) {
        lastTheme = theme;
        flashTheme(theme === 1 ? 'City Theme' : 'Neon Theme');
      }
      // Power-ups
      if (typeof player !== 'undefined') {
        if (pBoots)  pBoots.classList.toggle('active', !!player.jumping_boots);
        if (pFly)    pFly.classList.toggle('active', !!player.fly_boost);
        if (pHover)  pHover.classList.toggle('active', !!player.hoverboard);
      }
    }, 80);
  }
  function stopHUDUpdate() {
    if (hudInterval) { clearInterval(hudInterval); hudInterval = null; }
  }

  // ===== Public: Start Game =====
  window.uiStartGame = function () {
    showScreen('playing');
    hideHUD();

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
    setTimeout(function () {
      gamePaused = false;
    }, 100);
  };

  // ===== Public: Restart =====
  window.uiRestartGame = function () {
    sessionStorage.setItem('ss_skipSplash', 'true');
    location.reload();
  };

  // ===== Public: Go to Menu =====
  window.uiGoMenu = function () {
    sessionStorage.setItem('ss_skipSplash', 'true');
    location.reload();
  };

  // ===== Public: Game Over =====
  window.uiGameOver = function (won, finalScore, finalCoins) {
    gamePaused = true;
    stopHUDUpdate();
    hideHUD();

    var title = $('#result-title');
    var scoreV = $('#result-score');
    var coinV = $('#result-coins');
    var bestWrap = $('#result-best-wrap');
    var bestV = $('#result-best');

    if (title) {
      title.textContent = won ? 'YOU WON!' : 'GAME OVER';
      title.className = 'result-title ' + (won ? 'win' : 'lose');
    }
    if (scoreV) scoreV.textContent = Math.floor(finalScore);
    if (coinV) coinV.textContent = finalCoins;

    var isNewBest = setHighScore(finalScore);
    if (bestWrap) bestWrap.style.display = '';
    if (bestV) {
      bestV.textContent = getHighScore() + (isNewBest ? ' ★' : '');
    }

    showScreen('gameover');
  };

  // ===== Event bindings =====
  document.addEventListener('DOMContentLoaded', function () {
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
    var volMusic = $('#volume-music');
    var volSfx = $('#volume-sfx');
    var volMusicVal = $('#volume-music-value');
    var volSfxVal = $('#volume-sfx-value');
    var toggleSplash = $('#toggle-splash');

    if (btnStart)  btnStart.onclick = function () { uiStartGame(); };
    if (btnHowto)  btnHowto.onclick = function () { showScreen('howto'); };
    if (btnSettings) btnSettings.onclick = function () { showScreen('settings'); };
    if (btnPause)  btnPause.onclick = function () { uiPauseGame(); };
    if (btnResume) btnResume.onclick = function () { uiResumeGame(); };
    if (btnRestartPause) btnRestartPause.onclick = function () { uiRestartGame(); };
    if (btnMenuPause) btnMenuPause.onclick = function () { uiGoMenu(); };
    if (btnRestartOver) btnRestartOver.onclick = function () { uiRestartGame(); };
    if (btnMenuOver) btnMenuOver.onclick = function () { uiGoMenu(); };
    if (btnHowtoBack) btnHowtoBack.onclick = function () { showScreen('start'); };
    if (btnSettingsBack) btnSettingsBack.onclick = function () { showScreen('start'); };

    // Audio sliders
    var s = getAudioSettings();
    if (volMusic) {
      volMusic.value = s.music * 100;
      if (volMusicVal) volMusicVal.textContent = Math.round(volMusic.value) + '%';
      volMusic.oninput = function () {
        s.music = volMusic.value / 100;
        saveAudioSettings(s);
        applyAudio();
        if (volMusicVal) volMusicVal.textContent = Math.round(volMusic.value) + '%';
      };
    }
    if (volSfx) {
      volSfx.value = s.sfx * 100;
      if (volSfxVal) volSfxVal.textContent = Math.round(volSfx.value) + '%';
      volSfx.oninput = function () {
        s.sfx = volSfx.value / 100;
        saveAudioSettings(s);
        applyAudio();
        if (volSfxVal) volSfxVal.textContent = Math.round(volSfx.value) + '%';
      };
    }

    // Splash toggle
    if (toggleSplash) {
      toggleSplash.checked = sessionStorage.getItem('ss_skipSplash') !== 'true';
      toggleSplash.onchange = function () {
        sessionStorage.setItem('ss_skipSplash', toggleSplash.checked ? '' : 'true');
      };
    }

    // ESC to pause/resume
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (currentScreen === 'playing') uiPauseGame();
        else if (currentScreen === 'paused') uiResumeGame();
      }
    });

    applyAudio();
    updateHighScoreDisplay();
  });

})();
