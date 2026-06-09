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
    'webgl-error': $('#webgl-error'),
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

  // ===== Stats & Achievements =====
  var ACHIEVEMENTS = [
    { id: 'first_game',   icon: '🎮', name: 'First Steps',      desc: 'Play your first game',           check: function (s) { return s.games >= 1; } },
    { id: 'score_500',    icon: '🥈', name: 'Runner',           desc: 'Score 500+ points',              check: function (s) { return s.best >= 500; } },
    { id: 'score_1000',   icon: '💎', name: 'Legend',           desc: 'Score 1000+ points',             check: function (s) { return s.best >= 1000; } },
    { id: 'coins_50',     icon: '🪙', name: 'Coin Collector',   desc: 'Collect 50+ coins in one game',  check: function (s) { return s.maxCoins >= 50; } },
    { id: 'coins_100',    icon: '🏆', name: 'Coin Master',      desc: 'Collect 100+ coins in one game', check: function (s) { return s.maxCoins >= 100; } },
    { id: 'win_1',        icon: '🏁', name: 'Survivor',         desc: 'Win a game',                     check: function (s) { return s.wins >= 1; } },
    { id: 'win_5',        icon: '👑', name: 'Champion',         desc: 'Win 5 games',                    check: function (s) { return s.wins >= 5; } },
  ];

  function getStats() {
    var raw = localStorage.getItem('ss_stats');
    if (!raw) return { games: 0, wins: 0, totalCoins: 0, best: 0, maxCoins: 0 };
    try { return JSON.parse(raw); } catch (e) { return { games: 0, wins: 0, totalCoins: 0, best: 0, maxCoins: 0 }; }
  }
  function saveStats(obj) {
    localStorage.setItem('ss_stats', JSON.stringify(obj));
  }
  function getUnlockedAchievements() {
    var raw = localStorage.getItem('ss_achievements');
    if (!raw) return [];
    try { return JSON.parse(raw); } catch (e) { return []; }
  }
  function unlockAchievement(id) {
    var list = getUnlockedAchievements();
    if (list.indexOf(id) === -1) {
      list.push(id);
      localStorage.setItem('ss_achievements', JSON.stringify(list));
      return true;
    }
    return false;
  }
  function updateStats(won, finalScore, finalCoins) {
    var s = getStats();
    s.games += 1;
    if (won) s.wins += 1;
    s.totalCoins += finalCoins;
    if (finalScore > s.best) s.best = Math.floor(finalScore);
    if (finalCoins > s.maxCoins) s.maxCoins = finalCoins;
    saveStats(s);
    // Check achievements
    var newlyUnlocked = [];
    ACHIEVEMENTS.forEach(function (a) {
      if (a.check(s) && unlockAchievement(a.id)) {
        newlyUnlocked.push(a);
      }
    });
    return newlyUnlocked;
  }
  function renderAchievements() {
    var container = $('#achievements-list');
    if (!container) return;
    var unlocked = getUnlockedAchievements();
    container.innerHTML = '';
    ACHIEVEMENTS.forEach(function (a) {
      var isUnlocked = unlocked.indexOf(a.id) !== -1;
      var div = document.createElement('div');
      div.className = 'achievement-item' + (isUnlocked ? ' unlocked' : '');
      div.innerHTML =
        '<div class="achievement-icon">' + a.icon + '</div>' +
        '<div class="achievement-info">' +
          '<div class="achievement-name">' + a.name + '</div>' +
          '<div class="achievement-desc">' + a.desc + '</div>' +
        '</div>' +
        '<div style="font-size:16px;">' + (isUnlocked ? '✅' : '🔒') + '</div>';
      container.appendChild(div);
    });
  }
  function renderStats() {
    var s = getStats();
    var elGames = $('#stat-games');
    var elWins = $('#stat-wins');
    var elCoins = $('#stat-total-coins');
    var elBest = $('#stat-best');
    if (elGames) elGames.textContent = s.games;
    if (elWins) elWins.textContent = s.wins;
    if (elCoins) elCoins.textContent = formatNum(s.totalCoins);
    if (elBest) elBest.textContent = formatNum(s.best);
    renderAchievements();
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

  // ===== Dynamic Theme Colors =====
  function setThemeColors(isNeon) {
    var root = document.documentElement;
    if (isNeon) {
      root.style.setProperty('--neon-pink', '#b829dd');
      root.style.setProperty('--shadow-pink', '0 0 25px rgba(184,41,221,0.35)');
      root.style.setProperty('--border-glow', 'rgba(184,41,221,0.25)');
    } else {
      root.style.setProperty('--neon-pink', '#ff2a6d');
      root.style.setProperty('--shadow-pink', '0 0 25px rgba(255,42,109,0.35)');
      root.style.setProperty('--border-glow', 'rgba(255,42,109,0.25)');
    }
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
    var lastScore = -1, lastCoins = -1, lastTheme = -1, lastMult = -1;
    var scoreEl = $('#hud-score');
    var coinEl = $('#hud-coins');
    var timeEl = $('#hud-time');
    var multEl = $('#hud-multiplier');
    var multPanel = $('#hud-multiplier-panel');
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
      // Time
      if (timeEl && typeof startTime !== 'undefined') {
        var elapsed = Math.floor(Date.now() * 0.001 - startTime);
        var m = Math.floor(elapsed / 60);
        var s = elapsed % 60;
        timeEl.textContent = m + ':' + (s < 10 ? '0' : '') + s;
      }
      // Multiplier
      if (typeof scoreMultiplier !== 'undefined' && scoreMultiplier !== lastMult) {
        lastMult = scoreMultiplier;
        if (multEl) multEl.textContent = 'x' + scoreMultiplier;
        if (multPanel) multPanel.style.display = scoreMultiplier > 1 ? 'flex' : 'none';
        if (scoreMultiplier > 1 && multEl) popScore(multEl);
      }
      // Theme
      if (typeof theme !== 'undefined' && theme !== lastTheme) {
        lastTheme = theme;
        flashTheme(theme === 1 ? 'City Theme' : 'Neon Theme');
        setThemeColors(theme === 2);
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

  // ===== Button click sound =====
  var clickAudio = null;
  function playClick() {
    if (!clickAudio) {
      clickAudio = new Audio();
      // Simple synthesized click using Web Audio API
      try {
        var ctx = new (window.AudioContext || window.webkitAudioContext)();
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 800;
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.08);
      } catch (e) {}
    }
  }

  // ===== Public: Start Game =====
  window.uiStartGame = function () {
    // Check WebGL support before loading game
    var canvas = document.getElementById('glcanvas');
    var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      showScreen('webgl-error');
      return;
    }

    var loading = $('#loading-overlay');
    if (loading) loading.classList.remove('hidden');

    if (typeof main !== 'function') {
      var s = document.createElement('script');
      s.src = './main.js';
      s.onload = function () {
        if (loading) loading.classList.add('hidden');
        showScreen('playing');
        runCountdown(function () {
          showHUD();
          startHUDUpdate();
          showKeyHint();
        });
      };
      s.onerror = function () {
        if (loading) loading.classList.add('hidden');
        alert('Failed to load game. Please refresh and try again.');
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
    var newAchievements = updateStats(won, finalScore, finalCoins);
    if (bestWrap) bestWrap.style.display = '';
    if (bestV) {
      bestV.textContent = formatNum(getHighScore()) + (isNewBest ? ' ★' : '');
    }
    // Show achievement unlock toast
    newAchievements.forEach(function (a, i) {
      setTimeout(function () {
        showAchievementToast(a);
      }, i * 800 + 500);
    });

    // Achievement unlock toast helper
    function showAchievementToast(a) {
      var toast = document.createElement('div');
      toast.style.cssText =
        'position:fixed; top:80px; left:50%; transform:translateX(-50%); z-index:500;' +
        'background:rgba(15,15,24,0.95); border:1px solid rgba(255,215,0,0.3);' +
        'border-radius:12px; padding:12px 24px; display:flex; align-items:center; gap:12px;' +
        'font-size:14px; color:#fff; box-shadow:0 0 30px rgba(255,215,0,0.2);' +
        'animation:toast-in 0.4s ease, toast-out 0.4s ease 2.6s forwards;';
      toast.innerHTML = '<span style="font-size:20px;">' + a.icon + '</span> <b>' + a.name + '</b> unlocked!';
      document.body.appendChild(toast);
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 3000);
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
    var btnStats = $('#btn-stats');
    var btnStatsBack = $('#btn-stats-back');
    var btnSettingsBack = $('#btn-settings-back');
    var btnFullscreen = $('#btn-fullscreen');
    var btnWebglBack = $('#btn-webgl-back');
    var btnShare = $('#btn-share');
    var pauseVol = $('#pause-volume');
    var volMusic = $('#volume-music');
    var volSfx = $('#volume-sfx');
    var volMusicVal = $('#volume-music-value');
    var volSfxVal = $('#volume-sfx-value');
    var toggleSplash = $('#toggle-splash');
    var toggleFps = $('#toggle-fps');
    fpsEl = $('#fps-counter');

    if (btnStart)  btnStart.onclick = function () { playClick(); uiStartGame(); };
    if (btnHowto)  btnHowto.onclick = function () { playClick(); showScreen('howto'); };
    if (btnSettings) btnSettings.onclick = function () { playClick(); showScreen('settings'); };
    if (btnPause)  btnPause.onclick = function () { playClick(); uiPauseGame(); };
    if (btnResume) btnResume.onclick = function () { playClick(); uiResumeGame(); };
    if (btnRestartPause) btnRestartPause.onclick = function () { playClick(); uiRestartGame(); };
    if (btnMenuPause) btnMenuPause.onclick = function () { playClick(); uiGoMenu(); };
    if (btnRestartOver) btnRestartOver.onclick = function () { playClick(); uiRestartGame(); };
    if (btnMenuOver) btnMenuOver.onclick = function () { playClick(); uiGoMenu(); };
    if (btnHowtoBack) btnHowtoBack.onclick = function () { playClick(); showScreen('start'); };
    if (btnStats) btnStats.onclick = function () { playClick(); renderStats(); showScreen('stats'); };
    if (btnStatsBack) btnStatsBack.onclick = function () { playClick(); showScreen('start'); };
    if (btnSettingsBack) btnSettingsBack.onclick = function () { playClick(); showScreen('start'); };
    if (btnFullscreen) btnFullscreen.onclick = function () { playClick(); uiToggleFullscreen(); };
    if (btnWebglBack) btnWebglBack.onclick = function () { playClick(); showScreen('start'); };
    if (btnShare) btnShare.onclick = function () {
      playClick();
      var text = 'I scored ' + formatNum(Math.floor(score || 0)) + ' in Subway Surfers! 🎮';
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function () {
          btnShare.textContent = '✅ Copied!';
          setTimeout(function () { btnShare.textContent = '📋 Copy Score'; }, 1500);
        });
      } else {
        btnShare.textContent = '❌ Failed';
        setTimeout(function () { btnShare.textContent = '📋 Copy Score'; }, 1500);
      }
    };
    if (pauseVol) {
      var s = getAudioSettings();
      pauseVol.value = s.music * 100;
      pauseVol.oninput = function () {
        s.music = pauseVol.value / 100;
        saveAudioSettings(s);
        applyAudio();
      };
    }

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

    // Background particles
    initParticles();
    initSpeedLines();

    // Button ripple effect
    document.querySelectorAll('.btn').forEach(function (btn) {
      btn.addEventListener('pointerdown', function (e) {
        var rect = btn.getBoundingClientRect();
        var ripple = document.createElement('span');
        ripple.className = 'btn-ripple';
        var size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
        btn.appendChild(ripple);
        setTimeout(function () {
          if (ripple.parentNode) ripple.parentNode.removeChild(ripple);
        }, 500);
      });
    });

    applyAudio();
    updateHighScoreDisplay();
  });

  // ===== Background Particles =====
  function initParticles() {
    var canvas = document.getElementById('bg-particles');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    var particles = [];
    var count = 60;
    for (var i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.4 + 0.1,
        color: Math.random() > 0.5 ? '255,42,109' : '5,217,232'
      });
    }

    function draw() {
      if (currentScreen === 'playing') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        requestAnimationFrame(draw);
        return;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + p.color + ',' + p.alpha + ')';
        ctx.fill();
      }
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }

  // ===== Speed Lines Overlay =====
  function initSpeedLines() {
    var canvas = document.getElementById('speed-lines');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    function resize() {
      var rect = canvas.parentNode.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    }
    resize();
    window.addEventListener('resize', resize);

    var speedLines = [];
    var speedLineTimer = 0;

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (currentScreen === 'playing') {
        speedLineTimer += 1;
        if (speedLineTimer > 2) {
          speedLineTimer = 0;
          if (speedLines.length < 40) {
            speedLines.push({
              x: canvas.width + Math.random() * 100,
              y: Math.random() * canvas.height,
              w: 30 + Math.random() * 120,
              h: 1 + Math.random() * 2,
              speed: 8 + Math.random() * 12,
              alpha: 0.15 + Math.random() * 0.25,
            });
          }
        }
        for (var i = speedLines.length - 1; i >= 0; i--) {
          var s = speedLines[i];
          s.x -= s.speed;
          s.alpha -= 0.008;
          if (s.x + s.w < 0 || s.alpha <= 0) {
            speedLines.splice(i, 1);
            continue;
          }
          ctx.fillStyle = 'rgba(255,255,255,' + s.alpha + ')';
          ctx.fillRect(s.x, s.y, s.w, s.h);
        }
      } else {
        speedLines = [];
      }
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }

  // ===== Floating combo text =====
  window.flashScreen = function(color, duration) {
    var el = document.getElementById('screen-flash');
    if (!el) return;
    el.style.background = color || '#fff';
    el.style.opacity = '0.4';
    el.style.transition = 'none';
    // Force reflow
    void el.offsetWidth;
    el.style.transition = 'opacity ' + (duration || 0.3) + 's ease-out';
    el.style.opacity = '0';
  };

  window.showComboText = function(text, x, y) {
    var el = document.createElement('div');
    el.textContent = text;
    el.style.cssText = 'position:fixed;left:' + x + 'px;top:' + y + 'px;'
      + 'font-size:28px;font-weight:900;color:var(--neon-cyan);'
      + 'text-shadow:0 0 12px rgba(5,217,232,0.6);'
      + 'pointer-events:none;z-index:300;transform:translate(-50%,-50%);'
      + 'animation:comboFloat 1s ease-out forwards;';
    document.body.appendChild(el);
    setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 1000);
  };

})();
