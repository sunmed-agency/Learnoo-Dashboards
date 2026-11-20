'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { QuizQuestion, QuizQuestionAnswer } from '@/src/types';
import { resolveStudentExamMediaUrl } from '@/src/lib/student-exam-media';
import { useCurrentUser } from '@/src/hooks';
import { getStudentPlatformFeatures } from '@/src/services/student/platform-feature.service';
import {
  resolveEnabledWatermarkBucket,
  type WatermarkResolution,
} from '@/src/lib/watermark-from-features';
import { examCopyGuardContentProps } from '@/src/hooks/useExamCopyGuard';
import ExamWatermark from './WaterMarkDyna';
import { ExamImageViewer } from './ExamImageViewer';
import { ZoomIn } from 'lucide-react';
import { ExamBanner } from './ExamBanner';
export type ExamQuestionScreenMode = 'take' | 'review';

function answerReasonText(a: QuizQuestionAnswer): string | null {
  const r = a.attributes?.reason;
  if (r == null) return null;
  const s = typeof r === 'string' ? r.trim() : String(r).trim();
  return s.length > 0 ? s : null;
}

function answerReasonImage(a: QuizQuestionAnswer): string | null {
  return resolveStudentExamMediaUrl(a.attributes?.reason_image);
}

function reviewOptionContainerClass(args: {
  selected: boolean;
  isCorrect: boolean;
  questionCorrect: boolean;
}): string {
  const { selected, isCorrect, questionCorrect } = args;
  if (selected && isCorrect) {
    return 'border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600/25';
  }
  if (selected && !isCorrect) {
    return 'border-red-600 bg-red-50 ring-1 ring-red-600/25';
  }
  if (!selected && isCorrect && !questionCorrect) {
    return 'border-emerald-500/70 border-dashed bg-emerald-50/60';
  }
  return 'border-[#E2E8F0] bg-white';
}

function reviewOptionTextClass(args: { selected: boolean; isCorrect: boolean }): string {
  const { selected, isCorrect } = args;
  if (selected && isCorrect) return 'text-emerald-950';
  if (selected && !isCorrect) return 'text-red-950';
  if (!selected && isCorrect) return 'text-emerald-900';
  return 'text-[#0F172A]';
}

export type ExamQuestionScreenProps = {
  dir: 'ltr' | 'rtl';
  examTitle: string;
  questionBadgeText: string;
  questionProgressText: string;
  currentQuestionNumber: number;
  totalQuestions: number;
  question: QuizQuestion;
  answers: QuizQuestionAnswer[];
  studentName?: string | null;
  /** When true, header spans the student main horizontal padding (take-exam page). */
  headerBleed?: boolean;
  headerAside?: ReactNode;
  mode: ExamQuestionScreenMode;
  multi?: boolean;
  selectedIds?: string[];
  onSelectSingle?: (answerId: string) => void;
  onToggleMulti?: (answerId: string) => void;
  /** `short_answer` input — only relevant when `question.attributes.type === 'short_answer'`. */
  shortText?: string;
  onChangeShortText?: (text: string) => void;
  /** Review-only: whether the learner’s selection(s) for this question are fully correct. */
  reviewQuestionCorrect?: boolean;
  feedbackLabel?: string;
  noAnswerOptionsText?: string;
  shortAnswerPlaceholder?: string;
  shortAnswerAriaLabel?: string;
  awaitingGradingLabel?: string;
  articleFooter: ReactNode;
  belowArticle?: ReactNode;
  /** Review-only: shown under the options (the student's answer and, when wrong, the right one). */
  reviewAnswerSummary?: ReactNode;
  /** Exam banner image (quiz `banner`), shown above the question on every question. */
  bannerUrl?: string | null;
  /** Course name and instructor shown on the banner. */
  bannerCourseTitle?: string | null;
  bannerInstructor?: string | null;
};

export function ExamQuestionScreen({
  dir,
  examTitle,
  questionBadgeText,
  questionProgressText,
  currentQuestionNumber,
  totalQuestions,
  question,
  answers,
  studentName,
  headerBleed = false,
  headerAside,
  mode,
  multi = false,
  selectedIds = [],
  onSelectSingle,
  onToggleMulti,
  shortText = '',
  onChangeShortText,
  reviewQuestionCorrect = false,
  feedbackLabel,
  noAnswerOptionsText,
  shortAnswerPlaceholder,
  shortAnswerAriaLabel,
  awaitingGradingLabel,
  articleFooter,
  belowArticle,
  reviewAnswerSummary,
  bannerUrl,
  bannerCourseTitle,
  bannerInstructor,
}: ExamQuestionScreenProps) {
  const qNum = currentQuestionNumber;
  const copyGuardActive = mode === 'take' || mode === 'review';
  const copyGuardProps = examCopyGuardContentProps(copyGuardActive);
  const questionImageSrc = resolveStudentExamMediaUrl(question.attributes.image);
  const sectionImageSrc = resolveStudentExamMediaUrl(question.attributes.section?.image);
  const sectionTitle = question.attributes.section?.title?.trim() ?? '';
  /** The image open in the full-screen viewer (question, section, option or feedback image). */
  const [viewerImage, setViewerImage] = useState<{ src: string; alt: string } | null>(null);
  const openImage = (src: string, alt = '') => (event: { preventDefault: () => void; stopPropagation: () => void }) => {
    // Inside an option label a click would also pick the option; opening the image must not.
    event.preventDefault();
    event.stopPropagation();
    setViewerImage({ src, alt });
  };
  const zoomBadge = (
    <span className="pointer-events-none absolute bottom-1.5 end-1.5 grid size-7 place-items-center rounded-full bg-[#0A1033]/70 text-white opacity-90 shadow-sm transition group-hover:opacity-100" aria-hidden>
      <ZoomIn className="size-3.5" />
    </span>
  );
  const zoomLabel = dir === 'rtl' ? 'افتح الصورة بالحجم الكامل' : 'Open the image full screen';
  const { user } = useCurrentUser();

  const [watermarkConfig, setWatermarkConfig] =
    useState<WatermarkResolution | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadWatermark = async () => {
      try {
        const features = await getStudentPlatformFeatures();

        const resolution = resolveEnabledWatermarkBucket(
          features,
          'exams'
        );

        if (mounted) {
          setWatermarkConfig(resolution);
        }
      } catch (error) {
        console.error(error);
      }
    };

    loadWatermark();

    return () => {
      mounted = false;
    };
  }, []);
  const watermarkText = useMemo(() => {
    const config = watermarkConfig?.config;

    if (!config?.enabled) return '';

    const attrs = user?.attributes;

    const parts: string[] = [];

    if (config.useStudentCode && attrs?.student_code) {
      parts.push(String(attrs.student_code));
    }

    if (config.usePhoneNumber && attrs?.phone) {
      parts.push(String(attrs.phone));
    }

    return parts.join(' · ');
  }, [watermarkConfig, user]);

  const headerInner = (
    <header className="box-border flex min-h-[52px] w-full min-w-0 items-center justify-between gap-3 border-b border-[#EEEEEE] bg-white py-2.5 ps-5 pe-8 sm:ps-6 sm:pe-12 lg:ps-8 lg:pe-16">
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 leading-tight">
        <h1 className="truncate text-base font-bold text-[#0F172A] sm:text-lg">{examTitle}</h1>
        <p className="text-xs text-[#64748B] sm:text-[13px]">{questionProgressText}</p>
      </div>
      {headerAside ? <div className="shrink-0">{headerAside}</div> : null}
    </header>
  );

  return (
    <div
      className={`flex w-full min-w-0 flex-col pb-6 sm:pb-8${copyGuardActive ? ' select-none' : ''}`}
      dir={dir}
      {...copyGuardProps}
    >
      {/* With a banner image, the banner carries the title, progress and timer on one line (no separate header). */}
      {bannerUrl ? null : headerBleed ? (
        <div className="-mx-4 -mt-4 mb-4 w-[calc(100%+2rem)] max-w-none shrink-0 sm:-mx-5 sm:-mt-5 sm:w-[calc(100%+2.5rem)] lg:-mx-16 lg:w-[calc(100%+8rem)]">
          {headerInner}
        </div>
      ) : (
        <div className="mb-4 w-full shrink-0">{headerInner}</div>
      )}

      <div className={`mx-auto flex w-full max-w-[832px] flex-col gap-3 sm:gap-4${bannerUrl ? " pt-1" : ""}`}>
        {/* On question pages the banner shows only when the exam has an image (otherwise the header names the exam). */}
        {bannerUrl ? (
          <ExamBanner
            src={bannerUrl}
            alt={examTitle}
            courseTitle={bannerCourseTitle}
            instructor={bannerInstructor}
            subtitle={questionProgressText}
            aside={headerAside}
          />
        ) : null}

        <article
          className={`relative isolate flex w-full flex-col overflow-hidden rounded-xl border border-[#E8ECF2] bg-white px-4 py-4 shadow-[0_4px_24px_rgba(15,23,42,0.06)] sm:rounded-2xl sm:px-5 sm:py-5${copyGuardActive ? ' select-none' : ''}`}
          {...copyGuardProps}
        >
          <div className="relative z-0 flex flex-col gap-4 sm:gap-5">
            {studentName ? (
              <p className="text-[11px] font-medium text-[#94A3B8] sm:text-[12px]">{studentName}</p>
            ) : null}

            <div
              className="relative min-h-[min(30vh,240px)] flex-1 overflow-hidden sm:min-h-[min(34vh,280px)]"
              aria-label={examTitle}
            >
              <div className="relative z-0 flex flex-col gap-4 sm:gap-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <span
                    className="inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold sm:px-3 sm:py-1 sm:text-[12px]"
                    style={{ backgroundColor: '#E8EEFC', color: '#2D46D9' }}
                  >
                    {questionBadgeText}
                  </span>
                  <span className="text-xs font-semibold text-[#64748B] sm:text-sm">
                    {qNum} / {totalQuestions}
                  </span>
                </div>

                {/* Section ("قسم"): the image (and title) shared by this question and the others of its section */}
                {sectionImageSrc || sectionTitle ? (
                  <div className="overflow-hidden rounded-xl border border-[#E0E7FF] bg-[#F5F7FF]">
                    {sectionTitle ? (
                      <p dir="auto" className="border-b border-[#E0E7FF] px-3 py-2 text-[13px] font-bold text-[#1F33C4] sm:text-sm">
                        {sectionTitle}
                      </p>
                    ) : null}
                    {sectionImageSrc ? (
                      <button type="button" onClick={openImage(sectionImageSrc, sectionTitle)} className="group relative block w-full cursor-zoom-in" aria-label={zoomLabel}>
                        <Image
                          src={sectionImageSrc}
                          alt={sectionTitle}
                          width={900}
                          height={400}
                          className="mx-auto max-h-[min(30vh,240px)] w-full object-contain"
                          sizes="(max-width: 768px) 100vw, 800px"
                          unoptimized
                        />
                        {zoomBadge}
                      </button>
                    ) : null}
                  </div>
                ) : null}

                <h2 dir="auto" className="whitespace-pre-wrap break-words text-start text-base font-bold leading-relaxed text-[#0F172A] sm:text-lg">
                  {question.attributes.text}
                </h2>

                {questionImageSrc ? (
                  <button type="button" onClick={openImage(questionImageSrc)} className="group relative block w-full max-w-2xl cursor-zoom-in overflow-hidden rounded-lg border border-[#E2E8F0] bg-slate-50" aria-label={zoomLabel}>
                    <Image
                      src={questionImageSrc}
                      alt=""
                      width={800}
                      height={450}
                      className="max-h-[min(40vh,220px)] w-full object-contain sm:max-h-[min(42vh,260px)]"
                      sizes="(max-width: 768px) 100vw, 800px"
                      unoptimized
                    />
                    {zoomBadge}
                  </button>
                ) : null}

                {question.attributes.type === 'short_answer' ? (
                  <div className="flex flex-col gap-2 sm:gap-2.5">
                    {mode === 'take' ? (
                      <textarea
                        dir="auto"
                        value={shortText}
                        onChange={(e) => onChangeShortText?.(e.target.value)}
                        placeholder={shortAnswerPlaceholder}
                        aria-label={shortAnswerAriaLabel ?? question.attributes.text}
                        rows={5}
                        className="w-full resize-y rounded-lg border border-[#E2E8F0] bg-white px-3 py-2.5 text-[13px] leading-relaxed text-[#0F172A] outline-none transition focus:border-[#2D46D9] focus:ring-2 focus:ring-[#2D46D9]/15 sm:px-4 sm:py-3 sm:text-sm"
                        style={{ userSelect: 'text' }}
                      />
                    ) : (
                      <div className="flex flex-col gap-2 rounded-lg border border-[#E2E8F0] bg-slate-50 px-3 py-2.5 sm:gap-2.5 sm:px-4 sm:py-3">
                        {shortText.trim() ? (
                          <p dir="auto" className="whitespace-pre-wrap break-words text-start text-[13px] leading-relaxed text-[#0F172A] sm:text-sm">{shortText}</p>
                        ) : (
                          <p className="text-[13px] italic text-slate-500 sm:text-sm">—</p>
                        )}
                        {awaitingGradingLabel ? (
                          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                            {awaitingGradingLabel}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>
                ) : mode === 'take' ? (
                  <div className="flex flex-col gap-2 sm:gap-2.5">
                    {answers.map((ans) => {
                      const aid = String(ans.id);
                      const label = ans.attributes?.text?.trim() ?? '';
                      const imgSrc = resolveStudentExamMediaUrl(ans.attributes?.image);
                      const checked = selectedIds.includes(aid);
                      return (
                        <label
                          key={aid}
                          className={`flex cursor-pointer flex-col gap-2 rounded-lg border bg-white px-3 py-2.5 transition-colors sm:gap-2.5 sm:px-4 sm:py-3 ${checked ? 'border-[#2D46D9] ring-1 ring-[#2D46D9]/20' : 'border-[#E2E8F0] hover:border-slate-300'
                            }`}
                        >
                          <div className="flex items-start gap-2.5 sm:gap-3">

                            <input
                              type={multi ? 'checkbox' : 'radio'}
                              name={`question-${question.id}`}
                              value={aid}
                              checked={checked}
                              onChange={() =>
                                multi ? onToggleMulti?.(aid) : onSelectSingle?.(aid)
                              }
                              className="mt-0.5 size-[15px] shrink-0 accent-[#2D46D9] sm:mt-1 sm:size-4"
                            />
                            <span dir="auto" className="min-w-0 flex-1 whitespace-pre-wrap break-words text-start text-[13px] font-medium leading-relaxed text-[#0F172A] sm:text-sm">{label}</span>
                          </div>
                          {imgSrc ? (
                            <button type="button" onClick={openImage(imgSrc, label)} className="group relative ms-6 block w-full max-w-xl cursor-zoom-in overflow-hidden rounded-md border border-[#E2E8F0] bg-slate-50 sm:ms-7" aria-label={zoomLabel}>
                              <Image
                                src={imgSrc}
                                alt=""
                                width={640}
                                height={360}
                                className="max-h-[min(32vh,180px)] w-full object-contain sm:max-h-[min(34vh,200px)]"
                                sizes="(max-width: 768px) 100vw, 640px"
                                unoptimized
                              />
                              {zoomBadge}
                            </button>
                          ) : null}
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 sm:gap-2.5">

                    {answers.length === 0 ? (
                      <p className="text-sm text-slate-600">{noAnswerOptionsText}</p>
                    ) : (
                      answers.map((ans) => {
                        const aid = String(ans.id);
                        const selected = selectedIds.includes(aid);
                        const isCorrect = !!ans.attributes?.is_correct;
                        const reason = answerReasonText(ans);
                        const reasonImageSrc = answerReasonImage(ans);
                        const showFeedback = (reason != null || reasonImageSrc != null) && (isCorrect || selected);
                        const label = ans.attributes?.text?.trim() ?? '';
                        const imgSrc = resolveStudentExamMediaUrl(ans.attributes?.image);
                        return (
                          <div
                            key={aid}
                            className={`flex flex-col gap-2 rounded-lg border px-3 py-2.5 sm:gap-2.5 sm:px-4 sm:py-3 ${reviewOptionContainerClass({
                              selected,
                              isCorrect,
                              questionCorrect: reviewQuestionCorrect,
                            })}`}
                          >

                            <div className="flex items-start gap-2.5 sm:gap-3">
                              <span
                                className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border border-slate-300 bg-white text-[10px] font-bold text-slate-600 sm:mt-1 sm:size-[18px] sm:text-[11px]"
                                aria-hidden
                              >
                                {selected ? '✓' : ''}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p
                                  dir="auto"
                                  className={`whitespace-pre-wrap break-words text-start text-[13px] font-medium leading-relaxed sm:text-sm ${reviewOptionTextClass({
                                    selected,
                                    isCorrect,
                                  })}`}
                                >
                                  {label}
                                </p>
                                {showFeedback ? (
                                  <div className="mt-2 border-s-2 border-slate-200 ps-3">
                                    {feedbackLabel ? (
                                      <p className="text-xs font-bold text-slate-700 mb-1 sm:text-[13px]">{feedbackLabel}</p>
                                    ) : null}
                                    {reason ? (
                                      <p dir="auto" className="whitespace-pre-wrap break-words text-start text-xs leading-relaxed text-slate-600 sm:text-[13px]">
                                        {reason}
                                      </p>
                                    ) : null}
                                    {reasonImageSrc ? (
                                      <button type="button" onClick={openImage(reasonImageSrc, reason ?? '')} className="group relative mt-2 block w-full max-w-xl cursor-zoom-in overflow-hidden rounded-md border border-[#E2E8F0] bg-slate-50" aria-label={zoomLabel}>
                                        <Image
                                          src={reasonImageSrc}
                                          alt=""
                                          width={640}
                                          height={360}
                                          className="max-h-[min(32vh,180px)] w-full object-contain sm:max-h-[min(34vh,200px)]"
                                          sizes="(max-width: 768px) 100vw, 640px"
                                          unoptimized
                                        />
                                        {zoomBadge}
                                      </button>
                                    ) : null}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                            {imgSrc ? (
                              <button type="button" onClick={openImage(imgSrc, label)} className="group relative ms-7 block w-full max-w-xl cursor-zoom-in overflow-hidden rounded-md border border-[#E2E8F0] bg-slate-50 sm:ms-8" aria-label={zoomLabel}>
                                <Image
                                  src={imgSrc}
                                  alt=""
                                  width={640}
                                  height={360}
                                  className="max-h-[min(32vh,180px)] w-full object-contain sm:max-h-[min(34vh,200px)]"
                                  sizes="(max-width: 768px) 100vw, 640px"
                                  unoptimized
                                />
                                {zoomBadge}
                              </button>
                            ) : null}
                          </div>
                        );
                      })
                    )}
                    {reviewAnswerSummary}
                  </div>
                )}

              </div>

              {watermarkConfig?.config.enabled && watermarkText ? (
                <ExamWatermark text={watermarkText} watermarkConfig={watermarkConfig} />
              ) : null}
              {viewerImage ? (
                <ExamImageViewer
                  src={viewerImage.src}
                  alt={viewerImage.alt}
                  onClose={() => setViewerImage(null)}
                  watermarkText={watermarkText}
                  watermarkConfig={watermarkConfig}
                />
              ) : null}
            </div>

            <div className="relative z-10 mt-auto flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between sm:pt-4">
              {articleFooter}
            </div>
          </div>
        </article>

        {belowArticle}
      </div>
    </div>
  );
}
