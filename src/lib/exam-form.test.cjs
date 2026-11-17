const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');
const loaded = { exports: {} };
new Function('require', 'module', 'exports', ts.transpileModule(readFileSync(`${__dirname}/exam-form.ts`, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText)(() => ({ toApiDateTime: value => value }), loaded, loaded.exports);

test('correcting an answer advances focus to the next invalid question even with repeated local answer IDs', () => {
  const question = id => ({ id, text: 'Question', type: 'single_choice', score: 1, autoCorrect: true,
    answers: [{ id: '1', text: '', isCorrect: true, reason: '' }, { id: '2', text: 'Answer', isCorrect: false, reason: '' }] });
  const questions = [question('first'), question('second')];
  const { validateExamQuestions } = loaded.exports;
  assert.equal(validateExamQuestions(questions).firstInvalid.id, 'first');
  questions[0].answers[0].text = 'Corrected';
  const errors = validateExamQuestions(questions);
  assert.equal(errors.firstInvalid.id, 'second');
  assert.deepEqual([...errors.answerIds], ['second:1']);
  questions[1].answers[0].text = 'Corrected';
  assert.equal(validateExamQuestions(questions).firstInvalid, undefined);
});

test('cleared exam dates are submitted explicitly so edits remove the stored schedule', () => {
  const data = loaded.exports.buildExamFormData({ title: 'Exam', courses: ['1'], chapter: '', type: 'exam', duration: '10',
    totalMarks: '1', passingMarks: '50', maxAttempts: '1', status: 'Draft', startTime: '', endTime: '', is_public: 'false' }, [], 'edit');
  assert.equal(data.get('start_time'), '');
  assert.equal(data.get('end_time'), '');
});

test('validation identifies the actual blank answer and maps server errors to its field', () => {
  const question = { id: 'q1', text: 'Question', type: 'single_choice', score: 1,
    answers: [{ id: 'a1', text: 'Answer', isCorrect: true }, { id: 'a2', text: '', isCorrect: false }] };
  const { validateExamQuestions, getExamErrorField, focusExamField } = loaded.exports;
  assert.equal(validateExamQuestions([question]).firstInvalidField, 'answer-q1-a2');
  assert.equal(getExamErrorField({ 'questions.0.answers.1.text': ['Required'] }, [question]), 'answer-q1-a2');
  assert.equal(getExamErrorField({ total_marks: ['Invalid total'] }, [question]), 'exam-totalMarks');
  assert.equal(getExamErrorField({ 'course_ids.0': ['Required'] }, [question]), 'exam-courses');
  let focused = false; let scrolled = false;
  global.requestAnimationFrame = callback => callback();
  global.document = { getElementById: id => { assert.equal(id, 'answer-q1-a2'); return { matches: () => true, focus: () => { focused = true; }, scrollIntoView: () => { scrolled = true; } }; } };
  focusExamField(validateExamQuestions([question]).firstInvalidField);
  assert.ok(focused && scrolled);
  delete global.requestAnimationFrame; delete global.document;
});

test('exam banner: a new file is uploaded, a kept banner is untouched, a removed one is cleared on edit', () => {
  const { buildExamFormData, EMPTY_EXAM_BANNER } = loaded.exports;
  const details = { title: 'Exam', courses: ['1'], chapter: '', type: 'exam', duration: '10',
    totalMarks: '1', passingMarks: '50', maxAttempts: '1', status: 'Draft', startTime: '', endTime: '', is_public: 'false' };
  const file = new File(['png'], 'banner.png', { type: 'image/png' });

  const created = buildExamFormData(details, [], 'create', { file, preview: 'blob:x' });
  assert.equal(created.get('banner').name, 'banner.png');
  assert.equal(created.has('remove_banner'), false);

  const plainCreate = buildExamFormData(details, [], 'create');
  assert.equal(plainCreate.has('banner'), false);
  assert.equal(plainCreate.has('remove_banner'), false);

  const kept = buildExamFormData(details, [], 'edit', { file: null, preview: 'https://api.test/storage/quizzes/b.png' });
  assert.equal(kept.has('banner'), false);
  assert.equal(kept.has('remove_banner'), false);

  const replaced = buildExamFormData(details, [], 'edit', { file, preview: 'blob:y' });
  assert.equal(replaced.get('banner').name, 'banner.png');
  assert.equal(replaced.has('remove_banner'), false);

  const removed = buildExamFormData(details, [], 'edit', EMPTY_EXAM_BANNER);
  assert.equal(removed.get('remove_banner'), '1');
  assert.equal(removed.has('banner'), false);
});

test('exam banner file checks match the backend rule (jpg/png/webp, at most 2 MB) and errors focus the banner', () => {
  const { getExamBannerFileError, EXAM_BANNER, getExamErrorField } = loaded.exports;
  assert.equal(EXAM_BANNER.width / EXAM_BANNER.height, 4);
  assert.equal(getExamBannerFileError({ type: 'image/jpeg', size: 300 * 1024 }), null);
  assert.equal(getExamBannerFileError({ type: 'image/webp', size: EXAM_BANNER.maxBytes }), null);
  assert.equal(getExamBannerFileError({ type: 'image/gif', size: 1000 }), 'type');
  assert.equal(getExamBannerFileError({ type: 'application/pdf', size: 1000 }), 'type');
  assert.equal(getExamBannerFileError({ type: 'image/png', size: EXAM_BANNER.maxBytes + 1 }), 'size');
  assert.equal(getExamErrorField({ banner: ['The banner must be an image.'] }, []), 'exam-banner');
});
