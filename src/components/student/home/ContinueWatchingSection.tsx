"use client";

import Link from "next/link";
import { Lock, Play } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { IUserProgress } from "@/src/interfaces/progress.interface";
import { isChapterHiddenFromStudent } from "@/src/lib/student-chapter-access";
import type { Chapter } from "@/src/types";
import { useEffect, useMemo, useRef, useState } from "react";
import { getCourseById } from "@/src/services/student/course.service";
import { ICourse } from "@/src/interfaces/courses.interface";

/** How many in-progress lessons the row shows. */
const MAX_ITEMS = 10;

const durationToSeconds = (duration?: string) => {
  if (!duration) return 0;
  const parts = duration.split(":").map(Number);
  if (parts.length === 2) {
    const [minutes = 0, seconds = 0] = parts;
    return minutes * 60 + seconds;
  }
  if (parts.length === 3) {
    const [hours = 0, minutes = 0, seconds = 0] = parts;
    return hours * 3600 + minutes * 60 + seconds;
  }
  return 0;
};

const formatSeconds = (seconds = 0) => {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

/** Shown when neither the lesson nor the course has an image (inline: src/ is not scanned by Tailwind). */
const COVER_FALLBACK =
  "radial-gradient(ellipse 70% 90% at 85% 10%, #3550F0 0%, transparent 60%), radial-gradient(ellipse 55% 70% at 5% 100%, rgba(232,118,106,0.55) 0%, transparent 60%), linear-gradient(135deg, #0A1033 0%, #141C66 55%, #1F33C4 100%)";

export default function ContinueWatchingSection({
  progress,
}: {
  progress?: IUserProgress[] | null;
}) {
  const [courseById, setCourseById] = useState<Record<string, ICourse | null>>({});

  const t = useTranslations("students.home.continueWatching");
  const locale = useLocale();

  // A chapter the server marks as not published (or still scheduled) must never
  // surface in the student UI, so only lessons that are actually visible are listed
  // (newest first, as the API returns them).
  const list = useMemo(
    () =>
      (Array.isArray(progress) ? progress : [])
        .filter((entry) => {
          const chapterData = entry?.attributes?.chapter?.data;
          if (!chapterData?.attributes) return false;
          return !isChapterHiddenFromStudent(chapterData as unknown as Chapter);
        })
        .slice(0, MAX_ITEMS),
    [progress],
  );

  // One request per course (not per lesson) for the course titles / images.
  const courseIdsKey = useMemo(
    () =>
      Array.from(
        new Set(
          list
            .map((e) => e.attributes.chapter.data.attributes.course_id)
            .filter((id) => id != null)
            .map(String),
        ),
      ).join(","),
    [list],
  );

  useEffect(() => {
    if (!courseIdsKey) return;
    let cancelled = false;
    Promise.all(
      courseIdsKey.split(",").map(async (id) => {
        const res = await getCourseById(id);
        const course = (res?.data?.data ?? res?.data ?? null) as ICourse | null;
        return [id, course] as const;
      }),
    ).then((pairs) => {
      if (!cancelled) setCourseById(Object.fromEntries(pairs));
    });
    return () => {
      cancelled = true;
    };
  }, [courseIdsKey]);

  // ---- Row of several lessons: moves on its own, the card in the middle is bigger.
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  /** True for a moment while the row hops between copies, so the size change is not animated. */
  const [noAnim, setNoAnim] = useState(false);
  const pausedRef = useRef(false);
  const resumeTimerRef = useRef<number | null>(null);
  const isRow = list.length > 1;

  // Endless loop: the lessons are rendered three times in a row (A A A). The row starts on the
  // middle copy and only ever moves forward; whenever it drifts into the first or last copy it
  // jumps (instantly, invisibly) to the same card in the middle copy, so the first lesson always
  // follows the last one and there is never an empty space at either end.
  const loopCount = list.length;

  const cardNearestMiddle = (el: HTMLElement) => {
    const box = el.getBoundingClientRect();
    const mid = box.left + box.width / 2;
    let best = 0;
    let bestDist = Infinity;
    Array.from(el.children).forEach((child, i) => {
      const r = child.getBoundingClientRect();
      const d = Math.abs(r.left + r.width / 2 - mid);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    return { index: best, mid };
  };

  /** Puts card `index` in the middle of the row. */
  const centerCard = (el: HTMLElement, index: number, smooth: boolean) => {
    const card = el.children[index] as HTMLElement | undefined;
    if (!card) return;
    const box = el.getBoundingClientRect();
    const r = card.getBoundingClientRect();
    el.scrollBy({ left: r.left + r.width / 2 - (box.left + box.width / 2), behavior: smooth ? "smooth" : "instant" });
  };

  // Start on the first lesson of the middle copy.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !isRow) return;
    const frame = requestAnimationFrame(() => {
      centerCard(el, loopCount, false);
      setActiveIndex(loopCount);
    });
    return () => cancelAnimationFrame(frame);
  }, [isRow, loopCount]);

  // Track the middle card; once the row settles in an outer copy, hop back to the middle copy.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !isRow) return;
    let frame = 0;
    let settleTimer = 0;
    const measure = () => {
      frame = 0;
      setActiveIndex(cardNearestMiddle(el).index);
    };
    const settle = () => {
      const { index } = cardNearestMiddle(el);
      if (index < loopCount || index >= loopCount * 2) {
        const same = loopCount + (index % loopCount);
        setNoAnim(true);
        centerCard(el, same, false);
        setActiveIndex(same);
        requestAnimationFrame(() => requestAnimationFrame(() => setNoAnim(false)));
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(settle, 160);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
      window.clearTimeout(settleTimer);
    };
  }, [isRow, loopCount]);

  // Every 3.5s the next card comes to the middle, always in the same direction.
  // Stops while the student hovers / touches the row, and for reduced-motion users.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !isRow) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      if (pausedRef.current || document.hidden) return;
      const { index } = cardNearestMiddle(el);
      centerCard(el, index + 1, true);
    }, 3500);
    return () => window.clearInterval(id);
  }, [isRow, loopCount]);

  const pauseRow = () => {
    pausedRef.current = true;
    if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
  };
  const resumeRowSoon = (ms = 4000) => {
    if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = window.setTimeout(() => {
      pausedRef.current = false;
    }, ms);
  };
  useEffect(
    () => () => {
      if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
    },
    [],
  );

  if (!list.length) return null;

  const renderCard = (entry: IUserProgress, wide: boolean) => {
    const lastChapter = entry.attributes.chapter.data.attributes;
    const chapterProgressId = entry.attributes.chapter.data.id;
    const course = courseById[String(lastChapter.course_id)] ?? null;

    const watchedSeconds = entry.attributes?.progress_seconds ?? 0;
    const totalSeconds = durationToSeconds(lastChapter?.duration);
    const progressPercent = totalSeconds ? Math.min((watchedSeconds / totalSeconds) * 100, 100) : 0;

    const videoSrc = lastChapter.video ?? "";
    // `video_ready` covers both real HLS and the temporary original-file
    // fallback (see ChapterResource on the backend) — requiring
    // video_status === "ready" on top of it would block resuming a lesson
    // that's watchable right now via the fallback stream.
    const canContinue =
      lastChapter.watch_access_state === "available" &&
      lastChapter.video_ready &&
      Boolean(videoSrc) &&
      chapterProgressId != null;
    const watchHref = canContinue ? `/${locale}/student/courses/watch/${chapterProgressId}` : null;
    const unavailableMessage =
      lastChapter.watch_access_state === "activation_required"
        ? t("activationRequired")
        : lastChapter.watch_access_state === "view_limit_reached"
          ? t("viewLimitReached")
          : t("notPublished");
    // The lesson image (or the course image) instead of a black video frame.
    const coverSrc =
      lastChapter.thumbnail?.trim() ||
      (course?.attributes as { thumbnail?: string | null } | undefined)?.thumbnail?.trim() ||
      "";

    return (
      <div
        className={`h-full rounded-xl p-3 sm:p-4 ${wide ? "grid grid-cols-1 gap-4 lg:grid-cols-[380px_1fr] lg:items-center" : "flex flex-col gap-3"}`}
        style={{ background: "#F7F8FA" }}
      >
        <div className={`relative w-full min-w-0 overflow-hidden rounded-2xl bg-[#0A1033]`}>
          <div className="relative aspect-video w-full">
            {watchHref ? (
              coverSrc ? (
                // eslint-disable-next-line @next/next/no-img-element -- remote API URLs
                <img src={coverSrc} alt={lastChapter.title || ""} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0" style={{ background: COVER_FALLBACK }} aria-hidden />
              )
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-800 px-4 text-center text-xs font-medium text-white/80">
                <Lock className="size-6" aria-hidden />
                <span>{unavailableMessage}</span>
              </div>
            )}

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

            <div className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-md sm:bottom-3 sm:left-3 sm:px-3">
              {lastChapter.duration}
            </div>

            {watchHref ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex size-14 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/90 p-3 shadow-lg transition duration-300 active:scale-95 sm:hover:scale-105">
                  <Link href={watchHref} className="flex items-center justify-center" aria-label={t("continue")}>
                    <Play size={24} fill="currentColor" className="ms-0.5 text-[var(--primary)] rtl:ms-0 rtl:me-0.5" />
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className={`flex w-full min-w-0 flex-col justify-center gap-1`}>
          <p className="truncate text-sm font-medium text-[var(--text-muted)]">{course?.attributes.title}</p>

          <h3 className={`font-bold leading-snug text-[var(--text-dark)] ${wide ? "text-base sm:text-lg" : "line-clamp-1 text-base"}`}>
            {lastChapter.title}
          </h3>

          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>{formatSeconds(watchedSeconds)}</span>
              <span>{lastChapter?.duration || "0:00"}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
              <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          {watchHref ? (
            <Link
              href={watchHref}
              className={`mt-3 inline-flex h-11 min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-sm font-medium text-white transition hover:opacity-90 ${wide ? "sm:w-auto" : ""}`}
            >
              <Play size={15} />
              {t("continue")}
            </Link>
          ) : (
            <span
              className={`mt-3 inline-flex h-11 min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-slate-100 px-4 text-sm font-medium text-slate-600 ${wide ? "sm:w-auto" : ""}`}
            >
              <Lock size={15} />
              {unavailableMessage}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <section className="rounded-2xl border border-[var(--border-color)] bg-white px-4 py-4 shadow-sm sm:px-6 sm:py-4">
      <h2 className="mb-4 text-lg font-bold text-[var(--text-dark)]">{t("title")}</h2>

      {list.length === 1 ? (
        renderCard(list[0], true)
      ) : (
        // Several lessons: an endless row that moves on its own in one direction (swipe on phones), no visible bar.
        // The card in the middle grows; the others go back to normal size.
        <div
          ref={scrollerRef}
          className="flex gap-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
            paddingTop: 14,
            paddingBottom: 18,
          }}
          onMouseEnter={pauseRow}
          onMouseLeave={() => resumeRowSoon(1500)}
          onTouchStart={pauseRow}
          onTouchEnd={() => resumeRowSoon()}
          onFocusCapture={pauseRow}
          onBlurCapture={() => resumeRowSoon()}
        >
          {[0, 1, 2].flatMap((copy) => list.map((entry, j) => ({ copy, entry, i: copy * loopCount + j }))).map(({ copy, entry, i }) => {
            const active = i === activeIndex;
            return (
              <div
                key={`${copy}-${entry.id ?? entry.attributes.chapter.data.id}`}
                className="shrink-0"
                style={{
                  width: "min(78vw, 300px)",
                  scrollSnapAlign: "center",
                  transform: active ? "scale(1.06)" : "scale(0.92)",
                  opacity: active ? 1 : 0.75,
                  transition: noAnim ? "none" : "transform 450ms cubic-bezier(.2,.8,.2,1), opacity 450ms ease, box-shadow 450ms ease",
                  borderRadius: 12,
                  boxShadow: active ? "0 18px 36px -20px rgba(45,70,232,0.55)" : "none",
                  position: "relative",
                  zIndex: active ? 1 : 0,
                }}
              >
                {renderCard(entry, false)}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
