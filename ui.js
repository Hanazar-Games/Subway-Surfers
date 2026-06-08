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
    var tc = $('#touch-controls');
    if (tc) tc.classList.add('visible');
  }
  function hideHUD() {
    screens.hud.classList.remove('visible');
    var hs = $('#hud-highscore');
    if (hs) hs.classList.remove('visible');
    var tc = $('#touch-controls');
    if (tc) tc.classList.remove('visible');
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

  // ===== Number formatting =====
  function formatNum(n) {
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  // ===== Fullscreen =====
  window.uiToggleFullscreen = function () {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(function () {});
    } else {
      document.exitFullscreen().catch(function () {});
    }
  };

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
    var wBoots = $('#wrap-boots');
    var wFly = $('#wrap-fly');
    var wHover = $('#wrap-hover');
    var fBoots = $('#fill-boots');
    var fFly = $('#fill-fly');
    var fHover = $('#fill-hover');
    updateHighScoreDisplay();

    hudInterval = setInterval(function () {
      var now = Date.now() * 0.001;
      // Score
      if (typeof score !== 'undefined' && score !== lastScore) {
        lastScore = score;
        if (scoreEl) {
          scoreEl.textContent = formatNum(Math.floor(score));
          popScore(scoreEl);
        }
      }
      // Coins
      if (typeof coins_collected !== 'undefined' && coins_collected !== lastCoins) {
        lastCoins = coins_collected;
        if (coinEl) {
          coinEl.textContent = formatNum(coins_collected);
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
        var bActive = !!player.jumping_boots;
        var fActive = !!player.fly_boost;
        var hActive = !!player.hoverboard;
        if (pBoots)  pBoots.classList.toggle('active', bActive);
        if (pFly)    pFly.classList.toggle('active', fActive);
        if (pHover)  pHover.classList.toggle('active', hActive);
        if (wBoots)  wBoots.classList.toggle('active', bActive);
        if (wFly)    wFly.classList.toggle('active', fActive);
        if (wHover)  wHover.classList.toggle('active', hActive);
        // Power-up countdown bars (10 second duration)
        if (fBoots && typeof boots_acquired !== 'undefined' && bActive) {
          var rem = Math.max(0, 10 - (now - boots_acquired));
          fBoots.style.transform = 'scaleX(' + (rem / 10) + ')';
        } else if (fBoots) { fBoots.style.transform = 'scaleX(0)'; }
        if (fFly && typeof fb_acquired !== 'undefined' && fActive) {
          var rem = Math.max(0, 10 - (now - fb_acquired));
          fFly.style.transform = 'scaleX(' + (rem / 10) + ')';
        } else if (fFly) { fFly.style.transform = 'scaleX(0)'; }
        if (fHover && typeof hoverboard_acquired !== 'undefined' && hActive) {
          var rem = Math.max(0, 10 - (now - hoverboard_acquired));
          fHover.style.transform = 'scaleX(' + (rem / 10) + ')';
        } else if (fHover) { fHover.style.transform = 'scaleX(0)'; }
      }
    }, 80);
  }
  function stopHUDUpdate() {
    if (hudInterval) { clearInterval(hudInterval); hudInterval = null; }
  }

  // ===== Key Hint =====
  function showKeyHint() {
    var hint = $('#key-hint');
    if (hint) {
      hint.classList.add('visible');
      setTimeout(function () {
        if (hint) hint.classList.remove('visible');
      }, 3500);
    }
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
          showKeyHint();
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

  // ===== FPS Counter =====
  var fpsEl = null;
  var fpsVisible = false;
  var lastFpsTime = 0;
  var frameCount = 0;
  window.uiUpdateFPS = function () {
    if (!fpsVisible) return;
    frameCount++;
    var now = performance.now();
    if (now - lastFpsTime >= 1000) {
      if (fpsEl) fpsEl.textContent = frameCount + ' FPS';
      frameCount = 0;
      lastFpsTime = now;
    }
  };

  // ===== Public: Game Over =====
  window.uiGameOver = function (won, finalScore, finalCoins) {
    gamePaused = true;
    stopHUDUpdate();
    hideHUD();
    if (gameAudio) gameAudio.pause();

    var title = $('#result-title');
    var scoreV = $('#result-score');
    var coinV = $('#result-coins');
    var bestWrap = $('#result-best-wrap');
    var bestV = $('#result-best');

    if (title) {
      title.textContent = won ? 'YOU WON!' : 'GAME OVER';
      title.className = 'result-title ' + (won ? 'win' : 'lose');
    }
    if (scoreV) scoreV.textContent = formatNum(Math.floor(finalScore));
    if (coinV) coinV.textContent = finalCoins;

    var isNewBest = setHighScore(finalScore);
    if (bestWrap) bestWrap.style.display = '';
    if (bestV) {
      bestV.textContent = formatNum(getHighScore()) + (isNewBest ? ' ★' : '');
    }

    // New record celebration
    var card = $('.glass-card', $('#gameover-overlay'));
    if (isNewBest && card) {
      var burst = document.createElement('div');
      burst.className = 'new-record-burst';
      card.appendChild(burst);
      var recText = document.createElement('div');
      recText.className = 'new-record-text';
      recText.textContent = 'NEW RECORD!';
      recText.style.marginBottom = '12px';
      card.insertBefore(recText, card.firstChild.nextSibling);
      setTimeout(function () {
        if (burst.parentNode) burst.parentNode.removeChild(burst);
      }, 1000);
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
    var btnFullscreen = $('#btn-fullscreen');
    var volMusic = $('#volume-music');
    var volSfx = $('#volume-sfx');
    var volMusicVal = $('#volume-music-value');
    var volSfxVal = $('#volume-sfx-value');
    var toggleSplash = $('#toggle-splash');
    var toggleFps = $('#toggle-fps');
    fpsEl = $('#fps-counter');

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
    if (btnFullscreen) btnFullscreen.onclick = function () { uiToggleFullscreen(); };

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
    // FPS toggle
    if (toggleFps) {
      fpsVisible = localStorage.getItem('ss_showFps') === 'true';
      toggleFps.checked = fpsVisible;
      if (fpsEl) fpsEl.classList.toggle('visible', fpsVisible);
      toggleFps.onchange = function () {
        fpsVisible = toggleFps.checked;
        localStorage.setItem('ss_showFps', fpsVisible ? 'true' : 'false');
        if (fpsEl) fpsEl.classList.toggle('visible', fpsVisible);
      };
    }

    // Touch controls
    var tLeft = $('#touch-left');
    var tRight = $('#touch-right');
    var tJump = $('#touch-jump');
    var tDuck = $('#touch-duck');
    function emitKey(code) {
      var ev = new KeyboardEvent('keydown', { bubbles: true });
      Object.defineProperty(ev, 'keyCode', { value: code });
      document.dispatchEvent(ev);
      setTimeout(function () {
        var up = new KeyboardEvent('keyup', { bubbles: true });
        Object.defineProperty(up, 'keyCode', { value: code });
        document.dispatchEvent(up);
      }, 80);
    }
    function bindTouch(el, code) {
      if (!el) return;
      var handler = function (e) { e.preventDefault(); emitKey(code); };
      el.addEventListener('pointerdown', handler, { passive: false });
      el.addEventListener('touchstart', handler, { passive: false });
    }
    bindTouch(tLeft,  37);
    bindTouch(tRight, 39);
    bindTouch(tJump,  38);
    bindTouch(tDuck,  40);

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
