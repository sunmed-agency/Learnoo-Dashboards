'use client';

import type { RefObject } from 'react';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/src/lib/api';

export type UseChapterViewRecordingArgs = {
  chapterId: number;
  videoRef: RefObject<HTMLVideoElement | null>;
  videoSrc: string;
  /** Kept for the callers; the server now decides when a view counts (chapter `view_by_minute`). */
  viewByMinute?: number;
  /** When false, listeners are not attached (e.g. access denied or no video). */
  enabled: boolean;
  /** Called when the server refuses the watching (e.g. the views are used up for a new opening). */
  onViewRecordError: (message: string) => void;
};

/** How often the played seconds are sent. */
export const HEARTBEAT_MS = 15_000;
/** A jump in the video bigger than this between two time updates is a seek, not watching (2x speed ≈ 0.5 s). */
export const MAX_PLAY_STEP_SECONDS = 4;

/** Seconds of video played between two time updates: 0 for a seek, a pause or going back. */
export function playedStep(previous: number | null, current: number): number {
  if (previous === null) return 0;
  const delta = current - previous;
  return delta > 0 && delta <= MAX_PLAY_STEP_SECONDS ? delta : 0;
}

function newSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Watch-time heartbeats (POST /v1/chapter/:id/watch). Every opening of the lesson is one session.
 * The player adds up the seconds of VIDEO actually played (seeks skipped, so playback speed
 * changes nothing) and sends them, with the position, every 15 s and on pause, end, hide and
 * close. The server keeps the balance across openings and counts the view when it reaches the
 * lesson's minutes; the session that used it plays on to the end.
 */
export function useChapterViewRecording({
  chapterId,
  videoRef,
  videoSrc,
  enabled,
  onViewRecordError,
}: UseChapterViewRecordingArgs) {
  const router = useRouter();
  const onErrorRef = useRef(onViewRecordError);
  onErrorRef.current = onViewRecordError;

  useEffect(() => {
    if (!enabled || !videoSrc || !Number.isFinite(chapterId)) return;

    const sessionId = newSessionId();
    let pending = 0;
    let lastTime: number | null = null;
    let inFlight = false;
    let stopped = false;
    let cancelled = false;
    let detach: (() => void) | undefined;

    const raf = window.requestAnimationFrame(() => {
      if (cancelled) return;
      const el = videoRef.current;

      const send = async (keepalive = false) => {
        if (stopped || (inFlight && !keepalive)) return;
        // Without a <video> (embedded player) the visible time stands in for the played time.
        const watched = el ? Math.floor(pending) : HEARTBEAT_MS / 1000;
        if (el && watched < 1) return;
        if (el) pending -= watched;
        const position = Math.max(0, Math.floor(el?.currentTime ?? 0));
        inFlight = true;
        try {
          const result = await api.chapters.watchHeartbeat(chapterId, { session_id: sessionId, watched, position }, keepalive);
          if (result?.counted && !keepalive) router.refresh();
        } catch (err) {
          if (err instanceof ApiError && err.status === 403) {
            // A new opening after the views were used up (or access lost): stop playing.
            stopped = true;
            el?.pause();
            onErrorRef.current(err.message || 'You cannot watch this lesson.');
          } else if (el) {
            // Network or server trouble: keep the seconds for the next heartbeat.
            pending += watched;
          }
        } finally {
          inFlight = false;
        }
      };

      const onTimeUpdate = () => {
        if (!el) return;
        const now = el.currentTime;
        if (!el.paused && !el.seeking) pending += playedStep(lastTime, now);
        lastTime = now;
      };
      const resetClock = () => { lastTime = el ? el.currentTime : null; };
      const onPauseOrEnd = () => { void send(); };
      const onHide = () => { if (document.visibilityState === 'hidden') void send(true); };
      const onPageHide = () => { void send(true); };

      if (el) {
        el.addEventListener('timeupdate', onTimeUpdate);
        el.addEventListener('seeking', resetClock);
        el.addEventListener('playing', resetClock);
        el.addEventListener('pause', onPauseOrEnd);
        el.addEventListener('ended', onPauseOrEnd);
      }
      document.addEventListener('visibilitychange', onHide);
      window.addEventListener('pagehide', onPageHide);
      const interval = window.setInterval(() => {
        if (!el && document.visibilityState !== 'visible') return;
        void send();
      }, HEARTBEAT_MS);

      detach = () => {
        window.clearInterval(interval);
        if (el) {
          el.removeEventListener('timeupdate', onTimeUpdate);
          el.removeEventListener('seeking', resetClock);
          el.removeEventListener('playing', resetClock);
          el.removeEventListener('pause', onPauseOrEnd);
          el.removeEventListener('ended', onPauseOrEnd);
        }
        document.removeEventListener('visibilitychange', onHide);
        window.removeEventListener('pagehide', onPageHide);
        // Leaving the lesson inside the site: send what is left.
        if (el) void send(true);
      };
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
      detach?.();
    };
  }, [chapterId, enabled, router, videoRef, videoSrc]);
}
