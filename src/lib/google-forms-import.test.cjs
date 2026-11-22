const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const ts = require('typescript');

const load = (file, deps = {}) => {
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync(join(__dirname, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'module', 'exports', code)((id) => deps[id] ?? require(id), module, module.exports);
  return module.exports;
};

global.URL.createObjectURL = () => 'blob:preview';
const examForm = load('exam-form.ts', { './platform-date-time': { toApiDateTime: (value) => value } });
const gf = load('google-forms-import.ts', { '@/src/lib/exam-form': examForm });

const png = 'data:image/png;base64,' + Buffer.from('\x89PNG\r\n\x1a\nbody', 'binary').toString('base64');
const question = (extra = {}) => ({
  key: 'radio1:q1', text: 'ما وظيفة القلب؟', type: 'single_choice', score: 2, auto_correct: true, required: true, section: null, image: null,
  answers: [{ text: 'ضخ الدم', is_correct: true, reason: 'القلب مضخة', image: null }, { text: 'الهضم', is_correct: false, reason: '', image: null }],
  accepted_answers: [], feedback: { right: '', wrong: '', general: 'القلب مضخة', combined: 'القلب مضخة' }, warnings: [], include: true, needs_answer: false,
  source: { type: 'google_forms', item_id: 'radio1', question_id: 'q1', form_id: null, revision_id: null }, ...extra,
});
const preview = { form_id: 'FORM_1', revision_id: '42', title: 'Quiz', description: '', is_quiz: true, questions: [], skipped: [], previous_imports: [] };

test('choice questions become new exam questions with answers, feedback, provenance and images as files', () => {
  const { questions, sections } = gf.mapGoogleFormToExam(preview, [question({ image: { data: png, alt: 'heart' } })], 1);
  const [q] = questions;
  assert.equal(sections.length, 0);
  assert.equal(q.id, 'new-gf-1-0');
  assert.equal(q.type, 'single_choice');
  assert.equal(q.score, 2);
  assert.ok(q.image instanceof File);
  assert.equal(q.image.type, 'image/png');
  assert.deepEqual(q.answers.map((a) => [a.text, a.isCorrect, a.reason]), [['ضخ الدم', true, 'القلب مضخة'], ['الهضم', false, '']]);
  assert.deepEqual(JSON.parse(q.source), { type: 'google_forms', item_id: 'radio1', question_id: 'q1', form_id: 'FORM_1', revision_id: '42' });
});

test('page breaks become sections and short answers keep accepted answers for manual review', () => {
  const { questions, sections } = gf.mapGoogleFormToExam(preview, [
    question({ section: 'الجزء الثاني' }),
    question({ key: 's', type: 'short_answer', auto_correct: true, answers: [], accepted_answers: ['Na', 'na'], section: 'الجزء الثاني' }),
  ], 2);
  assert.equal(sections.length, 1);
  assert.equal(sections[0].title, 'الجزء الثاني');
  assert.equal(questions[0].sectionKey, sections[0].key);
  assert.equal(questions[1].sectionKey, sections[0].key);
  assert.equal(questions[1].autoCorrect, false);
  assert.equal(questions[1].answers[0].text, 'Na / na');
});

test('questions without a correct answer or with too few options are flagged', () => {
  assert.equal(gf.questionProblem(question()), null);
  assert.equal(gf.questionProblem(question({ answers: question().answers.map((a) => ({ ...a, is_correct: false })) })), 'no_correct');
  assert.equal(gf.questionProblem(question({ answers: [question().answers[0]] })), 'few_options');
  assert.equal(gf.questionProblem(question({ type: 'short_answer', answers: [] })), null);
});

test('only real image data urls become files', () => {
  assert.equal(gf.dataUrlToFile('data:text/html;base64,PGh0bWw+', 'x'), null);
  assert.equal(gf.dataUrlToFile('javascript:alert(1)', 'x'), null);
  assert.equal(gf.dataUrlToFile(png, 'x').name, 'x.png');
});

test('the exam form sends provenance only for new imported questions', () => {
  const details = { title: 'T', courses: [], chapter: '', duration: '30', totalMarks: '2', passingMarks: '50', maxAttempts: '1', type: 'exam', isPublic: 'true', status: 'active', startTime: '', endTime: '', isPreview: false };
  const [imported] = gf.mapGoogleFormToExam(preview, [question()], 3).questions;
  const existing = { ...imported, id: '77', source: imported.source };
  const create = examForm.buildExamFormData(details, [imported], 'create');
  const edit = examForm.buildExamFormData(details, [existing], 'edit');
  assert.equal(JSON.parse(create.get('questions[0][source]')).form_id, 'FORM_1');
  assert.equal(edit.get('questions[0][source]'), null);
});

test('warnings and skip reasons read in Arabic and English', () => {
  assert.match(gf.warningText('no_answer_key', true), /إجابة صحيحة/);
  assert.match(gf.warningText('image_failed', false), /image/);
  assert.match(gf.skipReasonText('unsupported_scale', true), /غير مدعوم/);
  assert.match(gf.skipReasonText('something-new', false), /Unsupported/);
});

test('importing the same form again replaces its unsaved questions and sections instead of doubling them', () => {
  const first = gf.mapGoogleFormToExam(preview, [question({ section: 'Part 2' }), question({ key: 'b', text: 'Q2' })], 10);
  const manual = { id: 'new-1', text: 'Typed by hand', type: 'single_choice', score: 1, autoCorrect: true, answers: [] };
  const placeholder = { id: 'new-2', text: '  ', type: 'single_choice', score: 1, autoCorrect: true, answers: [] };
  const saved = { ...first.questions[1], id: '55' }; // already saved in this exam: never touched
  const otherForm = gf.mapGoogleFormToExam({ ...preview, form_id: 'FORM_2' }, [question({ key: 'o', text: 'Other form' })], 11).questions[0];
  const afterFirst = gf.mergeGoogleFormImport([manual, placeholder, saved, otherForm], [], first.questions, first.sections);
  assert.equal(afterFirst.questions.length, 5);
  assert.equal(afterFirst.sections.length, 1);
  assert.deepEqual(afterFirst.removed, [placeholder]);

  const second = gf.mapGoogleFormToExam(preview, [question({ key: 'b', text: 'Q2' })], 12);
  const afterSecond = gf.mergeGoogleFormImport(afterFirst.questions, afterFirst.sections, second.questions, second.sections);
  assert.deepEqual(afterSecond.questions.map((q) => q.text), ['Typed by hand', 'Q2', 'Other form', 'Q2']);
  assert.equal(afterSecond.questions.filter((q) => q.id.startsWith('new-gf-12')).length, 1);
  assert.equal(afterSecond.sections.length, 0); // the earlier import's section has no questions left
  assert.equal(afterSecond.removed.length, 2);
});
