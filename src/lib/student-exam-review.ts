/**
 * The answer review after an exam: which options the student chose, and the lines shown under the
 * options (the student's answer, then — when it is wrong — the right one).
 */

type ReviewOption = { id: string | number; attributes?: { text?: string | null; is_correct?: boolean | null } | null };
type ReviewRowFields = { answer_text?: unknown; selected_answer_ids?: unknown };

/** A result row, flat or JSON:API (`{ attributes: {...} }`). */
function rowFields(row: unknown): ReviewRowFields {
  if (row == null || typeof row !== 'object') return {};
  const attributes = (row as { attributes?: unknown }).attributes;
  return (attributes != null && typeof attributes === 'object' ? attributes : row) as ReviewRowFields;
}

/**
 * The chosen option ids for one question.
 *
 * 1. `selected_answer_ids` from the result payload: the options the server graded, so the marked
 *    options always agree with the right/wrong verdict (an option whose text holds a comma included).
 * 2. The picks kept in this browser right after finishing.
 * 3. `answer_text` split on commas and matched on each option's text (older backends).
 */
export function reviewSelectedIds(args: {
  row: unknown;
  options: ReviewOption[];
  localSelection?: string[] | null;
  isShortAnswer: boolean;
}): string[] {
  const { row, options, localSelection, isShortAnswer } = args;
  if (isShortAnswer) return [];

  const fields = rowFields(row);
  const graded = fields.selected_answer_ids;
  if (Array.isArray(graded)) {
    const ids = new Set(graded.map(String));
    return options.map((option) => String(option.id)).filter((id) => ids.has(id));
  }

  if (localSelection && localSelection.length > 0) return localSelection;

  const text = typeof fields.answer_text === 'string' ? fields.answer_text : '';
  if (!text) return [];
  const parts = text.split(',').map((part) => part.trim());
  return options
    .filter((option) => parts.includes((option.attributes?.text ?? '').trim()))
    .map((option) => String(option.id));
}

/** The texts shown under the options: what was chosen, and the right options only when it was wrong. */
export function reviewAnswerSummary(args: {
  options: ReviewOption[];
  selectedIds: string[];
  questionCorrect: boolean;
}): { chosen: string[]; correct: string[] } {
  const { options, selectedIds, questionCorrect } = args;
  const text = (option: ReviewOption) => (option.attributes?.text ?? '').trim();
  const chosen = options.filter((option) => selectedIds.includes(String(option.id))).map(text).filter(Boolean);
  const correct = questionCorrect
    ? []
    : options.filter((option) => option.attributes?.is_correct === true).map(text).filter(Boolean);
  return { chosen, correct };
}
