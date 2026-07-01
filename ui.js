/**
 * Subway Surfers - Modern UI Controller
 * Manages: Start Menu, HUD, Pause, Game Over, Settings, High Scores
 * Minimal intrusion into game core (main.js)
 */

// Global pause flag - used by main.js render loop
var gamePaused = true;
window.gamePaused = true;

(function () {
  'use strict';

  // ===== State =====
  var currentScreen = 'start';   // 'start' | 'playing' | 'paused' | 'gameover' | 'howto' | 'stats' | 'settings'
  var gameAudio = null;
  var crashAudio = null;
  var hudInterval = null;
  var countdownTimer = null;
  var countdownFallbackTimer = null;
  var countdownActive = false;
  var gameLaunching = false;
  var resumePending = false;
  var pauseStartedAt = 0;
  var themeFlashTimer = null;
  var scorePopTimer = null;

  // ===== DOM refs =====
  var $ = function (sel) { return document.querySelector(sel); };
  function setPaused(value) {
    gamePaused = !!value;
    window.gamePaused = gamePaused;
  }
  var screens = {
    start:    $('#start-screen'),
    howto:    $('#howto-screen'),
    stats:    $('#stats-screen'),
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
    screens.hud.classList.remove('hidden');
    screens.hud.classList.add('visible');
    var hs = $('#hud-highscore');
    if (hs) hs.classList.add('visible');
    var tc = $('#touch-controls');
    if (tc) {
      tc.classList.remove('hidden');
      tc.classList.add('visible');
    }
    var db = $('#distance-bar');
    if (db) db.classList.add('visible');
  }
  function hideHUD() {
    screens.hud.classList.remove('visible');
    screens.hud.classList.add('hidden');
    var hs = $('#hud-highscore');
    if (hs) hs.classList.remove('visible');
    var tc = $('#touch-controls');
    if (tc) {
      tc.classList.remove('visible');
      tc.classList.add('hidden');
    }
    var db = $('#distance-bar');
    if (db) db.classList.remove('visible');
  }

  // ===== Countdown =====
  function runCountdown(cb) {
    var overlay = $('#countdown-overlay');
    var numEl = $('#countdown-number');
    if (!overlay || !numEl) {
      if (cb) cb();
      return;
    }
    var count = 3;
    countdownActive = true;
    overlay.style.display = 'flex';
    numEl.textContent = count;

    function finishCountdown() {
      if (!countdownActive) return;
      countdownActive = false;
      if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
      }
      if (countdownFallbackTimer) {
        clearTimeout(countdownFallbackTimer);
        countdownFallbackTimer = null;
      }
      overlay.style.display = 'none';
      if (cb) cb();
    }

    var tick = function () {
      count--;
      if (count > 0) {
        numEl.textContent = count;
        numEl.style.animation = 'none';
        void numEl.offsetWidth;
        numEl.style.animation = '';
        if (typeof flashScreen === 'function') flashScreen('rgba(255,255,255,0.15)', 0.15);
      } else if (count === 0) {
        numEl.textContent = 'GO!';
        numEl.style.animation = 'none';
        void numEl.offsetWidth;
        numEl.style.animation = '';
        if (typeof flashScreen === 'function') flashScreen('rgba(5,217,232,0.25)', 0.3);
        clearInterval(countdownTimer);
        countdownTimer = null;
        setTimeout(function () {
          finishCountdown();
        }, 600);
      }
    };

    if (countdownTimer) clearInterval(countdownTimer);
    if (countdownFallbackTimer) clearTimeout(countdownFallbackTimer);
    countdownTimer = setInterval(tick, 800);
    countdownFallbackTimer = setTimeout(finishCountdown, 3600);
  }

  // ===== Audio System =====
  function clamp01(v, fallback) {
    var n = Number(v);
    if (!isFinite(n)) n = fallback;
    return Math.max(0, Math.min(1, n));
  }
  function getAudioSettings() {
    var raw = localStorage.getItem('ss_audio');
    if (!raw) return { music: 0.5, sfx: 0.5 };
    try {
      var parsed = JSON.parse(raw);
      return {
        music: clamp01(parsed.music, 0.5),
        sfx: clamp01(parsed.sfx, 0.5)
      };
    } catch (e) { return { music: 0.5, sfx: 0.5 }; }
  }
  function saveAudioSettings(obj) {
    var safe = {
      music: clamp01(obj.music, 0.5),
      sfx: clamp01(obj.sfx, 0.5)
    };
    localStorage.setItem('ss_audio', JSON.stringify(safe));
  }
  function setSliderValue(slider, label, value) {
    if (slider) slider.value = Math.round(value * 100);
    if (label) label.textContent = Math.round(value * 100) + '%';
  }
  function syncAudioControls() {
    var s = getAudioSettings();
    setSliderValue($('#volume-music'), $('#volume-music-value'), s.music);
    setSliderValue($('#volume-sfx'), $('#volume-sfx-value'), s.sfx);
    setSliderValue($('#pause-volume'), null, s.music);
  }
  function applyAudio() {
    var s = getAudioSettings();
    gameAudio = document.getElementById('music');
    crashAudio = document.getElementById('crash');
    if (gameAudio) gameAudio.volume = s.music;
    if (crashAudio) crashAudio.volume = s.sfx;
    if (typeof setSfxVolume === 'function') setSfxVolume(s.sfx);
    syncAudioControls();
  }
  var fadeInterval = null;
  function fadeAudio(targetVolume, duration, onDone) {
    if (!gameAudio) return;
    var startVolume = gameAudio.volume || 0;
    var startTime = Date.now();
    if (fadeInterval) clearInterval(fadeInterval);
    fadeInterval = setInterval(function() {
      var now = Date.now();
      var t = Math.min(1, (now - startTime) / duration);
      var vol = startVolume + (targetVolume - startVolume) * t;
      gameAudio.volume = Math.max(0, Math.min(1, vol));
      if (t >= 1) {
        clearInterval(fadeInterval);
        if (onDone) onDone();
      }
    }, 50);
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
        var diff = Math.floor(score) - Math.floor(lastScore);
        lastScore = score;
        if (scoreEl) {
          scoreEl.textContent = formatNum(Math.floor(score));
          popScore(scoreEl);
          // Score pop animation intensity based on change size
          if (diff >= 5) {
            scoreEl.style.transform = 'scale(1.25)';
            setTimeout(function() { if (scoreEl) scoreEl.style.transform = ''; }, 150);
          }
          // Near-record / new-record pulse
          var best = getHighScore();
          var cur = Math.floor(score);
          if (cur > best) {
            scoreEl.style.color = 'var(--neon-gold)';
            scoreEl.style.textShadow = '0 0 15px rgba(255,215,0,0.5)';
            scoreEl.classList.add('record-pulse');
          } else if (cur >= best - 50 && best > 0) {
            scoreEl.style.color = 'var(--neon-pink)';
            scoreEl.style.textShadow = '0 0 10px rgba(255,42,109,0.4)';
            scoreEl.classList.add('near-record-pulse');
          } else {
            scoreEl.style.color = '';
            scoreEl.style.textShadow = '';
            scoreEl.classList.remove('record-pulse', 'near-record-pulse');
          }
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
          if (pBoots) pBoots.classList.toggle('warning', rem < 3);
        } else if (fBoots) { fBoots.style.transform = 'scaleX(0)'; if (pBoots) pBoots.classList.remove('warning'); }
        if (fFly && typeof fb_acquired !== 'undefined' && fActive) {
          var rem = Math.max(0, 10 - (now - fb_acquired));
          fFly.style.transform = 'scaleX(' + (rem / 10) + ')';
          if (pFly) pFly.classList.toggle('warning', rem < 3);
        } else if (fFly) { fFly.style.transform = 'scaleX(0)'; if (pFly) pFly.classList.remove('warning'); }
        if (fHover && typeof hoverboard_acquired !== 'undefined' && hActive) {
          var rem = Math.max(0, 10 - (now - hoverboard_acquired));
          fHover.style.transform = 'scaleX(' + (rem / 10) + ')';
          if (pHover) pHover.classList.toggle('warning', rem < 3);
        } else if (fHover) { fHover.style.transform = 'scaleX(0)'; if (pHover) pHover.classList.remove('warning'); }
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
  var clickCtx = null;
  function hasUserActivation() {
    return !navigator.userActivation || navigator.userActivation.hasBeenActive;
  }
  function playClick() {
    if (!hasUserActivation()) return;
    var settings = getAudioSettings();
    if (settings.sfx <= 0) return;
    try {
      if (!clickCtx) clickCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (clickCtx.state === 'suspended') clickCtx.resume();
      var osc = clickCtx.createOscillator();
      var gain = clickCtx.createGain();
      osc.connect(gain);
      gain.connect(clickCtx.destination);
      osc.frequency.value = 800;
      gain.gain.setValueAtTime(0.08 * settings.sfx, clickCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, clickCtx.currentTime + 0.08);
      osc.start(clickCtx.currentTime);
      osc.stop(clickCtx.currentTime + 0.08);
    } catch (e) {}
  }

  // ===== Public: Start Game =====
  window.uiStartGame = function () {
    if (gameLaunching || currentScreen === 'playing') return;
    gameLaunching = true;
    // Check WebGL support before loading game
    var canvas = document.getElementById('glcanvas');
    var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      gameLaunching = false;
      showScreen('webgl-error');
      return;
    }

    var loading = $('#loading-overlay');
    if (loading) loading.classList.remove('hidden');

    function startPlay() {
      gameLaunching = false;
      if (loading) loading.classList.add('hidden');
      showScreen('playing');
      setPaused(true);
      runCountdown(function () {
        showHUD();
        startHUDUpdate();
        showKeyHint();
        if (typeof resetGameStartTiming === 'function') resetGameStartTiming();
        setPaused(false);
        var s = getAudioSettings();
        if (gameAudio) { gameAudio.volume = 0; gameAudio.play().catch(function(){}); }
        fadeAudio(s.music, 1500);
      });
    }
    if (typeof main !== 'function') {
      var s = document.createElement('script');
      s.src = './main.js';
      s.onload = startPlay;
      s.onerror = function () {
        gameLaunching = false;
        if (loading) loading.classList.add('hidden');
        alert('Failed to load game. Please refresh and try again.');
      };
      document.body.appendChild(s);
    } else {
      startPlay();
    }
  };

  // ===== Public: Pause =====
  window.uiPauseGame = function () {
    if (currentScreen !== 'playing') return;
    if (countdownActive) return;
    if (resumePending) return;
    setPaused(true);
    resumePending = false;
    pauseStartedAt = Date.now() * 0.001;
    stopHUDUpdate();
    fadeAudio(0.1, 500);
    if (typeof updateTrainRumble === 'function') updateTrainRumble(0);
    var flash = document.getElementById('screen-flash');
    if (flash) { flash.style.background = 'rgba(0,0,0,0.4)'; flash.style.opacity = '1'; flash.style.transition = 'opacity 0.3s'; }
    // Update pause stats
    var pScore = $('#pause-score');
    var pCoins = $('#pause-coins');
    var pDist = $('#pause-dist');
    if (pScore) pScore.textContent = typeof score !== 'undefined' ? formatNum(Math.floor(score)) : '0';
    if (pCoins) pCoins.textContent = typeof coins_collected !== 'undefined' ? coins_collected : '0';
    if (pDist) pDist.textContent = (typeof player !== 'undefined' ? Math.floor(-player.pos[2]) : '0') + 'm';
    syncAudioControls();
    hideHUD();
    showScreen('pause');
  };

  // ===== Public: Resume =====
  window.uiResumeGame = function () {
    if (currentScreen !== 'pause') return;
    if (resumePending) return;
    resumePending = true;
    var flash = document.getElementById('screen-flash');
    if (flash) { flash.style.opacity = '0'; }
    showScreen('playing');
    showHUD();
    if (pauseStartedAt) {
      var pausedFor = Date.now() * 0.001 - pauseStartedAt;
      ['startTime', 'policeCaughtUp', 'obstacle_hit_time', 'boots_acquired', 'fb_acquired', 'hoverboard_acquired', 'flash_start_time'].forEach(function (name) {
        if (typeof window[name] === 'number' && isFinite(window[name])) window[name] += pausedFor;
      });
      pauseStartedAt = 0;
    }
    var s = getAudioSettings();
    if (gameAudio && gameAudio.paused && s.music > 0) gameAudio.play().catch(function(){});
    fadeAudio(s.music, 500);
    startHUDUpdate();
    setTimeout(function () {
      setPaused(false);
      resumePending = false;
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
    setPaused(true);
    gameLaunching = false;
    resumePending = false;
    countdownActive = false;
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    if (countdownFallbackTimer) {
      clearTimeout(countdownFallbackTimer);
      countdownFallbackTimer = null;
    }
    stopHUDUpdate();
    hideHUD();
    fadeAudio(0, 1000, function() { if (gameAudio) gameAudio.pause(); });
    if (typeof updateTrainRumble === 'function') updateTrainRumble(0);

    var title = $('#result-title');
    var scoreV = $('#result-score');
    var coinV = $('#result-coins');
    var bestWrap = $('#result-best-wrap');
    var bestV = $('#result-best');
    var distV = $('#result-dist');
    var streakV = $('#result-streak');
    var powersV = $('#result-powers');

    if (title) {
      title.textContent = won ? 'YOU WON!' : 'GAME OVER';
      title.className = 'result-title ' + (won ? 'win' : 'lose');
    }
    if (scoreV) scoreV.textContent = formatNum(Math.floor(finalScore));
    if (coinV) coinV.textContent = finalCoins;
    if (distV) distV.textContent = (typeof score !== 'undefined' ? Math.floor(-player.pos[2]) : 0) + 'm';
    if (streakV) streakV.textContent = typeof bestStreak !== 'undefined' ? bestStreak : 0;
    if (powersV) powersV.textContent = typeof powersCollected !== 'undefined' ? powersCollected : 0;

    var isNewBest = setHighScore(finalScore);
    var newAchievements = updateStats(won, finalScore, finalCoins);
    if (bestWrap) bestWrap.style.display = '';
    if (bestV) {
      bestV.textContent = formatNum(getHighScore()) + (isNewBest ? ' ★' : '');
    }
    if (isNewBest) {
      if (title) {
        title.textContent = 'NEW RECORD!';
        title.style.color = 'var(--neon-gold)';
        title.style.textShadow = '0 0 30px rgba(255,215,0,0.5)';
      }
      if (typeof showComboText === 'function') {
        setTimeout(function() {
          var rect = document.getElementById('glcanvas').getBoundingClientRect();
          showComboText('NEW RECORD!', rect.left + rect.width / 2, rect.top + rect.height * 0.25);
        }, 300);
      }
      if (typeof flashScreen === 'function') {
        setTimeout(function() { flashScreen('rgba(255,215,0,0.2)', 0.4); }, 200);
      }
      spawnConfetti();
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
      var url = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text);
      window.open(url, '_blank', 'width=600,height=400');
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).catch(function(){});
      }
      var origText = btnShare.textContent;
      btnShare.textContent = '✅ Shared!';
      setTimeout(function() { btnShare.textContent = origText; }, 1500);
    };
    if (pauseVol) {
      pauseVol.oninput = function () {
        var s = getAudioSettings();
        s.music = pauseVol.value / 100;
        saveAudioSettings(s);
        applyAudio();
      };
    }

    // Audio sliders
    if (volMusic) {
      volMusic.oninput = function () {
        var s = getAudioSettings();
        s.music = volMusic.value / 100;
        saveAudioSettings(s);
        applyAudio();
      };
    }
    if (volSfx) {
      volSfx.oninput = function () {
        var s = getAudioSettings();
        s.sfx = volSfx.value / 100;
        saveAudioSettings(s);
        applyAudio();
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
    var lastTouchEmit = 0;
    function emitKey(code) {
      if (currentScreen !== 'playing' || countdownActive) return;
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
      var handler = function (e) {
        e.preventDefault();
        var now = Date.now();
        if (now - lastTouchEmit < 90) return;
        lastTouchEmit = now;
        emitKey(code);
      };
      if (window.PointerEvent) {
        el.addEventListener('pointerdown', handler, { passive: false });
      } else {
        el.addEventListener('touchstart', handler, { passive: false });
        el.addEventListener('mousedown', handler, { passive: false });
      }
    }
    bindTouch(tLeft,  37);
    bindTouch(tRight, 39);
    bindTouch(tJump,  38);
    bindTouch(tDuck,  40);

    // Swipe gesture support (anywhere on screen during gameplay)
    var touchStartX = 0, touchStartY = 0;
    var minSwipe = 40;
    document.addEventListener('touchstart', function(e) {
      if (currentScreen !== 'playing') return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });
    document.addEventListener('touchend', function(e) {
      if (currentScreen !== 'playing') return;
      var dx = e.changedTouches[0].clientX - touchStartX;
      var dy = e.changedTouches[0].clientY - touchStartY;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > minSwipe) {
        emitKey(dx > 0 ? 39 : 37);
      } else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > minSwipe) {
        emitKey(dy > 0 ? 40 : 38);
      }
    }, { passive: true });

    // ESC to pause/resume, Enter/Space to restart from gameover
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (currentScreen === 'playing') uiPauseGame();
        else if (currentScreen === 'pause') uiResumeGame();
      }
      if ((e.key === 'Enter' || e.key === ' ') && currentScreen === 'gameover') {
        uiRestartGame();
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
    syncAudioControls();
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

  window.showScorePopup = function(text, x, y, color) {
    var el = document.createElement('div');
    el.textContent = text;
    el.className = 'score-popup';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.color = color || 'var(--neon-gold)';
    document.body.appendChild(el);
    setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 900);
  };

  window.spawnConfetti = function() {
    var colors = ['#ff2a6d', '#05d9e8', '#ffd700', '#00ff88', '#ffaa00'];
    for (var i = 0; i < 40; i++) {
      var c = document.createElement('div');
      c.className = 'confetti';
      c.style.left = Math.random() * 100 + 'vw';
      c.style.background = colors[Math.floor(Math.random() * colors.length)];
      c.style.animationDuration = (2 + Math.random() * 2) + 's';
      c.style.animationDelay = (Math.random() * 0.5) + 's';
      c.style.transform = 'rotate(' + (Math.random() * 360) + 'deg)';
      document.body.appendChild(c);
      setTimeout(function(el) { return function() { if (el.parentNode) el.parentNode.removeChild(el); }; }(c), 4500);
    }
  }

})();
