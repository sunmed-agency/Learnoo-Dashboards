const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const ts = require('typescript');
const root = resolve(__dirname, '../..');

function load(file) {
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync(resolve(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  new Function('require', 'module', 'exports', code)(require, module, module.exports);
  return module.exports.default;
}

const FormModal = load('components/ui/FormModal.tsx');

function render(props = {}) {
  const html = renderToStaticMarkup(React.createElement(FormModal, {
    title: 'إضافة رابط',
    onClose() {},
    closeLabel: 'إلغاء',
    footer: React.createElement('button', { id: 'save' }, 'إنشاء'),
    ...props,
  }, React.createElement('input', { id: 'field' })));
  const classes = [...html.matchAll(/class="([^"]*)"/g)].map(match => match[1].replaceAll('&amp;', '&'));
  return { html, classes };
}

test('the panel is capped to the visible screen without vh units and only its body scrolls', () => {
  const { html, classes } = render();
  const panel = classes.find(value => value.includes('rounded-2xl'));
  assert.match(panel, /(^| )max-h-full( |$)/);
  assert.match(panel, /(^| )flex-col( |$)/);
  assert.match(panel, /(^| )overflow-hidden( |$)/);
  assert.equal(classes.some(value => /\d+vh|h-screen/.test(value)), false, 'a vh height ends under the iPhone Safari toolbar');

  const body = classes.find(value => value.includes('overflow-y-auto'));
  assert.match(body, /(^| )min-h-0( |$)/);
  assert.match(body, /(^| )flex-1( |$)/);
  assert.match(body, /(^| )overflow-x-hidden( |$)/);
  const bodyStart = html.indexOf(`class="${body.replaceAll('&', '&amp;')}"`);
  const bodyHtml = html.slice(bodyStart, html.indexOf('</div>', bodyStart));
  assert.ok(bodyHtml.includes('id="field"'), 'fields render inside the scrolling body');
  assert.equal(bodyHtml.includes('id="save"'), false, 'save stays outside the scrolling body');
  assert.ok(html.indexOf('id="save"') > bodyStart, 'save renders below the body');
});

test('phone fields use 16px text so iPhone Safari does not zoom the form on focus', () => {
  const { classes } = render();
  const body = classes.find(value => value.includes('overflow-y-auto'));
  for (const tag of ['input', 'select', 'textarea']) assert.ok(body.includes(`max-sm:[&_${tag}]:text-base`), tag);
});

test('the dialog is labelled by its title and the close button is named', () => {
  const { html } = render({ widthClassName: 'max-w-2xl' });
  const labelled = html.match(/role="dialog" aria-modal="true" aria-labelledby="([^"]+)"/);
  assert.ok(labelled);
  assert.match(html, new RegExp(`<h2 id="${labelled[1]}"[^>]*>إضافة رابط</h2>`));
  assert.match(html, /aria-label="إلغاء"/);
  assert.match(html, /max-w-2xl/);
});

for (const page of ['app/(admin)/community/page.tsx', 'app/(doctor)/doctor/community/page.tsx']) {
  test(`${page} puts the link and post forms in FormModal with save/cancel in the footer`, () => {
    const source = readFileSync(resolve(root, page), 'utf8');
    assert.equal(source.includes('fixed inset-0'), false, 'no hand-made overlay is left on the page');
    for (const [open, save] of [['{isSocialModalOpen && (', 'onClick={handleSaveSocialLink}'], ['{isCreateModalOpen && (', 'onClick={handleCreatePost}']]) {
      const modal = source.slice(source.indexOf(open), source.indexOf('</FormModal>', source.indexOf(open)));
      assert.match(modal, /<FormModal/);
      const footer = modal.slice(modal.indexOf('footer={('), modal.indexOf(')}\n        >'));
      assert.ok(footer.includes(save), save);
    }
  });
}
