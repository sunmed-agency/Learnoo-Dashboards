import type { ReactNode } from 'react';
import { BookOpen, UserRound } from 'lucide-react';
import { resolveStudentExamMediaUrl } from '@/src/lib/student-exam-media';

/**
 * The exam banner, styled like the course banner but compact so the exam fits one screen:
 * one dark Learnoo card with the staff-set image (4:1, small height) at the start, then the exam
 * title, the course and the instructor, and an optional `aside` (the timer) on the same line.
 * On phones the image sits on top (still short) and the text + aside row comes under it.
 * Without an image the card shows the text row alone.
 */
export function ExamBanner({
  src,
  alt,
  courseTitle,
  instructor,
  subtitle,
  aside,
  className = '',
}: {
  src?: string | null;
  /** The exam title (also the image alt). */
  alt: string;
  courseTitle?: string | null;
  instructor?: string | null;
  /** Small line under the title (e.g. "Question 2 of 20"). */
  subtitle?: string | null;
  /** Shown at the end of the same line (e.g. the exam timer). */
  aside?: ReactNode;
  className?: string;
}) {
  const url = resolveStudentExamMediaUrl(src);
  const course = courseTitle?.trim() || '';
  const doctor = instructor?.trim() || '';

  return (
    <section
      className={`relative isolate w-full shrink-0 overflow-hidden rounded-2xl bg-[#0A1033] p-2 text-white shadow-[0_14px_34px_-24px_rgba(45,70,232,0.7)] sm:p-2.5 ${className}`}
      data-testid="exam-banner"
    >
      <div
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_140%_at_100%_0%,rgba(53,80,240,0.8)_0%,transparent_60%),radial-gradient(ellipse_45%_120%_at_0%_100%,rgba(232,118,106,0.4)_0%,transparent_60%),linear-gradient(135deg,#0A1033_0%,#141C66_55%,#1F33C4_100%)]"
        aria-hidden
      />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- API-hosted image, same as other exam media
          <img
            src={url}
            alt={alt}
            draggable={false}
            className="block aspect-[4/1] max-h-[15dvh] w-full shrink-0 rounded-xl object-cover object-center sm:h-[clamp(60px,11vh,96px)] sm:max-h-none sm:w-auto"
          />
        ) : null}

        <div className="flex min-w-0 flex-1 items-center gap-3 px-1.5 pb-1 sm:px-0 sm:pb-0">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[15px] font-extrabold leading-snug tracking-tight sm:text-lg">{alt}</h1>
            {course || doctor ? (
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {course ? (
                  <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[11.5px] font-bold ring-1 ring-white/20 sm:text-xs">
                    <BookOpen className="size-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{course}</span>
                  </span>
                ) : null}
                {doctor ? (
                  <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[#E8766A]/25 px-2.5 py-0.5 text-[11.5px] font-bold text-[#FFE1DC] ring-1 ring-[#E8766A]/40 sm:text-xs">
                    <UserRound className="size-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{doctor}</span>
                  </span>
                ) : null}
              </div>
            ) : null}
            {subtitle ? <p className="mt-1 text-[11.5px] text-white/70 sm:text-xs">{subtitle}</p> : null}
          </div>
          {aside ? <div className="shrink-0">{aside}</div> : null}
        </div>
      </div>
    </section>
  );
}
