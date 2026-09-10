const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const zlib = require('node:zlib');

const root = path.resolve(__dirname, '..');

async function game() {
  let clock = 100000, frame;
  const listeners = {}, elements = new Map(), buffers = new Map(), bindings = {};
  const draws = [], uniforms = {}, enabled = new Set();
  let depthWrite = true;
  const noop = () => {};
  const gl = new Proxy({
    createBuffer: () => ({}), createTexture: () => ({}), createShader: () => ({}), createProgram: () => ({}),
    bindBuffer: (target, buffer) => { bindings[target] = buffer; },
    bufferData: (target, data) => { buffers.set(bindings[target], data); },
    deleteBuffer: buffer => buffers.delete(buffer),
    getShaderParameter: () => true, getProgramParameter: () => true,
    getUniformLocation: (_, name) => name, getAttribLocation: (_, name) => name,
    enable: flag => enabled.add(flag), disable: flag => enabled.delete(flag),
    depthMask: value => { depthWrite = value; },
    uniform1f: (name, value) => { uniforms[name] = value; },
    uniformMatrix4fv: (name, _, matrix) => { uniforms[name] = Array.from(matrix); },
    drawElements: () => draws.push({ buffer: bindings.ARRAY_BUFFER, matrix: uniforms.uModelViewMatrix?.slice(), alpha: uniforms.uAlpha, blend: enabled.has('BLEND'), depthWrite }),
  }, { get: (obj, key) => key in obj ? obj[key] : /^[A-Z_0-9]+$/.test(key) ? key : noop });
  const element = id => {
    if (!elements.has(id)) elements.set(id, {
      style: {}, textContent: '', width: 1280, height: 720, clientWidth: 1280, clientHeight: 720,
      classList: { add: noop, remove: noop, toggle: noop },
      getContext: kind => kind === '2d' ? { drawImage: noop } : gl,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 }),
      play: () => Promise.resolve(), pause: noop,
    });
    return elements.get(id);
  };
  gl.canvas = element('glcanvas');
  const context = vm.createContext({
    console, Math, Float32Array, Uint16Array, Uint8Array, Promise,
    Date: class extends Date { constructor(...args) { super(...(args.length ? args : [clock])); } static now() { return clock; } },
    performance: { now: () => clock },
    navigator: { userActivation: { hasBeenActive: false } },
    localStorage: { getItem: () => null },
    document: {
      getElementById: element, querySelector: selector => element(selector.slice(1)),
      createElement: () => element('texture-canvas'),
      addEventListener: (type, callback) => { (listeners[type] ||= []).push(callback); },
    },
    Image: class { width = 16; height = 16; set src(value) { queueMicrotask(() => this.onload?.()); } },
    setTimeout: () => 1, clearTimeout: noop,
    requestAnimationFrame: callback => { frame = callback; return 1; },
    cancelAnimationFrame: noop, alert: message => { throw new Error(message); },
    gamePaused: true, uiGameOver: (...args) => { context.result = args; context.gamePaused = true; },
  });
  context.window = context;
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script src="\.\/([^"]+)"/g)].map(match => match[1].split('?')[0]).filter(name => name !== 'ui.js');
  for (const name of [...scripts, 'main.js']) vm.runInContext(fs.readFileSync(path.join(root, name), 'utf8'), context, { filename: name });
  await context.gameLoadPromise;
  await Promise.resolve();
  context.gamePaused = false;
  context.resetGameStartTiming();
  return {
    state: context, gl, draws, buffers, elements,
    step(seconds = 1 / 60) { clock += seconds * 1000; draws.length = 0; frame(clock); },
    key(keyCode) { for (const callback of listeners.keydown || []) callback({ keyCode, preventDefault: noop }); },
    clearCourse() {
      for (const name of ['trainF', 'trainT', 'trainL', 'trainR', 'trainExtra', 'boxes', 'manholes', 'duck_obs_stop', 'jump_obs', 'rope_stop'])
        for (const object of context[name]) object.pos[2] = -100000;
      for (const name of ['coins', 'boots', 'flying_boost', 'hoverboard']) for (const object of context[name]) object.exist = false;
    },
  };
}

test('effect PNGs contain complete, valid scanlines', () => {
  for (const name of ['1_Dust.png', '1_GlowCyan.png', '1_GlowGold.png', '1_GlowPink.png']) {
    const data = fs.readFileSync(path.join(root, 'assets', name));
    const width = data.readUInt32BE(16), height = data.readUInt32BE(20), chunks = [];
    for (let offset = 8; offset < data.length;) {
      const length = data.readUInt32BE(offset);
      if (data.toString('ascii', offset + 4, offset + 8) === 'IDAT') chunks.push(data.subarray(offset + 8, offset + 8 + length));
      offset += length + 12;
    }
    const pixels = zlib.inflateSync(Buffer.concat(chunks)), stride = width * 4 + 1;
    assert.equal(pixels.length, height * stride, name);
    for (let row = 0; row < height; row++) assert.ok(pixels[row * stride] <= 4, name);
  }
});

test('boosted jumps rise above a normal jump and land at every supported frame rate', async () => {
  for (const fps of [30, 60, 120, 144]) {
    const g = await game(); g.clearCourse();
    g.state.player.jumping_boots = true; g.state.boots_acquired = 100;
    g.key(38);
    let peak = -4, lowest = -4;
    for (let i = 0; i < fps * 2; i++) { g.step(1 / fps); peak = Math.max(peak, g.state.player.pos[1]); lowest = Math.min(lowest, g.state.player.pos[1]); }
    assert.ok(peak > 2.8 && peak < 3.2, `${fps}fps peak ${peak}`);
    assert.ok(lowest >= -4, `${fps}fps fell below ground: ${lowest}`);
    assert.equal(g.state.player.pos[1], -4);
    assert.equal(g.state.jumping, false);
  }
});

test('descending cannot refresh a jump', async () => {
  const g = await game(); g.clearCourse(); g.key(38);
  for (let i = 0; i < 60 && g.state.jumping; i++) g.step();
  assert.ok(g.state.player.pos[1] > -4);
  const before = g.state.player.speedy;
  g.key(38);
  assert.equal(g.state.player.speedy, before);
});

test('chaser heads use the body transform rather than the last limb transform', async () => {
  const g = await game();
  for (const name of ['police', 'dog']) {
    g.draws.length = 0;
    vm.runInContext(`${name}.drawCube(document.querySelector('#glcanvas').getContext('webgl'), mat4.create(), { program: {}, attribLocations: {}, uniformLocations: { modelViewMatrix: 'uModelViewMatrix' } }, 0)`, g.state);
    const body = g.draws.find(draw => draw.buffer === g.state[name].buffer.normal);
    assert.deepEqual(g.draws.at(-1).matrix, body.matrix, name);
  }
});

test('death freezes input, movement, coins and powers until settlement', async () => {
  const g = await game(); g.clearCourse();
  const s = g.state;
  s.dying = true; s.deathTimer = 0; s.freezeTime = 0; s.score = 100;
  s.coins[0].exist = true; s.coins[0].pos = s.player.pos.slice();
  s.boots[0].exist = true; s.boots[0].pos = s.player.pos.slice();
  const position = s.player.pos.slice();
  g.key(39); g.key(38); g.step();
  assert.deepEqual(s.player.pos, position);
  assert.equal(s.coins_collected, 0); assert.equal(s.powersCollected, 0); assert.equal(s.score, 100);
});

test('single-digit coin streaks expire', async () => {
  const g = await game(); g.clearCourse();
  g.state.multiplierStreak = 5; g.state.scoreMultiplier = 1; g.state.lastCoinTime = 97;
  g.step();
  assert.equal(g.state.multiplierStreak, 0);
});

test('coin count stays physical while streak bonuses contribute to score', async () => {
  const g = await game(); g.clearCourse();
  for (let i = 0; i < 20; i++) {
    g.state.coins[0].exist = true;
    g.state.coins[0].pos = g.state.player.pos.slice();
    g.step();
  }
  assert.equal(g.state.coins_collected, 20);
  assert.ok(Math.abs(g.state.score - g.state.runDistance - 32) < 0.001);
});

test('fast movement collects coins crossed between frames', async () => {
  for (const fps of [30, 60, 120, 144]) {
    const g = await game(); g.clearCourse();
    g.state.SPEED_BASE = 1.05;
    g.state.coins[0].exist = true;
    g.state.coins[0].pos = [g.state.player.pos[0], -4, g.state.player.pos[2] - 0.1];
    g.step(1 / fps);
    assert.equal(g.state.coins_collected, 1, `${fps}fps skipped a crossed coin`);
  }
});

test('near-miss slow motion preserves the police following distance', async () => {
  const g = await game(); g.clearCourse();
  const before = g.state.police.pos[2] - g.state.player.pos[2];
  g.state.timeDilation = 0.3;
  for (let i = 0; i < 20; i++) g.step();
  const after = g.state.police.pos[2] - g.state.player.pos[2];
  assert.ok(Math.abs(after - before) < 0.01, `gap changed from ${before} to ${after}`);
});

test('slow motion slows jumping, falling and ducking with forward travel', async () => {
  for (const fps of [30, 60, 120, 144]) {
    for (const motion of ['jump', 'fall', 'duck']) {
      const normal = await game(), slow = await game();
      for (const g of [normal, slow]) {
        g.clearCourse();
        if (motion === 'fall') {
          g.state.player.pos[1] = 5;
          g.state.player.grounded = false;
          g.state.player.speedy = -0.2;
          g.state.wasInAir = true;
        } else g.key(motion === 'jump' ? 38 : 40);
      }
      slow.state.timeDilation = 0.3;
      for (let i = 0; i < Math.ceil(fps / 10); i++) { normal.step(1 / fps); slow.step(1 / fps); }
      assert.ok(slow.state.runDistance < normal.state.runDistance * 0.75);
      if (motion === 'duck') assert.ok(slow.state.duckTime > normal.state.duckTime + 0.03);
      else {
        const origin = motion === 'jump' ? -4 : 5;
        assert.ok(Math.abs(slow.state.player.pos[1] - origin) < Math.abs(normal.state.player.pos[1] - origin) * 0.75,
          `${motion} ignored slow motion at ${fps}fps`);
      }
      for (let i = 0; i < fps * 2; i++) slow.step(1 / fps);
      assert.equal(slow.state.player.pos[1], -4);
      assert.equal(slow.state.player.grounded, true);
      assert.equal(slow.state.ducking, false);
    }
  }
});

test('impact freeze lasts fifty milliseconds within one frame at every refresh rate', async () => {
  for (const fps of [30, 60, 120, 144]) {
    const g = await game(); g.clearCourse();
    g.state.manholes[0].pos = g.state.player.pos.slice();
    g.step(1 / fps);
    assert.equal(g.state.dying, true);
    let frames = 0;
    while (g.state.deathTimer === 0 && frames < fps) { g.step(1 / fps); frames++; }
    const hold = (frames - 1) / fps;
    assert.ok(hold >= 0.05 - 0.00001 && hold <= 0.05 + 1 / fps + 0.00001, `${fps}fps hold: ${hold}s`);
  }
});

test('impact freeze preserves the rendered character poses', async () => {
  const g = await game(); g.clearCourse();
  g.state.manholes[0].pos = g.state.player.pos.slice();
  g.step(1 / 144);
  assert.ok(g.state.dying && g.state.freezeTime > 0);
  const poses = () => ['player', 'police', 'dog'].map(name =>
    g.draws.find(draw => draw.buffer === g.state[name].buffer.normal).matrix);
  const impact = poses();
  let displayed = impact;
  for (let i = 0; i < 16 && g.state.freezeTime > 0; i++) {
    g.step(1 / 144);
    if (g.draws.length) displayed = poses();
    assert.deepEqual(displayed, impact, 'the frozen scene changed character poses');
  }
  assert.equal(g.state.freezeTime, 0);
  g.step(1 / 144);
  assert.ok(g.draws.length > 0 && g.state.deathTimer > 0, 'death animation did not resume after the freeze');
});

test('police stay behind the runner through a stumble and recovery', async () => {
  const g = await game(); g.clearCourse();
  for (let i = 0; i < 1200; i++) g.step();
  g.state.placeDuck(0, g.state.player.pos[0], g.state.player.pos[2] - 0.5);
  g.step();
  assert.equal(g.state.obstacle_hit_type, 'duck');
  for (let i = 0; i < 660; i++) {
    g.step();
    assert.ok(g.state.police.pos[2] - g.state.player.pos[2] >= 2 - 0.001, 'police overtook the player');
  }
  assert.equal(g.state.obstacle_hit, -1);
  assert.equal(g.state.result, undefined);
});

test('train rumble warns before impact and fades after the whole train passes', async () => {
  const g = await game(); g.clearCourse();
  g.state.player.hoverboard = true; g.state.hoverboard_acquired = 100;
  const samples = [];
  g.state.updateTrainRumble = intensity => samples.push(intensity);
  const measure = distance => {
    g.state.placeTrain(0, g.state.player.pos[0], g.state.player.pos[2] - distance - 10);
    g.state.train_speeds[0] = 0;
    g.step();
    return samples.at(-1);
  };
  assert.equal(measure(30), 0);
  const approaching = measure(20), close = measure(5), alongside = measure(-10);
  assert.ok(approaching > 0 && close > approaching && alongside >= close);
  const departing = measure(-35);
  assert.ok(departing > 0 && departing < alongside);
  assert.equal(measure(-50), 0);
  g.state.placeTrain(0, 6, g.state.player.pos[2] - 10);
  g.step();
  assert.equal(samples.at(-1), 0, 'another lane must not trigger a same-lane warning');
});

test('pause does not create a movement burst on the first resumed frame', async () => {
  const g = await game(); g.clearCourse(); g.step();
  g.state.gamePaused = true; g.step(20);
  g.state.gamePaused = false;
  const z = g.state.player.pos[2]; g.step();
  assert.ok(z - g.state.player.pos[2] < 0.4);
});

test('restarting resets the run without another loop or resource allocation', async () => {
  const g = await game(); g.clearCourse();
  const size = g.buffers.size;
  g.state.coins_collected = 27; g.state.player.fly_boost = true;
  assert.equal(typeof g.state.resetGame, 'function');
  g.state.resetGame();
  assert.equal(g.state.coins_collected, 0); assert.equal(g.state.runDistance, 0);
  assert.equal(g.state.player.fly_boost, false); assert.deepEqual(Array.from(g.state.player.pos), [-6, -4, -4]);
  assert.equal(g.buffers.size, size);
});

test('solid box mesh normals face outward', async () => {
  const g = await game();
  const inward = [];
  for (const expression of ['player', 'police', 'dog', 'boxes[0]', 'trainF[0]', 'boots[0]', 'jump_obs[0]', 'duck_obs_stand1[0]']) {
    const object = vm.runInContext(expression, g.state);
    const positions = g.buffers.get(object.buffer.position), normals = g.buffers.get(object.buffer.normal);
    for (let face = 0; face < 6; face++) {
      let dot = 0;
      for (let vertex = face * 4; vertex < face * 4 + 4; vertex++)
        for (let axis = 0; axis < 3; axis++) dot += positions[vertex * 3 + axis] * normals[vertex * 3 + axis];
      if (dot <= 0) inward.push(`${expression} face ${face}`);
    }
  }
  assert.deepEqual(inward, []);
});

test('a train is retained until its rear passes the recycling line', async () => {
  const g = await game();
  const front = g.state.cam_z + 30;
  g.state.trainF[0].pos[2] = front;
  g.state.streamWorld(g.gl, 0);
  assert.equal(g.state.trainF[0].pos[2], front);
});

test('fatal collisions cannot grant a power-up in the impact frame', async () => {
  const g = await game(); g.clearCourse();
  g.state.manholes[0].pos = g.state.player.pos.slice();
  g.state.boots[0].exist = true; g.state.boots[0].pos = g.state.player.pos.slice();
  g.step();
  assert.equal(g.state.dying, true);
  assert.equal(g.state.powersCollected, 0);
  const frozen = [g.state.score, g.state.runDistance];
  for (let i = 0; i < 65; i++) g.step();
  assert.deepEqual(Array.from(g.state.result), [frozen[0], 0, frozen[1]]);
});

test('player afterimages blend without writing opaque depth', async () => {
  const g = await game();
  g.state.afterimages.push({x: 0, y: -4, z: -4, tilt: 0, life: 0.2, maxLife: 0.25});
  g.draws.length = 0;
  g.state.drawScene(g.gl, g.state.gameProgramInfo, 0);
  const ghost = g.draws.filter(draw => draw.buffer === g.state.player.buffer.normal && draw.alpha < 1);
  assert.ok(ghost.length);
  assert.ok(ghost.every(draw => draw.blend && !draw.depthWrite));
});

test('obstacle types use their intended fatal, duck, jump and shield rules', async () => {
  for (const [name, y, safe] of [
    ['trainF', -4, false], ['boxes', -4, false], ['manholes', -4, false],
    ['duck_obs_stop', -4, false], ['duck_obs_stop', -5, true],
    ['jump_obs', -4, false], ['jump_obs', 0, true],
    ['rope_stop', -4, false], ['rope_stop', -5, true], ['rope_stop', 0, true],
  ]) {
    const g = await game(); g.clearCourse();
    g.state.player.pos[1] = y;
    g.state.player.grounded = y <= -4;
    if (y === -5) { g.state.ducking = true; g.state.duckTime = 1; }
    const object = g.state[name][0];
    object.pos[0] = -6; object.pos[2] = -4.2;
    if (name === 'trainF') g.state.train_speeds[0] = 0;
    g.step();
    assert.equal(Boolean(g.state.dying || g.state.result), !safe, `${name} at ${y}`);
  }
  const g = await game(); g.clearCourse();
  g.state.player.hoverboard = true; g.state.hoverboard_acquired = 100;
  g.state.manholes[0].pos = g.state.player.pos.slice(); g.step();
  assert.equal(g.state.dying, false);
});

test('power-up expiry cannot interrupt an airborne jump', async () => {
  const g = await game(); g.clearCourse();
  g.state.player.jumping_boots = true; g.state.boots_acquired = 90;
  g.key(38); g.step();
  assert.equal(g.state.player.jumping_boots, false);
  for (let i = 0; i < 120; i++) g.step();
  assert.equal(g.state.player.pos[1], -4);
  assert.equal(g.state.player.grounded, true);
});

test('landing, ducking on a box and stepping off preserve support correctly', async () => {
  const g = await game(); g.clearCourse();
  const s = g.state;
  s.boxes[0].pos[0] = s.player.pos[0]; s.boxes[0].pos[2] = s.player.pos[2];
  s.player.pos[1] = 0; s.player.speedy = -0.2; s.player.grounded = false; s.wasInAir = true;
  for (let i = 0; i < 10; i++) s.updateVerticalMotion(g.gl, 1);
  assert.equal(s.player.pos[1], s.boxes[0].pos[1] + 2.75);
  assert.equal(s.player.grounded, true);
  g.key(40); g.step();
  assert.equal(s.dying, false);
  g.key(39);
  for (let i = 0; i < 60; i++) g.step();
  assert.equal(s.player.pos[1], -4);
  assert.equal(s.player.grounded, true);
});

test('running distance remains consistent across frame rates', async () => {
  const distances = [];
  for (const fps of [30, 60, 120, 144]) {
    const g = await game(); g.clearCourse();
    g.state.drawScene = () => {};
    for (let i = 0; i < fps * 2; i++) g.step(1 / fps);
    distances.push(g.state.runDistance);
  }
  assert.ok(Math.max(...distances) - Math.min(...distances) < 0.1, JSON.stringify(distances));
});

test('flight expiry descends through the world instead of teleporting to ground', async () => {
  const g = await game(); g.clearCourse();
  const s = g.state;
  s.player.fly_boost = true; s.player.pos[1] = 10; s.player.grounded = false; s.fb_acquired = 90;
  g.step();
  assert.equal(s.player.fly_boost, false);
  assert.ok(s.player.pos[1] > -4 && s.player.pos[1] < 10);
  for (let i = 0; i < 100; i++) g.step();
  assert.equal(s.player.pos[1], -4);
  assert.equal(s.player.grounded, true);
});

test('streaming thirty kilometres preserves world coverage and buffer counts', async () => {
  const g = await game();
  const coinCount = g.state.coins.length, bufferCount = g.buffers.size;
  for (let distance = 0; distance < 30000; distance += 5) {
    g.state.player.pos[2] -= 5;
    g.state.cam_z = g.state.player.pos[2] + 14;
    g.state.streamWorld(g.gl, 0.3);
    const z = g.state.track1.map(track => track.pos[2]);
    assert.ok(Math.min(...z) <= g.state.cam_z - 145);
    assert.ok(Math.max(...z) >= g.state.cam_z + 15);
  }
  assert.equal(g.state.coins.length, coinCount);
  assert.equal(g.buffers.size, bufferCount);
});
