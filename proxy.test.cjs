/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS test harness. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');
const loaded = { exports: {} };
new Function('require', 'module', 'exports', ts.transpileModule(readFileSync(`${__dirname}/proxy.ts`, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText)(() => ({}), loaded, loaded.exports);

test('the generated icon stays public while application pages remain authenticated', () => {
  const matcher = new RegExp(`^${loaded.exports.config.matcher[0]}$`);
  for (const path of ['/icon', '/Logo.jpeg', '/favicon.ico', '/_next/static/chunk.js', '/api/auth/session-end']) assert.equal(matcher.test(path), false, path);
  for (const path of ['/notifications', '/doctor/notifications', '/ar/student/notifications', '/icon/settings']) assert.equal(matcher.test(path), true, path);
});

test('a signed-out student opening a shared exam link is sent to sign-in with the way back', () => {
  // auth-routes with its real route tables; the auth/user helpers are not used here.
  const load = (file) => {
    const mod = { exports: {} };
    new Function('require', 'module', 'exports', ts.transpileModule(readFileSync(`${__dirname}/${file}`, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText)((id) => (id === '@/src/lib/role-route-config' ? load('src/lib/role-route-config.ts')
      : id === '@/src/lib/app-locales' ? load('src/lib/app-locales.ts') : {}), mod, mod.exports);
    return mod.exports;
  };
  const { getLoginHref, getRouteZone } = load('src/lib/auth-routes.ts');
  const path = '/ar/student/exams/start-exam/42';
  assert.equal(getLoginHref(path, '', getRouteZone(path)), '/login?next=%2Far%2Fstudent%2Fexams%2Fstart-exam%2F42');
  assert.equal(getLoginHref('/en/student/live-sessions/7/', '?x=1', 'student'), '/login?next=%2Fen%2Fstudent%2Flive-sessions%2F7%3Fx%3D1');
  assert.equal(getLoginHref('/doctor/exams', '', getRouteZone('/doctor/exams')), '/login');
});
