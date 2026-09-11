const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const root = path.resolve(__dirname, '..');

test('Pages artifact contains only runtime files and resolves every versioned resource', async () => {
  const { buildPages } = await import('../scripts/build-pages.mjs');
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'subway-pages-'));
  try {
    buildPages(output);
    const html = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
    const version = html.match(/name="application-version" content="([^"]+)"/)[1];
    const references = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map(match => match[1]);
    const engine = fs.readFileSync(path.join(output, 'main.js'), 'utf8');
    references.push(...[...engine.matchAll(/loadTexture\(gl, '([^']+)'\)/g)].map(match => match[1] + '?v=' + version));
    const expected = new Set(['index.html', '.nojekyll']);
    for (const reference of references) {
      const url = new URL(reference, 'https://example.github.io/Subway-Surfers/');
      assert.equal(url.origin, 'https://example.github.io');
      assert.ok(url.pathname.startsWith('/Subway-Surfers/'), reference);
      const relative = url.pathname.slice('/Subway-Surfers/'.length);
      expected.add(relative);
      const file = path.join(output, relative);
      assert.ok(fs.readdirSync(path.dirname(file)).includes(path.basename(file)), `missing or wrong-case resource: ${reference}`);
      assert.ok(fs.statSync(file).size > 0, reference);
      if (!relative.endsWith('.svg')) assert.equal(url.searchParams.get('v'), version, `stale cache URL: ${reference}`);
      assert.deepEqual(fs.readFileSync(file), fs.readFileSync(path.join(root, relative)));
    }
    const files = fs.readdirSync(output, { recursive: true }).filter(file => fs.statSync(path.join(output, file)).isFile());
    assert.deepEqual(files.sort(), [...expected].sort(), 'development files leaked into the deployment');
  } finally { fs.rmSync(output, { recursive: true, force: true }); }
});
