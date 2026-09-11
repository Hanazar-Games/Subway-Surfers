import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function browserClient() {
  if (process.argv[2]) {
    const { connect } = await import(pathToFileURL(join(process.argv[2], 'dist/src/client.js')));
    return connect();
  }
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
  const contexts = new Map();
  return {
    async page(name, options) {
      const context = await browser.newContext(options);
      context.setDefaultTimeout(30000);
      contexts.set(name, context);
      return context.newPage();
    },
    async close(name) {
      await contexts.get(name)?.close();
      contexts.delete(name);
    },
    async disconnect() { await browser.close(); }
  };
}
