import assert from 'node:assert/strict';
import test from 'node:test';
import { reviewAnswerSummary, reviewSelectedIds } from './student-exam-review.ts';
import { hubQuizCourseTitles } from './student-exam-hub-quiz.ts';

const options = [
  { id: '3', attributes: { text: 'C, I, G', is_correct: true } },
  { id: '4', attributes: { text: 'C', is_correct: false } },
  { id: '5', attributes: { text: 'X - M', is_correct: true } },
];

test("the server's graded options win over this browser's picks and over splitting the text", () => {
  const row = { answer_text: 'C, I, G, X - M', selected_answer_ids: [3, 5] };
  assert.deepEqual(reviewSelectedIds({ row, options, localSelection: ['4'], isShortAnswer: false }), ['3', '5']);
  assert.deepEqual(reviewSelectedIds({ row: { id: '9', attributes: row }, options, isShortAnswer: false }), ['3', '5']);
});

test('older payloads: local picks first, then the text split on commas', () => {
  const row = { answer_text: 'C, X - M' };
  assert.deepEqual(reviewSelectedIds({ row, options, localSelection: ['5'], isShortAnswer: false }), ['5']);
  assert.deepEqual(reviewSelectedIds({ row, options, localSelection: null, isShortAnswer: false }), ['4', '5']);
  assert.deepEqual(reviewSelectedIds({ row: { answer_text: 'C' }, options, isShortAnswer: true }), []);
});

test('a wrong answer lists the pick and, beneath it, the right options', () => {
  assert.deepEqual(reviewAnswerSummary({ options, selectedIds: ['4'], questionCorrect: false }), {
    chosen: ['C'],
    correct: ['C, I, G', 'X - M'],
  });
});

test('a right answer needs no correction, and hidden right options print nothing', () => {
  assert.deepEqual(reviewAnswerSummary({ options, selectedIds: ['3', '5'], questionCorrect: true }), {
    chosen: ['C, I, G', 'X - M'],
    correct: [],
  });
  const hidden = [{ id: '8', attributes: { text: 'A' } }, { id: '9', attributes: { text: 'B' } }];
  assert.deepEqual(reviewAnswerSummary({ options: hidden, selectedIds: ['8'], questionCorrect: false }), { chosen: ['A'], correct: [] });
});

test('exam cards name the course: shared courses first, else the course_title of its own course', () => {
  assert.deepEqual(hubQuizCourseTitles({ id: '1', attributes: { courses: [{ attributes: { title: 'محاسبة' } }], course_title: 'x' } }), ['محاسبة']);
  assert.deepEqual(hubQuizCourseTitles({ id: '2', attributes: { courses: [], course_title: ' اقتصاد ' } }), ['اقتصاد']);
  assert.deepEqual(hubQuizCourseTitles({ id: '3', attributes: {} }), []);
});
