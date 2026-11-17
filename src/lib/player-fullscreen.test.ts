import assert from 'node:assert/strict';
import test, { mock } from 'node:test';

import {
  choosePlayerFullscreenMode,
  currentFullscreenElement,
  elementFullscreenRequest,
  isNativeVideoPresentation,
  leaveNativeVideoPresentation,
  requestElementFullscreenWithFallback,
} from './player-fullscreen.ts';

const fn = () => undefined;

test('desktop and Android: the player shell itself goes fullscreen', () => {
  assert.equal(choosePlayerFullscreenMode({ requestFullscreen: fn }, { fullscreenEnabled: true }), 'element');
  assert.equal(choosePlayerFullscreenMode({ requestFullscreen: fn }, {}), 'element');
});

test('iPad / older Safari: the prefixed shell request is used', () => {
  assert.equal(
    choosePlayerFullscreenMode({ webkitRequestFullscreen: fn }, { webkitFullscreenEnabled: true }),
    'element',
  );
});

test('iPhone Safari: no element fullscreen, so the in-page mode is used (never the native video player)', () => {
  // What iOS 26 Safari on iPhone exposes: no request on a <div>, no fullscreenEnabled.
  assert.equal(choosePlayerFullscreenMode({}, {}), 'in-page');
  assert.equal(choosePlayerFullscreenMode(null, {}), 'in-page');
});

test('a document that reports fullscreen disabled (e.g. iframe without allowfullscreen) uses the in-page mode', () => {
  assert.equal(choosePlayerFullscreenMode({ requestFullscreen: fn }, { fullscreenEnabled: false }), 'in-page');
  assert.equal(
    choosePlayerFullscreenMode({ webkitRequestFullscreen: fn }, { webkitFullscreenEnabled: false }),
    'in-page',
  );
});

test('the shell request is called on the shell', () => {
  const shell = {
    requestFullscreen(this: unknown) {
      return this === shell ? 'called on shell' : 'called on something else';
    },
  };
  const req = elementFullscreenRequest(shell);
  assert.ok(req);
  assert.equal(req(), 'called on shell');
  assert.equal(elementFullscreenRequest({}), null);
});

test('reads the fullscreen element from any prefix', () => {
  const el = {};
  assert.equal(currentFullscreenElement({ fullscreenElement: el }), el);
  assert.equal(currentFullscreenElement({ webkitFullscreenElement: el }), el);
  assert.equal(currentFullscreenElement({}), null);
});

test('native player and picture-in-picture count as a watermark-free presentation', () => {
  assert.equal(isNativeVideoPresentation({ webkitDisplayingFullscreen: true }), true);
  assert.equal(isNativeVideoPresentation({ webkitPresentationMode: 'fullscreen' }), true);
  assert.equal(isNativeVideoPresentation({ webkitPresentationMode: 'picture-in-picture' }), true);
  assert.equal(isNativeVideoPresentation({ webkitPresentationMode: 'inline' }), false);
  assert.equal(isNativeVideoPresentation({}), false);
});

test('leaving the native player puts the video back inline', () => {
  const calls: string[] = [];
  const video = {
    webkitPresentationMode: 'fullscreen',
    webkitSetPresentationMode(mode: string) {
      calls.push(mode);
      this.webkitPresentationMode = mode;
    },
  };
  assert.equal(leaveNativeVideoPresentation(video), true);
  assert.deepEqual(calls, ['inline']);
  assert.equal(leaveNativeVideoPresentation(video), false);
});

test('falls back to webkitExitFullscreen when presentation modes are missing', () => {
  let exited = 0;
  const video = {
    webkitDisplayingFullscreen: true,
    webkitExitFullscreen() {
      exited += 1;
    },
  };
  assert.equal(leaveNativeVideoPresentation(video), true);
  assert.equal(exited, 1);
  assert.equal(leaveNativeVideoPresentation({ webkitPresentationMode: 'inline' }), false);
});

function recorder(isFs: () => boolean = () => false) {
  const calls: string[] = [];
  return {
    calls,
    handlers: {
      enterInPage: () => calls.push('in-page'),
      leaveInPage: () => calls.push('leave-in-page'),
      onEntered: () => calls.push('entered'),
      isElementFullscreen: isFs,
    },
  };
}

const flush = () => new Promise<void>((r) => setImmediate(r));

test('fallback: a granted request enters element fullscreen only', async () => {
  const r = recorder();
  requestElementFullscreenWithFallback(() => Promise.resolve(), r.handlers, 50);
  await flush();
  assert.deepEqual(r.calls, ['entered']);
});

test('fallback: a refused request uses the in-page mode', async () => {
  const r = recorder();
  requestElementFullscreenWithFallback(() => Promise.reject(new TypeError('Permissions check failed')), r.handlers, 50);
  await flush();
  assert.deepEqual(r.calls, ['in-page']);
});

test('fallback: a request that throws uses the in-page mode at once', () => {
  const r = recorder();
  requestElementFullscreenWithFallback(() => {
    throw new Error('not allowed');
  }, r.handlers, 50);
  assert.deepEqual(r.calls, ['in-page']);
});

test('fallback: a request that never answers (in-app web view) uses the in-page mode after the timeout', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const r = recorder();
    requestElementFullscreenWithFallback(() => new Promise<void>(() => {}), r.handlers, 1500);
    mock.timers.tick(1499);
    assert.deepEqual(r.calls, []);
    mock.timers.tick(1);
    assert.deepEqual(r.calls, ['in-page']);
  } finally {
    mock.timers.reset();
  }
});

test('fallback: a prefixed request with no promise counts once the shell is fullscreen', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    let fs = false;
    const r = recorder(() => fs);
    requestElementFullscreenWithFallback(() => {
      fs = true;
      return undefined;
    }, r.handlers, 1500);
    mock.timers.tick(1500);
    assert.deepEqual(r.calls, []);
  } finally {
    mock.timers.reset();
  }
});

test('fallback: a late grant after the in-page fallback leaves the in-page mode (never both)', async () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  let grant: () => void = () => {};
  let fs = false;
  const r = recorder(() => fs);
  try {
    requestElementFullscreenWithFallback(
      () =>
        new Promise<void>((resolve) => {
          grant = () => {
            fs = true;
            resolve();
          };
        }),
      r.handlers,
      1500,
    );
    mock.timers.tick(1500);
  } finally {
    mock.timers.reset();
  }
  grant();
  await flush();
  assert.deepEqual(r.calls, ['in-page', 'leave-in-page']);
});
