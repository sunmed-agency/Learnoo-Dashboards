/**
 * Order of the comments under a community post.
 *
 * Posts are listed newest first, but the comments under one post read as a
 * conversation: oldest first, so an answer always sits below the comment it
 * answers — even when the teacher answered with a new comment rather than a
 * reply. Comments posted in the same second keep the order they were saved
 * in (by id). A row without a readable date (e.g. one just posted that the
 * server has not echoed back yet) goes to the end, where a new comment lands.
 */

type CommentRow = {
  id?: string | number;
  attributes?: { created_at?: unknown } | null;
  created_at?: unknown;
};

function createdAtMs(row: CommentRow): number {
  const raw = row?.attributes?.created_at ?? row?.created_at;
  if (raw == null || raw === '') return Number.POSITIVE_INFINITY;
  const ms = new Date(String(raw)).getTime();
  return Number.isNaN(ms) ? Number.POSITIVE_INFINITY : ms;
}

function compareIds(a: CommentRow, b: CommentRow): number {
  const ia = Number(a?.id);
  const ib = Number(b?.id);
  if (Number.isFinite(ia) && Number.isFinite(ib)) return ia - ib;
  return String(a?.id ?? '').localeCompare(String(b?.id ?? ''));
}

/** Oldest first, ties by id. Returns a new array; the input is not touched. */
export function sortCommentsOldestFirst<T>(comments: readonly T[] | null | undefined): T[] {
  return [...(comments ?? [])].sort((a, b) => {
    const ta = createdAtMs(a as CommentRow);
    const tb = createdAtMs(b as CommentRow);
    if (ta !== tb) return ta < tb ? -1 : 1;
    return compareIds(a as CommentRow, b as CommentRow);
  });
}
