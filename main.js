"use strict";

var player;
var police;
var dog;
var track1 = new Array();
var track2 = new Array();
var track3 = new Array();
var wall = new Array();
var city = new Array();
var coins = new Array();
var trainT = new Array();
var trainF = new Array();
var trainL = new Array();
var trainR = new Array();
var trainExtra = new Array(); // bottom, back, wheels
var boxes = new Array();
var manholes = new Array();
var duck_obs_stop = new Array();
var duck_obs_stand1 = new Array();
var duck_obs_stand2 = new Array();
var jump_obs = new Array();
var rope_stand1 = new Array();
var rope_stand2 = new Array();
var rope_stop = new Array();
var boots = new Array();
var flying_boost = new Array();
var hoverboard = new Array();
var particles = new Array();

var player_texture, police_texture, dog_texture;
var track_texture;
var wall_texture;
var city_texture;
var coin_texture;
var trainF_texture, trainT_texture, trainL_texture, trainR_texture;
var train_texture;
var box_texture;
var manhole_texture;
var stop_texture, stand_texture;
var boots_texture;
var fb_texture;
var hoverboard_texture;
var particle_texture;
var dust_texture;
var glow_cyan_texture, glow_pink_texture, glow_gold_texture;

// Theme texture caches (preload both themes to avoid runtime reloads)
var themeTextures = {1: {}, 2: {}};

var cam_x = 0, cam_y = 12, cam_z = 40.0;
var cam_y_target = 5;
var cam_z_target = 13.0;
var cameraShake = 0;
var gameStartAnim = true;
var target_x = 0, target_y = 0, target_z = cam_z - 10;
var d, startTime, policeCaughtUp, obstacle_hit_time, flash_start_time, boots_acquired, fb_acquired, hoverboard_acquired;
var theme = 1;
var theme_flag = 1;
var obstacle_hit = -1;
var obstacle_hit_type = ''; // 'duck' | 'jump' | 'rope' — disambiguates the shared index

var jump_height = 0;
var duck_ground = -5;
var jumping = false;
var ducking = false;
var wasInAir = false;
var greyScale = false;
var flashing = false;
var train_speeds = new Array();
var player_speed = 0.5;
var currentFov = 70; // starts wide, narrows during intro dive

var score = 0;
var coins_collected = 0;
var scoreMultiplier = 1;
var multiplierStreak = 0;
var bestStreak = 0;
var powersCollected = 0;
var lastCoinTime = 0;
var trailTimer = 0;
var sparkTimer = 0;
var lastMilestone = 0;
var nearMissTimer = 0;
var envParticles = []; // ambient floating dust
var hazardMarkers = [];
var dying = false;
var deathTimer = 0;
var freezeFrame = 0;
var timeDilation = 1.0;

var cubeRotation = 0;
var vpMatrix = mat4.create(); // shared view-projection for world-to-screen
var afterimages = []; // player afterimages on lane switch
var shockwaves = []; // landing shockwave rings
var playerLastX = null; // track player X for afterimage spawning

// Cached DOM refs (updated once on init)
var _distFill = null, _distText = null, _streakBar = null, _streakPanel = null, _streakEl = null;

// ========== Web Audio SFX ==========
var audioCtx = null;
var sfxMasterGain = null;

function hasUserActivation() {
    return !navigator.userActivation || navigator.userActivation.hasBeenActive;
}

function safeVibrate(pattern) {
    if (navigator.vibrate && hasUserActivation()) {
        navigator.vibrate(pattern);
    }
}

function initSfx() {
    if (audioCtx) return;
    if (!hasUserActivation()) return;
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    audioCtx = new AudioContext();
    sfxMasterGain = audioCtx.createGain();
    var storedVolume = 0.5;
    try {
        var raw = localStorage.getItem('ss_audio');
        if (raw) {
            var v = Number(JSON.parse(raw).sfx);
            if (isFinite(v)) storedVolume = v;
        }
    } catch (e) {}
    sfxMasterGain.gain.value = Math.max(0, Math.min(1, storedVolume)) * 0.8;
    sfxMasterGain.connect(audioCtx.destination);
}

function setSfxVolume(volume) {
    var safeVolume = Math.max(0, Math.min(1, Number(volume) || 0));
    if (sfxMasterGain) {
        sfxMasterGain.gain.value = safeVolume * 0.8;
    }
}

function resumeSfx() {
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playCoinSound() {
    initSfx();
    resumeSfx();
    if (!audioCtx) return;
    var mult = typeof scoreMultiplier !== 'undefined' ? scoreMultiplier : 1;
    var streak = typeof multiplierStreak !== 'undefined' ? multiplierStreak : 1;
    var t = audioCtx.currentTime;
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.type = 'sine';
    var streakBoost = Math.min(5, streak / 3) * 100;
    var baseFreq = 1100 + (mult - 1) * 300 + streakBoost;
    var peakFreq = 1900 + (mult - 1) * 400 + streakBoost;
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(peakFreq, t + 0.08);
    var vol = 0.25 + Math.min(0.15, streak / 40);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(gain);
    gain.connect(sfxMasterGain);
    osc.start(t);
    osc.stop(t + 0.2);
}

function playPowerUpSound() {
    initSfx();
    resumeSfx();
    if (!audioCtx) return;
    var t = audioCtx.currentTime;
    // Two rising tones for power-up jingle
    var osc1 = audioCtx.createOscillator();
    var osc2 = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc1.type = 'sine';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(523, t);
    osc1.frequency.exponentialRampToValueAtTime(1046, t + 0.25);
    osc2.frequency.setValueAtTime(659, t);
    osc2.frequency.exponentialRampToValueAtTime(1318, t + 0.25);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(sfxMasterGain);
    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.4);
    osc2.stop(t + 0.4);
}

function playBumpSound() {
    initSfx();
    resumeSfx();
    if (!audioCtx) return;
    var t = audioCtx.currentTime;
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.25);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(gain);
    gain.connect(sfxMasterGain);
    osc.start(t);
    osc.stop(t + 0.3);
}

var trainRumbleOsc = null;
var trainRumbleGain = null;

function updateTrainRumble(intensity) {
    initSfx();
    resumeSfx();
    if (!audioCtx) return;
    if (intensity <= 0) {
        if (trainRumbleGain) {
            try { trainRumbleGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1); } catch(e) {}
        }
        return;
    }
    if (!trainRumbleOsc) {
        trainRumbleOsc = audioCtx.createOscillator();
        trainRumbleGain = audioCtx.createGain();
        // Start silent — the default gain of 1.0 would blast a sawtooth
        // burst before the first setTargetAtTime ramp settles
        trainRumbleGain.gain.value = 0;
        trainRumbleOsc.type = 'sawtooth';
        trainRumbleOsc.frequency.value = 45;
        // Lowpass filter for rumble
        var filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 120;
        trainRumbleOsc.connect(filter);
        filter.connect(trainRumbleGain);
        trainRumbleGain.connect(sfxMasterGain);
        trainRumbleOsc.start();
    }
    var t = audioCtx.currentTime;
    var vol = Math.min(0.25, intensity * 0.15);
    trainRumbleGain.gain.setTargetAtTime(vol, t, 0.05);
    trainRumbleOsc.frequency.setTargetAtTime(40 + intensity * 15, t, 0.05);
}

function playVictorySound() {
    initSfx();
    resumeSfx();
    if (!audioCtx) return;
    var t = audioCtx.currentTime;
    // Ascending fanfare arpeggio (C5 E5 G5 C6)
    var notes = [523.25, 659.25, 783.99, 1046.5];
    for (var i = 0; i < notes.length; i++) {
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = notes[i];
        var st = t + i * 0.12;
        var isLast = i === notes.length - 1;
        gain.gain.setValueAtTime(0, st);
        gain.gain.linearRampToValueAtTime(0.22, st + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, st + (isLast ? 0.6 : 0.25));
        osc.connect(gain);
        gain.connect(sfxMasterGain);
        osc.start(st);
        osc.stop(st + (isLast ? 0.7 : 0.3));
    }
}

function playJumpSound() {
    initSfx();
    resumeSfx();
    if (!audioCtx) return;
    var t = audioCtx.currentTime;
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.1);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain);
    gain.connect(sfxMasterGain);
    osc.start(t);
    osc.stop(t + 0.25);
}

function applyTheme(t) {
  track_texture = themeTextures[t].track;
  wall_texture = themeTextures[t].wall;
  city_texture = themeTextures[t].city;
  player_texture = themeTextures[t].player;
  police_texture = themeTextures[t].police;
  coin_texture = themeTextures[t].coin;
  train_texture = themeTextures[t].train;
  box_texture = themeTextures[t].box;
  manhole_texture = themeTextures[t].manhole;
  stop_texture = themeTextures[t].stop;
  stand_texture = themeTextures[t].stand;
  boots_texture = themeTextures[t].boots;
  fb_texture = themeTextures[t].fb;
  hoverboard_texture = themeTextures[t].hoverboard;
  dog_texture = themeTextures[t].dog;
}

function resetGameStartTiming() {
  d = new Date();
  startTime = d.getTime() * 0.001;
  policeCaughtUp = startTime;
}

function keepOpeningLaneSafe(x, z) {
  if (z > -320 && x === -6) {
    return Math.random() < 0.5 ? 0 : 6;
  }
  return x;
}

function laneFromRandom() {
  var j = Math.floor(Math.random() * 3);
  if (j == 0) return -6;
  if (j == 1) return 0;
  return 6;
}

function addHazardMarker(x, z, type) {
  hazardMarkers.push({
    x: x,
    z: z,
    type: type || 'danger',
    pulse: Math.random() * Math.PI * 2
  });
}

main();

function main() {
  try {
    // Cache DOM refs
    _distFill = document.getElementById('distance-fill');
    _distText = document.getElementById('distance-text');
    _streakBar = document.getElementById('streak-bar');
    _streakPanel = document.getElementById('hud-streak-panel');
    _streakEl = document.getElementById('hud-streak');

    const canvas = document.querySelector('#glcanvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    d = new Date();
    startTime = d.getTime() * 0.001;
    policeCaughtUp = startTime;

    if (!gl) {
      alert('Unable to initialize WebGL. Your browser or machine may not support it.');
      gameReady = true;
      return;
    }

    // 标记游戏已初始化完成，允许键盘输入
    gameReady = true;

  const vsSource = `
  attribute vec4 aVertexPosition;
  attribute vec3 aVertexNormal;
  attribute vec2 aTextureCoord;

  uniform mat4 uNormalMatrix;
  uniform mat4 uModelViewMatrix;
  uniform mat4 uProjectionMatrix;

  varying highp vec2 vTextureCoord;
  varying highp vec3 vLighting;
  varying highp float vFogDepth;

  void main(void) {
    gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
    vTextureCoord = aTextureCoord;

    // Apply lighting effect
    highp vec3 ambientLight = vec3(0.3, 0.3, 0.3);
    highp vec3 directionalLightColor = vec3(1, 1, 1);
    highp vec3 directionalVector = normalize(vec3(0.85, 0.8, 0.75));

    highp vec4 transformedNormal = uNormalMatrix * vec4(aVertexNormal, 1.0);

    highp float directional = max(dot(transformedNormal.xyz, directionalVector), 0.0);
    vLighting = ambientLight + (directionalLightColor * directional);

    // Fog depth = distance from camera in view space
    vFogDepth = -(uModelViewMatrix * aVertexPosition).z;
  }
`;

  const vsSourcehigh = `
  attribute vec4 aVertexPosition;
  attribute vec3 aVertexNormal;
  attribute vec2 aTextureCoord;

  uniform mat4 uNormalMatrix;
  uniform mat4 uModelViewMatrix;
  uniform mat4 uProjectionMatrix;

  varying highp vec2 vTextureCoord;
  varying highp vec3 vLighting;
  varying highp float vFogDepth;

  void main(void) {
    gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
    vTextureCoord = aTextureCoord;

    // Apply lighting effect
    highp vec3 ambientLight = vec3(0.3, 0.3, 0.3);
    highp vec3 directionalLightColor = vec3(1, 1, 1);
    highp vec3 directionalVector = normalize(vec3(0.85, 0.8, 0.75));

    highp vec4 transformedNormal = uNormalMatrix * vec4(aVertexNormal, 1.0);

    highp float directional = max(dot(transformedNormal.xyz, directionalVector), 1.0);
    vLighting = ambientLight + (directionalLightColor * directional);

    vFogDepth = -(uModelViewMatrix * aVertexPosition).z;
  }
`;

  const fsSource = `
    varying highp vec2 vTextureCoord;
    varying highp vec3 vLighting;
    varying highp float vFogDepth;

    uniform sampler2D uSampler;
    uniform highp vec3 uFogColor;
    uniform highp float uFogNear;
    uniform highp float uFogFar;
    uniform highp float uGlow;
    uniform highp float uAlpha;

    void main(void) {
      highp vec4 texelColor = texture2D(uSampler, vTextureCoord);
      highp vec4 litColor = vec4(texelColor.rgb * vLighting, texelColor.a);

      // Neon glow boost
      litColor.rgb += texelColor.rgb * uGlow;

      highp float fogAmount = smoothstep(uFogNear, uFogFar, vFogDepth);
      gl_FragColor = mix(litColor, vec4(uFogColor, litColor.a), fogAmount);
      gl_FragColor.a *= uAlpha;
    }
  `;

  const fsSourcebw = `
    varying highp vec2 vTextureCoord;
    varying highp vec3 vLighting;
    varying highp float vFogDepth;

    uniform sampler2D uSampler;
    uniform highp vec3 uFogColor;
    uniform highp float uFogNear;
    uniform highp float uFogFar;
    uniform highp float uGlow;
    uniform highp float uAlpha;

    void main(void) {
      highp vec4 texelColor = texture2D(uSampler, vTextureCoord);
      highp vec4 litColor = vec4(texelColor.rrr * vLighting, texelColor.a);

      litColor.rgb += texelColor.rrr * uGlow;

      highp float fogAmount = smoothstep(uFogNear, uFogFar, vFogDepth);
      gl_FragColor = mix(litColor, vec4(uFogColor, litColor.a), fogAmount);
      gl_FragColor.a *= uAlpha;
    }
  `;

  const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
  const shaderProgrambw = initShaderProgram(gl, vsSource, fsSourcebw);
  const shaderProgramhigh = initShaderProgram(gl, vsSourcehigh, fsSource);

  // Preload ALL theme textures once at startup
  themeTextures[1] = {
    track: loadTexture(gl, 'assets/1_Track.jpg'),
    wall: loadTexture(gl, 'assets/1_Wall.jpg'),
    city: loadTexture(gl, 'assets/1_City.jpg'),
    player: loadTexture(gl, 'assets/1_Player.jpeg'),
    police: loadTexture(gl, 'assets/1_Police.png'),
    coin: loadTexture(gl, 'assets/1_Coin.jpg'),
    train: loadTexture(gl, 'assets/1_Train.jpeg'),
    box: loadTexture(gl, 'assets/1_Box.png'),
    manhole: loadTexture(gl, 'assets/1_Manhole.jpeg'),
    stop: loadTexture(gl, 'assets/1_Stop.jpg'),
    stand: loadTexture(gl, 'assets/1_Stand.jpeg'),
    boots: loadTexture(gl, 'assets/1_Boots.jpeg'),
    fb: loadTexture(gl, 'assets/1_FlyingBoost.jpeg'),
    hoverboard: loadTexture(gl, 'assets/1_Hoverboard.jpeg'),
    dog: loadTexture(gl, 'assets/1_Dog.jpeg'),
  };
  themeTextures[2] = {
    track: loadTexture(gl, 'assets/2_Track.jpeg'),
    wall: loadTexture(gl, 'assets/2_Wall.jpeg'),
    city: loadTexture(gl, 'assets/2_City.jpg'),
    player: loadTexture(gl, 'assets/2_Player.jpeg'),
    police: loadTexture(gl, 'assets/2_Police.jpeg'),
    coin: loadTexture(gl, 'assets/2_Coin.jpeg'),
    train: loadTexture(gl, 'assets/2_Train.jpg'),
    box: loadTexture(gl, 'assets/2_Box.jpg'),
    manhole: loadTexture(gl, 'assets/2_Manhole.jpeg'),
    stop: loadTexture(gl, 'assets/2_Stop.jpeg'),
    stand: loadTexture(gl, 'assets/2_Stand.jpg'),
    boots: loadTexture(gl, 'assets/2_Boots.jpg'),
    fb: loadTexture(gl, 'assets/2_FlyingBoost.jpg'),
    hoverboard: loadTexture(gl, 'assets/2_Hoverboard.jpg'),
    dog: loadTexture(gl, 'assets/1_Dog.jpeg'),
  };
  particle_texture = loadTexture(gl, 'assets/1_Coin.jpg');
  dust_texture = loadTexture(gl, 'assets/1_Dust.png');
  glow_cyan_texture = loadTexture(gl, 'assets/1_GlowCyan.png');
  glow_pink_texture = loadTexture(gl, 'assets/1_GlowPink.png');
  glow_gold_texture = loadTexture(gl, 'assets/1_GlowGold.png');

  applyTheme(1);

  const programInfo = {
    program: shaderProgram,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
      vertexNormal: gl.getAttribLocation(shaderProgram, 'aVertexNormal'),
      textureCoord: gl.getAttribLocation(shaderProgram, 'aTextureCoord'),
    },
    uniformLocations: {
      projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
      modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
      normalMatrix: gl.getUniformLocation(shaderProgram, 'uNormalMatrix'),
      uSampler: gl.getUniformLocation(shaderProgram, 'uSampler'),
      uFogColor: gl.getUniformLocation(shaderProgram, 'uFogColor'),
      uFogNear: gl.getUniformLocation(shaderProgram, 'uFogNear'),
      uFogFar: gl.getUniformLocation(shaderProgram, 'uFogFar'),
      uGlow: gl.getUniformLocation(shaderProgram, 'uGlow'),
      uAlpha: gl.getUniformLocation(shaderProgram, 'uAlpha'),
    },
  };

  const programInfobw = {
    program: shaderProgrambw,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(shaderProgrambw, 'aVertexPosition'),
      vertexNormal: gl.getAttribLocation(shaderProgrambw, 'aVertexNormal'),
      textureCoord: gl.getAttribLocation(shaderProgrambw, 'aTextureCoord'),
    },
    uniformLocations: {
      projectionMatrix: gl.getUniformLocation(shaderProgrambw, 'uProjectionMatrix'),
      modelViewMatrix: gl.getUniformLocation(shaderProgrambw, 'uModelViewMatrix'),
      normalMatrix: gl.getUniformLocation(shaderProgrambw, 'uNormalMatrix'),
      uSampler: gl.getUniformLocation(shaderProgrambw, 'uSampler'),
      uFogColor: gl.getUniformLocation(shaderProgrambw, 'uFogColor'),
      uFogNear: gl.getUniformLocation(shaderProgrambw, 'uFogNear'),
      uFogFar: gl.getUniformLocation(shaderProgrambw, 'uFogFar'),
      uGlow: gl.getUniformLocation(shaderProgrambw, 'uGlow'),
      uAlpha: gl.getUniformLocation(shaderProgrambw, 'uAlpha'),
    },
  };

  const programInfohigh = {
    program: shaderProgramhigh,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(shaderProgramhigh, 'aVertexPosition'),
      vertexNormal: gl.getAttribLocation(shaderProgramhigh, 'aVertexNormal'),
      textureCoord: gl.getAttribLocation(shaderProgramhigh, 'aTextureCoord'),
    },
    uniformLocations: {
      projectionMatrix: gl.getUniformLocation(shaderProgramhigh, 'uProjectionMatrix'),
      modelViewMatrix: gl.getUniformLocation(shaderProgramhigh, 'uModelViewMatrix'),
      normalMatrix: gl.getUniformLocation(shaderProgramhigh, 'uNormalMatrix'),
      uSampler: gl.getUniformLocation(shaderProgramhigh, 'uSampler'),
      uFogColor: gl.getUniformLocation(shaderProgramhigh, 'uFogColor'),
      uFogNear: gl.getUniformLocation(shaderProgramhigh, 'uFogNear'),
      uFogFar: gl.getUniformLocation(shaderProgramhigh, 'uFogFar'),
      uGlow: gl.getUniformLocation(shaderProgramhigh, 'uGlow'),
      uAlpha: gl.getUniformLocation(shaderProgramhigh, 'uAlpha'),
    },
  };

  for (var i = 0; i < 1000; i += 1) {
    wall.push(new Wall(gl, [0, 0, -i * 5]));
    city.push(new City(gl, [0, 5, -i * 10]));
  }

  for (var i = 0; i < 1000; i += 1) {
    track1.push(new Track(gl, [-6, 0, -i * 5]));
    track2.push(new Track(gl, [0, 0, -i * 5]));
    track3.push(new Track(gl, [6, 0, -i * 5]));
  }

  player = new Player(gl, [-6, -4, -4]);
  player.speedz = player_speed;
  police = new Police(gl, [-6, -4, 0]);
  police.speedz = player_speed;
  dog = new Dog(gl, [player.pos[0] + 2, -4.5, -2])
  dog.speedz = player_speed;

  for (var i = 0; i < 50; i++) {
    var x, y, z;
    x = laneFromRandom();
    y = -4;
    if (i == 0)
      z = -30;
    else
      z = coins[coins.length - 1].pos[2] - (Math.random() * 30 - 15);
    var num_coins = Math.floor(Math.random() * 5 + 5);
    var pattern = Math.floor(Math.random() * 3);
    for (var k = 0; k < num_coins; k++) {
      var coinY = y;
      if (pattern == 1) coinY = y + Math.sin(k / Math.max(1, num_coins - 1) * Math.PI) * 2.4;
      else if (pattern == 2 && k % 3 == 1) coinY = y + 1.4;
      coins.push(new Coin(gl, [x, coinY, z]));
      z -= 2.5;
    }
  }

  for (var i = 0; i < 10; i++) {
    var x, y, z;
    x = laneFromRandom();
    y = -4;
    z = - (i + 1) * 79;
    x = keepOpeningLaneSafe(x, z);
    addHazardMarker(x, z + 18, 'train');
    // Train body: front, top, left, right, bottom, back panels
    trainF.push(new Train(gl, [x, y, z + 10], 10, 3, 0.1));
    trainT.push(new Train(gl, [x, y + 5, z], 0.1, 3, 20));
    trainL.push(new Train(gl, [x - 1.5, y, z], 10, 0.1, 20));
    trainR.push(new Train(gl, [x + 1.5, y, z], 10, 0.1, 20));
    // Bottom panel
    trainExtra.push(new Train(gl, [x, y - 5, z], 0.1, 3, 20));
    // Back panel
    trainExtra.push(new Train(gl, [x, y, z - 10], 10, 3, 0.1));
    // 4 wheels with X-axis rotation for rolling effect
    var ws = 0.8;
    var w1 = new Train(gl, [x - 1.2, y - 5.4, z + 7], ws, ws, ws);
    w1.rotAxis = [1, 0, 0];
    var w2 = new Train(gl, [x + 1.2, y - 5.4, z + 7], ws, ws, ws);
    w2.rotAxis = [1, 0, 0];
    var w3 = new Train(gl, [x - 1.2, y - 5.4, z - 7], ws, ws, ws);
    w3.rotAxis = [1, 0, 0];
    var w4 = new Train(gl, [x + 1.2, y - 5.4, z - 7], ws, ws, ws);
    w4.rotAxis = [1, 0, 0];
    trainExtra.push(w1);
    trainExtra.push(w2);
    trainExtra.push(w3);
    trainExtra.push(w4);

    var train_speed;
    var j = Math.floor(Math.random() * 3);
    if (j == 0)
      train_speed = 0.2;
    else if (j == 1)
      train_speed = 0.5;
    else
      train_speed = 0.7;
    train_speeds.push(train_speed);
  }

  for (var i = 0; i < 10; i++) {
    var x, y, z;
    x = laneFromRandom();
    y = -3.4;
    z = - i * 73 - 40;
    x = keepOpeningLaneSafe(x, z);
    addHazardMarker(x, z + 8, 'box');
    // Box obstacle (more crate-like proportions)
    boxes.push(new Box(gl, [x, y, z], 3.5, 4.5, 5));
  }

  for (var i = 0; i < 10; i++) {
    var x, y, z;
    x = laneFromRandom();
    y = -5.1;
    z = - (i + 1) * 151;
    x = keepOpeningLaneSafe(x, z);
    addHazardMarker(x, z + 8, 'gap');
    manholes.push(new Manhole(gl, [x, y, z], 0.6, 4, 4));
  }

  for (var i = 0; i < 20; i++) {
    var x, y, z;
    x = laneFromRandom();
    y = 0;
    z = -i * 61 - 30;
    x = keepOpeningLaneSafe(x, z);
    addHazardMarker(x, z + 7, 'duck');
    duck_obs_stop.push(new Stop(gl, [x, y, z], 7, 3, 0.1));
    duck_obs_stand1.push(new Stand(gl, [x + 1.5, y - 2, z], 6, 0.2, 0.1));
    duck_obs_stand2.push(new Stand(gl, [x - 1.5, y - 2, z], 6, 0.2, 0.1));
  }

  for (var i = 0; i < 20; i++) {
    var x, y, z;
    x = laneFromRandom();
    y = -3;
    z = -(i + 1) * 53;
    x = keepOpeningLaneSafe(x, z);
    addHazardMarker(x, z + 7, 'jump');
    jump_obs.push(new Stop(gl, [x, y, z], 3, 3, 1));
  }

  for (var i = 0; i < 6; i++) {
    var x, y, z;
    y = -3.5;
    z = -(i + 1) * 127;
    addHazardMarker(0, z + 8, 'rope');
    rope_stand1.push(new Stand(gl, [-8, y - 1, z], 2, 0.4, 0.1));
    rope_stand2.push(new Stand(gl, [8, y - 1, z], 2, 0.4, 0.1));
    rope_stop.push(new Stop(gl, [0, y, z], 0.3, 16, 0.1));
  }

  for (var i = 0; i < 5; i++) {
    var x, y, z;
    x = laneFromRandom();
    y = 0;
    z = -(i + 1) * 103;
    boots.push(new Boots(gl, [x, y, z], 1.5, 1.5, 1.5));
  }

  for (var i = 0; i < 5; i++) {
    var x, y, z;
    x = laneFromRandom();
    y = 0;
    z = -i * 157 - 60;
    flying_boost.push(new FlyingBoost(gl, [x, y, z], 1.5, 1.5, 1.5));
  }

  hoverboard.push(new Hoverboard(gl, [0, 0, -150], 1.5, 1.5, 1.5));
  hoverboard.push(new Hoverboard(gl, [0, 0, -400], 1.5, 1.5, 1.5));

  // Initialize ambient dust particles (small golden motes floating in light shafts)
  for (var i = 0; i < 30; i++) {
    envParticles.push({
      pos: [(Math.random()-0.5)*20, Math.random()*8 - 2, -Math.random()*100],
      vel: [(Math.random()-0.5)*0.3, (Math.random()-0.5)*0.1, (Math.random()-0.5)*0.3],
      phase: Math.random()*Math.PI*2
    });
  }

  var then = 0;

  function render(now) {
    if (typeof uiUpdateFPS === 'function') uiUpdateFPS();
    if (window.gamePaused) {
      requestAnimationFrame(render);
      return;
    }
    now *= 0.001;  // convert to seconds
    var deltaTime = now - then;
    if (deltaTime > 0.1) deltaTime = 0.1; // cap to prevent tab-inactive jumps
    then = now;

    // Select shader program
    var activeProgram = programInfo;
    if (greyScale) activeProgram = programInfobw;
    else if (flashing) {
      d = new Date();
      if (Math.floor(d.getTime() * 0.001 - flash_start_time) % 2 != 0) activeProgram = programInfohigh;
    }

    // Freeze frame on death impact (render but don't update)
    if (freezeFrame > 0) {
      freezeFrame--;
      drawScene(gl, activeProgram, 0);
      requestAnimationFrame(render);
      return;
    }

    d = new Date();
    if (obstacle_hit != -1) {
      if (d.getTime() * 0.001 - obstacle_hit_time >= 10) {
        obstacle_hit = -1;
        player.speedz = player_speed;
        policeCaughtUp = d.getTime() * 0.001;
        // Recovery celebration
        if (typeof flashScreen === 'function') flashScreen('rgba(0,255,136,0.1)', 0.2);
        if (typeof showComboText === 'function') {
          var rect = document.getElementById('glcanvas').getBoundingClientRect();
          showComboText('Recovered!', rect.left + rect.width / 2, rect.top + rect.height * 0.3);
        }
        for (var p = 0; p < 6; p++) {
          particles.push(new Particle(gl, [player.pos[0], player.pos[1], player.pos[2]], [(Math.random()-0.5)*2, Math.random()*2+0.5, (Math.random()-0.5)*2], 0.4, glow_cyan_texture));
        }
      }
    }

    // Difficulty scaling: speed slowly increases with distance
    var distance = -player.pos[2];
    score = distance + coins_collected;
    player_speed = 0.5 + Math.min(0.5, distance / 3000);
    // Update distance progress bar
    if (_distFill && _distText) {
      var progress = Math.min(100, (distance / 800) * 100);
      _distFill.style.width = progress + '%';
      _distText.textContent = Math.floor(distance) + 'm / 800m';
    }
    if (obstacle_hit == -1) {
      player.speedz = player_speed;
    }

    // Death slow-motion: gradually freeze time then end game
    if (dying) {
      deathTimer += deltaTime;
      player.speedz *= 0.85;
      cameraShake *= 0.9;
      cam_z_target += 0.15; // camera pulls back on death
      if (deathTimer > 0.8) {
        dying = false;
        deathTimer = 0;
        cam_z_target = 13.0;
        if (typeof uiGameOver === 'function') { uiGameOver(false, score, coins_collected); }
        return;
      }
      // Vignette darkening via screen flash overlay
      if (typeof flashScreen === 'function' && deathTimer > 0.3) {
        var darken = Math.min(0.4, (deathTimer - 0.3) * 0.8);
        flashScreen('rgba(0,0,0,' + darken + ')', 0.05);
      }
    }

    if (player.jumping_boots) {
      if (d.getTime() * 0.001 - boots_acquired >= 10) {
        player.jumping_boots = false;
        jump_height = 0;
        jumping = false;
      }
    }

    if (player.fly_boost) {
      if (d.getTime() * 0.001 - fb_acquired >= 10) {
        player.fly_boost = false;
        player.pos[1] = -4;
        dog.pos[2] = player.pos[2] + 2;
        cam_y_target = 5;
        jumping = false;
      }
    }

    if (player.hoverboard) {
      if (d.getTime() * 0.001 - hoverboard_acquired >= 10) {
        player.hoverboard = false;
        jumping = false;
      }
    }

    // Time dilation (near-miss slow-mo effect)
    if (timeDilation < 1.0) {
      timeDilation += 0.03;
      if (timeDilation > 1.0) timeDilation = 1.0;
    }

    // move forward
    var effectiveSpeed = player.speedz * timeDilation;
    player.pos[2] -= effectiveSpeed;
    cam_z -= effectiveSpeed;
    dog.pos[2] -= effectiveSpeed;

    // smooth camera vertical follow
    var camDiff = cam_y_target - cam_y;
    cam_y += camDiff * 0.08;
    target_y = cam_y - 7.2;

    // start-of-game camera push-in animation
    if (gameStartAnim) {
      cam_z += (cam_z_target - cam_z) * 0.025;
      cam_y += (cam_y_target - cam_y) * 0.04;
      currentFov += (45 - currentFov) * 0.04;
      if (Math.abs(cam_z - cam_z_target) < 0.1) {
        cam_z = cam_z_target;
        cam_y = cam_y_target;
        currentFov = 45;
        gameStartAnim = false;
      }
    }

    // recover tilt back to upright
    if (player.tilt > 0) { player.tilt -= 0.02; if (player.tilt < 0) player.tilt = 0; }
    if (player.tilt < 0) { player.tilt += 0.02; if (player.tilt > 0) player.tilt = 0; }
    d = new Date();
    var policeTimer = d.getTime() * 0.001 - policeCaughtUp;
    if (policeTimer >= 5 && policeTimer <= 10)
      police.speedz = player_speed / 2;
    else
      police.speedz = player_speed;
    police.pos[2] -= police.speedz
    // Police approaching warning (first 5 seconds after obstacle hit)
    if (policeTimer > 0 && policeTimer < 5 && typeof flashScreen === 'function') {
      var warnIntensity = 1.0 - policeTimer / 5;
      if (Math.sin(Date.now() * 0.008) > 0.8) {
        flashScreen('rgba(255,0,0,' + (warnIntensity * 0.08) + ')', 0.05);
      }
    }

    // Afterimage on lane switch
    if (playerLastX !== null && playerLastX !== player.pos[0]) {
      afterimages.push({
        x: playerLastX,
        y: player.pos[1],
        z: player.pos[2],
        life: 0.25,
        maxLife: 0.25,
        tilt: player.tilt
      });
    }
    playerLastX = player.pos[0];

    if (player.pos[0] > 6)
      player.pos[0] = 6;
    if (player.pos[0] < -6)
      player.pos[0] = -6;
    police.pos[0] = player.pos[0];
    police.pos[1] = player.pos[1];
    dog.pos[0] = player.pos[0] + 2;

    // Distance milestone celebration
    var dist = Math.floor(-player.pos[2]);
    if (dist >= lastMilestone + 100) {
      lastMilestone = dist - (dist % 100);
      if (typeof flashScreen === 'function') flashScreen('#ffffff', 0.2);
      if (typeof showComboText === 'function') {
        var rect = document.getElementById('glcanvas').getBoundingClientRect();
        showComboText(lastMilestone + 'm', rect.left + rect.width / 2, rect.top + rect.height * 0.35);
      }
      // Firework burst
      for (var p = 0; p < 24; p++) {
        var angle = Math.random() * Math.PI * 2;
        var speed = 2.0 + Math.random() * 4.0;
        particles.push(new Particle(gl,
          [player.pos[0] + (Math.random()-0.5)*0.5, player.pos[1] + 0.5, player.pos[2]],
          [Math.cos(angle)*speed, Math.random()*5.0 + 2.0, Math.sin(angle)*speed],
          0.6 + Math.random()*0.4, glow_gold_texture));
      }
    }

    // x3 multiplier golden aura pulse
    if (scoreMultiplier >= 3) {
      var pulsePhase = Date.now() * 0.003;
      if (Math.sin(pulsePhase) > 0.95 && typeof flashScreen === 'function') {
        flashScreen('rgba(255,215,0,0.08)', 0.1);
      }
    }

    // Power-up active screen tint
    if (player.hoverboard && typeof flashScreen === 'function') {
      flashScreen('rgba(0,255,136,0.03)', 0.05);
    }
    if (player.fly_boost && typeof flashScreen === 'function') {
      flashScreen('rgba(255,42,109,0.04)', 0.05);
    }

    // Train proximity warning (red edge flash when train is close behind on same track)
    var num_trains_warn = trainF.length;
    for (var i = 0; i < num_trains_warn; i++) {
      if (trainF[i].pos[0] == player.pos[0]) {
        var zdist_warn = player.pos[2] - trainF[i].pos[2];
        if (zdist_warn > 5 && zdist_warn < 20) {
          if (typeof flashScreen === 'function') flashScreen('rgba(255,0,0,0.06)', 0.08);
          break;
        }
      }
    }

    if (!player.fly_boost) {
      // jump
      if (jumping) {
        player.pos[1] += player.speedy;
        player.speedy -= 0.01;
        police.pos[1] = player.pos[1];
        // Wind streak particles on jump
        if (Math.random() < 0.3) {
          particles.push(new Particle(gl,
            [player.pos[0] + (Math.random()-0.5)*0.5, player.pos[1] - 0.5, player.pos[2] + 1.0],
            [(Math.random()-0.5)*0.5, -0.5 - Math.random(), 3.0 + Math.random()*2.0],
            0.15 + Math.random()*0.1, dust_texture));
        }
        if (player.pos[1] >= jump_height) {
          player.pos[1] = jump_height;
          jumping = false;
          player.speedy = 0.05;
          wasInAir = true;
        }
      }

      if (jumping == false) {
        if (player.pos[1] > -4) {
          player.speedy += 0.02;
          player.pos[1] -= player.speedy;
          // jump onto train
          var n = trainF.length;
          for (var i = 0; i < n; i++) {
            if (player.pos[0] == trainF[i].pos[0]) {
              if (player.pos[1] <= trainT[i].pos[1] + 1 && player.pos[1] >= trainT[i].pos[1]) {
                if (player.pos[2] <= trainF[i].pos[2] && player.pos[2] >= trainF[i].pos[2] - 20) {
                  player.pos[1] = trainT[i].pos[1] + 1;
                  break;
                }
              }
            }
          }
          // jump onto box
          var numBoxes = boxes.length;
          for (var i = 0; i < numBoxes; i++) {
            if (player.pos[0] == boxes[i].pos[0]) {
              if (player.pos[1] <= boxes[i].pos[1] + 3.5) {
                if (player.pos[2] <= boxes[i].pos[2] + 3.5 && player.pos[2] >= boxes[i].pos[2] - 3.5) {
                  player.pos[1] = boxes[i].pos[1] + 3.5;
                  break;
                }
              }
            }
          }
          if (player.pos[1] < -4 && !ducking) {
            if (wasInAir) {
              wasInAir = false;
              // Landing camera dip
              cam_y_target -= 0.4;
              if (typeof playBumpSound === 'function') playBumpSound();
              for (var p = 0; p < 8; p++) {
                var vx = (Math.random() - 0.5) * 3.0;
                var vy = Math.random() * 2.0 + 0.5;
                var vz = (Math.random() - 0.5) * 3.0;
                particles.push(new Particle(gl, [player.pos[0], -4.2, player.pos[2]], [vx, vy, vz], 0.4 + Math.random() * 0.3, dust_texture));
              }
              shockwaves.push({ x: player.pos[0], z: player.pos[2], life: 0.4, maxLife: 0.4 });
              // Perfect landing bonus from high fall
              if (player.speedy > 0.15) {
                coins_collected += 1;
                if (typeof showScorePopup === 'function') {
                  var sp = worldToScreen(player.pos[0], player.pos[1], player.pos[2]);
                  if (sp) showScorePopup('+1', sp.x, sp.y, '#ffffff');
                }
                if (typeof showComboText === 'function') {
                  var rect = document.getElementById('glcanvas').getBoundingClientRect();
                  showComboText('Nice Landing!', rect.left + rect.width / 2, rect.top + rect.height * 0.45);
                }
              }
            }
            player.pos[1] = -4;
            player.speedy = 0;
          }
          police.pos[1] = player.pos[1];
        }
      }

      // duck
      if (ducking) {
        player.pos[1] -= player.speedy;
        police.pos[1] = player.pos[1];
        if (player.pos[1] <= duck_ground) {
          ducking = false;
          player.speedy = 0.05;
        }
      }

      if (ducking == false) {
        if (player.pos[1] < -4) {
          player.pos[1] += player.speedy;
          if (player.pos[1] > -4 && !jumping) {
            if (wasInAir) {
              wasInAir = false;
              for (var p = 0; p < 8; p++) {
                var vx = (Math.random() - 0.5) * 3.0;
                var vy = Math.random() * 2.0 + 0.5;
                var vz = (Math.random() - 0.5) * 3.0;
                particles.push(new Particle(gl, [player.pos[0], -4.2, player.pos[2]], [vx, vy, vz], 0.4 + Math.random() * 0.3, dust_texture));
              }
              shockwaves.push({ x: player.pos[0], z: player.pos[2], life: 0.4, maxLife: 0.4 });
            }
            player.pos[1] = -4;
            player.speedy = 0.05;
          }
          police.pos[1] = player.pos[1];
        }
      }
    }

    // train movement
    var num_trains = trainF.length;
    for (var i = 0; i < num_trains; i++) {
      var tSpeed = train_speeds[i] * timeDilation;
      trainF[i].pos[2] += tSpeed;
      trainT[i].pos[2] += tSpeed;
      trainL[i].pos[2] += tSpeed;
      trainR[i].pos[2] += tSpeed;
      // Sync extra parts (bottom, back, 4 wheels) with the train
      for (var j = 0; j < 6; j++) {
        trainExtra[i * 6 + j].pos[2] += tSpeed;
      }
      // Rotate wheels based on speed (scaled for visual effect)
      for (var j = 2; j < 6; j++) {
        trainExtra[i * 6 + j].rotation += tSpeed * 0.5;
      }
    }

    // coins collecting + magnet pull effect
    var num_coins = coins.length;
    for (var i = 0; i < num_coins; i++) {
      if (coins[i].exist == true) {
        // Magnet pull: if coin is close horizontally and vertically, pull it toward player
        var dx = player.pos[0] - coins[i].pos[0];
        var dy = player.pos[1] - coins[i].pos[1];
        var dz = player.pos[2] - coins[i].pos[2];
        var distSq = dx*dx + dy*dy + dz*dz;
        if (distSq < 36.0) { // within 6 units
          var pull = 0.08;
          // Coin spins faster when being pulled
          coins[i].speed = 0.3;
          // Coin trail when being pulled
          if (Math.random() < 0.25) {
            particles.push(new Particle(gl,
              [coins[i].pos[0], coins[i].pos[1], coins[i].pos[2]],
              [(Math.random()-0.5)*0.5, (Math.random()-0.5)*0.5, (Math.random()-0.5)*0.5],
              0.2 + Math.random()*0.15, glow_gold_texture));
          }
          coins[i].pos[0] += dx * pull;
          coins[i].pos[1] += dy * pull;
          coins[i].pos[2] += dz * pull;
        }
        if (coins[i].pos[0] == player.pos[0]) {
          if (coins[i].pos[1] >= player.pos[1] - 0.75 && coins[i].pos[1] <= player.pos[1] + 0.75) {
            if (coins[i].pos[2] >= player.pos[2] - 0.5 && coins[i].pos[2] <= player.pos[2] + 0.5) {
              coins[i].exist = false;
              var now = Date.now() * 0.001;
              var prevMult = scoreMultiplier;
              if (now - lastCoinTime < 2.0) {
                multiplierStreak += 1;
              } else {
                multiplierStreak = 1;
              }
              if (multiplierStreak > bestStreak) bestStreak = multiplierStreak;
              lastCoinTime = now;
              if (multiplierStreak >= 20) scoreMultiplier = 3;
              else if (multiplierStreak >= 10) scoreMultiplier = 2;
              else scoreMultiplier = 1;
              if (scoreMultiplier > prevMult && typeof showComboText === 'function') {
                var rect = document.getElementById('glcanvas').getBoundingClientRect();
                var screenX = rect.left + rect.width / 2 + (player.pos[0] / 6) * rect.width * 0.3;
                var screenY = rect.top + rect.height * 0.4;
                showComboText('x' + scoreMultiplier + '!', screenX, screenY);
                if (scoreMultiplier >= 3) {
                  if (typeof flashScreen === 'function') flashScreen('#ffd700', 0.4);
                  cameraShake = 0.5;
                  safeVibrate([20, 30, 20]);
                  // Extra burst particles for x3
                  for (var pb = 0; pb < 16; pb++) {
                    var pbx = (Math.random() - 0.5) * 6.0;
                    var pby = Math.random() * 4.0 + 2.0;
                    var pbz = (Math.random() - 0.5) * 6.0;
                    particles.push(new Particle(gl, [player.pos[0], player.pos[1], player.pos[2]], [pbx, pby, pbz], 0.6 + Math.random() * 0.4, glow_gold_texture));
                  }
                } else {
                  if (typeof flashScreen === 'function') flashScreen('#05d9e8', 0.25);
                }
              } else if (multiplierStreak > 1 && multiplierStreak % 5 === 0 && typeof showComboText === 'function') {
                var rect = document.getElementById('glcanvas').getBoundingClientRect();
                var screenX = rect.left + rect.width / 2 + (player.pos[0] / 6) * rect.width * 0.3;
                var screenY = rect.top + rect.height * 0.4;
                showComboText(multiplierStreak + ' combo!', screenX, screenY);
              }
              coins_collected += scoreMultiplier;
              safeVibrate(10);
              if (_streakEl && _streakPanel) {
                _streakEl.textContent = multiplierStreak;
                _streakPanel.style.display = '';
                _streakEl.style.transform = 'scale(1.4)';
                setTimeout(function() { if (_streakEl) _streakEl.style.transform = 'scale(1)'; }, 150);
              }
              playCoinSound();
              // Score popup at coin position
              if (typeof showScorePopup === 'function') {
                var sp = worldToScreen(coins[i].pos[0], coins[i].pos[1], coins[i].pos[2]);
                if (sp) {
                  var popupColor = scoreMultiplier >= 3 ? '#ffaa00' : (scoreMultiplier >= 2 ? '#05d9e8' : '#ffd700');
                  showScorePopup('+' + scoreMultiplier, sp.x, sp.y, popupColor);
                }
              }
              // Spawn sparkle particles on coin collect
              for (var p = 0; p < 6; p++) {
                var vx = (Math.random() - 0.5) * 4.0;
                var vy = Math.random() * 3.0 + 1.5;
                var vz = (Math.random() - 0.5) * 4.0;
                particles.push(new Particle(gl, [coins[i].pos[0], coins[i].pos[1], coins[i].pos[2]], [vx, vy, vz], 0.5 + Math.random() * 0.3));
              }
            }
          }
        }
      }
    }

    // Train proximity rumble intensity
    var rumbleIntensity = 0;

    if (!player.hoverboard) {
      // collision with train
      for (var i = 0; i < num_trains; i++) {
        if (player.pos[0] == trainF[i].pos[0]) {
          var zdistTrain = player.pos[2] - trainF[i].pos[2];
          if (zdistTrain > -25 && zdistTrain < 5) {
            rumbleIntensity = Math.max(rumbleIntensity, 1.0 - Math.abs(zdistTrain + 5) / 20);
          }
          if (player.pos[1] >= trainF[i].pos[1] - 4 && player.pos[1] <= trainF[i].pos[1] + 4) {
            if (player.pos[2] >= trainF[i].pos[2] - 18 && player.pos[2] <= trainF[i].pos[2]) {
              if (dying) break;
              score = -player.pos[2] + coins_collected;
              cameraShake = 0.8; safeVibrate(100);
              if (typeof flashScreen === 'function') flashScreen('#ff0000', 0.5);
              // Death explosion particles
              for (var p = 0; p < 20; p++) {
                var vx = (Math.random() - 0.5) * 8.0;
                var vy = Math.random() * 6.0 + 2.0;
                var vz = (Math.random() - 0.5) * 8.0;
                particles.push(new Particle(gl, [player.pos[0], player.pos[1], player.pos[2]], [vx, vy, vz], 0.8 + Math.random() * 0.4, glow_pink_texture));
              }
              Die();
              dying = true; freezeFrame = 3;
              deathTimer = 0;
              break;
            }
          }
          // Near miss: same track, very close z, but player is above the train
          if (zdistTrain > -18 && zdistTrain < -15 && player.pos[1] > trainT[i].pos[1] + 2) {
            var now = Date.now() * 0.001;
            if (now - nearMissTimer > 1.0) {
              nearMissTimer = now;
              coins_collected += 1;
              playCoinSound();
              if (typeof showComboText === 'function') {
                var rect = document.getElementById('glcanvas').getBoundingClientRect();
                showComboText('Near Miss!', rect.left + rect.width / 2, rect.top + rect.height * 0.3);
              }
              for (var p = 0; p < 6; p++) {
                particles.push(new Particle(gl, [player.pos[0], player.pos[1], player.pos[2]], [(Math.random()-0.5)*3, Math.random()*2+1, (Math.random()-0.5)*3], 0.4, glow_gold_texture));
              }
              timeDilation = 0.3; // brief slow-mo on near miss
            }
          }
        }
      }

      // Update train rumble audio
      if (typeof updateTrainRumble === 'function') updateTrainRumble(rumbleIntensity);

      // collision with boxes
      var num_boxes = boxes.length;
      for (var i = 0; i < num_boxes; i++) {
        if (player.pos[0] == boxes[i].pos[0]) {
          if (player.pos[1] >= boxes[i].pos[1] - 2 && player.pos[1] <= boxes[i].pos[1] + 2) {
            if (player.pos[2] <= boxes[i].pos[2] + 3 && player.pos[2] >= boxes[i].pos[2] - 3) {
              if (dying) break;
              score = -player.pos[2] + coins_collected;
              cameraShake = 0.8; safeVibrate(100);
              if (typeof flashScreen === 'function') flashScreen('#ff0000', 0.5);
              // Death explosion particles
              for (var p = 0; p < 20; p++) {
                var vx = (Math.random() - 0.5) * 8.0;
                var vy = Math.random() * 6.0 + 2.0;
                var vz = (Math.random() - 0.5) * 8.0;
                particles.push(new Particle(gl, [player.pos[0], player.pos[1], player.pos[2]], [vx, vy, vz], 0.8 + Math.random() * 0.4, glow_pink_texture));
              }
              Die();
              dying = true; freezeFrame = 3;
              deathTimer = 0;
              break;
            }
          }
        }
      }

      // collision with manholes
      var num_manholes = manholes.length;
      for (var i = 0; i < num_manholes; i++) {
        if (player.pos[0] == manholes[i].pos[0]) {
          if (player.pos[1] <= -4) {
            if (player.pos[2] <= manholes[i].pos[2] + 2.3 && player.pos[2] >= manholes[i].pos[2] - 2.3) {
              if (dying) break;
              score = -player.pos[2] + coins_collected;
              cameraShake = 0.8; safeVibrate(100);
              if (typeof flashScreen === 'function') flashScreen('#ff0000', 0.5);
              // Death explosion particles
              for (var p = 0; p < 20; p++) {
                var vx = (Math.random() - 0.5) * 8.0;
                var vy = Math.random() * 6.0 + 2.0;
                var vz = (Math.random() - 0.5) * 8.0;
                particles.push(new Particle(gl, [player.pos[0], player.pos[1], player.pos[2]], [vx, vy, vz], 0.8 + Math.random() * 0.4, glow_pink_texture));
              }
              Die();
              dying = true; freezeFrame = 3;
              deathTimer = 0;
              break;
            }
          }
        }
      }

      // collision with duck_obs
      var num_high = duck_obs_stop.length;
      for (var i = 0; i < num_high; i++) {
        if (i != obstacle_hit || obstacle_hit_type != 'duck') {
          if (player.pos[0] == duck_obs_stop[i].pos[0]) {
            if (player.pos[1] >= duck_obs_stop[i].pos[1] - 4 && player.pos[1] <= duck_obs_stop[i].pos[1] + 4) {
              if (duck_obs_stop[i].pos[2] >= player.pos[2] - 0.7 && duck_obs_stop[i].pos[2] <= player.pos[2] + 0.7) {
                if (dying) break;
                d = new Date();
                if (d.getTime() * 0.001 - policeCaughtUp <= 10) {
                  Die();
                  if (typeof uiGameOver === 'function') { uiGameOver(false, score, coins_collected); return; }
                }
                else {
                  cameraShake = 0.3; safeVibrate(30);
                  playBumpSound();
                  if (typeof flashScreen === 'function') flashScreen('#ff8800', 0.15);
                  obstacle_hit = i;
                  obstacle_hit_type = 'duck';
                  player.speedz = player_speed / 2;
                  policeCaughtUp = d.getTime() * 0.001;
                  obstacle_hit_time = policeCaughtUp;
                }
              }
            }
          }
        }
      }

      // collision with jump_obs
      var num_low = jump_obs.length;
      for (var i = 0; i < num_low; i++) {
        if (i != obstacle_hit || obstacle_hit_type != 'jump') {
          if (player.pos[0] == jump_obs[i].pos[0]) {
            if (player.pos[1] >= jump_obs[i].pos[1] - 2 && player.pos[1] <= jump_obs[i].pos[1] + 2) {
              if (player.pos[2] <= jump_obs[i].pos[2] + 0.2 && player.pos[2] >= jump_obs[i].pos[2] - 0.2) {
                if (dying) break;
                d = new Date();
                if (d.getTime() * 0.001 - policeCaughtUp <= 10) {
                  score = -player.pos[2] + coins_collected;
                  Die();
                  if (typeof uiGameOver === 'function') { uiGameOver(false, score, coins_collected); return; }
                }
                else {
                  cameraShake = 0.3; safeVibrate(30);
                  playBumpSound();
                  if (typeof flashScreen === 'function') flashScreen('#ff8800', 0.15);
                  obstacle_hit = i;
                  obstacle_hit_type = 'jump';
                  player.speedz = player_speed / 2;
                  policeCaughtUp = d.getTime() * 0.001;
                  obstacle_hit_time = policeCaughtUp;
                }
              }
            }
          }
        }
      }

      // collision with rope
      var num_rope = rope_stop.length;
      for (var i = 0; i < num_rope; i++) {
        if (i != obstacle_hit || obstacle_hit_type != 'rope') {
          if (rope_stop[i].pos[1] <= player.pos[1] + 0.5 && rope_stop[i].pos[1] >= player.pos[1] - 0.5) {
            if (player.pos[2] <= rope_stop[i].pos[2] + 0.02 && player.pos[2] >= rope_stop[i].pos[2] - 0.02) {
              if (dying) break;
              d = new Date();
              if (d.getTime() * 0.001 - policeCaughtUp <= 10) {
                score = -player.pos[2] + coins_collected;
                Die();
                if (typeof uiGameOver === 'function') { uiGameOver(false, score, coins_collected); return; }
              }
              else {
                cameraShake = 0.3; safeVibrate(30);
                playBumpSound();
                if (typeof flashScreen === 'function') flashScreen('#ff8800', 0.15);
                obstacle_hit = i;
                obstacle_hit_type = 'rope';
                player.speedz = player_speed / 2;
                policeCaughtUp = d.getTime() * 0.001;
                obstacle_hit_time = policeCaughtUp;
              }
            }
          }
        }
      }
    }

    // // train and box
    // for (var i = 0; i < num_trains; i++) {
    //   for (var j = 0; j < num_boxes; j++) {
    //     if (boxes[j].pos[0] == trainF[i].pos[0]) {
    //       if (boxes[j].pos[2] - 5 <= trainF[i].pos[2] && boxes[j].pos[2] - 4.5 >= trainF[i].pos[2]) {
    //         train_speeds[i] = 0;
    //       }
    //     }
    //   }
    // }

    // // train and duck_obs
    // for (var i = 0; i < num_trains; i++) {
    //   for (var j = 0; j < num_high; j++) {
    //     if (trainF[i].pos[0] == duck_obs_stop[j].pos[0]) {
    //       if (trainF[i].pos[2] >= duck_obs_stop[j].pos[2] - 5 && trainF[i].pos[2] <= duck_obs_stop[j].pos[2] - 4.5) {
    //         train_speeds[i] = 0;
    //       }
    //     }
    //   }
    // }

    // // train and jump_obs
    // for (var i = 0; i < num_trains; i++) {
    //   for (var j = 0; j < num_low; j++) {
    //     if (trainF[i].pos[0] == jump_obs[j].pos[0]) {
    //       if (trainF[i].pos[2] >= jump_obs[j].pos[2] - 5 && trainF[i].pos[2] <= jump_obs[j].pos[2] - 4.5) {
    //         train_speeds[i] = 0;
    //       }
    //     }
    //   }
    // }

    // collision with jumping boots
    var num_boots = boots.length;
    for (var i = 0; i < num_boots; i++) {
      if (boots[i].exist) {
        boots[i].rotation += 0.3 * timeDilation;
        if (player.pos[0] == boots[i].pos[0]) {
          if (player.pos[1] >= boots[i].pos[1] - 1.2 && player.pos[1] <= boots[i].pos[1] + 1.2) {
            if (player.pos[2] >= boots[i].pos[2] - 1.2 && player.pos[2] <= boots[i].pos[2] + 1.2) {
              boots[i].exist = false;
              player.jumping_boots = true;
              playPowerUpSound();
              if (typeof flashScreen === 'function') flashScreen('#05d9e8', 0.4);
              for (var p = 0; p < 12; p++) {
                var vx = (Math.random() - 0.5) * 5.0;
                var vy = Math.random() * 4.0 + 1.0;
                var vz = (Math.random() - 0.5) * 5.0;
                particles.push(new Particle(gl, [boots[i].pos[0], boots[i].pos[1], boots[i].pos[2]], [vx, vy, vz], 0.6 + Math.random() * 0.3, glow_cyan_texture));
              }
              d = new Date();
              boots_acquired = d.getTime() * 0.001;
              powersCollected += 1; cameraShake = 0.2; safeVibrate(20);
              if (typeof showComboText === 'function') {
                var rect = document.getElementById('glcanvas').getBoundingClientRect();
                showComboText('Jump Boots!', rect.left + rect.width / 2, rect.top + rect.height * 0.35);
              }
              jump_height = 3;
              jumping = false;
            }
          }
        }
      }
    }

    // collision with flying boost
    var num_fb = flying_boost.length;
    for (var i = 0; i < num_fb; i++) {
      if (flying_boost[i].exist) {
        flying_boost[i].rotation += 0.1 * timeDilation;
        if (player.pos[0] == flying_boost[i].pos[0]) {
          if (player.pos[1] >= flying_boost[i].pos[1] - 1.75 && player.pos[1] <= flying_boost[i].pos[1] + 1.75) {
            if (player.pos[2] >= flying_boost[i].pos[2] - 1.75 && player.pos[2] <= flying_boost[i].pos[2] + 1.75) {
              flying_boost[i].exist = false;
              player.fly_boost = true;
              playPowerUpSound();
              if (typeof flashScreen === 'function') flashScreen('#ff2a6d', 0.4);
              for (var p = 0; p < 12; p++) {
                var vx = (Math.random() - 0.5) * 5.0;
                var vy = Math.random() * 4.0 + 1.0;
                var vz = (Math.random() - 0.5) * 5.0;
                particles.push(new Particle(gl, [flying_boost[i].pos[0], flying_boost[i].pos[1], flying_boost[i].pos[2]], [vx, vy, vz], 0.6 + Math.random() * 0.3, glow_pink_texture));
              }
              dog.pos[2] -= 10;
              player.pos[1] = 10;
              cam_y_target = player.pos[1] + 9;
              d = new Date();
              fb_acquired = d.getTime() * 0.001;
              powersCollected += 1; cameraShake = 0.2; safeVibrate(20);
              if (typeof showComboText === 'function') {
                var rect = document.getElementById('glcanvas').getBoundingClientRect();
                showComboText('Flying Boost!', rect.left + rect.width / 2, rect.top + rect.height * 0.35);
              }
              jumping = false;
              // generate coins in air
              var zi = flying_boost[i].pos[2] - 5;
              var zf = zi - 70;
              var c = 0;
              var xc = player.pos[0];
              var yc = player.pos[1];
              while (zi >= zf) {
                if (c == 10) {
                  c = 0;
                  if (xc == -6)
                    xc = 0;
                  else if (xc == 0)
                    xc = 6;
                  else if (xc == 6)
                    xc = -6;
                }
                coins.push(new Coin(gl, [xc, yc, zi]))
                zi -= 2;
                c += 1;
              }
            }
          }
        }
      }
    }

    // collision with hoverboard
    for (var i = 0; i < 2; i++) {
      hoverboard[i].rotation += 0.2 * timeDilation;
      if (hoverboard[i].exist) {
        if (player.pos[0] == hoverboard[i].pos[0]) {
          if (player.pos[1] >= hoverboard[i].pos[1] - 1.2 && player.pos[1] <= hoverboard[i].pos[1] + 1.2) {
            if (player.pos[2] >= hoverboard[i].pos[2] - 1.2 && player.pos[2] <= hoverboard[i].pos[2] + 1.2) {
              hoverboard[i].exist = false;
              player.hoverboard = true;
              playPowerUpSound();
              if (typeof flashScreen === 'function') flashScreen('#ffd700', 0.4);
              for (var p = 0; p < 12; p++) {
                var vx = (Math.random() - 0.5) * 5.0;
                var vy = Math.random() * 4.0 + 1.0;
                var vz = (Math.random() - 0.5) * 5.0;
                particles.push(new Particle(gl, [hoverboard[i].pos[0], hoverboard[i].pos[1], hoverboard[i].pos[2]], [vx, vy, vz], 0.6 + Math.random() * 0.3, glow_gold_texture));
              }
              d = new Date();
              hoverboard_acquired = d.getTime() * 0.001;
              powersCollected += 1; cameraShake = 0.2; safeVibrate(20);
              if (typeof showComboText === 'function') {
                var rect = document.getElementById('glcanvas').getBoundingClientRect();
                showComboText('Hoverboard!', rect.left + rect.width / 2, rect.top + rect.height * 0.35);
              }
              jumping = false;
            }
          }
        }
      }
    }

    if (player.pos[2] <= -800 && !dying) {
      score = -player.pos[2] + coins_collected;
      // Victory celebration
      playVictorySound();
      if (typeof flashScreen === 'function') flashScreen('#ffd700', 0.5);
      if (typeof spawnConfetti === 'function') spawnConfetti();
      for (var p = 0; p < 40; p++) {
        var angle = Math.random() * Math.PI * 2;
        var speed = 3.0 + Math.random() * 5.0;
        particles.push(new Particle(gl,
          [player.pos[0], player.pos[1] + 2, player.pos[2]],
          [Math.cos(angle)*speed, Math.random()*6.0 + 2.0, Math.sin(angle)*speed],
          1.0 + Math.random()*0.5, glow_gold_texture));
      }
      if (typeof uiGameOver === 'function') { uiGameOver(true, score, coins_collected); return; }
    }

    // Decay score multiplier if no coin collected recently
    var nowTime = Date.now() * 0.001;
    if (nowTime - lastCoinTime >= 2.0 && scoreMultiplier > 1) {
      scoreMultiplier = 1;
      multiplierStreak = 0;
      if (_streakPanel) _streakPanel.style.display = 'none';
    }
    // Update streak bar
    if (_streakBar && multiplierStreak > 0) {
      var rem = Math.max(0, 2.0 - (nowTime - lastCoinTime));
      _streakBar.style.width = (rem / 2.0 * 100) + '%';
    }

    // Update afterimages
    for (var ai = afterimages.length - 1; ai >= 0; ai--) {
      afterimages[ai].life -= deltaTime * timeDilation;
      if (afterimages[ai].life <= 0) afterimages.splice(ai, 1);
    }
    // Update shockwaves
    for (var si = shockwaves.length - 1; si >= 0; si--) {
      shockwaves[si].life -= deltaTime * timeDilation;
      if (shockwaves[si].life <= 0) shockwaves.splice(si, 1);
    }

    // Trail particles for hoverboard / flying boost
    trailTimer += deltaTime * timeDilation;
    if (trailTimer > 0.05) {
      trailTimer = 0;
      if (player.hoverboard) {
        for (var p = 0; p < 2; p++) {
          var tx = player.pos[0] + (Math.random() - 0.5) * 0.6;
          var ty = player.pos[1] - 0.8;
          var tz = player.pos[2] + 1.5 + Math.random() * 0.5;
          particles.push(new Particle(gl, [tx, ty, tz], [(Math.random()-0.5)*1.0, 0.5, 2.0], 0.3 + Math.random()*0.2, dust_texture));
        }
      }
      if (player.fly_boost) {
        for (var p = 0; p < 3; p++) {
          var tx = player.pos[0] + (Math.random() - 0.5) * 0.4;
          var ty = player.pos[1] - 1.5;
          var tz = player.pos[2] + 1.0 + Math.random() * 0.5;
          particles.push(new Particle(gl, [tx, ty, tz], [(Math.random()-0.5)*0.5, -1.0 - Math.random(), 1.5], 0.25 + Math.random()*0.15, dust_texture));
        }
      }
    }

    // Train spark particles when train is close behind
    sparkTimer += deltaTime * timeDilation;
    if (sparkTimer > 0.08) {
      sparkTimer = 0;
      var num_trains = trainF.length;
      for (var i = 0; i < num_trains; i++) {
        if (trainF[i].pos[0] == player.pos[0]) {
          var zdist = player.pos[2] - trainF[i].pos[2];
          if (zdist > -15 && zdist < 5) {
            // Sparks from train wheels
            for (var p = 0; p < 2; p++) {
              var sx = trainF[i].pos[0] + (Math.random() - 0.5) * 2.5;
              var sy = trainF[i].pos[1] - 4.5;
              var sz = trainF[i].pos[2] + (Math.random() - 0.5) * 8;
              var svx = (Math.random() - 0.5) * 4.0;
              var svy = Math.random() * 3.0 + 1.0;
              var svz = (Math.random() - 0.5) * 4.0;
              particles.push(new Particle(gl, [sx, sy, sz], [svx, svy, svz], 0.3 + Math.random() * 0.2, particle_texture));
            }
          }
        }
      }
    }

    // update particles
    for (var i = particles.length - 1; i >= 0; i--) {
      particles[i].update(deltaTime * timeDilation);
      if (particles[i].life <= 0) {
        particles.splice(i, 1);
      }
    }

    // Coin spin speed recovery
    for (var i = 0; i < coins.length; i++) {
      if (coins[i].speed > 0.1) {
        coins[i].speed -= 0.005;
        if (coins[i].speed < 0.1) coins[i].speed = 0.1;
      }
    }

    // update ambient dust particles
    var dustTime = Date.now() * 0.001;
    var envDt = deltaTime * timeDilation;
    for (var i = 0; i < envParticles.length; i++) {
      var ep = envParticles[i];
      ep.pos[0] += ep.vel[0] * envDt;
      ep.pos[1] += ep.vel[1] * envDt + Math.sin(dustTime + ep.phase) * 0.002;
      ep.pos[2] += ep.vel[2] * envDt;
      // wrap around relative to camera
      if (ep.pos[2] > cam_z + 5) ep.pos[2] -= 90;
      if (ep.pos[2] < cam_z - 85) ep.pos[2] += 90;
      if (ep.pos[0] > 12) ep.pos[0] -= 24;
      if (ep.pos[0] < -12) ep.pos[0] += 24;
    }

    // apply camera shake (collision / impact feedback)
    var origCamX = cam_x;
    var origCamY = cam_y;
    if (cameraShake > 0) {
      cam_x += (Math.random() - 0.5) * cameraShake;
      cam_y += (Math.random() - 0.5) * cameraShake;
      cameraShake *= 0.85;
      if (cameraShake < 0.02) cameraShake = 0;
    }

    drawScene(gl, activeProgram, deltaTime);

    // restore camera position after shake
    cam_x = origCamX;
    cam_y = origCamY;

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
  } catch (e) {
    console.error('Game initialization error:', e);
    gameReady = true;
  }
}

function worldToScreen(wx, wy, wz) {
  var clip = [vpMatrix[0]*wx + vpMatrix[4]*wy + vpMatrix[8]*wz + vpMatrix[12],
              vpMatrix[1]*wx + vpMatrix[5]*wy + vpMatrix[9]*wz + vpMatrix[13],
              vpMatrix[2]*wx + vpMatrix[6]*wy + vpMatrix[10]*wz + vpMatrix[14],
              vpMatrix[3]*wx + vpMatrix[7]*wy + vpMatrix[11]*wz + vpMatrix[15]];
  if (clip[3] === 0) return null;
  var ndcX = clip[0] / clip[3];
  var ndcY = clip[1] / clip[3];
  var canvas = document.getElementById('glcanvas');
  if (!canvas) return null;
  var rect = canvas.getBoundingClientRect();
  return {
    x: rect.left + (ndcX * 0.5 + 0.5) * rect.width,
    y: rect.top + (-ndcY * 0.5 + 0.5) * rect.height
  };
}

function drawScene(gl, programInfo, deltaTime) {

  if (theme_flag == 1) {
    applyTheme(theme);
    if (theme == 1) {
      // Subtle warm shift as speed increases
      var speedRatio = Math.min(1, (player_speed - 0.5) / 0.5);
      var r = 144 / 256 + speedRatio * 0.05;
      var g = 228 / 256 - speedRatio * 0.02;
      var b = 252 / 256 - speedRatio * 0.05;
      gl.clearColor(r, g, b, 1.0);
      if (greyScale)
        gl.clearColor(50 / 255, 50 / 255, 50 / 255, 1.0);
    }
    if (theme == 2) {
      gl.clearColor(0, 0, 0, 1.0);
    }
    theme_flag = 0;
  }

  gl.clearDepth(1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  var targetFov = 45 + Math.min(1, (player_speed - 0.5) / 0.5) * 12;
  currentFov += (targetFov - currentFov) * 0.05;
  const fieldOfView = currentFov * Math.PI / 180;
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  const zNear = 0.1;
  const zFar = 100.0;
  const projectionMatrix = mat4.create();

  mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

  var cameraMatrix = mat4.create();
  mat4.translate(cameraMatrix, cameraMatrix, [cam_x, cam_y, cam_z]);
  var cameraPosition = [
    cameraMatrix[12],
    cameraMatrix[13],
    cameraMatrix[14],
  ];
  var up = [0, 1, 0];

  mat4.lookAt(cameraMatrix, cameraPosition, [target_x, target_y, cam_z - 10], up);

  var viewMatrix = cameraMatrix;

  mat4.multiply(vpMatrix, projectionMatrix, viewMatrix);

  // Set fog uniforms (theme-dependent fog color)
  var fogColor = theme == 1 ? [0.56, 0.89, 0.99] : [0.0, 0.0, 0.0];
  if (greyScale) fogColor = [0.2, 0.2, 0.2];
  gl.useProgram(programInfo.program);
  gl.uniform3fv(programInfo.uniformLocations.uFogColor, fogColor);
  gl.uniform1f(programInfo.uniformLocations.uFogNear, 25.0);
  gl.uniform1f(programInfo.uniformLocations.uFogFar, 90.0);
  gl.uniform1f(programInfo.uniformLocations.uGlow, theme == 2 ? 0.35 : 0.0);
  gl.uniform1f(programInfo.uniformLocations.uAlpha, 1.0);

  // Distance-based culling bounds
  var cullNear = cam_z + 8;
  var cullFar = cam_z - 95;

  // Pre-compute object counts for culling loops
  var num_trains = trainF.length;
  var num_boxes = boxes.length;
  var num_manholes = manholes.length;

  // Compute visible track range (tracks at z = -i * 5)
  var iStart = Math.max(0, Math.floor(-(cullNear + 5) / 5));
  var iEnd = Math.min(1000, Math.ceil(-(cullFar - 5) / 5));
  for (var i = iStart; i < iEnd; i += 1) {
    track1[i].drawCube(gl, vpMatrix, programInfo, deltaTime);
    track2[i].drawCube(gl, vpMatrix, programInfo, deltaTime);
    track3[i].drawCube(gl, vpMatrix, programInfo, deltaTime);
  }

  // Background parallax: city/wall move slower than foreground
  var parallaxOffset = cam_z * 0.06;
  var bgStart = Math.max(0, Math.floor(-(cullNear + 5 + parallaxOffset) / 10));
  var bgEnd = Math.min(1000, Math.ceil(-(cullFar - 5 + parallaxOffset) / 10));
  for (var i = bgStart; i < bgEnd; i += 1) {
    if (theme == 1) {
      var origZ = city[i].pos[2];
      city[i].pos[2] = origZ - parallaxOffset;
      city[i].drawCube(gl, vpMatrix, programInfo, deltaTime);
      city[i].pos[2] = origZ;
    } else if (theme == 2) {
      var origZ = wall[i].pos[2];
      wall[i].pos[2] = origZ - parallaxOffset;
      wall[i].drawCube(gl, vpMatrix, programInfo, deltaTime);
      wall[i].pos[2] = origZ;
    }
  }

  // Ground warning decals improve obstacle readability at high speed.
  if (typeof drawGlow === 'function') {
    for (var hm = 0; hm < hazardMarkers.length; hm++) {
      var mark = hazardMarkers[hm];
      if (mark.z < cullNear && mark.z > cullFar) {
        var distToPlayer = Math.abs(mark.z - player.pos[2]);
        var pulse = 0.35 + 0.25 * Math.sin(Date.now() * 0.008 + mark.pulse);
        var alpha = Math.max(0.12, Math.min(0.55, pulse + (40 - Math.min(40, distToPlayer)) * 0.006));
        var tex = mark.type === 'jump' || mark.type === 'duck' ? glow_cyan_texture : glow_pink_texture;
        if (mark.type === 'train') tex = glow_gold_texture;
        var width = mark.type === 'rope' ? 4.5 : 1.15;
        gl.uniform1f(programInfo.uniformLocations.uAlpha, alpha);
        drawGlow(gl, vpMatrix, programInfo, tex, mark.x, -4.88, mark.z, width, 0.45);
      }
    }
    gl.uniform1f(programInfo.uniformLocations.uAlpha, 1.0);
  }

  // Power-up expiry blink (last 3 seconds)
  var nowSecs = Date.now() * 0.001;
  var minRem = 10;
  if (player.jumping_boots) minRem = Math.min(minRem, 10 - (nowSecs - boots_acquired));
  if (player.fly_boost) minRem = Math.min(minRem, 10 - (nowSecs - fb_acquired));
  if (player.hoverboard) minRem = Math.min(minRem, 10 - (nowSecs - hoverboard_acquired));
  if (minRem < 3 && (player.jumping_boots || player.fly_boost || player.hoverboard)) {
    var blink = 0.5 + 0.5 * Math.sin(Date.now() * 0.015);
    gl.uniform1f(programInfo.uniformLocations.uAlpha, blink);
  }
  player.drawCube(gl, vpMatrix, programInfo, deltaTime);
  gl.uniform1f(programInfo.uniformLocations.uAlpha, 1.0);

  // Afterimages on lane switch
  for (var ai = 0; ai < afterimages.length; ai++) {
    var aimg = afterimages[ai];
    var alpha = aimg.life / aimg.maxLife * 0.5;
    gl.uniform1f(programInfo.uniformLocations.uAlpha, alpha);
    var origX = player.pos[0];
    var origY = player.pos[1];
    var origZ = player.pos[2];
    var origTilt = player.tilt;
    player.pos[0] = aimg.x;
    player.pos[1] = aimg.y;
    player.pos[2] = aimg.z;
    player.tilt = aimg.tilt;
    player.drawCube(gl, vpMatrix, programInfo, deltaTime);
    player.pos[0] = origX;
    player.pos[1] = origY;
    player.pos[2] = origZ;
    player.tilt = origTilt;
  }
  gl.uniform1f(programInfo.uniformLocations.uAlpha, 1.0);

  police.drawCube(gl, vpMatrix, programInfo, deltaTime);
  dog.drawCube(gl, vpMatrix, programInfo, deltaTime);

  var num_coins = coins.length;
  for (var i = 0; i < num_coins; i++) {
    if (coins[i].exist && coins[i].pos[2] < cullNear && coins[i].pos[2] > cullFar)
      coins[i].drawCube(gl, vpMatrix, programInfo, deltaTime);
  }

  // draw particles on top of coins
  for (var i = 0; i < particles.length; i++) {
    if (particles[i].pos[2] < cullNear && particles[i].pos[2] > cullFar)
      particles[i].drawCube(gl, vpMatrix, programInfo, deltaTime);
  }

  for (var i = 0; i < num_trains; i++) {
    if (trainF[i].pos[2] < cullNear && trainF[i].pos[2] > cullFar) {
      trainF[i].drawCube(gl, vpMatrix, programInfo, deltaTime);
      trainT[i].drawCube(gl, vpMatrix, programInfo, deltaTime);
      trainL[i].drawCube(gl, vpMatrix, programInfo, deltaTime);
      trainR[i].drawCube(gl, vpMatrix, programInfo, deltaTime);
    }
  }
  for (var i = 0; i < trainExtra.length; i++) {
    if (trainExtra[i].pos[2] < cullNear && trainExtra[i].pos[2] > cullFar)
      trainExtra[i].drawCube(gl, vpMatrix, programInfo, deltaTime);
  }

  // Train headlight glows (drawn after opaque geometry with additive blend)
  for (var i = 0; i < num_trains; i++) {
    if (trainF[i].pos[2] < cullNear && trainF[i].pos[2] > cullFar) {
      if (typeof drawGlow === 'function') {
        drawGlow(gl, vpMatrix, programInfo, glow_gold_texture,
          trainF[i].pos[0], trainF[i].pos[1] + 1.5, trainF[i].pos[2] + 10, 1.2, 1.2);
      }
    }
  }

  // Obstacle shadows
  gl.disable(gl.DEPTH_TEST);
  for (var i = 0; i < num_trains; i++) {
    if (trainF[i].pos[2] < cullNear && trainF[i].pos[2] > cullFar) {
      if (typeof drawShadow === 'function')
        drawShadow(gl, vpMatrix, programInfo, trainF[i].pos[0], -5.1, trainF[i].pos[2] - 5, 2.0, 8.0);
    }
  }
  for (var i = 0; i < num_boxes; i++) {
    if (boxes[i].pos[2] < cullNear && boxes[i].pos[2] > cullFar) {
      if (typeof drawShadow === 'function')
        drawShadow(gl, vpMatrix, programInfo, boxes[i].pos[0], -5.1, boxes[i].pos[2], 1.8, 1.8);
    }
  }
  for (var i = 0; i < num_manholes; i++) {
    if (manholes[i].pos[2] < cullNear && manholes[i].pos[2] > cullFar) {
      if (typeof drawShadow === 'function')
        drawShadow(gl, vpMatrix, programInfo, manholes[i].pos[0], -5.05, manholes[i].pos[2], 1.5, 1.5);
    }
  }
  gl.enable(gl.DEPTH_TEST);

  // Landing shockwaves (expanding rings)
  if (typeof drawGlow === 'function') {
    for (var si = 0; si < shockwaves.length; si++) {
      var sw = shockwaves[si];
      if (sw.z < cullNear && sw.z > cullFar) {
        var progress = 1 - sw.life / sw.maxLife;
        var size = 0.5 + progress * 3.0;
        var alpha = 1 - progress;
        gl.uniform1f(programInfo.uniformLocations.uAlpha, alpha * 0.6);
        drawGlow(gl, vpMatrix, programInfo, glow_cyan_texture, sw.x, -4.8, sw.z, size, size * 0.3);
      }
    }
    gl.uniform1f(programInfo.uniformLocations.uAlpha, 1.0);
  }

  for (var i = 0; i < num_boxes; i++) {
    if (boxes[i].pos[2] < cullNear && boxes[i].pos[2] > cullFar)
      boxes[i].drawCube(gl, vpMatrix, programInfo, deltaTime);
  }

  for (var i = 0; i < num_manholes; i++) {
    if (manholes[i].pos[2] < cullNear && manholes[i].pos[2] > cullFar)
      manholes[i].drawCube(gl, vpMatrix, programInfo, deltaTime);
  }

  var num_high = duck_obs_stop.length;
  for (var i = 0; i < num_high; i++) {
    if (duck_obs_stop[i].pos[2] < cullNear && duck_obs_stop[i].pos[2] > cullFar) {
      duck_obs_stop[i].drawCube(gl, vpMatrix, programInfo, deltaTime);
      duck_obs_stand1[i].drawCube(gl, vpMatrix, programInfo, deltaTime);
      duck_obs_stand2[i].drawCube(gl, vpMatrix, programInfo, deltaTime);
    }
  }

  var num_low = jump_obs.length;
  for (var i = 0; i < num_low; i++) {
    if (jump_obs[i].pos[2] < cullNear && jump_obs[i].pos[2] > cullFar)
      jump_obs[i].drawCube(gl, vpMatrix, programInfo, deltaTime);
  }

  var num_rope = rope_stop.length;
  for (var i = 0; i < num_rope; i++) {
    if (rope_stop[i].pos[2] < cullNear && rope_stop[i].pos[2] > cullFar) {
      rope_stand1[i].drawCube(gl, vpMatrix, programInfo, deltaTime);
      rope_stand2[i].drawCube(gl, vpMatrix, programInfo, deltaTime);
      rope_stop[i].drawCube(gl, vpMatrix, programInfo, deltaTime);
    }
  }

  var num_boots = boots.length;
  for (var i = 0; i < num_boots; i++) {
    if (boots[i].exist && boots[i].pos[2] < cullNear && boots[i].pos[2] > cullFar)
      boots[i].drawCube(gl, vpMatrix, programInfo, deltaTime);
  }

  var num_boost = flying_boost.length;
  for (var i = 0; i < num_boost; i++) {
    if (flying_boost[i].exist && flying_boost[i].pos[2] < cullNear && flying_boost[i].pos[2] > cullFar)
      flying_boost[i].drawCube(gl, vpMatrix, programInfo, deltaTime);
  }

  for (var i = 0; i < 2; i++) {
    if (hoverboard[i].exist && hoverboard[i].pos[2] < cullNear && hoverboard[i].pos[2] > cullFar)
      hoverboard[i].drawCube(gl, vpMatrix, programInfo, deltaTime);
  }

  // Ambient dust particles (tiny glowing motes)
  if (typeof drawGlow === 'function') {
    for (var i = 0; i < envParticles.length; i++) {
      var ep = envParticles[i];
      if (ep.pos[2] < cullNear && ep.pos[2] > cullFar) {
        drawGlow(gl, vpMatrix, programInfo, dust_texture,
          ep.pos[0], ep.pos[1], ep.pos[2], 0.04, 0.04);
      }
    }
  }
}

function initShaderProgram(gl, vsSource, fsSource) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
    return null;
  }

  return shaderProgram;
}

function loadTexture(gl, url) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  const level = 0;
  const internalFormat = gl.RGBA;
  const width = 1;
  const height = 1;
  const border = 0;
  const srcFormat = gl.RGBA;
  const srcType = gl.UNSIGNED_BYTE;
  const pixel = new Uint8Array([0, 0, 255, 255]);
  gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
    width, height, border, srcFormat, srcType,
    pixel);

  const image = new Image();
  image.onload = function () {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    var source = image;
    var uploadWidth = image.width;
    var uploadHeight = image.height;
    try {
      var canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0);
      source = canvas;
      uploadWidth = canvas.width;
      uploadHeight = canvas.height;
    } catch (e) {}
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
      srcFormat, srcType, source);

    if (isPowerOf2(uploadWidth) && isPowerOf2(uploadHeight)) {
      gl.generateMipmap(gl.TEXTURE_2D);
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
  };
  image.src = url;

  return texture;
}

function isPowerOf2(value) {
  return (value & (value - 1)) == 0;
}

function loadShader(gl, type, source) {
  const shader = gl.createShader(type);

  gl.shaderSource(shader, source);

  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function Die() {
  var music = document.getElementById('music');
  var crash = document.getElementById('crash');
  if (music) music.pause();
  if (crash) { crash.currentTime = 0; crash.play().catch(function(){}); }
}
