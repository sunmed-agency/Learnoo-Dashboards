import assert from 'node:assert/strict';
import test from 'node:test';

import { appleAppSiteAssociation, assetLinks } from './app-site-association.ts';

test('Android App Links trust the Play signing key and the upload / Huawei key for the Learnoo package', () => {
  assert.equal(assetLinks.length, 1);
  const [link] = assetLinks;
  assert.deepEqual(link.relation, ['delegate_permission/common.handle_all_urls']);
  assert.equal(link.target.package_name, 'com.sunmed.learnoo');
  assert.deepEqual(link.target.sha256_cert_fingerprints.map((f) => f.slice(0, 8)), ['D6:C5:18', 'C5:12:9A']);
  for (const fingerprint of link.target.sha256_cert_fingerprints) assert.match(fingerprint, /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/);
});

test('iOS Universal Links name the App Store app and only the exam and live session pages', () => {
  const [detail] = appleAppSiteAssociation.applinks.details;
  assert.deepEqual(detail.appIDs, ['4KDNUK93M8.app.learnoo']);
  assert.deepEqual(detail.components, [
    { '/': '/*/student/exams/start-exam/*' },
    { '/': '/*/student/live-sessions/*' },
  ]);
});
