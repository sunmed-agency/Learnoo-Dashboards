const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const ts = require('typescript');

function load(env) {
  const compiled = ts.transpileModule(readFileSync(join(__dirname, 'share-links.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const mod = { exports: {} };
  const previous = process.env.NEXT_PUBLIC_APP_URL;
  if (env === undefined) delete process.env.NEXT_PUBLIC_APP_URL; else process.env.NEXT_PUBLIC_APP_URL = env;
  new Function('require', 'module', 'exports', compiled)(
    id => (id === '@/src/lib/app-locales' ? { APP_LOCALES: ['en', 'ar'] } : require(id)),
    mod, mod.exports,
  );
  if (previous === undefined) delete process.env.NEXT_PUBLIC_APP_URL; else process.env.NEXT_PUBLIC_APP_URL = previous;
  return mod.exports;
}

test('shared links are the student pages of learnoo.app, which the app opens', () => {
  const { examShareUrl, liveSessionShareUrl } = load(undefined);
  assert.equal(examShareUrl(42, 'ar'), 'https://learnoo.app/ar/student/exams/start-exam/42');
  assert.equal(liveSessionShareUrl('7', 'en'), 'https://learnoo.app/en/student/live-sessions/7');
});

test('an unknown dashboard locale falls back to Arabic and the site URL follows the environment', () => {
  const { examShareUrl } = load('http://localhost:3000/');
  assert.equal(examShareUrl(5, 'fr'), 'http://localhost:3000/ar/student/exams/start-exam/5');
});
