'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { BookOpen, ChevronLeft, CircleX, Home, ListChecks, RefreshCw, Trophy } from 'lucide-react';
import { ExamAnswersReview } from '@/components/student/exams/ExamAnswersReview';
import { normalizeQuestions } from '@/src/lib/student-exam-question-utils';
import {
  api
} from '@/src/lib/api';
import { readStudentQuizResultPayload } from '@/src/lib/student-quiz-cache';
import type { Quiz } from '@/src/types';
import { formatTimeTakenForDisplay } from '@/src/lib/quiz-finish-result-fields';
import {
  isExamPassed,
  passingMarksPercentage,
  readPercentageWithScoreFallback,
  formatPercent,
} from '@/src/lib/student-exam-score';
import type { QuizAttemptResultResponse } from '@/src/types';

const PRIMARY = '#2D46D9';

function formatFinishedAt(raw: string | undefined, locale: string): string {
  if (!raw?.trim()) return '—';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw.trim();
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(d);
}

export default function ExamResultView({ locale, quizId }: { locale: string; quizId: string }) {
  const router = useRouter();
  const t = useTranslations('courses.studentExamResult');
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const [payload, setPayload] = useState<QuizAttemptResultResponse | null | undefined>(undefined);

  // Local fallback from sessionStorage right after exam finish
  const [localQuizForReview, setLocalQuizForReview] = useState<Quiz | undefined>(undefined);
  const [localSelections, setLocalSelections] = useState<Record<string, string[]> | undefined>(undefined);

  const [showAnswerReview, setShowAnswerReview] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    // Attempt to read local storage fallback if the user just finished an exam
    const local = readStudentQuizResultPayload(quizId);
    if (local?.quizForReview) setLocalQuizForReview(local.quizForReview);
    if (local?.selectionsForReview) setLocalSelections(local.selectionsForReview);

    let active = true;
    // Right after finishing, the finish response already holds the score: show it at once instead
    // of waiting for the result request (which grades the attempt again). That request still runs
    // and replaces it when it arrives (it also brings the answers for the review).
    const finishRes = local?.finishResponse;
    const shownFromFinish = Boolean((finishRes as { results?: unknown } | undefined)?.results);
    if (shownFromFinish) setPayload(finishRes as unknown as QuizAttemptResultResponse);

    async function loadResult() {
      try {
        let attemptIdToFetch: string | number | undefined = undefined;

        // Try to get the exact attempt ID they just took from local memory
        if (finishRes) {
          attemptIdToFetch = finishRes.attempt?.data?.id ?? (finishRes.attempt as any)?.id;
        }

        // Fallback to searching their attempt history if they came straight to this URL
        if (!attemptIdToFetch) {
          const attemptsRes = await api.quizAttempts.list({ quiz_id: quizId });
          const attempts = attemptsRes.data || [];
          if (!attempts.length) {
            if (active) setPayload(null);
            return;
          }
          attemptIdToFetch = [...attempts].sort((a, b) => Number(b.id) - Number(a.id))[0].id;
        }

        const resultRes = await api.quizAttemptResults.result(attemptIdToFetch);
        if (active) setPayload(resultRes);
      } catch (err) {
        console.error('Failed to load exam result', err);
        // Keep the result from the finish response on screen if we already showed it.
        if (shownFromFinish) return;
        if (active) setLoadError(t('loadingError'));
        if (active) setPayload(null);
      }
    }
    void loadResult();

    return () => {
      active = false;
    };
  }, [quizId, t]);

  useEffect(() => {
    if (payload === null && !loadError) {
      router.replace(`/${locale}/student/exams`);
    }
  }, [payload, loadError, locale, router]);

  const results: any = payload?.results ?? payload?.data?.attempt ?? (payload?.attempt as any)?.data ?? payload?.attempt;
  const quizInfo: any = payload?.quiz_info ?? payload?.data?.quiz ?? payload?.quiz;

  const yourPct =
    results != null
      ? readPercentageWithScoreFallback(
        results.percentage ?? undefined,
        results.score ?? results.earned_marks ?? (payload?.data as any)?.score,
        results.total_score ?? quizInfo?.total_marks ?? quizInfo?.attributes?.total_marks,
      )
      : null;
  const passPct =
    quizInfo != null && (typeof quizInfo.passing_marks === 'number' || typeof quizInfo?.attributes?.passing_marks === 'number')
      ? passingMarksPercentage(quizInfo.passing_marks ?? quizInfo?.attributes?.passing_marks)
      : null;
  const passed = isExamPassed(results?.passed, yourPct, passPct);
  const timeTakenVal = results != null && 'time_taken' in results ? formatTimeTakenForDisplay(results.time_taken as number | string | null | undefined) : null;

  const scoreMarksLine = useMemo(() => {
    if (!results) return '—';
    const a = Number(results.score ?? results.earned_marks ?? (payload?.data as any)?.score);
    const b = Number(results.total_score ?? quizInfo?.total_marks ?? quizInfo?.attributes?.total_marks);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return '—';
    return `${a} / ${b}`;
  }, [results, payload, quizInfo]);

  if (payload === undefined) {
    return (
      <div className="mx-auto max-w-[1130px] px-4 py-24 text-center text-sm text-slate-600" dir={dir}>
        {t('loading')}
      </div>
    );
  }

  if (payload === null || !results || !quizInfo) {
    if (loadError) {
      return (
        <div className="mx-auto max-w-[1130px] px-4 py-24 text-center text-sm text-red-600" dir={dir}>
          {loadError}
        </div>
      );
    }
    return null;
  }

  const homeHref = `/${locale}/student`;
  // Fallback to courses list if we don't have a specific course context
  const reviewHref = `/${locale}/student/courses`;
  const retryHref = `/${locale}/student/exams/start-exam/${encodeURIComponent(quizId)}`;

  const handleRetry = () => {
    router.push(retryHref);
  };

  // We dynamically pass the entire API payload to ExamAnswersReview, or use local fallback
  const hasApiReviewData = Boolean((payload?.data?.quiz ?? payload?.quiz) && (payload?.data?.answers ?? payload?.answers));
  const hasLocalReviewData = Boolean(localQuizForReview && localSelections);
  const canAnswerReview = hasApiReviewData || hasLocalReviewData;

  const bannerBg = passed ? '#16A34A' : '#DC2626';
  const quizTitle = quizInfo?.title?.trim() ?? quizInfo?.attributes?.title?.trim() ?? '—';

  return (
    <div className="flex w-full justify-center px-0 pb-6 pt-1 sm:px-4" dir={dir}>
      <div
        className="flex w-full max-w-[960px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_8px_40px_rgba(15,23,42,0.1)]"
        style={{ borderRadius: 16 }}
      >
        <header
          className="flex items-center justify-center gap-4 px-5 py-5 text-start sm:px-8 sm:py-6"
          style={{
            backgroundColor: bannerBg,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
          }}
        >
          <div
            className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-white text-white sm:size-14"
            aria-hidden
          >
            {passed ? (
              <Trophy className="size-6 sm:size-7" strokeWidth={2} />
            ) : (
              <CircleX className="size-6 sm:size-7" strokeWidth={2} />
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-white sm:text-2xl">
              {passed ? t('congratulationsTitle') : t('failedTitle')}
            </h1>
            <p className="mt-0.5 text-[13px] text-white/95 sm:text-sm">
              {passed ? t('passedSubtitle') : t('failedSubtitle')}
            </p>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 px-4 py-5 sm:gap-5 sm:px-8 sm:py-6">
          {showAnswerReview && canAnswerReview ? (
            <>
              <div className="flex flex-col gap-2 border-b border-slate-100 pb-3">
                <button
                  type="button"
                  onClick={() => setShowAnswerReview(false)}
                  className="inline-flex w-fit items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-[#334155] transition-colors hover:bg-slate-100"
                >
                  <ChevronLeft className="size-4 shrink-0 rtl:rotate-180" strokeWidth={2} aria-hidden />
                  {t('backFromReview')}
                </button>
              </div>
              <ExamAnswersReview
                payload={payload}
                fallbackQuiz={localQuizForReview}
                fallbackSelections={localSelections}
                locale={locale}
                onExitReview={() => setShowAnswerReview(false)}
              />
            </>
          ) : (
            <>
              <h2 className="text-center text-base font-bold leading-snug text-[#0F172A] [overflow-wrap:anywhere] sm:text-lg">{quizTitle}</h2>

              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div className="rounded-xl border border-[#E8ECF2] bg-white px-2 py-3 text-center shadow-sm sm:px-5 sm:py-4">
                  <p className="text-xl font-bold tabular-nums sm:text-[1.75rem]" style={{ color: PRIMARY }}>
                    {yourPct != null ? formatPercent(yourPct) : '—'}
                  </p>
                  <p className="mt-1 text-[12px] font-medium text-[#64748B] sm:text-[13px]">{t('yourScore')}</p>
                </div>
                <div className="rounded-xl border border-[#E8ECF2] bg-white px-2 py-3 text-center shadow-sm sm:px-5 sm:py-4">
                  <p className="text-xl font-bold tabular-nums text-[#0F172A] sm:text-[1.75rem]">{scoreMarksLine}</p>
                  <p className="mt-1 text-[12px] font-medium text-[#64748B] sm:text-[13px]">{t('scoreMarks')}</p>
                </div>
                <div className="rounded-xl border border-[#E8ECF2] bg-white px-2 py-3 text-center shadow-sm sm:px-5 sm:py-4">
                  <p className="text-xl font-bold tabular-nums text-[#0F172A] sm:text-[1.75rem]">
                    {passPct != null ? formatPercent(passPct) : '—'}
                  </p>
                  <p className="mt-1 text-[12px] font-medium text-[#64748B] sm:text-[13px]">{t('passingScore')}</p>
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-3 rounded-xl border border-[#E8ECF2] bg-[#F8FAFC] px-4 py-3 text-sm sm:px-6">
                <div>
                  <dt className="font-medium text-[#64748B]">{t('finishedAt')}</dt>
                  <dd className="mt-1 font-semibold text-[#0F172A]">{formatFinishedAt(results.finished_at as string | undefined, locale)}</dd>
                </div>
                <div>
                  <dt className="font-medium text-[#64748B]">{t('timeTaken')}</dt>
                  <dd className="mt-1 font-semibold text-[#0F172A]">
                    {timeTakenVal != null
                      ? t('timeTakenMinutes', {
                        value: Number(timeTakenVal).toLocaleString(locale, { maximumFractionDigits: 2 }),
                      })
                      : '—'}
                  </dd>
                </div>
              </dl>

              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3">
                <Link
                  href={homeHref}
                  className="inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-[#F1F5F9] px-5 text-sm font-semibold text-[#334155] transition-colors hover:bg-[#E2E8F0] sm:max-w-[200px] sm:flex-none"
                >
                  <Home className="size-4 shrink-0" strokeWidth={2} aria-hidden />
                  {t('backToHome')}
                </Link>
                {canAnswerReview ? (
                  <button
                    type="button"
                    onClick={() => setShowAnswerReview(true)}
                    className="inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border border-[#C7D2FE] bg-[#EEF2FF] px-5 text-sm font-semibold text-[#3730A3] transition-colors hover:bg-[#E0E7FF] sm:max-w-[240px] sm:flex-none"
                  >
                    <ListChecks className="size-4 shrink-0" strokeWidth={2} aria-hidden />
                    {t('reviewAnswers')}
                  </button>
                ) : null}
                <Link
                  href={reviewHref}
                  className="inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-colors sm:max-w-[220px] sm:flex-none"
                  style={{ backgroundColor: '#E8EEFC', color: PRIMARY }}
                >
                  <BookOpen className="size-4 shrink-0" strokeWidth={2} aria-hidden />
                  {t('reviewLectures')}
                </Link>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold text-white transition-colors hover:opacity-95 sm:max-w-[200px] sm:flex-none"
                  style={{ backgroundColor: PRIMARY }}
                >
                  <RefreshCw className="size-4 shrink-0" strokeWidth={2} aria-hidden />
                  {t('retryExam')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
