import assert from 'node:assert/strict';
import test from 'node:test';
import { formatPercent, isExamPassed } from './student-exam-score.ts';

test('derives a pass only when the API omits the result', () => {
  assert.equal(isExamPassed(undefined, 100, 50), true);
  assert.equal(isExamPassed(undefined, 40, 50), false);
  assert.equal(isExamPassed(false, 100, 50), false);
});

test('score percentages show at most one decimal', () => {
  assert.equal(formatPercent((2 / 3) * 100), '66.7%');
  assert.equal(formatPercent((2 / 9) * 100), '22.2%');
  assert.equal(formatPercent(90), '90%');
  assert.equal(formatPercent(Number.NaN), '—');
});
