const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');

const load = (file) => {
  const { outputText } = ts.transpileModule(readFileSync(require.resolve(file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
  const mod = { exports: {} };
  new Function('module', 'exports', 'require', outputText)(mod, mod.exports, require);
  return mod.exports;
};
const { formatClock, formatWatchTime, toMinutes } = load('./watch-time.ts');

test('positions read as a clock and watch time in words', () => {
  assert.equal(formatClock(754), '12:34');
  assert.equal(formatClock(3754), '1:02:34');
  assert.equal(formatClock(null), '—');
  assert.equal(formatWatchTime(0, true), '—');
  assert.equal(formatWatchTime(45, true), 'أقل من دقيقة');
  assert.equal(formatWatchTime(754, true), '12 دقيقة');
  assert.equal(formatWatchTime(11520, true), '3 س 12 د');
  assert.equal(formatWatchTime(11520, false), '3 h 12 min');
  assert.equal(toMinutes(1799), 29);
});
