import { resolveStudentExamMediaUrl } from '@/src/lib/student-exam-media';

/**
 * The exam's banner (set by staff when creating the exam), shown at the top of the exam.
 * 4:1 like a Google Forms header; the whole image always shows (no cropping). Its height is
 * capped at 28% of the screen (width at 4 × that) so a phone in landscape still has room for the
 * question. Renders nothing without a banner.
 */
export function ExamBanner({ src, alt, className = '' }: { src?: string | null; alt: string; className?: string }) {
  const url = resolveStudentExamMediaUrl(src);
  if (!url) return null;

  return (
    <div
      className={`mx-auto w-full max-w-[112vh] shrink-0 overflow-hidden rounded-xl border border-[#E8ECF2] bg-white sm:rounded-2xl ${className}`}
      data-testid="exam-banner"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- API-hosted image, same as other exam media */}
      <img
        src={url}
        alt={alt}
        draggable={false}
        className="block aspect-[4/1] w-full object-contain"
      />
    </div>
  );
}
