const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');

const source = readFileSync(require.resolve('./strong-password.ts'), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
const mod = { exports: {} };
new Function('module', 'exports', 'crypto', outputText)(mod, mod.exports, globalThis.crypto);
const { generateStrongPassword } = mod.exports;

test('generated passwords are long, mixed and different every time', () => {
  const seen = new Set();
  for (let i = 0; i < 200; i++) {
    const password = generateStrongPassword();
    assert.equal(password.length, 14);
    assert.match(password, /[A-Z]/);
    assert.match(password, /[a-z]/);
    assert.match(password, /[2-9]/);
    assert.match(password, /[!@#$%&*?\-_]/);
    assert.doesNotMatch(password, /[0O1lI]/);
    seen.add(password);
  }
  assert.equal(seen.size, 200);
  assert.equal(generateStrongPassword(20).length, 20);
});
