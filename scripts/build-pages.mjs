import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

export function buildPages(output) {
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  const engine = readFileSync(join(root, 'main.js'), 'utf8');
  const files = new Set(['index.html']);
  for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) files.add(match[1].replace(/^\.\//, '').split('?')[0]);
  for (const match of engine.matchAll(/loadTexture\(gl, '([^']+)'\)/g)) files.add(match[1]);
  for (const file of files) {
    if (!/^(?:assets\/)?[\w.-]+$/.test(file)) throw new Error(`Unexpected runtime path: ${file}`);
    const source = join(root, file);
    if (!readdirSync(dirname(source)).includes(file.split('/').at(-1))) throw new Error(`Missing or wrong-case resource: ${file}`);
    mkdirSync(dirname(join(output, file)), { recursive: true });
    copyFileSync(source, join(output, file));
  }
  writeFileSync(join(output, '.nojekyll'), '');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = join(root, '_site');
  rmSync(output, { recursive: true, force: true });
  buildPages(output);
  console.log('Built Pages artifact in _site/');
}
