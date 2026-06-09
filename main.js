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

var cam_x = 0, cam_y = 5, cam_z = 13.0;
var cam_y_target = 5;
var cameraShake = 0;
var target_x = 0, target_y = 0, target_z = cam_z - 10;
var d, startTime, policeCaughtUp, obstacle_hit_time, flash_start_time, boots_acquired, fb_acquired, hoverboard_acquired;
var theme = 1;
var theme_flag = 1;
var obstacle_hit = -1;

var jump_height = 0;
var duck_ground = -5;
var jumping = false;
var ducking = false;
var wasInAir = false;
var greyScale = false;
var flashing = false;
var train_speeds = new Array();
var positions = new Array();
var player_speed = 0.5;

var score = 0;
var coins_collected = 0;
var scoreMultiplier = 1;
var multiplierStreak = 0;
var lastCoinTime = 0;
var trailTimer = 0;
var sparkTimer = 0;

var cubeRotation = 0;

// ========== Web Audio SFX ==========
var audioCtx = null;
var sfxMasterGain = null;

function initSfx() {
    if (audioCtx) return;
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    audioCtx = new AudioContext();
    sfxMasterGain = audioCtx.createGain();
    sfxMasterGain.gain.value = 0.4;
    sfxMasterGain.connect(audioCtx.destination);
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
    var t = audioCtx.currentTime;
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1100, t);
    osc.frequency.exponentialRampToValueAtTime(1900, t + 0.08);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.01);
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

main();

function main() {
  try {

    document.getElementById('music').play();

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

    void main(void) {
      highp vec4 texelColor = texture2D(uSampler, vTextureCoord);
      highp vec4 litColor = vec4(texelColor.rgb * vLighting, texelColor.a);

      highp float fogAmount = smoothstep(uFogNear, uFogFar, vFogDepth);
      gl_FragColor = mix(litColor, vec4(uFogColor, 1.0), fogAmount);
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

    void main(void) {
      highp vec4 texelColor = texture2D(uSampler, vTextureCoord);
      highp vec4 litColor = vec4(texelColor.rrr * vLighting, texelColor.a);

      highp float fogAmount = smoothstep(uFogNear, uFogFar, vFogDepth);
      gl_FragColor = mix(litColor, vec4(uFogColor, 1.0), fogAmount);
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
    var j = Math.floor(Math.random() * 3);
    var x, y, z;
    if (j == 0)
      x = -6;
    else if (j == 1)
      x = 0;
    else
      x = 6;
    y = -4;
    if (i == 0)
      z = -30;
    else
      z = coins[coins.length - 1].pos[2] - (Math.random() * 30 - 15);
    var num_coins = Math.floor(Math.random() * 5 + 5);
    for (var k = 0; k < num_coins; k++) {
      coins.push(new Coin(gl, [x, y, z]));
      z -= 2.5;
    }
  }

  for (var i = 0; i < 10; i++) {
    var x, y, z;
    var j = Math.floor(Math.random() * 3);
    if (j == 0)
      x = -6;
    else if (j == 1)
      x = 0;
    else
      x = 6;
    y = -4;
    z = - (i + 1) * 79;
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
    var j = Math.floor(Math.random() * 3);
    if (j == 0)
      x = -6;
    else if (j == 1)
      x = 0;
    else
      x = 6;
    y = -3.4;
    z = - i * 73 - 40;
    // Box obstacle (more crate-like proportions)
    boxes.push(new Box(gl, [x, y, z], 3.5, 4.5, 5));
  }

  for (var i = 0; i < 10; i++) {
    var x, y, z;
    var j = Math.floor(Math.random() * 3);
    if (j == 0)
      x = -6;
    else if (j == 1)
      x = 0;
    else
      x = 6;
    y = -5.1;
    z = - (i + 1) * 151;
    manholes.push(new Manhole(gl, [x, y, z], 0.6, 4, 4));
  }

  for (var i = 0; i < 20; i++) {
    var x, y, z;
    var j = Math.floor(Math.random() * 3);
    if (j == 0)
      x = -6;
    else if (j == 1)
      x = 0;
    else
      x = 6;
    y = 0;
    z = -i * 61 - 30
    duck_obs_stop.push(new Stop(gl, [x, y, z], 7, 3, 0.1));
    duck_obs_stand1.push(new Stand(gl, [x + 1.5, y - 2, z], 6, 0.2, 0.1));
    duck_obs_stand2.push(new Stand(gl, [x - 1.5, y - 2, z], 6, 0.2, 0.1));
  }

  for (var i = 0; i < 20; i++) {
    var x, y, z;
    var j = Math.floor(Math.random() * 3);
    if (j == 0)
      x = -6;
    else if (j == 1)
      x = 0;
    else
      x = 6;
    y = -3;
    z = -(i + 1) * 53;
    jump_obs.push(new Stop(gl, [x, y, z], 3, 3, 1));
  }

  for (var i = 0; i < 6; i++) {
    var x, y, z;
    y = -3.5;
    z = -(i + 1) * 127;
    rope_stand1.push(new Stand(gl, [-8, y - 1, z], 2, 0.4, 0.1));
    rope_stand2.push(new Stand(gl, [8, y - 1, z], 2, 0.4, 0.1));
    rope_stop.push(new Stop(gl, [0, y, z], 0.3, 16, 0.1));
  }

  for (var i = 0; i < 5; i++) {
    var x, y, z;
    var j = Math.floor(Math.random() * 3);
    if (j == 0)
      x = -6;
    else if (j == 1)
      x = 0;
    else
      x = 6;
    y = 0;
    z = -(i + 1) * 103;
    boots.push(new Boots(gl, [x, y, z], 1.5, 1.5, 1.5));
  }

  for (var i = 0; i < 5; i++) {
    var x, y, z;
    var j = Math.floor(Math.random() * 3);
    if (j == 0)
      x = -6;
    else if (j == 1)
      x = 0;
    else
      x = 6;
    y = 0;
    z = -i * 157 - 60;
    flying_boost.push(new FlyingBoost(gl, [x, y, z], 1.5, 1.5, 1.5));
  }

  hoverboard.push(new Hoverboard(gl, [0, 0, -150], 1.5, 1.5, 1.5));
  hoverboard.push(new Hoverboard(gl, [0, 0, -400], 1.5, 1.5, 1.5));

  var then = 0;

  function render(now) {
    if (typeof uiUpdateFPS === 'function') uiUpdateFPS();
    if (gamePaused) {
      requestAnimationFrame(render);
      return;
    }
    now *= 0.001;  // convert to seconds
    const deltaTime = now - then;
    then = now;

    d = new Date();
    if (obstacle_hit != -1) {
      if (d.getTime() * 0.001 - obstacle_hit_time >= 10) {
        obstacle_hit = -1;
        player.speedz = player_speed;
        policeCaughtUp = d.getTime() * 0.001;
      }
    }

    // Difficulty scaling: speed slowly increases with distance
    var distance = -player.pos[2];
    player_speed = 0.5 + Math.min(0.5, distance / 3000);
    if (obstacle_hit == -1) {
      player.speedz = player_speed;
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

    // move forward
    player.pos[2] -= player.speedz;
    cam_z -= player.speedz;
    dog.pos[2] -= player.speedz;

    // smooth camera vertical follow
    var camDiff = cam_y_target - cam_y;
    cam_y += camDiff * 0.08;
    target_y = cam_y - 5;

    // recover tilt back to upright
    if (player.tilt > 0) { player.tilt -= 0.02; if (player.tilt < 0) player.tilt = 0; }
    if (player.tilt < 0) { player.tilt += 0.02; if (player.tilt > 0) player.tilt = 0; }
    d = new Date();
    if (d.getTime() * 0.001 - policeCaughtUp >= 5 && d.getTime() * 0.001 - policeCaughtUp <= 10)
      police.speedz = player_speed / 2;
    else
      police.speedz = player_speed;
    police.pos[2] -= police.speedz

    if (player.pos[0] > 6)
      player.pos[0] = 6;
    if (player.pos[0] < -6)
      player.pos[0] = -6;
    police.pos[0] = player.pos[0];
    police.pos[1] = player.pos[1];
    dog.pos[0] = player.pos[0] + 2;

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
          n = boxes.length;
          for (var i = 0; i < n; i++) {
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
              for (var p = 0; p < 8; p++) {
                var vx = (Math.random() - 0.5) * 3.0;
                var vy = Math.random() * 2.0 + 0.5;
                var vz = (Math.random() - 0.5) * 3.0;
                particles.push(new Particle(gl, [player.pos[0], -4.2, player.pos[2]], [vx, vy, vz], 0.4 + Math.random() * 0.3, dust_texture));
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
      trainF[i].pos[2] += train_speeds[i];
      trainT[i].pos[2] += train_speeds[i];
      trainL[i].pos[2] += train_speeds[i];
      trainR[i].pos[2] += train_speeds[i];
      // Sync extra parts (bottom, back, 4 wheels) with the train
      for (var j = 0; j < 6; j++) {
        trainExtra[i * 6 + j].pos[2] += train_speeds[i];
      }
      // Rotate wheels based on speed (scaled for visual effect)
      for (var j = 2; j < 6; j++) {
        trainExtra[i * 6 + j].rotation += train_speeds[i] * 0.5;
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
              lastCoinTime = now;
              if (multiplierStreak >= 20) scoreMultiplier = 3;
              else if (multiplierStreak >= 10) scoreMultiplier = 2;
              else scoreMultiplier = 1;
              if (scoreMultiplier > prevMult && typeof showComboText === 'function') {
                var rect = document.getElementById('glcanvas').getBoundingClientRect();
                var screenX = rect.left + rect.width / 2 + (player.pos[0] / 6) * rect.width * 0.3;
                var screenY = rect.top + rect.height * 0.4;
                showComboText('x' + scoreMultiplier + '!', screenX, screenY);
                if (typeof flashScreen === 'function') flashScreen('#05d9e8', 0.25);
              }
              coins_collected += scoreMultiplier;
              playCoinSound();
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

    if (!player.hoverboard) {
      // collision with train
      for (var i = 0; i < num_trains; i++) {
        if (player.pos[0] == trainF[i].pos[0]) {
          if (player.pos[1] >= trainF[i].pos[1] - 4 && player.pos[1] <= trainF[i].pos[1] + 4) {
            if (player.pos[2] >= trainF[i].pos[2] - 18 && player.pos[2] <= trainF[i].pos[2]) {
              score = -player.pos[2] + coins_collected;
              cameraShake = 0.6;
              if (typeof flashScreen === 'function') flashScreen('#ff0000', 0.5);
              // Death explosion particles
              for (var p = 0; p < 20; p++) {
                var vx = (Math.random() - 0.5) * 8.0;
                var vy = Math.random() * 6.0 + 2.0;
                var vz = (Math.random() - 0.5) * 8.0;
                particles.push(new Particle(gl, [player.pos[0], player.pos[1], player.pos[2]], [vx, vy, vz], 0.8 + Math.random() * 0.4, glow_pink_texture));
              }
              Die();
              if (typeof uiGameOver === 'function') { uiGameOver(false, score, coins_collected); return; }
            }
          }
        }
      }

      // collision with boxes
      var num_boxes = boxes.length;
      for (var i = 0; i < num_boxes; i++) {
        if (player.pos[0] == boxes[i].pos[0]) {
          if (player.pos[1] >= boxes[i].pos[1] - 2 && player.pos[1] <= boxes[i].pos[1] + 2) {
            if (player.pos[2] <= boxes[i].pos[2] + 3 && player.pos[2] >= boxes[i].pos[2] - 3) {
              score = -player.pos[2] + coins_collected;
              cameraShake = 0.6;
              if (typeof flashScreen === 'function') flashScreen('#ff0000', 0.5);
              // Death explosion particles
              for (var p = 0; p < 20; p++) {
                var vx = (Math.random() - 0.5) * 8.0;
                var vy = Math.random() * 6.0 + 2.0;
                var vz = (Math.random() - 0.5) * 8.0;
                particles.push(new Particle(gl, [player.pos[0], player.pos[1], player.pos[2]], [vx, vy, vz], 0.8 + Math.random() * 0.4, glow_pink_texture));
              }
              Die();
              if (typeof uiGameOver === 'function') { uiGameOver(false, score, coins_collected); return; }
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
              score = -player.pos[2] + coins_collected;
              cameraShake = 0.6;
              if (typeof flashScreen === 'function') flashScreen('#ff0000', 0.5);
              // Death explosion particles
              for (var p = 0; p < 20; p++) {
                var vx = (Math.random() - 0.5) * 8.0;
                var vy = Math.random() * 6.0 + 2.0;
                var vz = (Math.random() - 0.5) * 8.0;
                particles.push(new Particle(gl, [player.pos[0], player.pos[1], player.pos[2]], [vx, vy, vz], 0.8 + Math.random() * 0.4, glow_pink_texture));
              }
              Die();
              if (typeof uiGameOver === 'function') { uiGameOver(false, score, coins_collected); return; }
            }
          }
        }
      }

      // collision with duck_obs
      var num_high = duck_obs_stop.length;
      for (var i = 0; i < num_high; i++) {
        if (i != obstacle_hit) {
          if (player.pos[0] == duck_obs_stop[i].pos[0]) {
            if (player.pos[1] >= duck_obs_stop[i].pos[1] - 4 && player.pos[1] <= duck_obs_stop[i].pos[1] + 4) {
              if (duck_obs_stop[i].pos[2] >= player.pos[2] - 0.7 && duck_obs_stop[i].pos[2] <= player.pos[2] + 0.7) {
                d = new Date();
                if (d.getTime() * 0.001 - policeCaughtUp <= 10) {
                  if (typeof uiGameOver === 'function') { uiGameOver(false, score, coins_collected); return; }
                }
                else {
                  cameraShake = 0.3;
                  playBumpSound();
                  if (typeof flashScreen === 'function') flashScreen('#ff8800', 0.15);
                  obstacle_hit = i;
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
        if (i != obstacle_hit) {
          if (player.pos[0] == jump_obs[i].pos[0]) {
            if (player.pos[1] >= jump_obs[i].pos[1] - 2 && player.pos[1] <= jump_obs[i].pos[1] + 2) {
              if (player.pos[2] <= jump_obs[i].pos[2] + 0.2 && player.pos[2] >= jump_obs[i].pos[2] - 0.2) {
                d = new Date();
                if (d.getTime() * 0.001 - policeCaughtUp <= 10) {
                  score = -player.pos[2] + coins_collected;
                  if (typeof uiGameOver === 'function') { uiGameOver(false, score, coins_collected); return; }
                }
                else {
                  cameraShake = 0.3;
                  playBumpSound();
                  if (typeof flashScreen === 'function') flashScreen('#ff8800', 0.15);
                  obstacle_hit = i;
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
        if (i != obstacle_hit) {
          if (rope_stop[i].pos[1] <= player.pos[1] + 0.5 && rope_stop[i].pos[1] >= player.pos[1] - 0.5) {
            if (player.pos[2] <= rope_stop[i].pos[2] + 0.02 && player.pos[2] >= rope_stop[i].pos[2] - 0.02) {
              d = new Date();
              if (d.getTime() * 0.001 - policeCaughtUp <= 10) {
                score = -player.pos[2] + coins_collected;
                if (typeof uiGameOver === 'function') { uiGameOver(false, score, coins_collected); return; }
              }
              else {
                cameraShake = 0.3;
                playBumpSound();
                obstacle_hit = i;
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
        boots[i].rotation += 0.3;
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
        flying_boost[i].rotation += 0.1;
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
                    xc = 0
                  else if (xc == 0)
                    xc = 6
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
      hoverboard[i].rotation += 0.2;
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
              jumping = false;
            }
          }
        }
      }
    }

    if (player.pos[2] <= -800) {
      score = -player.pos[2] + coins_collected;
      if (typeof uiGameOver === 'function') { uiGameOver(true, score, coins_collected); return; }
    }

    // Decay score multiplier if no coin collected recently
    var nowTime = Date.now() * 0.001;
    if (nowTime - lastCoinTime >= 2.0 && scoreMultiplier > 1) {
      scoreMultiplier = 1;
      multiplierStreak = 0;
    }

    // Trail particles for hoverboard / flying boost
    trailTimer += deltaTime;
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
    sparkTimer += deltaTime;
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
      particles[i].update(deltaTime);
      if (particles[i].life <= 0) {
        particles.splice(i, 1);
      }
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

    if (greyScale) {
      drawScene(gl, programInfobw, deltaTime);
    }
    else if (flashing) {
      d = new Date();
      if (Math.floor(d.getTime() * 0.001 - flash_start_time) % 2 == 0) {
        drawScene(gl, programInfo, deltaTime);
      }
      else {
        drawScene(gl, programInfohigh, deltaTime);
      }
    }
    else {
      drawScene(gl, programInfo, deltaTime);
    }

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

function drawScene(gl, programInfo, deltaTime) {

  if (theme_flag == 1) {
    applyTheme(theme);
    if (theme == 1) {
      gl.clearColor(144 / 256, 228 / 256, 252 / 256, 1.0);
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

  const fieldOfView = 45 * Math.PI / 180;
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

  var viewProjectionMatrix = mat4.create();

  mat4.multiply(viewProjectionMatrix, projectionMatrix, viewMatrix);

  // Set fog uniforms (theme-dependent fog color)
  var fogColor = theme == 1 ? [0.56, 0.89, 0.99] : [0.0, 0.0, 0.0];
  if (greyScale) fogColor = [0.2, 0.2, 0.2];
  gl.useProgram(programInfo.program);
  gl.uniform3fv(programInfo.uniformLocations.uFogColor, fogColor);
  gl.uniform1f(programInfo.uniformLocations.uFogNear, 25.0);
  gl.uniform1f(programInfo.uniformLocations.uFogFar, 90.0);

  // Distance-based culling bounds
  var cullNear = cam_z + 8;
  var cullFar = cam_z - 95;

  // Compute visible track range (tracks at z = -i * 5)
  var iStart = Math.max(0, Math.floor(-(cullNear + 5) / 5));
  var iEnd = Math.min(1000, Math.ceil(-(cullFar - 5) / 5));
  for (var i = iStart; i < iEnd; i += 1) {
    track1[i].drawCube(gl, viewProjectionMatrix, programInfo, deltaTime);
    track2[i].drawCube(gl, viewProjectionMatrix, programInfo, deltaTime);
    track3[i].drawCube(gl, viewProjectionMatrix, programInfo, deltaTime);
    if (theme == 1)
      city[i].drawCube(gl, viewProjectionMatrix, programInfo, deltaTime);
    else if (theme == 2)
      wall[i].drawCube(gl, viewProjectionMatrix, programInfo, deltaTime);
  }

  player.drawCube(gl, viewProjectionMatrix, programInfo, deltaTime);
  police.drawCube(gl, viewProjectionMatrix, programInfo, deltaTime);
  dog.drawCube(gl, viewProjectionMatrix, programInfo, deltaTime);

  var num_coins = coins.length;
  for (var i = 0; i < num_coins; i++) {
    if (coins[i].exist && coins[i].pos[2] < cullNear && coins[i].pos[2] > cullFar)
      coins[i].drawCube(gl, viewProjectionMatrix, programInfo, deltaTime);
  }

  // draw particles on top of coins
  for (var i = 0; i < particles.length; i++) {
    if (particles[i].pos[2] < cullNear && particles[i].pos[2] > cullFar)
      particles[i].drawCube(gl, viewProjectionMatrix, programInfo, deltaTime);
  }

  var num_trains = trainF.length;
  for (var i = 0; i < num_trains; i++) {
    if (trainF[i].pos[2] < cullNear && trainF[i].pos[2] > cullFar) {
      trainF[i].drawCube(gl, viewProjectionMatrix, programInfo, deltaTime);
      trainT[i].drawCube(gl, viewProjectionMatrix, programInfo, deltaTime);
      trainL[i].drawCube(gl, viewProjectionMatrix, programInfo, deltaTime);
      trainR[i].drawCube(gl, viewProjectionMatrix, programInfo, deltaTime);
    }
  }
  for (var i = 0; i < trainExtra.length; i++) {
    if (trainExtra[i].pos[2] < cullNear && trainExtra[i].pos[2] > cullFar)
      trainExtra[i].drawCube(gl, viewProjectionMatrix, programInfo, deltaTime);
  }

  // Train headlight glows (drawn after opaque geometry with additive blend)
  for (var i = 0; i < num_trains; i++) {
    if (trainF[i].pos[2] < cullNear && trainF[i].pos[2] > cullFar) {
      if (typeof drawGlow === 'function') {
        drawGlow(gl, viewProjectionMatrix, programInfo, glow_gold_texture,
          trainF[i].pos[0], trainF[i].pos[1] + 1.5, trainF[i].pos[2] + 10, 1.2, 1.2);
      }
    }
  }

  // Obstacle shadows
  gl.disable(gl.DEPTH_TEST);
  for (var i = 0; i < num_trains; i++) {
    if (trainF[i].pos[2] < cullNear && trainF[i].pos[2] > cullFar) {
      if (typeof drawShadow === 'function')
        drawShadow(gl, viewProjectionMatrix, programInfo, trainF[i].pos[0], -5.1, trainF[i].pos[2] - 5, 2.0, 8.0);
    }
  }
  for (var i = 0; i < num_boxes; i++) {
    if (boxes[i].pos[2] < cullNear && boxes[i].pos[2] > cullFar) {
      if (typeof drawShadow === 'function')
        drawShadow(gl, viewProjectionMatrix, programInfo, boxes[i].pos[0], -5.1, boxes[i].pos[2], 1.8, 1.8);
    }
  }
  for (var i = 0; i < num_manholes; i++) {
    if (manholes[i].pos[2] < cullNear && manholes[i].pos[2] > cullFar) {
      if (typeof drawShadow === 'function')
        drawShadow(gl, viewProjectionMatrix, programInfo, manholes[i].pos[0], -5.05, manholes[i].pos[2], 1.5, 1.5);
    }
  }
  gl.enable(gl.DEPTH_TEST);

  var num_boxes = boxes.length;
  for (var i = 0; i < num_boxes; i++) {
    if (boxes[i].pos[2] < cullNear && boxes[i].pos[2] > cullFar)
      boxes[i].drawCube(gl, viewProjectionMatrix, programInfo, deltaTime);
  }

  var num_manholes = manholes.length;
  for (var i = 0; i < num_manholes; i++) {
    if (manholes[i].pos[2] < cullNear && manholes[i].pos[2] > cullFar)
      manholes[i].drawCube(gl, viewProjectionMatrix, programInfo, deltaTime);
  }

  var num_high = duck_obs_stop.length;
  for (var i = 0; i < num_high; i++) {
    if (duck_obs_stop[i].pos[2] < cullNear && duck_obs_stop[i].pos[2] > cullFar) {
      duck_obs_stop[i].drawCube(gl, viewProjectionMatrix, programInfo, deltaTime);
      duck_obs_stand1[i].drawCube(gl, viewProjectionMatrix, programInfo, deltaTime);
      duck_obs_stand2[i].drawCube(gl, viewProjectionMatrix, programInfo, deltaTime);
    }
  }

  var num_low = jump_obs.length;
  for (var i = 0; i < num_low; i++) {
    if (jump_obs[i].pos[2] < cullNear && jump_obs[i].pos[2] > cullFar)
      jump_obs[i].drawCube(gl, viewProjectionMatrix, programInfo, deltaTime);
  }

  var num_rope = rope_stop.length;
  for (var i = 0; i < num_rope; i++) {
    if (rope_stop[i].pos[2] < cullNear && rope_stop[i].pos[2] > cullFar) {
      rope_stand1[i].drawCube(gl, viewProjectionMatrix, programInfo, deltaTime);
      rope_stand2[i].drawCube(gl, viewProjectionMatrix, programInfo, deltaTime);
      rope_stop[i].drawCube(gl, viewProjectionMatrix, programInfo, deltaTime);
    }
  }

  var num_boots = boots.length;
  for (var i = 0; i < num_boots; i++) {
    if (boots[i].exist && boots[i].pos[2] < cullNear && boots[i].pos[2] > cullFar)
      boots[i].drawCube(gl, viewProjectionMatrix, programInfo, deltaTime);
  }

  var num_boost = flying_boost.length;
  for (var i = 0; i < num_boost; i++) {
    if (flying_boost[i].exist && flying_boost[i].pos[2] < cullNear && flying_boost[i].pos[2] > cullFar)
      flying_boost[i].drawCube(gl, viewProjectionMatrix, programInfo, deltaTime);
  }

  for (var i = 0; i < 2; i++) {
    if (hoverboard[i].exist && hoverboard[i].pos[2] < cullNear && hoverboard[i].pos[2] > cullFar)
      hoverboard[i].drawCube(gl, viewProjectionMatrix, programInfo, deltaTime);
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
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
      srcFormat, srcType, image);

    if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
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
  document.getElementById('music').pause();
  document.getElementById('crash').play();
}
