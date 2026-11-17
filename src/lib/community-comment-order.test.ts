import assert from 'node:assert/strict';
import test from 'node:test';

import { sortCommentsOldestFirst } from './community-comment-order.ts';

const row = (id: string, created_at?: string | null) => ({ id, attributes: { created_at } });
const ids = (rows: { id: string }[]) => rows.map((r) => r.id);

test("the doctor's answer sits under the student's question even if the server sent it first", () => {
  // The order the old backend sent (newest first), as in the doctor's photo.
  const answer = row('41', '2026-11-13T10:00:00+02:00');
  const question = row('40', '2026-11-12T10:00:00+02:00');
  assert.deepEqual(ids(sortCommentsOldestFirst([answer, question])), ['40', '41']);
});

test('a later top-level comment goes under both, and same-second comments keep the order they were saved in', () => {
  const rows = [
    row('9', '2026-11-14T10:00:00Z'),
    row('12', '2026-11-14T10:00:00Z'),
    row('3', '2026-11-12T08:00:00Z'),
    row('5', '2026-11-13T08:00:00Z'),
  ];
  assert.deepEqual(ids(sortCommentsOldestFirst(rows)), ['3', '5', '9', '12']);
});

test('dates in different time zones are compared as instants, not as text', () => {
  // 10:00 in Cairo (+02:00) is earlier than 09:00 UTC.
  const rows = [row('2', '2026-11-14T09:00:00Z'), row('1', '2026-11-14T10:00:00+02:00')];
  assert.deepEqual(ids(sortCommentsOldestFirst(rows)), ['1', '2']);
});

test('a row without a readable date goes last, where a new comment lands', () => {
  const rows = [row('8', null), row('7', 'not a date'), row('6', '2026-11-14T10:00:00Z')];
  assert.deepEqual(ids(sortCommentsOldestFirst(rows)), ['6', '7', '8']);
});

test('flat rows, empty input and the input array are handled safely', () => {
  const flat = [{ id: 2, created_at: '2026-11-14' }, { id: 1, created_at: '2026-11-13' }];
  assert.deepEqual(sortCommentsOldestFirst(flat).map((r) => r.id), [1, 2]);
  assert.deepEqual(sortCommentsOldestFirst(null), []);
  assert.deepEqual(sortCommentsOldestFirst(undefined), []);
  const input = [row('2', '2026-11-14'), row('1', '2026-11-13')];
  sortCommentsOldestFirst(input);
  assert.deepEqual(ids(input), ['2', '1']);
});
