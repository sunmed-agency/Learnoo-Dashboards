import { BookOpen, UserRound } from 'lucide-react';
import { resolveStudentExamMediaUrl } from '@/src/lib/student-exam-media';

/**
 * The exam banner at the top of the exam, styled like the course banner: the image staff set when
 * creating the exam fills the card edge to edge (4:1, the recommended size, so nothing is lost),
 * and under it a dark Learnoo bar carries the exam title, the course name and the instructor.
 * Without an image the bar alone is shown (same text on the Learnoo gradient).
 * The image height is capped (about a quarter of the screen) so a phone in landscape keeps room
 * for the question.
 */
export function ExamBanner({
  src,
  alt,
  courseTitle,
  instructor,
  className = '',
}: {
  src?: string | null;
  /** The exam title (also the image alt). */
  alt: string;
  courseTitle?: string | null;
  instructor?: string | null;
  className?: string;
}) {
  const url = resolveStudentExamMediaUrl(src);
  const course = courseTitle?.trim() || '';
  const doctor = instructor?.trim() || '';

  return (
    <section
      className={`relative isolate mx-auto w-full shrink-0 overflow-hidden rounded-2xl bg-[#0A1033] text-white shadow-[0_18px_40px_-26px_rgba(45,70,232,0.7)] ${className}`}
      data-testid="exam-banner"
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- API-hosted image, same as other exam media
        <img
          src={url}
          alt={alt}
          draggable={false}
          className="block aspect-[4/1] max-h-[26vh] w-full object-cover object-center"
        />
      ) : null}

      <div className="relative px-4 py-3 sm:px-5 sm:py-3.5">
        <div
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_140%_at_100%_0%,rgba(53,80,240,0.8)_0%,transparent_60%),radial-gradient(ellipse_45%_120%_at_0%_100%,rgba(232,118,106,0.4)_0%,transparent_60%),linear-gradient(135deg,#0A1033_0%,#141C66_55%,#1F33C4_100%)]"
          aria-hidden
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <h1 className="min-w-0 text-base font-extrabold leading-snug tracking-tight [overflow-wrap:anywhere] sm:text-lg">{alt}</h1>
          {course || doctor ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {course ? (
                <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold ring-1 ring-white/20 sm:text-[13px]">
                  <BookOpen className="size-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{course}</span>
                </span>
              ) : null}
              {doctor ? (
                <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[#E8766A]/25 px-3 py-1 text-xs font-bold text-[#FFE1DC] ring-1 ring-[#E8766A]/40 sm:text-[13px]">
                  <UserRound className="size-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{doctor}</span>
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
