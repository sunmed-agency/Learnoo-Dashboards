/** Forced app update settings, served by `GET /v1/app-update` and saved by `PUT /v1/app-update`. */

export const APP_UPDATE_PLATFORMS = ['android', 'huawei', 'ios'] as const;
export type AppUpdatePlatform = (typeof APP_UPDATE_PLATFORMS)[number];

export interface AppUpdatePlatformSettings {
  min_version: string | null;
  store_url: string;
}

export interface AppUpdateSettings {
  enabled: boolean;
  platforms: Record<AppUpdatePlatform, AppUpdatePlatformSettings>;
}

/** Same rule as the backend: `1.0.3`, `1.0.10` or `1.0.3+12` (version, optional build number). */
const VERSION_PATTERN = /^\d{1,5}(\.\d{1,5}){0,3}(\+\d{1,9})?$/;

export function isValidAppVersion(value: string): boolean {
  const trimmed = value.trim();
  return trimmed === '' || VERSION_PATTERN.test(trimmed);
}

export function isValidStoreUrl(value: string): boolean {
  try {
    return new URL(value.trim()).protocol === 'https:';
  } catch {
    return false;
  }
}

/** Fields with a problem, as `platform.field`, so the form can mark them. */
export function appUpdateSettingsErrors(settings: AppUpdateSettings): string[] {
  return APP_UPDATE_PLATFORMS.flatMap((platform) => {
    const { min_version, store_url } = settings.platforms[platform];
    return [
      ...(isValidAppVersion(min_version ?? '') ? [] : [`${platform}.min_version`]),
      ...(isValidStoreUrl(store_url) ? [] : [`${platform}.store_url`]),
    ];
  });
}

/** The request body: trimmed, an empty minimum sent as null (no minimum for that store). */
export function appUpdateSettingsPayload(settings: AppUpdateSettings): AppUpdateSettings {
  const platforms = Object.fromEntries(APP_UPDATE_PLATFORMS.map((platform) => {
    const minVersion = (settings.platforms[platform].min_version ?? '').trim();
    return [platform, { min_version: minVersion === '' ? null : minVersion, store_url: settings.platforms[platform].store_url.trim() }];
  })) as AppUpdateSettings['platforms'];

  return { enabled: settings.enabled, platforms };
}
