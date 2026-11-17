/**
 * Lets the Learnoo app open the student exam and live session links
 * (`share-links.ts`) instead of the browser.
 *
 * Android (App Links): the app's package and the SHA-256 of every key its
 * store builds are signed with — Google Play app signing and the upload key
 * that also signs the Huawei AppGallery build.
 * iOS (Universal Links): Team ID + bundle id, and the paths the app opens.
 */

export const ANDROID_PACKAGE = 'com.sunmed.learnoo';

export const ANDROID_SHA256_FINGERPRINTS = [
  // Google Play app signing key
  'D6:C5:18:B8:09:A9:9C:EA:CC:00:F4:2E:5F:13:A4:E6:48:08:65:16:91:B0:30:2B:77:E5:11:8C:4A:07:09:97',
  // Upload key, also the Huawei AppGallery signing key
  'C5:12:9A:8D:4F:BA:E3:9C:A7:69:5D:9C:1F:91:FE:E5:B4:46:72:05:4A:79:EF:4D:B6:43:A7:D3:16:72:B0:D6',
];

export const IOS_APP_ID = '4KDNUK93M8.app.learnoo';

/** Website paths the app opens; `*` is the locale, then the id. */
export const APP_LINK_PATHS = ['/*/student/exams/start-exam/*', '/*/student/live-sessions/*'];

export const assetLinks = [
  {
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: ANDROID_PACKAGE,
      sha256_cert_fingerprints: ANDROID_SHA256_FINGERPRINTS,
    },
  },
];

export const appleAppSiteAssociation = {
  applinks: {
    details: [
      {
        appIDs: [IOS_APP_ID],
        components: APP_LINK_PATHS.map((path) => ({ '/': path })),
      },
    ],
  },
};
