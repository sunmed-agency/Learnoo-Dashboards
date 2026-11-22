const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const ts = require('typescript');

const code = ts.transpileModule(readFileSync(join(__dirname, 'ui-text.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
const loaded = { exports: {} };
new Function('require', 'module', 'exports', code)((id) => (id === 'next-intl' ? { useLocale: () => 'ar' } : id === './ui-text-ar.json' ? require('./ui-text-ar.json') : require(id)), loaded, loaded.exports);
const { translateUiText, useTx } = loaded.exports;
const dictionary = require('./ui-text-ar.json');

test('English UI text reads in Arabic on the Arabic site and stays English on the English site', () => {
  assert.equal(translateUiText('Save Changes', 'ar'), 'حفظ التغييرات');
  assert.equal(translateUiText('Save Changes', 'en'), 'Save Changes');
  assert.equal(useTx()('Retry'), 'إعادة المحاولة');
});

test('text without an Arabic entry is shown as it is, never blank', () => {
  assert.equal(translateUiText('Something new', 'ar'), 'Something new');
});

test('every Arabic entry is filled in and actually Arabic', () => {
  for (const [english, arabic] of Object.entries(dictionary)) {
    assert.ok(arabic.trim(), `empty: ${english}`);
    assert.match(arabic, /[؀-ۿ]|^[A-Z0-9 ()%.+-]+$/, `not Arabic: ${english}`);
  }
});

test('supervisors without the codes permission do not get the activation page (sheet activation lives in the academic plan)', () => {
  const src = readFileSync(join(__dirname, 'permissions.ts'), 'utf8');
  const permissions = { exports: {} };
  new Function('require', 'module', 'exports', ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(require, permissions, permissions.exports);
  const supervisor = (list) => ({ attributes: { role: 'Admin', permissions: list } });
  assert.equal(permissions.exports.canOpenPage(supervisor(['activation.sheet', 'structure.view', 'students.view']), '/activation'), false);
  assert.equal(permissions.exports.canOpenPage(supervisor(['activation.codes']), '/activation'), true);
  assert.equal(permissions.exports.canOpenPage({ attributes: { role: 'Admin', permissions: null } }, '/activation'), true);
});
