import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

const skillDir = process.argv[2];
if (!skillDir) throw new Error('Usage: node tests/browser-lifecycle.mjs /path/to/dev-browser [artifact-directory]');
const { connect } = await import(pathToFileURL(join(skillDir, 'dist/src/client.js')));
const client = await connect();
const prefix = `subway-lifecycle-${Date.now()}`;
const url = process.env.GAME_URL || 'http://127.0.0.1:8735';
const artifacts = process.argv[3];
const failures = [];

async function test(name, run) {
  if (process.env.TEST_CASE && !name.includes(process.env.TEST_CASE)) return;
  const pageName = `${prefix}-${name}`;
  const page = await client.page(pageName, {viewport: {width: 1440, height: 1000}});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.route('**/*', route => route.continue());
    await page.addInitScript(() => { localStorage.clear(); localStorage.setItem('ss_showIntro', 'false'); });
    await run(page);
    assert.deepEqual(errors, [], 'uncaught browser errors');
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push(name);
    console.error(`FAIL ${name}: ${error.message}`);
  } finally { await client.close(pageName); }
}

async function start(page) {
  await page.goto(url);
  await page.locator('#btn-start').click();
  await page.waitForFunction(() => gameReady && !gamePaused);
  await page.evaluate(() => {
    for (const objects of [trainF, trainT, trainL, trainR, trainExtra, boxes, manholes, duck_obs_stop, duck_obs_stand1, duck_obs_stand2, jump_obs, rope_stop, rope_stand1, rope_stand2])
      for (const object of objects) object.pos[2] = -10000;
  });
}

try {
  await test('multi-touch', async page => {
    await start(page);
    const result = await page.evaluate(() => {
      const target = document.querySelector('#glcanvas');
      const touch = (identifier, clientX) => new Touch({identifier, target, clientX, clientY: 250});
      const send = (type, touches, changedTouches = []) => target.dispatchEvent(new TouchEvent(type, {bubbles: true, touches, changedTouches}));
      send('touchstart', [touch(1, 100)]);
      send('touchstart', [touch(1, 100), touch(2, 200)]);
      send('touchend', [touch(1, 100)], [touch(2, 200)]);
      send('touchend', [], [touch(1, 100)]);
      const stationary = player.pos[0];
      send('touchstart', [touch(3, 100)]);
      send('touchcancel', [], [touch(3, 200)]);
      send('touchend', [], [touch(3, 200)]);
      const cancelled = player.pos[0];
      send('touchstart', [touch(4, 100)]);
      send('touchend', [], [touch(4, 200)]);
      return {stationary, cancelled, swipe: player.pos[0]};
    });
    assert.deepEqual(result, {stationary: -6, cancelled: -6, swipe: 0});
  });

  await test('held-pause-key', async page => {
    await start(page);
    await page.keyboard.down('Escape');
    await page.keyboard.down('Escape');
    await page.keyboard.up('Escape');
    assert.equal(await page.evaluate(() => uiCurrentScreen), 'pause', 'key repeat resumed the paused run');
  });

  await test('held-effect-keys', async page => {
    await start(page);
    for (const [key, flag] of [['g', 'greyScale'], ['f', 'flashing']]) {
      await page.keyboard.down(key);
      await page.keyboard.down(key);
      await page.keyboard.up(key);
      assert.equal(await page.evaluate(flag => window[flag], flag), true, `holding ${key} switched the effect off`);
      await page.keyboard.press(key);
      assert.equal(await page.evaluate(flag => window[flag], flag), false, `a new ${key} press did not toggle off`);
    }
  });

  await test('unsupported-fullscreen', async page => {
    await page.addInitScript(() => Object.defineProperty(Element.prototype, 'requestFullscreen', {configurable: true, value: undefined}));
    await page.goto(url);
    await page.locator('#btn-settings').click();
    assert.equal(await page.locator('#btn-fullscreen').isVisible(), false, 'an unavailable fullscreen action is visible');
    assert.equal(await page.getByRole('button', {name: 'Fullscreen'}).count(), 0);
    if (artifacts) await page.screenshot({path: join(artifacts, 'settings-without-fullscreen.png'), animations: 'disabled'});
  });

  await test('accessible-direction-buttons', async page => {
    await page.setViewportSize({width: 390, height: 844});
    await start(page);
    await page.locator('#touch-right').click({button: 'right'});
    assert.equal(await page.evaluate(() => player.pos[0]), -6, 'right mouse button changed lanes');
    await page.locator('#touch-right').focus();
    await page.keyboard.press('Space');
    assert.equal(await page.evaluate(() => player.pos[0]), 0, 'Space did not activate Right');
    await page.locator('#touch-left').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => player.pos[0]), -6, 'Enter did not activate Left');
    await page.locator('#touch-right').click();
    assert.equal(await page.evaluate(() => player.pos[0]), 0, 'pointer click must move exactly once');
    await page.keyboard.press('Escape');
    await page.locator('#touch-right').dispatchEvent('click', {detail: 0});
    assert.equal(await page.evaluate(() => player.pos[0]), 0, 'hidden controls moved the player');
  });

  await test('short-screen-scroll-and-focus', async page => {
    await page.setViewportSize({width: 320, height: 480});
    await page.goto(url);
    for (const name of ['stats', 'howto', 'settings']) {
      for (let visit = 0; visit < 2; visit++) {
        await page.locator(`#btn-${name}`).click();
        assert.ok(await page.evaluate(name => {
          const card = document.querySelector(`#${name}-screen .glass-card`);
          const bounds = card.getBoundingClientRect(), focus = document.activeElement.getBoundingClientRect();
          return card.scrollTop === 0 && focus.top >= bounds.top && focus.bottom <= bounds.bottom;
        }, name), `${name} visit ${visit + 1} must open at the top with visible focus`);
        if (artifacts && visit === 1) await page.screenshot({path: join(artifacts, `reopened-${name}.png`), animations: 'disabled'});
        await page.locator(`#btn-${name}-back`).click();
      }
    }
    await page.locator('#btn-settings').click();
    assert.equal(await page.evaluate(() => document.activeElement.id), 'volume-music', 'settings skipped its first control');
  });

  await test('sfx-signal-and-stop', async page => {
    await start(page);
    const samples = await page.evaluate(async () => {
      gamePaused = true;
      uiStopRunAudio();
      initSfx(); resumeSfx();
      const analyser = audioCtx.createAnalyser();
      sfxMasterGain.connect(analyser);
      const peak = async () => {
        const data = new Float32Array(analyser.fftSize);
        let value = 0;
        for (let i = 0; i < 8; i++) {
          await new Promise(resolve => setTimeout(resolve, 20));
          analyser.getFloatTimeDomainData(data);
          for (const sample of data) value = Math.max(value, Math.abs(sample));
        }
        return value;
      };
      const results = [];
      for (const play of [playJumpSound, playBumpSound, playPowerUpSound, playMilestoneFanfare, () => updateTrainRumble(1)]) {
        setSfxVolume(0.5);
        play();
        const audible = await peak();
        uiStopRunAudio();
        await new Promise(resolve => setTimeout(resolve, 100));
        const stopped = await peak();
        results.push({audible, stopped});
        await new Promise(resolve => setTimeout(resolve, 900));
      }
      sfxMasterGain.disconnect(analyser);
      return results;
    });
    for (const [i, sample] of samples.entries()) {
      assert.ok(sample.audible > 0.001, `SFX ${i} has no signal`);
      assert.ok(sample.stopped < 0.00001, `SFX ${i} continues after stopping run audio`);
    }
    await page.evaluate(() => uiPauseGame());
    await page.locator('#btn-resume').click();
    await page.waitForFunction(() => !document.querySelector('#music').paused && sfxMasterGain.gain.value > 0);
  });

  await test('populated-mobile-hud', async page => {
    await start(page);
    for (const viewport of [{width: 320, height: 568}, {width: 390, height: 844}, {width: 768, height: 1024}, {width: 320, height: 480}]) {
      await page.setViewportSize(viewport);
      await page.evaluate(() => {
        for (const coin of coins) coin.exist = false;
        coins_collected = 123456; bonusScore = 123456;
        scoreMultiplier = 3; multiplierStreak = 150; lastCoinTime = Date.now() / 1000;
        document.querySelector('#hud-streak-panel').style.display = 'flex';
        document.querySelector('#hud-streak').textContent = '150';
      });
      await page.waitForFunction(() => document.querySelector('#hud-coins').textContent === '123,456');
      if (artifacts) await page.screenshot({path: join(artifacts, `populated-hud-${viewport.width}x${viewport.height}.png`), animations: 'disabled'});
      const overlaps = await page.evaluate(() => {
        const items = [...document.querySelectorAll('.hud-panel, #hud-theme, #hud-pause, #hud-highscore, #glcanvas')];
        const result = [];
        for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
          const a = items[i].getBoundingClientRect(), b = items[j].getBoundingClientRect();
          if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom)
            result.push([items[i].id || items[i].textContent.trim(), items[j].id || items[j].textContent.trim()]);
        }
        return result;
      });
      assert.deepEqual(overlaps, [], `${viewport.width}x${viewport.height}`);
    }
  });

  await test('screen-focus', async page => {
    await page.goto(url);
    await page.locator('#btn-settings').click();
    await page.waitForTimeout(550);
    assert.ok(await page.evaluate(() => Boolean(document.activeElement.closest('#settings-screen'))), 'focus stayed on the hidden menu');
    assert.equal(await page.getByRole('slider', {name: 'Music volume', exact: true}).count(), 1);
    assert.equal(await page.getByRole('slider', {name: 'Sound effects volume', exact: true}).count(), 1);
  });

  await test('restart-hud', async page => {
    await start(page);
    await page.evaluate(() => { bonusScore = 600; coins_collected = 12; });
    await page.waitForFunction(() => document.querySelector('#hud-coins').textContent === '12');
    await page.keyboard.press('Escape');
    await page.evaluate(() => {
      const hud = document.querySelector('#hud');
      const observer = new MutationObserver(() => {
        if (!hud.classList.contains('visible')) return;
        window.restartHud = {
          score: document.querySelector('#hud-score').textContent,
          coins: document.querySelector('#hud-coins').textContent,
          time: document.querySelector('#hud-time').textContent,
        };
        observer.disconnect();
      });
      observer.observe(hud, {attributes: true});
    });
    await page.locator('#btn-restart-pause').click();
    await page.waitForFunction(() => window.restartHud);
    assert.deepEqual(await page.evaluate(() => restartHud), {score: '0', coins: '0', time: '0:00'});
  });

  await test('distance-score-animation', async page => {
    await start(page);
    await page.evaluate(() => { gamePaused = true; score = 100; });
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      window.distancePopped = false;
      const scoreEl = document.querySelector('#hud-score');
      new MutationObserver(() => {
        if (scoreEl.classList.contains('score-pop')) window.distancePopped = true;
      }).observe(scoreEl, {attributes: true});
      window.distanceTimer = setInterval(() => { score += 6; }, 80);
    });
    await page.waitForTimeout(450);
    const popped = await page.evaluate(() => { clearInterval(distanceTimer); return distancePopped; });
    assert.equal(popped, false, 'distance-only score changes repeatedly bounce the HUD');
    await page.evaluate(() => { bonusScore += 1; score += 1; });
    await page.waitForFunction(() => document.querySelector('#hud-score').classList.contains('score-pop'));
  });

  for (const stage of ['loading', 'countdown', 'countdown-finish', 'playing', 'pause']) {
    await test(`context-loss-${stage}`, async page => {
      let release;
      const held = new Promise(resolve => { release = resolve; });
      if (stage === 'loading') await page.route('**/assets/1_Track.jpg*', async route => { await held; await route.continue(); });
      try {
        await page.goto(url);
        await page.locator('#btn-start').click();
        if (stage === 'loading') await page.waitForFunction(() => typeof gameLoadPromise !== 'undefined');
        else if (stage === 'countdown') await page.waitForFunction(() => document.querySelector('#countdown-overlay').style.display === 'flex');
        else if (stage === 'countdown-finish') await page.waitForFunction(() => document.querySelector('#countdown-number').textContent === 'GO!');
        else {
          await page.waitForFunction(() => gameReady && !gamePaused);
          if (stage === 'pause') await page.keyboard.press('Escape');
        }
        await page.evaluate(() => document.querySelector('#glcanvas').getContext('webgl').getExtension('WEBGL_lose_context').loseContext());
        await page.waitForTimeout(150);
        assert.equal(await page.evaluate(() => uiCurrentScreen), 'webgl-error');
        release();
        await page.waitForTimeout(3700);
        assert.ok(await page.evaluate(() => gamePaused && !gameReady && uiCurrentScreen === 'webgl-error' &&
          document.querySelector('#music').paused && document.querySelector('#crash').paused &&
          (!sfxMasterGain || sfxMasterGain.gain.value === 0) &&
          document.querySelector('#countdown-overlay').style.display === 'none' &&
          document.querySelector('#loading-overlay').classList.contains('hidden')),
        'a stale load or countdown restarted the failed game');
        assert.equal(await page.evaluate(() => localStorage.getItem('ss_stats')), null, 'graphics failure must not count as a finished run');
      } finally { release(); }
    });
  }
} finally { await client.disconnect(); }

if (failures.length) process.exitCode = 1;
