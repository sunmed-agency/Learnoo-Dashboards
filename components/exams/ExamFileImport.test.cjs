const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const ts = require('typescript');

const transpile = (file, jsx = false) => ts.transpileModule(readFileSync(join(__dirname, file), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, ...(jsx ? { jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } : {}) },
}).outputText;
const examForm = { exports: {} };
new Function('require', 'module', 'exports', transpile('../../src/lib/exam-form.ts'))(() => ({ toApiDateTime: value => value }), examForm, examForm.exports);

function preview(correct) {
  const question = {
    id: 'new-import-1-0', text: 'أي مستوى إداري يتولى وضع الأهداف؟', type: 'single_choice', score: 1, autoCorrect: true, image: null, imagePreview: '',
    answers: ['الإدارة التنفيذية', 'رؤساء الأقسام', 'الإدارة الوسطى', 'الإدارة العليا'].map((text, i) => ({ id: `a-import-1-0-${i}`, text, isCorrect: correct.includes(i), reason: '' })),
  };
  // useState order in ExamFileImport: open, busy, error, exam, title, index, count
  const state = [true, false, '', { questions: [question], review: [], contexts: [] }, 'Exam', 0, 1];
  let cursor = 0;
  const component = { exports: {} };
  new Function('require', 'module', 'exports', transpile('ExamFileImport.tsx', true))(id => {
    if (id === 'react') return { ...React, useEffect: () => {}, useRef: initial => ({ current: initial }), useState: () => [state[cursor++], () => {}] };
    if (id === 'next-intl') return { useLocale: () => 'ar' };
    if (id === '@/src/lib/exam-form') return examForm.exports;
    return require(id);
  }, component, component.exports);
  const markup = renderToStaticMarkup(React.createElement(component.exports.ExamFileImport, { onApply: () => {} }));
  return Array.from(markup.matchAll(/<input type="radio"[^>]*>/g), match => / checked=""/.test(match[0]));
}

test('import preview never marks several radios checked, so a flagged question accepts the first click on its right choice', () => {
  // Word file read with every option marked correct: none may show as checked, or React swallows the click.
  assert.deepEqual(preview([0, 1, 2, 3]), [false, false, false, false]);
  assert.deepEqual(preview([0, 1]), [false, false, false, false]);
  assert.deepEqual(preview([]), [false, false, false, false]);
  assert.deepEqual(preview([3]), [false, false, false, true]);
});
