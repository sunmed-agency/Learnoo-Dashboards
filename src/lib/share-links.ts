/**
 * Links a teacher copies from the dashboard and sends to students.
 *
 * They are the student pages of the public website, so a tap opens the exam or
 * live session on the website, or in the Learnoo app when it is installed (the
 * app claims these paths through `/.well-known/assetlinks.json` and
 * `/.well-known/apple-app-site-association`).
 */
import { APP_LOCALES, type AppLocale } from '@/src/lib/app-locales';

/** The public website, e.g. https://learnoo.app. */
export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://learnoo.app').replace(/\/+$/, '');

function linkLocale(locale: string): AppLocale {
  return (APP_LOCALES as readonly string[]).includes(locale) ? (locale as AppLocale) : 'ar';
}

export function examShareUrl(examId: string | number, locale: string): string {
  return `${SITE_URL}/${linkLocale(locale)}/student/exams/start-exam/${encodeURIComponent(String(examId))}`;
}

export function liveSessionShareUrl(roomId: string | number, locale: string): string {
  return `${SITE_URL}/${linkLocale(locale)}/student/live-sessions/${encodeURIComponent(String(roomId))}`;
}
