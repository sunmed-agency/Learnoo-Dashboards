'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { AlertCircle, CalendarClock, Clock, FileText, Play, Target } from 'lucide-react';
import toast from 'react-hot-toast';
import type { ApiResponse, Quiz, QuizAttempt } from '@/src/types';
import { api, ApiError } from '@/src/lib/api';
import { writeStudentTakePayload } from '@/src/lib/student-quiz-cache';
import { sanitizeNumericCourseQueryParam } from '@/src/lib/student-start-exam-href';
import { navigateTakeExamExit } from '@/components/student/exams/takeExamNav';
import { ExamBanner } from '@/components/student/exams/ExamBanner';

/** Backend may return this in JSON `message` (2xx or error body). */
function isMaxAttemptsReachedMessage(text: string | null | undefined): boolean {
  if (!text?.trim()) return false;
  return /max\s*attempts?\s*reached/i.test(text.trim());
}

/** Figma exam intro — primary blue */
const EXAM_PRIMARY = '#2D46D9';

export function StartExamIntro({
  quiz,
  quizId,
  backHref,
}: {
  quiz: Quiz;
  quizId: string;
  backHref: string;
}) {
  const router = useRouter();
  const locale = useLocale();
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const t = useTranslations('courses.studentStartExam');

  const [starting, setStarting] = useState(false);

  const attrs = quiz.attributes;
  const subtitle =
    attrs.description?.trim() ||
    (attrs.type === 'exam' ? t('typeExam') : t('typeHomework'));
  const questions = attrs.questions ?? [];
  const qCount = questions.length;
  const durationMin = typeof attrs.duration === 'number' && attrs.duration > 0 ? attrs.duration : 0;

  // The exam window set by staff (start / end), shown so the student knows when it closes.
  const fmtWhen = (iso?: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  };
  const windowStart = fmtWhen(attrs.start_time);
  const windowEnd = fmtWhen(attrs.end_time);
  const ar = locale === 'ar';

  const rules = [
    t('rule1'),
    t('rule2'),
    t('rule3'),
    t('rule4'),
    t('rule5'),
  ] as const;

  const courseForTake = sanitizeNumericCourseQueryParam(String(attrs.course_id ?? ''));
  const takeHref =
    courseForTake != null
      ? `/${locale}/student/exams/take/${encodeURIComponent(quizId)}?course=${encodeURIComponent(courseForTake)}`
      : `/${locale}/student/exams/take/${encodeURIComponent(quizId)}`;

  const handleStart = async () => {
    if (starting) return;
    const numericQuizId = Number(quiz.id);
    if (!Number.isFinite(numericQuizId)) {
      toast.error(t('startAttemptError'));
      return;
    }
    setStarting(true);
    try {
      const res = await api.quizAttempts.start({ quiz_id: numericQuizId });
      const payload = res as ApiResponse<QuizAttempt>;
      const apiMessage = typeof payload.message === 'string' ? payload.message.trim() : '';
      if (apiMessage && isMaxAttemptsReachedMessage(apiMessage)) {
        toast.error(apiMessage);
        navigateTakeExamExit(router, backHref);
        return;
      }
      const attemptId = String(payload.data?.id ?? '').trim();
      if (!attemptId) {
        toast.error(t('startAttemptError'));
        return;
      }
      writeStudentTakePayload(quizId, {
        version: 1,
        quiz,
        backHref,
        examStartedAtMs: Date.now(),
        attemptId: String(payload.data.id),
      });
      router.push(takeHref);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : null;
      if (msg && isMaxAttemptsReachedMessage(msg)) {
        toast.error(msg.trim());
        navigateTakeExamExit(router, backHref);
        return;
      }
      toast.error(msg?.trim() || t('startAttemptError'));
    } finally {
      setStarting(false);
    }
  };

  const handleCancel = () => {
    navigateTakeExamExit(router, backHref);
  };

  const tile = 'flex items-center gap-3 rounded-[12px] border border-[#E8ECF2] bg-[#F8F9FB] px-3 py-2.5 text-start sm:px-4';
  const tileIcon = 'grid size-9 shrink-0 place-items-center rounded-lg bg-[#EAEEFE] text-[#2D46E8]';

  return (
    <div className="w-full pb-6 pt-1" dir={dir}>
      <div className="mx-auto flex w-full max-w-[832px] flex-col gap-3 sm:gap-4">
        <ExamBanner
          src={attrs.banner}
          alt={attrs.title}
          courseTitle={attrs.course_title}
          instructor={attrs.course_instructor}
        />
        <article className="flex w-full flex-col gap-4 rounded-2xl border border-[#E8ECF2] bg-white px-4 py-4 shadow-[0_4px_32px_rgba(15,23,42,0.07)] sm:gap-5 sm:px-6 sm:py-5">
          <p className="text-center text-[13px] text-[#64748B] sm:text-start">{subtitle}</p>

          {/* Duration, questions, passing mark and the exam window in one row */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
            <div className={tile}>
              <span className={tileIcon}><Clock className="size-[18px]" aria-hidden /></span>
              <span className="min-w-0">
                <span className="block text-[11.5px] font-medium text-[#64748B]">{t('durationLabel')}</span>
                <span className="block text-[14px] font-bold text-[#0F172A]">{durationMin > 0 ? t('minutesUnit', { count: durationMin }) : '—'}</span>
              </span>
            </div>
            <div className={tile}>
              <span className={tileIcon}><FileText className="size-[18px]" aria-hidden /></span>
              <span className="min-w-0">
                <span className="block text-[11.5px] font-medium text-[#64748B]">{t('questionsLabel')}</span>
                <span className="block text-[14px] font-bold text-[#0F172A]">{qCount}</span>
              </span>
            </div>
            <div className={tile}>
              <span className={tileIcon}><Target className="size-[18px]" aria-hidden /></span>
              <span className="min-w-0">
                <span className="block text-[11.5px] font-medium text-[#64748B]">{ar ? 'درجة النجاح' : 'Passing mark'}</span>
                <span className="block text-[14px] font-bold text-[#0F172A]" dir="ltr">{attrs.passing_marks != null ? `${attrs.passing_marks}%` : '—'}</span>
              </span>
            </div>
            <div className={tile}>
              <span className={tileIcon}><CalendarClock className="size-[18px]" aria-hidden /></span>
              <span className="min-w-0">
                <span className="block text-[11.5px] font-medium text-[#64748B]">{ar ? 'موعد الاختبار' : 'Exam window'}</span>
                <span className="block text-[12.5px] font-bold leading-snug text-[#0F172A]">
                  {windowStart || windowEnd ? (
                    <>
                      {windowStart ? <span className="block">{ar ? 'من' : 'From'} {windowStart}</span> : null}
                      {windowEnd ? <span className="block">{ar ? 'إلى' : 'Until'} {windowEnd}</span> : null}
                    </>
                  ) : ar ? 'متاح في أي وقت' : 'Open any time'}
                </span>
              </span>
            </div>
          </div>

          <section className="text-start">
            <h2 className="text-[14px] font-bold text-[#0F172A]">{t('rulesHeading')}</h2>
            <ul className="mt-2.5 grid gap-x-6 gap-y-2 text-[13px] leading-relaxed text-[#475569] sm:grid-cols-2">
              {rules.map((text) => (
                <li key={text} className="flex gap-2.5">
                  <span
                    className="mt-2 size-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: EXAM_PRIMARY }}
                    aria-hidden
                  />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </section>

          <div className="flex gap-3 rounded-[12px] border border-[#F5D0A8] bg-[#FFF8F0] px-3 py-2.5 sm:px-4">
            <div
              className="flex size-9 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: '#FFEDD5', color: '#C2410C' }}
            >
              <AlertCircle className="size-5" strokeWidth={2} aria-hidden />
            </div>
            <div className="min-w-0 text-start">
              <p className="text-[13px] font-bold" style={{ color: '#9A3412' }}>
                {t('noticeTitle')}
              </p>
              <p className="mt-0.5 text-[12px] leading-relaxed" style={{ color: '#7C2D12' }}>
                {t('noticeBody')}
              </p>
            </div>
          </div>

          <footer className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <button
              type="button"
              onClick={handleCancel}
              disabled={starting}
              className="inline-flex h-[48px] flex-1 items-center justify-center rounded-[12px] border border-[#D1D5DB] bg-white text-[14px] font-semibold text-[#475569] transition-colors hover:bg-[#F8F9FB] disabled:opacity-50"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={() => void handleStart()}
              disabled={starting}
              className="inline-flex h-[48px] flex-1 items-center justify-center gap-2 rounded-[12px] bg-[#2D46D9] text-[14px] font-bold text-white shadow-sm transition-colors hover:bg-[#2438c4] active:bg-[#1e2f9e] disabled:opacity-50"
            >
              <Play className="size-4 shrink-0 fill-white text-white" aria-hidden />
              {t('startExam')}
            </button>
          </footer>
        </article>
      </div>
    </div>
  );
}
