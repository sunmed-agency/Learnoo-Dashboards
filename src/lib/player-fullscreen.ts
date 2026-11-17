/**
 * Fullscreen rules for the protected student video player.
 *
 * The watermark is an HTML layer drawn over the <video>. It is only visible
 * when the element that goes fullscreen *contains* that layer:
 *
 * - `element`: the browser can put the player shell (video + watermark +
 *   controls) in real fullscreen (desktop, Android Chrome, iPad).
 * - `in-page`: the browser cannot (iPhone Safari has no element fullscreen,
 *   only `video.webkitEnterFullscreen()`). The shell then covers the whole
 *   viewport inside the page instead.
 *
 * There is deliberately no "video" mode: fullscreen on the <video> itself
 * (and the iPhone native player, and picture-in-picture) shows the video
 * without the watermark, so the player never asks for it and leaves it at
 * once if the browser enters it some other way (gesture, native button).
 */

export type PlayerFullscreenMode = 'element' | 'in-page';

type FullscreenCapableElement = {
  requestFullscreen?: unknown;
  webkitRequestFullscreen?: unknown;
  mozRequestFullScreen?: unknown;
  msRequestFullscreen?: unknown;
};

type FullscreenCapableDocument = {
  fullscreenEnabled?: boolean;
  webkitFullscreenEnabled?: boolean;
  fullscreenElement?: unknown;
  webkitFullscreenElement?: unknown;
  mozFullScreenElement?: unknown;
  msFullscreenElement?: unknown;
};

export type NativeVideoPresentation = {
  webkitDisplayingFullscreen?: boolean;
  webkitExitFullscreen?: () => void;
  webkitPresentationMode?: string;
  webkitSetPresentationMode?: (mode: string) => void;
};

/** The element's own fullscreen request, bound to it, or null when it has none. */
export function elementFullscreenRequest(
  element: FullscreenCapableElement | null | undefined,
): (() => unknown) | null {
  if (!element) return null;
  const candidates = [
    element.requestFullscreen,
    element.webkitRequestFullscreen,
    element.mozRequestFullScreen,
    element.msRequestFullscreen,
  ];
  for (const fn of candidates) {
    if (typeof fn === 'function') {
      return () => (fn as (this: unknown) => unknown).call(element);
    }
  }
  return null;
}

/**
 * Element fullscreen only when the shell can request it and the document does
 * not say fullscreen is disabled; everything else uses the in-page mode.
 */
export function choosePlayerFullscreenMode(
  shell: FullscreenCapableElement | null | undefined,
  doc: FullscreenCapableDocument | null | undefined,
): PlayerFullscreenMode {
  if (!elementFullscreenRequest(shell)) return 'in-page';
  const enabled = doc?.fullscreenEnabled ?? doc?.webkitFullscreenEnabled;
  if (enabled === false) return 'in-page';
  return 'element';
}

/** How long a fullscreen request may stay unanswered before the in-page mode is used. */
export const ELEMENT_FULLSCREEN_TIMEOUT_MS = 1500;

/**
 * Ask for element fullscreen, falling back to the in-page mode when the
 * request throws, rejects, or never answers (some in-app web views leave the
 * promise pending and show nothing). If a late answer does put the shell in
 * fullscreen, the in-page mode is left again so only one is active.
 */
export function requestElementFullscreenWithFallback(
  request: () => unknown,
  handlers: {
    enterInPage: () => void;
    leaveInPage: () => void;
    onEntered?: () => void;
    isElementFullscreen: () => boolean;
  },
  timeoutMs: number = ELEMENT_FULLSCREEN_TIMEOUT_MS,
): void {
  let settled = false;
  let fellBack = false;
  const fallBack = () => {
    if (settled || fellBack) return;
    fellBack = true;
    handlers.enterInPage();
  };

  let result: unknown;
  try {
    result = request();
  } catch {
    fallBack();
    return;
  }

  const timer = setTimeout(() => {
    if (!handlers.isElementFullscreen()) fallBack();
  }, timeoutMs);

  if (result != null && typeof (result as Promise<void>).then === 'function') {
    (result as Promise<void>).then(
      () => {
        clearTimeout(timer);
        if (fellBack) {
          if (handlers.isElementFullscreen()) handlers.leaveInPage();
          return;
        }
        settled = true;
        handlers.onEntered?.();
      },
      () => {
        clearTimeout(timer);
        fallBack();
      },
    );
  }
}

/** The element the document currently shows fullscreen, if any. */
export function currentFullscreenElement(doc: FullscreenCapableDocument | null | undefined): unknown {
  if (!doc) return null;
  return (
    doc.fullscreenElement ??
    doc.webkitFullscreenElement ??
    doc.mozFullScreenElement ??
    doc.msFullscreenElement ??
    null
  );
}

/** True while the video is shown by the iPhone native player or picture-in-picture. */
export function isNativeVideoPresentation(video: NativeVideoPresentation | null | undefined): boolean {
  if (!video) return false;
  if (video.webkitDisplayingFullscreen) return true;
  const mode = video.webkitPresentationMode;
  return typeof mode === 'string' && mode !== 'inline';
}

/**
 * Bring the video back inline from the native player / picture-in-picture.
 * Returns true when it had to leave one of them.
 */
export function leaveNativeVideoPresentation(video: NativeVideoPresentation | null | undefined): boolean {
  if (!video || !isNativeVideoPresentation(video)) return false;
  try {
    if (typeof video.webkitSetPresentationMode === 'function') {
      video.webkitSetPresentationMode('inline');
    } else if (typeof video.webkitExitFullscreen === 'function') {
      video.webkitExitFullscreen();
    }
  } catch {
    try {
      video.webkitExitFullscreen?.();
    } catch {
      /* ignore */
    }
  }
  return true;
}
