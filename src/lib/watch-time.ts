/** 754 → "12:34", 3754 → "1:02:34" (a position in a video). */
export function formatClock(totalSeconds: number | null | undefined): string {
  if (totalSeconds === null || totalSeconds === undefined || !Number.isFinite(totalSeconds) || totalSeconds < 0) return '—';
  const s = Math.floor(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

/** Watched time in words: 0 → "—", 45 → "أقل من دقيقة", 754 → "12 دقيقة", 11520 → "3 س 12 د". */
export function formatWatchTime(totalSeconds: number | null | undefined, ar: boolean): string {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  if (s === 0) return '—';
  if (s < 60) return ar ? 'أقل من دقيقة' : 'Under a minute';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h === 0) return ar ? `${m} دقيقة` : `${m} min`;
  return ar ? `${h} س ${m} د` : `${h} h ${m} min`;
}

/** Whole minutes, for "12 من 30 دقيقة". */
export const toMinutes = (seconds: number | null | undefined) => Math.floor(Math.max(0, Number(seconds) || 0) / 60);
