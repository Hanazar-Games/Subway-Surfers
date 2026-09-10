import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

const skillDir = process.argv[2];
if (!skillDir) throw new Error('Usage: node tests/browser.mjs /path/to/dev-browser [artifact-directory]');
const { connect } = await import(pathToFileURL(join(skillDir, 'dist/src/client.js')));
const client = await connect();
const url = process.env.GAME_URL || 'http://127.0.0.1:8735';
const prefix = `subway-regression-${Date.now()}`;
const pages = [], errors = [], renderingErrors = [];
const artifactDir = process.argv[3];
const check = (condition, message) => { assert.ok(condition, message); console.log(`PASS ${message}`); };

async function newPage(name, setup, expectedFailure = false) {
  const pageName = `${prefix}-${name}`;
  pages.push(pageName);
  const page = await client.page(pageName, { viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', error => errors.push(error.message));
  if (!expectedFailure) {
    page.on('console', message => {
      if (message.type() === 'error' || /GL_INVALID|GL_OUT_OF_MEMORY|INVALID_OPERATION/.test(message.text())) renderingErrors.push(message.text());
    });
    page.on('requestfailed', request => renderingErrors.push(`${request.url()}: ${request.failure()?.errorText}`));
    page.on('response', response => { if (response.status() >= 400) renderingErrors.push(`${response.status()} ${response.url()}`); });
  }
  await page.route('**/*', route => route.continue());
  if (setup) await setup(page);
  await page.goto(url);
  return page;
}

async function screenshot(page, name) {
  if (artifactDir) await page.screenshot({ path: join(artifactDir, `${name}.png`), animations: 'disabled' });
}

async function start(page) {
  await page.locator('#btn-start').click();
  await page.waitForFunction(() => window.gameReady && !window.gamePaused);
  await page.evaluate(() => {
    for (const objects of [trainF, trainT, trainL, trainR, trainExtra, boxes, manholes, duck_obs_stop, duck_obs_stand1, duck_obs_stand2, jump_obs, rope_stop, rope_stand1, rope_stand2])
      for (const object of objects) object.pos[2] = -10000;
  });
}

try {
  const page = await newPage('flow', async page => {
    await page.addInitScript(() => localStorage.clear());
  });
  await page.locator('#splash-screen').waitFor({ state: 'detached' });
  check(await page.locator('#hud').evaluate(el => el.inert && getComputedStyle(el).visibility === 'hidden'), 'hidden HUD cannot receive focus');
  check(await page.locator('#start-screen').evaluate(el => getComputedStyle(el).transitionDelay.split(',').every(value => parseFloat(value) === 0)), 'screen transitions respond without an extra delay');
  await screenshot(page, 'menu');
  await page.locator('#btn-settings').click();
  await page.locator('#volume-music').fill('35');
  await page.locator('#volume-sfx').fill('20');
  await page.locator('#toggle-fps').check();
  await page.locator('#toggle-splash').uncheck();
  check(await page.locator('#music').evaluate(el => el.volume === 0.35), 'music preference applies');
  await page.keyboard.press('Escape');
  await start(page);
  await page.waitForTimeout(450);
  check(await page.evaluate(() => !document.querySelector('#music').paused), 'BGM starts after countdown');
  check(await page.evaluate(() => {
    const a = document.querySelector('#hud-pause').getBoundingClientRect();
    const b = document.querySelector('#hud-highscore').getBoundingClientRect();
    return a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top;
  }), 'best-score badge does not cover pause');
  check(await page.locator('#distance-bar').evaluate(el => getComputedStyle(el).overflow === 'visible'), 'distance text is not clipped');
  await page.locator('#hud-pause').focus();
  await page.keyboard.press('Space');
  check(await page.evaluate(() => uiCurrentScreen === 'pause'), 'pause button supports keyboard Space');
  await page.keyboard.press('Escape');

  await page.keyboard.press('ArrowRight');
  check(await page.evaluate(() => player.pos[0] === 0), 'keyboard changes lane once');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowUp');
  await page.waitForFunction(() => player.grounded);
  await page.keyboard.press('ArrowDown');
  check(await page.evaluate(() => ducking && player.pos[1] === -5), 'duck control works');
  await page.waitForFunction(() => !ducking);

  await page.evaluate(() => { player.jumping_boots = true; boots_acquired = Date.now() / 1000; });
  await page.keyboard.press('Escape');
  const paused = await page.evaluate(() => ({ z: player.pos[2], remaining: 10 - (Date.now() / 1000 - boots_acquired) }));
  await page.locator('#pause-volume').fill('0');
  await page.waitForTimeout(650);
  check(await page.locator('#music').evaluate(el => el.volume === 0), 'pause fade cannot overwrite mute');
  check(await page.evaluate(z => player.pos[2] === z, paused.z), 'pause freezes movement');
  check(await page.evaluate(() => sfxMasterGain.gain.value === 0), 'pause mutes game SFX');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {configurable: true, get: () => true});
    document.dispatchEvent(new Event('visibilitychange'));
  });
  check(await page.locator('#music').evaluate(el => el.paused), 'hiding an already paused game also stops BGM');
  await page.evaluate(() => { delete document.hidden; });
  await page.locator('#pause-volume').fill('35');
  await page.locator('#btn-resume').click();
  check(await page.evaluate(remaining => Math.abs(10 - (Date.now() / 1000 - boots_acquired) - remaining) < 0.25, paused.remaining), 'resume preserves power-up lifetime');
  check(await page.evaluate(() => Math.abs(sfxMasterGain.gain.value - 0.16) < 0.001), 'resume restores SFX volume');

  const audio = await page.evaluate(async () => {
    const decoded = [];
    for (const id of ['music', 'crash']) {
      const source = document.getElementById(id).currentSrc;
      const buffer = await audioCtx.decodeAudioData(await (await fetch(source)).arrayBuffer());
      const samples = buffer.getChannelData(0);
      let peak = 0;
      for (const sample of samples) {
        if (!Number.isFinite(sample)) throw new Error('Invalid audio sample');
        peak = Math.max(peak, Math.abs(sample));
      }
      decoded.push({id, duration: buffer.duration, peak});
    }
    const analyser = audioCtx.createAnalyser();
    sfxMasterGain.connect(analyser);
    const samplePeak = async () => {
      playCoinSound();
      let peak = 0;
      const samples = new Float32Array(analyser.fftSize);
      for (let i = 0; i < 8; i++) {
        await new Promise(resolve => setTimeout(resolve, 20));
        analyser.getFloatTimeDomainData(samples);
        for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
      }
      return peak;
    };
    const audible = await samplePeak();
    setSfxVolume(0);
    await new Promise(resolve => setTimeout(resolve, 100));
    const muted = await samplePeak();
    sfxMasterGain.disconnect(analyser);
    setSfxVolume(0.2);
    return {decoded, audible, muted};
  });
  check(audio.decoded.every(item => item.duration > 0 && item.peak > 0), 'BGM and crash files decode to finite, non-silent audio');
  check(audio.audible > 0.001 && audio.muted < 0.00001, 'SFX output has a signal and mute produces silence');
  await page.locator('#music').evaluate(el => { el.currentTime = el.duration - 0.2; });
  await page.waitForFunction(() => document.querySelector('#music').currentTime < 2);
  check(await page.locator('#music').evaluate(el => !el.paused && el.loop), 'BGM loops after reaching the end');

  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {configurable: true, get: () => true});
    document.dispatchEvent(new Event('visibilitychange'));
  });
  check(await page.evaluate(() => gamePaused && uiCurrentScreen === 'pause' && document.querySelector('#music').paused), 'hidden tab pauses gameplay and BGM');
  await page.evaluate(() => { delete document.hidden; });
  await page.locator('#btn-resume').click();

  await page.keyboard.press('2');
  await page.waitForFunction(() => theme === 2 && theme_flag === 0);
  await screenshot(page, 'neon');
  await page.keyboard.press('g');
  check(await page.evaluate(() => greyScale && !flashing), 'grayscale toggle');
  await page.keyboard.press('f');
  check(await page.evaluate(() => flashing && !greyScale), 'flash mode excludes grayscale');
  await page.keyboard.press('f');
  await page.keyboard.press('1');
  await page.keyboard.press('Escape');
  await page.locator('#btn-restart-pause').click();
  await page.waitForFunction(() => !window.gamePaused);
  check(await page.evaluate(() => runDistance < 5 && coins_collected === 0 && !player.jumping_boots && document.querySelectorAll('script[src*="main.js"]').length === 1), 'restart resets the run in place');

  await page.evaluate(() => {
    manholes[0].pos = player.pos.slice();
    boots[0].pos = player.pos.slice(); boots[0].exist = true;
  });
  await page.waitForFunction(() => dying);
  const impact = await page.evaluate(() => ({score, distance: runDistance, coins: coins_collected, powers: powersCollected, x: player.pos[0]}));
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => uiCurrentScreen === 'gameover');
  check(await page.evaluate(impact => score === impact.score && runDistance === impact.distance && coins_collected === impact.coins && powersCollected === impact.powers && player.pos[0] === impact.x, impact), 'death freezes all settlement state and input');
  check(await page.locator('#music').evaluate(el => el.paused), 'death stops BGM');
  check(await page.locator('#crash').evaluate(el => el.currentTime > 0), 'crash audio plays');
  const games = await page.evaluate(() => JSON.parse(localStorage.getItem('ss_stats')).games);
  await page.evaluate(() => uiGameOver(score, coins_collected, runDistance));
  check(await page.evaluate(games => JSON.parse(localStorage.getItem('ss_stats')).games === games, games), 'settlement cannot double-count a run');
  await screenshot(page, 'gameover');
  await page.evaluate(() => {
    window.open = () => null;
    Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {writeText: async () => {}}});
  });
  await page.locator('#btn-share').waitFor({state: 'visible'});
  await page.locator('#btn-share').focus();
  await page.waitForFunction(() => document.activeElement === document.querySelector('#btn-share'));
  await page.keyboard.press('Space');
  check(await page.evaluate(() => uiCurrentScreen === 'gameover' && document.querySelector('#btn-share').textContent === 'Popup blocked'), 'keyboard share respects focus and reports a blocked popup');
  await page.locator('#btn-restart-over').click();
  await page.waitForFunction(() => !window.gamePaused);
  await page.keyboard.press('Escape');
  await page.locator('#btn-menu-pause').click();
  check(await page.evaluate(() => uiCurrentScreen === 'start' && gamePaused && document.querySelector('#screen-flash').style.opacity === '0'), 'main menu clears pause overlay and audio');

  for (const value of ['null', '{}', '42', '"bad"']) {
    await page.evaluate(value => localStorage.setItem('ss_achievements', value), value);
    await page.locator('#btn-stats').click();
    check(await page.locator('.achievement-item').count() === 7, `stats tolerates ${value}`);
    await page.locator('#btn-stats-back').click();
  }
  for (const viewport of [{width:320,height:568}, {width:390,height:844}, {width:667,height:375}]) {
    await page.setViewportSize(viewport);
    for (const name of ['howto', 'stats', 'settings']) {
      await page.locator(`#btn-${name}`).click();
      await page.waitForTimeout(550);
      check(await page.evaluate(name => {
        const rect = document.querySelector(`#${name}-screen .glass-card`).getBoundingClientRect();
        return rect.left >= -1 && rect.right <= innerWidth + 1 && rect.top >= -1 && rect.bottom <= innerHeight + 1;
      }, name), `${viewport.width}x${viewport.height} ${name} fits viewport`);
      await screenshot(page, `${viewport.width}-${name}`);
      await page.locator(`#btn-${name}-back`).click();
    }
  }

  await page.setViewportSize({width:390,height:844});
  await start(page);
  await page.locator('#touch-right').dispatchEvent('pointerdown');
  check(await page.evaluate(() => player.pos[0] === 0), 'touch button emits one move');
  await page.locator('#touch-left').dispatchEvent('pointerdown');
  check(await page.evaluate(() => player.pos[0] === -6), 'independent touch controls accept a quick combo');
  await screenshot(page, 'mobile-game');
  for (const viewport of [{width:320,height:568}, {width:390,height:844}, {width:667,height:375}]) {
    await page.setViewportSize(viewport);
    check(await page.evaluate(() => {
      const intersects = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      const rect = selector => document.querySelector(selector).getBoundingClientRect();
      const hint = document.querySelector('#key-hint');
      return !intersects(rect('#hud-theme'), rect('#hud-pause')) &&
        !intersects(rect('#distance-bar'), rect('#touch-controls')) &&
        (getComputedStyle(hint).display === 'none' || !intersects(hint.getBoundingClientRect(), rect('#touch-controls')));
    }), `${viewport.width}x${viewport.height} gameplay controls and labels do not overlap`);
    await screenshot(page, `${viewport.width}-game`);
  }
  await page.evaluate(() => {
    const target = document.querySelector('#glcanvas');
    const touch = clientX => new Touch({identifier: 1, target, clientX, clientY: 200});
    target.dispatchEvent(new TouchEvent('touchstart', {bubbles: true, touches: [touch(150)]}));
    target.dispatchEvent(new TouchEvent('touchend', {bubbles: true, changedTouches: [touch(230)]}));
  });
  check(await page.evaluate(() => player.pos[0] === 0), 'swipe moves exactly one lane');
  await page.keyboard.press('Escape');

  const denied = await newPage('storage-denied', async page => {
    await page.addInitScript(() => Object.defineProperty(window, 'localStorage', {get() { throw new DOMException('Denied', 'SecurityError'); }}));
  });
  await denied.locator('#splash-screen').waitFor({state:'detached'});
  await denied.locator('#btn-settings').click();
  await denied.locator('#volume-sfx').fill('23');
  check(await denied.locator('#volume-sfx-value').textContent() === '23%', 'settings work when persistent storage is unavailable');

  const failure = await newPage('asset-failure', async page => {
    await page.route('**/assets/1_Track.jpg*', route => route.abort());
  }, true);
  await failure.locator('#btn-start').click();
  await failure.waitForFunction(() => uiCurrentScreen === 'webgl-error');
  check(await failure.evaluate(() => gamePaused && !gameReady && document.querySelector('#countdown-overlay').style.display === 'none'), 'failed assets prevent countdown and expose reload');

  let releaseTexture;
  const heldTexture = new Promise(resolve => { releaseTexture = resolve; });
  const slow = await newPage('slow-assets', async page => {
    await page.route('**/assets/1_Track.jpg*', async route => { await heldTexture; await route.continue(); });
  });
  await slow.locator('#btn-start').click();
  await slow.waitForFunction(() => typeof gameLoadPromise !== 'undefined');
  check(await slow.evaluate(() => gamePaused && !gameReady && document.querySelector('#countdown-overlay').style.display === 'none'), 'countdown waits for delayed textures');
  releaseTexture();
  await slow.waitForFunction(() => gameReady && !gamePaused);
  await slow.keyboard.press('Escape');

  const noWebgl = await newPage('no-webgl', async page => {
    await page.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
        return kind.includes('webgl') ? null : getContext.call(this, kind, ...args);
      };
    });
  });
  await noWebgl.locator('#btn-start').click();
  check(await noWebgl.evaluate(() => uiCurrentScreen === 'webgl-error' && gamePaused), 'WebGL unavailable exposes a recoverable error');

  const shaderFailure = await newPage('shader-failure', async page => {
    await page.addInitScript(() => {
      WebGLRenderingContext.prototype.getShaderParameter = () => false;
    });
  }, true);
  await shaderFailure.locator('#btn-start').click();
  await shaderFailure.waitForFunction(() => uiCurrentScreen === 'webgl-error');
  check(await shaderFailure.evaluate(() => gamePaused && !gameReady), 'shader failure cannot start a broken run');

  check(errors.length === 0, `no uncaught browser errors: ${errors.join('; ')}`);
  check(renderingErrors.length === 0, `no unexpected console, WebGL or network errors: ${renderingErrors.join('; ')}`);
} finally {
  for (const name of pages) await client.close(name);
  await client.disconnect();
}
