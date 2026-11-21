const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const React = require('react');
const ts = require('typescript');
const nodes = node => React.isValidElement(node) ? [node, ...React.Children.toArray(node.props.children).flatMap(nodes)] : [];
const CourseTreeSelect = () => null;
const Trash2 = () => null;
function setup(role, { rows = [{ id: 1, phone: '201010000001', title: 'QA course', item_type: 'course', category_path: ['Second year', 'انتساب'], created_at: null }], confirm = true, failDelete = false } = {}) {
  const state = [], queries = [], requests = [], deleted = [], toasts = [], confirms = [];
  let refetches = 0;
  global.window = { confirm: message => { confirms.push(message); return confirm; } };
  let cursor = 0;
  const loaded = { exports: {} };
  const mocks = {
    react: { ...React, useState: initial => { const i = cursor++; if (!(i in state)) state[i] = initial; return [state[i], value => { state[i] = typeof value === 'function' ? value(state[i]) : value; }]; } },
    'next-intl': { useLocale: () => 'en' },
    '@/src/hooks/useAuth': { useCurrentUser: () => ({ role }) },
    '@/src/lib/permissions': { can: () => false, isSupervisor: () => false },
    '@tanstack/react-query': { useQuery: query => { queries.push(query); return { isPending: false, isError: false, refetch() { refetches++; }, data: { total: 31, last_page: 2, data: rows } }; } },
    'lucide-react': { Trash2 },
    sonner: { toast: { success: message => toasts.push(['success', message]), error: message => toasts.push(['error', message]) } },
    '@/src/components/admin/CourseTreeSelect': { CourseTreeSelect },
    '@/src/lib/api': {
      ownerOperationsApi: { pendingActivations: async (...params) => { requests.push(params); } },
      preActivationApi: { delete: async id => { deleted.push(id); if (failDelete) throw new Error('422'); } },
    },
  };
  const code = ts.transpileModule(readFileSync(`${__dirname}/page.tsx`, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  new Function('require', 'module', 'exports', code)(id => mocks[id] || require(id), loaded, loaded.exports);
  return { queries, requests, deleted, toasts, confirms, state, refetches: () => refetches, render: () => { cursor = 0; return loaded.exports.default(); } };
}
for (const role of ['Admin', 'Instructor', 'Student', 'Parent', undefined]) test(`${role}: pending number data stays hidden even if a cached result exists`, () => {
  const s = setup(role); const tree = s.render();
  assert.equal(s.queries.at(-1).enabled, false);
  assert.equal(nodes(tree).filter(node => node.type === 'article').length, 0);
});
test('Owner phone and course filters are applied together and a new search resets pagination', async () => {
  const s = setup('Super Admin'); let tree = s.render();
  nodes(tree).filter(node => node.type === 'button').at(-1).props.onClick();
  tree = s.render(); assert.equal(s.queries.at(-1).queryKey[1], 2);
  nodes(tree).find(node => node.type === 'input').props.onChange({ target: { value: '01010000001' } });
  nodes(tree).find(node => node.type === CourseTreeSelect).props.onChange('329');
  tree = s.render(); nodes(tree).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
  tree = s.render(); await s.queries.at(-1).queryFn();
  assert.deepEqual(s.requests.at(-1), [1, { phone: '01010000001', item_type: 'course', course_id: 329 }]);
  assert.equal(nodes(tree).filter(node => node.type === 'article').length, 1);
});
const trash = tree => nodes(tree).filter(node => node.type === 'button' && nodes(node).some(child => child.type === Trash2));
for (const role of ['Admin', 'Instructor']) test(`${role}: no delete button is rendered`, () => {
  assert.equal(trash(setup(role).render()).length, 0);
});
test('Owner deletes one pending number after confirming and the list reloads', async () => {
  const s = setup('Super Admin'); const [button] = trash(s.render());
  assert.equal(button.props['aria-label'], 'Delete 201010000001');
  await button.props.onClick();
  assert.match(s.confirms[0], /201010000001/); assert.match(s.confirms[0], /QA course/);
  assert.deepEqual(s.deleted, [1]); assert.equal(s.refetches(), 1);
  assert.deepEqual(s.toasts, [['success', 'Pending number deleted']]);
});
test('cancelling the confirmation deletes nothing', async () => {
  const s = setup('Super Admin', { confirm: false });
  await trash(s.render())[0].props.onClick();
  assert.deepEqual(s.deleted, []); assert.equal(s.refetches(), 0); assert.deepEqual(s.toasts, []);
});
test('a refused delete shows an error and refreshes the list', async () => {
  const s = setup('Super Admin', { failDelete: true });
  await trash(s.render())[0].props.onClick();
  assert.equal(s.toasts[0][0], 'error'); assert.equal(s.refetches(), 1);
});
test('deleting the last row of a later page moves back one page', async () => {
  const s = setup('Super Admin'); let tree = s.render();
  nodes(tree).filter(node => node.type === 'button').at(-1).props.onClick();
  tree = s.render(); assert.equal(s.queries.at(-1).queryKey[1], 2);
  await trash(tree)[0].props.onClick();
  s.render(); assert.equal(s.queries.at(-1).queryKey[1], 1); assert.equal(s.refetches(), 0);
});
