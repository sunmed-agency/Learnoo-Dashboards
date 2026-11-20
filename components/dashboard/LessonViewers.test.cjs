const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const ts = require('typescript');

const root = resolve(__dirname, '../..');
const nodes = node => React.isValidElement(node) ? [node, ...React.Children.toArray(node.props.children).flatMap(nodes)] : [];

const viewers = {
  data: [
    { id: 11, user: { id: 'u1', first_name: 'Mona', last_name: 'Ali', email: 'mona@example.com', student_code: 'STU-1' }, count: 2, created_at: '2026-11-16T10:00:00+02:00', remaining_views: 1 },
    { id: 12, user: { id: 'u2', first_name: 'Omar', last_name: 'Adel', email: null, student_code: 'STU-2' }, count: 3, created_at: null, remaining_views: 0 },
  ],
  max_views: 3,
  last_page: 2,
};

function setup() {
  const state = [], queries = [], requests = [];
  let cursor = 0;
  const loaded = { exports: {} };
  const mocks = {
    react: { ...React, useState: initial => { const i = cursor++; if (!(i in state)) state[i] = initial; return [state[i], value => { state[i] = value; }]; } },
    'next-intl': { useLocale: () => 'en' },
    '@/src/hooks/useAuth': { useCurrentUser: () => ({ user: null, role: 'Super Admin' }) }, '@/src/lib/permissions': { can: () => true }, 'use-debounce': { useDebounce: value => [value] }, sonner: { toast: { success() {}, error() {} } },
    '@tanstack/react-query': { useQuery: query => { queries.push(query); return { data: viewers, isLoading: false, error: null, refetch: async () => {} }; } },
    '@/src/lib/api': { __esModule: true, default: { chapters: { viewers: async (...params) => { requests.push(params); return viewers; } } } },
  };
  const code = ts.transpileModule(readFileSync(resolve(__dirname, 'LessonViewers.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  new Function('require', 'module', 'exports', code)(id => mocks[id] || require(id), loaded, loaded.exports);
  return { queries, requests, render: () => { cursor = 0; return loaded.exports.default({ chapterId: 7 }); } };
}

test('lesson viewers come from GET /v1/chapter/{id}/viewers, one page at a time', async () => {
  const s = setup();
  let tree = s.render();
  assert.deepEqual(s.queries.at(-1).queryKey, ['lessonViewers', 7, 1]);
  await s.queries.at(-1).queryFn();
  assert.deepEqual(s.requests, [[7, 1]]);

  nodes(tree).filter(node => node.type === 'button').at(-1).props.onClick();
  tree = s.render();
  assert.deepEqual(s.queries.at(-1).queryKey, ['lessonViewers', 7, 2]);
  await s.queries.at(-1).queryFn();
  assert.deepEqual(s.requests.at(-1), [7, 2]);
});

test('each student is listed with used and remaining views and the lesson limit', () => {
  const html = renderToStaticMarkup(setup().render());
  assert.match(html, /Limit per student: 3/);
  assert.match(html, /Mona Ali/);
  assert.match(html, /mona@example\.com/);
  assert.match(html, /Omar Adel/);
  assert.match(html, /STU-2/);
  assert.match(html, /Used views: 2/);
  assert.match(html, /Remaining views: 0/);
});

for (const page of ['app/(doctor)/doctor/departments/page.tsx', 'app/(admin)/departments/page.tsx']) {
  test(`${page} shows lesson viewers through LessonViewers, not the lesson response`, () => {
    const source = readFileSync(resolve(root, page), 'utf8');
    assert.match(source, /<LessonViewers key=\{viewNode\.id\} chapterId=\{Number\(viewNode\.data\.id\)\} \/>/);
    // Lesson responses stopped carrying other students' views (they reached
    // students too); the modal must not depend on them.
    assert.doesNotMatch(source, /userViews/);
  });
}
