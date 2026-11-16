'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import toast, { Toaster } from 'react-hot-toast';
import SettingsPageHeader from '@/components/settings/SettingsPageHeader';
import SettingsSection from '@/components/settings/SettingsSection';
import { useAppUpdateSettings, useSaveAppUpdateSettings } from '@/src/hooks';
import { getApiErrorMessage } from '@/src/lib/api';
import {
  APP_UPDATE_PLATFORMS,
  appUpdateSettingsErrors,
  appUpdateSettingsPayload,
  type AppUpdatePlatform,
  type AppUpdateSettings,
} from '@/src/lib/app-update-settings';

const inputClass = 'w-full px-4 py-2.5 bg-white border rounded-xl text-[14px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2137D6]/20 focus:border-[#2137D6] transition-all hover:border-[#D1D5DB]';

export default function AppUpdateSettingsPage() {
  const t = useTranslations('appUpdateSettings');
  const { data: saved, isLoading } = useAppUpdateSettings();
  const save = useSaveAppUpdateSettings();
  // Unsaved edits; until the first edit the form shows what the server has.
  const [draft, setDraft] = useState<AppUpdateSettings | null>(null);
  const [invalid, setInvalid] = useState<string[]>([]);
  const form = draft ?? saved ?? null;

  const setPlatform = (platform: AppUpdatePlatform, field: 'min_version' | 'store_url', value: string) => {
    if (!form) return;
    setDraft({ ...form, platforms: { ...form.platforms, [platform]: { ...form.platforms[platform], [field]: value } } });
    setInvalid((prev) => prev.filter((key) => key !== `${platform}.${field}`));
  };

  const handleSave = async () => {
    if (!form) return;
    const errors = appUpdateSettingsErrors(form);
    setInvalid(errors);
    if (errors.length > 0) {
      toast.error(t('invalid'));
      return;
    }
    try {
      await save.mutateAsync(appUpdateSettingsPayload(form));
      setDraft(null);
      toast.success(t('saved'));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('saveFailed')));
    }
  };

  const handleCancel = () => {
    setDraft(null);
    setInvalid([]);
  };

  return (
    <div className="flex flex-col h-full">
      <Toaster position="top-right" />
      <SettingsPageHeader title={t('title')} description={t('description')} />

      {isLoading || !form ? (
        <SettingsSection>
          <div className="space-y-6 animate-pulse">
            {[0, 1, 2].map((i) => <div key={i} className="h-10 w-full bg-gray-200 rounded-xl" />)}
          </div>
        </SettingsSection>
      ) : (
        <>
          <SettingsSection title={t('enabledTitle')}>
            <div className="flex items-start gap-4">
              <button
                type="button"
                role="switch"
                aria-checked={form.enabled}
                aria-labelledby="app-update-enabled-label"
                onClick={() => setDraft({ ...form, enabled: !form.enabled })}
                className={`relative inline-flex h-[24px] w-[44px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2137D6]/40 ${form.enabled ? 'bg-[#2137D6]' : 'bg-[#E5E7EB]'}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${form.enabled ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'}`} />
              </button>
              <div>
                <p id="app-update-enabled-label" className="text-[14px] font-medium text-[#111827]">{t('enabledLabel')}</p>
                <p className="text-[13px] text-[#6B7280] mt-1">{t('enabledDescription')}</p>
              </div>
            </div>
          </SettingsSection>

          {APP_UPDATE_PLATFORMS.map((platform) => {
            const versionId = `app-update-${platform}-version`;
            const urlId = `app-update-${platform}-url`;
            const versionInvalid = invalid.includes(`${platform}.min_version`);
            const urlInvalid = invalid.includes(`${platform}.store_url`);
            return (
              <SettingsSection key={platform} title={t(`platforms.${platform}`)}>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-1.5">
                    <label htmlFor={versionId} className="text-[13px] font-medium text-[#4B5563]">{t('minVersion')}</label>
                    <input
                      id={versionId}
                      type="text"
                      dir="ltr"
                      inputMode="decimal"
                      placeholder="1.0.3+12"
                      value={form.platforms[platform].min_version ?? ''}
                      onChange={(e) => setPlatform(platform, 'min_version', e.target.value)}
                      aria-invalid={versionInvalid}
                      aria-describedby={`${versionId}-help`}
                      className={`${inputClass} ${versionInvalid ? 'border-red-500' : 'border-[#EEEEEE]'}`}
                    />
                    <p id={`${versionId}-help`} className={`text-sm ${versionInvalid ? 'text-red-600' : 'text-gray-500'}`}>
                      {versionInvalid ? t('minVersionInvalid') : t('minVersionHelp')}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    <label htmlFor={urlId} className="text-[13px] font-medium text-[#4B5563]">{t('storeUrl')}</label>
                    <input
                      id={urlId}
                      type="url"
                      dir="ltr"
                      value={form.platforms[platform].store_url}
                      onChange={(e) => setPlatform(platform, 'store_url', e.target.value)}
                      aria-invalid={urlInvalid}
                      aria-describedby={urlInvalid ? `${urlId}-error` : undefined}
                      className={`${inputClass} ${urlInvalid ? 'border-red-500' : 'border-[#EEEEEE]'}`}
                    />
                    {urlInvalid && <p id={`${urlId}-error`} className="text-sm text-red-600">{t('storeUrlInvalid')}</p>}
                  </div>
                </div>
              </SettingsSection>
            );
          })}
        </>
      )}

      <div className="flex justify-end gap-4 mt-2 pb-8">
        <button
          onClick={handleCancel}
          disabled={isLoading || save.isPending}
          className="px-5 py-2.5 text-[14px] font-semibold text-[#4B5563] bg-white border border-[#EEEEEE] hover:bg-[#F9FAFB] rounded-xl transition-colors hover:border-[#D1D5DB] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('cancel')}
        </button>
        <button
          onClick={handleSave}
          disabled={isLoading || !form || save.isPending}
          className="px-5 py-2.5 text-[14px] font-semibold text-white bg-[#2137D6] hover:bg-[#1C2EB8] rounded-xl transition-colors shadow-md shadow-[#2137D6]/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {save.isPending ? t('saving') : t('save')}
        </button>
      </div>
    </div>
  );
}
