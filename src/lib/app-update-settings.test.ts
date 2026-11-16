import assert from 'node:assert/strict';
import test from 'node:test';
import { appUpdateSettingsErrors, appUpdateSettingsPayload, isValidAppVersion, isValidStoreUrl, type AppUpdateSettings } from './app-update-settings.ts';

const settings = (): AppUpdateSettings => ({
  enabled: true,
  platforms: {
    android: { min_version: ' 1.0.3+12 ', store_url: 'https://play.google.com/store/apps/details?id=com.sunmed.learnoo' },
    huawei: { min_version: '', store_url: ' https://appgallery.huawei.com/app/C119233749 ' },
    ios: { min_version: '1.0.10', store_url: 'https://apps.apple.com/app/id6825859916' },
  },
});

test('versions accepted like the backend: name with an optional build number, or empty', () => {
  for (const ok of ['1', '1.0', '1.0.3', '1.0.10', '1.0.3+12', '', '  ']) assert.equal(isValidAppVersion(ok), true, ok);
  for (const bad of ['v1.0.3', '1.0.3+', '+12', '1..0', '1.0.3+12+1', '1.0 .3', 'latest']) assert.equal(isValidAppVersion(bad), false, bad);
});

test('store links must be https', () => {
  assert.equal(isValidStoreUrl('https://apps.apple.com/app/id6825859916'), true);
  assert.equal(isValidStoreUrl('http://play.google.com/store/apps/details?id=com.sunmed.learnoo'), false);
  assert.equal(isValidStoreUrl('App Store'), false);
});

test('the payload is trimmed and an empty minimum means no minimum', () => {
  assert.deepEqual(appUpdateSettingsPayload(settings()), {
    enabled: true,
    platforms: {
      android: { min_version: '1.0.3+12', store_url: 'https://play.google.com/store/apps/details?id=com.sunmed.learnoo' },
      huawei: { min_version: null, store_url: 'https://appgallery.huawei.com/app/C119233749' },
      ios: { min_version: '1.0.10', store_url: 'https://apps.apple.com/app/id6825859916' },
    },
  });
});

test('the form marks each bad field', () => {
  const bad = settings();
  bad.platforms.ios.min_version = 'v2';
  bad.platforms.huawei.store_url = 'appgallery';
  assert.deepEqual(appUpdateSettingsErrors(settings()), []);
  assert.deepEqual(appUpdateSettingsErrors(bad), ['huawei.store_url', 'ios.min_version']);
});
