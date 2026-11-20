const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const ts = require('typescript');

/** Renders SchedulesBoard with fixed state: entries, loading=false, error=false, search. */
function render(entries, search = '', canUpload = false) {
  const compiled = ts.transpileModule(readFileSync(join(__dirname, 'SchedulesBoard.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  // useState order: entries, loading, error, search, busy, openImage, openPdf, selectedCourses, title, file, replaceTarget
  const state = [entries, false, false, search, false, null, null, [], '', null, null];
  let index = 0;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', compiled)((id) => {
    if (id === 'react') return { ...React, useState: () => [state[index++], () => {}], useEffect: () => {}, useMemo: (fn) => fn(), useRef: () => ({ current: null }) };
    if (id === 'next-intl') return { useLocale: () => 'ar' };
    if (id === 'next/dynamic') return () => (props) => React.createElement('div', { 'data-pdf-thumb': props.pdfUrl ?? '' });
    if (id === 'sonner') return { toast: { error() {}, success() {} } };
    if (id === '@/src/hooks/useCourses') return { useCourses: () => ({ data: [] }) };
    if (id === '@/src/components/admin/CourseTreeSelect') return { CourseTreeSelect: () => React.createElement('div', null, 'Course tree') };
    if (id === '@/components/student/exams/ExamImageViewer') return { ExamImageViewer: () => null };
    if (id === '@/src/lib/api') return { default: {} };
    return require(id);
  }, module, module.exports);
  return renderToStaticMarkup(React.createElement(module.exports.default, { canUpload }));
}

const entries = [
  { kind: 'course', id: 1, title: 'Biology', start: null, end: null, documents: [
    { id: '7', attributes: { name: 'Weekly plan.pdf', extension: 'pdf', path: 'https://p/api/pdf-proxy?source=x' } },
    { id: '8', attributes: { name: 'Term.png', extension: 'png', path: 'https://api/img.png' } },
  ] },
  { kind: 'live', id: 2, title: 'Hidden live category' },
  { kind: 'course', id: 3, title: 'Other course', documents: [] },
];

test('schedules are grouped by subject; a PDF shows its first page, an image shows itself', () => {
  const html = render(entries);
  assert.match(html, /Biology[\s\S]*Weekly plan[\s\S]*Term/);
  assert.match(html, /data-pdf-thumb="https:\/\/p\/api\/pdf-proxy\?source=x"/);
  assert.match(html, /<img[^>]+src="https:\/\/api\/img.png"/);
  assert.match(html, /2 جدول/);
  assert.doesNotMatch(html, /Hidden live category|Other course/);
});

test('search filters schedule names; nothing matching shows the empty search message', () => {
  const html = render(entries, 'weekly');
  assert.match(html, /Weekly plan/);
  assert.doesNotMatch(html, /Term</);
  assert.match(render(entries, 'unmatched'), /لا توجد جداول مطابقة للبحث/);
});

test('staff get the add form and replace / delete; students do not', () => {
  const staff = render(entries, '', true);
  assert.match(staff, /إضافة جدول[\s\S]*Course tree/);
  assert.match(staff, /استبدال الملف/);
  assert.match(staff, /حذف الجدول/);
  const student = render(entries);
  assert.doesNotMatch(student, /Course tree|استبدال الملف|حذف الجدول/);
});

test('a dated subject keeps its date range under its name', () => {
  const html = render([{ kind: 'course', id: 1, title: 'Biology', start: '2026-10-10T12:00:00Z', end: '2026-10-10T13:00:00Z', documents: [{ id: '3', attributes: { name: 'S.png', extension: 'png', path: 'https://a/s.png' } }] }]);
  assert.match(html, /data-testid="subject-dates">[^<]+ — [^<]+</);
});
