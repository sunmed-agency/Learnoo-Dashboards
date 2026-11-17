export function clampPercentage(value: unknown): number | null {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.min(100, Math.max(0, numeric));
}

/** A score percentage as students see it: at most one decimal (66.7%, 90%). */
export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const rounded = Math.round(value * 10) / 10;
  return `${rounded}%`;
}

export function percentageFromScore(score: unknown, total: unknown): number | null {
  const numericScore = typeof score === 'number' ? score : Number(score);
  const numericTotal = typeof total === 'number' ? total : Number(total);
  if (!Number.isFinite(numericScore) || !Number.isFinite(numericTotal) || numericTotal <= 0) {
    return null;
  }
  return clampPercentage((numericScore / numericTotal) * 100);
}

export function readPercentageWithScoreFallback(
  percentage: unknown,
  score: unknown,
  total: unknown,
): number | null {
  return clampPercentage(percentage) ?? percentageFromScore(score, total);
}

export function passingMarksPercentage(passingMarks: unknown): number | null {
  return clampPercentage(passingMarks);
}

export function isExamPassed(passed: unknown, score: number | null, passingScore: number | null): boolean {
  return typeof passed === 'boolean' ? passed : score !== null && passingScore !== null && score >= passingScore;
}
