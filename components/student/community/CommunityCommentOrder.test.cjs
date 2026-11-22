/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS test harness. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const ts = require('typescript');
const requireWithUiText = (id) => (id === '@/src/lib/ui-text' ? { useTx: () => (text) => text, translateUiText: (text) => text } : require(id));

const root = resolve(__dirname, '../../..');
const compile = source => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;
function load(path, mocks = {}) {
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', compile(readFileSync(resolve(root, path), 'utf8')))(
    name => mocks[name] || (name === '@/components/staff/StudentAuthor' ? { __esModule: true, default: ({ author, fallback }) => author?.full_name || fallback } : requireWithUiText(name)), loaded, loaded.exports);
  return loaded.exports;
}
const order = load('src/lib/community-comment-order.ts');
const scope = load('src/lib/student-course-scope.ts');
const posts = load('src/lib/student-community-posts.ts', { '@/src/lib/student-course-scope': scope });
const intl = { useLocale: () => 'ar', useTranslations: () => key => key };

// The doctor's case, in the order the old backend sent it (newest first).
const comment = (id, content, created_at, role) => ({ id, attributes: {
  content, title: content, type: 'post', status: 'published', parent_id: 90, created_at,
  user: { data: { id: `u${id}`, attributes: { full_name: role, role } } },
} });
const newestFirst = [
  comment('43', 'LATER-TOP-LEVEL', '2026-11-14T09:00:00Z', 'Student'),
  comment('41', 'DOCTOR-ANSWER', '2026-11-13T10:00:00Z', 'Instructor'),
  comment('40', 'STUDENT-QUESTION', '2026-11-12T10:00:00Z', 'Student'),
];
const positions = html => ['STUDENT-QUESTION', 'DOCTOR-ANSWER', 'LATER-TOP-LEVEL'].map(text => html.indexOf(text));
const assertConversationOrder = html => {
  const [question, answer, later] = positions(html);
  assert.ok(question >= 0 && answer >= 0 && later >= 0, 'all three comments render');
  assert.ok(question < answer, 'the answer sits under the question');
  assert.ok(answer < later, 'the later comment sits under the answer');
};

test('student community: comments read oldest first whatever order the server sent', () => {
  const Comments = load('components/student/community/StudentCommunityPostComments.tsx', {
    react: { ...React, useState: value => [value === false ? true : value, () => {}] },
    'next-intl': intl,
    '@/components/student/AuthorRoleBadge': { AuthorRoleBadge: () => null },
    '@/src/hooks/useComments': { useComments: () => ({ data: newestFirst, refetch() {} }), useDeleteComment: () => ({}) },
    '@/src/hooks/usePosts': { useReactToPost: () => ({}) },
    '@/src/stores/authStore': { useAuth: () => ({ user: null }) },
    '@/src/lib/community-comment-order': order,
  }).default;
  const html = renderToStaticMarkup(React.createElement(Comments, { postId: 90, commentsCount: 3 }));
  assertConversationOrder(html);
  // Each comment can be found on the page to bring a just-posted one into view.
  for (const id of ['40', '41', '43']) assert.match(html, new RegExp(`id="comment-${id}"`));
});

test('student community: reloading the comments keeps the list instead of a spinner', () => {
  const Comments = load('components/student/community/StudentCommunityPostComments.tsx', {
    react: { ...React, useState: value => [value === false ? true : value, () => {}] },
    'next-intl': intl,
    '@/components/student/AuthorRoleBadge': { AuthorRoleBadge: () => null },
    '@/src/hooks/useComments': { useComments: () => ({ data: newestFirst, isLoading: true, refetch() {} }), useDeleteComment: () => ({}) },
    '@/src/hooks/usePosts': { useReactToPost: () => ({}) },
    '@/src/stores/authStore': { useAuth: () => ({ user: null }) },
    '@/src/lib/community-comment-order': order,
  }).default;
  const html = renderToStaticMarkup(React.createElement(Comments, { postId: 90, commentsCount: 3 }));
  assertConversationOrder(html);
  assert.ok(!html.includes('animate-spin'));
});

test('staff community (owner, admin, teacher): comments read oldest first', () => {
  const Comments = load('src/components/admin/community/ModeratorPostComments.tsx', {
    'next-intl': intl,
    '@/src/hooks/useComments': { useComments: () => ({ data: newestFirst, refetch() {} }), useDeleteComment: () => ({}) },
    '@/src/hooks/usePosts': { useReactToPost: () => ({}), useUpdatePost: () => ({}) },
    '@/src/stores/authStore': { useAuth: () => ({ user: null }) },
    '@/src/lib/community-comment-order': order,
  }).default;
  const html = renderToStaticMarkup(React.createElement(Comments, {
    postId: 90, commentsCount: 3, expanded: true, onToggleExpanded() {},
  }));
  assertConversationOrder(html);
  for (const id of ['40', '41', '43']) assert.match(html, new RegExp(`id="comment-${id}"`));
});

function loadFeed(postsState) {
  return load('components/student/community/StudentCommunityFeed.tsx', {
    react: { ...React, useEffect() {} },
    'next-intl': intl,
    '@/components/student/AuthorRoleBadge': { AuthorRoleBadge: () => null },
    '@/components/student/community/StudentCommunityCreatePostModal': { __esModule: true, default: () => null },
    '@/components/student/community/StudentCommunityPostComments': { __esModule: true, default: ({ postId }) => React.createElement('span', null, `Comments of ${postId}`) },
    '@/src/lib/community-post-display': { communityPostRelativeTime: () => '', communityPostTypeBadgeClasses: () => '' },
    '@/src/lib/community-post-media': { pickPostImageUrl: () => null },
    '@/src/hooks/useComments': { useCreateComment: () => ({}) },
    '@/src/hooks/usePosts': { usePosts: () => postsState, useCreatePost: () => ({}), useReactToPost: () => ({}) },
    '@/src/hooks/useCourses': { useCourses: () => ({ data: [] }) },
    '@/src/stores/authStore': { useAuth: () => ({ user: { id: '7' } }) },
    '@/src/lib/student-community-posts': posts,
    '@/src/lib/student-course-scope': scope,
  }).default;
}

test('student community feed keeps the posts on screen while it refreshes after a comment', () => {
  const post = { id: '90', attributes: { title: 'News', content: 'News', type: 'post', status: 'published', parent_id: null, comments_count: 3,
    user: { data: { id: '1', attributes: { full_name: 'Teacher', role: 'Instructor' } } } } };
  const refreshing = renderToStaticMarkup(React.createElement(loadFeed({ data: [post], isLoading: true })));
  assert.match(refreshing, /id="post-90"/);
  assert.match(refreshing, /Comments of 90/);
  assert.ok(!refreshing.includes('animate-spin'));

  const firstLoad = renderToStaticMarkup(React.createElement(loadFeed({ data: undefined, isLoading: true })));
  assert.match(firstLoad, /animate-spin/);
  assert.ok(!firstLoad.includes('id="post-90"'));
});
