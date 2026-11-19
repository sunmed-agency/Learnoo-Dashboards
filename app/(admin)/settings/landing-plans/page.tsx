'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import toast, { Toaster } from 'react-hot-toast';
import { ArrowDown, ArrowUp, ExternalLink, Plus, RotateCcw, Star, Trash2 } from 'lucide-react';
import SettingsPageHeader from '@/components/settings/SettingsPageHeader';
import SettingsSection from '@/components/settings/SettingsSection';
import { useLandingPlans, useSaveLandingPlans } from '@/src/hooks';
import { getApiErrorMessage } from '@/src/lib/api';
import {
  DEFAULT_LANDING_PLANS,
  MAX_LANDING_PLANS,
  emptyLandingPlan,
  landingPlansErrors,
  landingPlansPayload,
  type LandingPlan,
  type LandingPlans,
} from '@/src/lib/landing-plans';

const inputClass = 'w-full px-4 py-2.5 bg-white border rounded-xl text-[14px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2137D6]/20 focus:border-[#2137D6] transition-all hover:border-[#D1D5DB]';
const labelClass = 'text-[13px] font-medium text-[#4B5563]';
const iconButton = 'p-2 rounded-lg text-[#6B7280] hover:bg-[#F4F5FD] hover:text-[#2137D6] disabled:opacity-30 disabled:cursor-not-allowed transition-colors';

type Lang = 'ar' | 'en';

export default function LandingPlansSettingsPage() {
  const t = useTranslations('landingPlansSettings');
  const { data: saved, isLoading, isError, refetch } = useLandingPlans();
  const save = useSaveLandingPlans();
  // Unsaved edits; until the first edit the form shows what the server has.
  const [draft, setDraft] = useState<LandingPlans | null>(null);
  const [invalid, setInvalid] = useState<string[]>([]);
  const form = draft ?? saved ?? null;

  const clearError = (key: string) => setInvalid((prev) => prev.filter((k) => k !== key));
  const field = (key: string) => (invalid.includes(key) ? 'border-red-500' : 'border-[#EEEEEE]');

  const updatePlan = (index: number, change: Partial<LandingPlan>, errorKey?: string) => {
    if (!form) return;
    setDraft({ ...form, plans: form.plans.map((plan, i) => (i === index ? { ...plan, ...change } : plan)) });
    if (errorKey) clearError(errorKey);
  };

  const setText = (index: number, key: 'name' | 'description' | 'badge', lang: Lang, value: string) => {
    if (!form) return;
    updatePlan(index, { [key]: { ...form.plans[index][key], [lang]: value } }, `plans.${index}.${key}.${lang}`);
  };

  const setFeatures = (index: number, lang: Lang, value: string) => {
    if (!form) return;
    updatePlan(index, { features: { ...form.plans[index].features, [lang]: value.split('\n') } }, `plans.${index}.features.${lang}`);
  };

  const movePlan = (index: number, offset: -1 | 1) => {
    if (!form) return;
    const plans = [...form.plans];
    [plans[index], plans[index + offset]] = [plans[index + offset], plans[index]];
    setDraft({ ...form, plans });
    setInvalid([]);
  };

  const removePlan = (index: number) => {
    if (!form) return;
    setDraft({ ...form, plans: form.plans.filter((_, i) => i !== index) });
    setInvalid([]);
  };

  const handleSave = async () => {
    if (!form) return;
    const errors = landingPlansErrors(form);
    setInvalid(errors);
    if (errors.length > 0) {
      toast.error(t('invalid'));
      return;
    }
    try {
      await save.mutateAsync(landingPlansPayload(form));
      setDraft(null);
      toast.success(t('saved'));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('saveFailed')));
    }
  };

  const errorText = (key: string, message: string) =>
    invalid.includes(key) ? <p className="text-sm text-red-600">{message}</p> : null;

  return (
    <div className="flex flex-col h-full">
      <Toaster position="top-right" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SettingsPageHeader title={t('title')} description={t('description')} />
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-[14px] font-semibold text-[#2137D6] bg-[#2137D6]/5 hover:bg-[#2137D6]/10 rounded-xl transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          {t('preview')}
        </a>
      </div>

      {isError && !form ? (
        <SettingsSection>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-[14px] text-red-600">{t('loadFailed')}</p>
            <button type="button" onClick={() => refetch()} className="px-4 py-2 text-[14px] font-semibold text-[#2137D6] bg-[#2137D6]/5 hover:bg-[#2137D6]/10 rounded-xl transition-colors">{t('retry')}</button>
          </div>
        </SettingsSection>
      ) : isLoading || !form ? (
        <SettingsSection>
          <div className="space-y-6 animate-pulse">
            {[0, 1, 2].map((i) => <div key={i} className="h-10 w-full bg-gray-200 rounded-xl" />)}
          </div>
        </SettingsSection>
      ) : (
        <>
          <SettingsSection title={t('contactTitle')}>
            <div className="grid grid-cols-1 gap-1.5">
              <label htmlFor="landing-contact-url" className={labelClass}>{t('contactUrl')}</label>
              <input
                id="landing-contact-url"
                type="url"
                dir="ltr"
                placeholder="https://wa.me/20…"
                value={form.contact_url ?? ''}
                onChange={(e) => { setDraft({ ...form, contact_url: e.target.value }); clearError('contact_url'); }}
                aria-invalid={invalid.includes('contact_url')}
                className={`${inputClass} ${field('contact_url')}`}
              />
              <p className={`text-sm ${invalid.includes('contact_url') ? 'text-red-600' : 'text-gray-500'}`}>
                {invalid.includes('contact_url') ? t('contactUrlInvalid') : t('contactUrlHelp')}
              </p>
            </div>
          </SettingsSection>

          {form.plans.map((plan, i) => {
            const id = (name: string) => `plan-${i}-${name}`;
            return (
              <SettingsSection key={i}>
                <div className="flex items-center justify-between gap-3 mb-6">
                  <h2 className="flex items-center gap-2 text-[15px] font-bold text-[#111827]">
                    {plan.highlighted && <Star className="w-4 h-4 text-amber-500 fill-amber-400" />}
                    {t('plan', { number: i + 1 })}
                    {(plan.name.ar || plan.name.en) && <span className="font-normal text-[#6B7280]">· {plan.name.ar || plan.name.en}</span>}
                  </h2>
                  <div className="flex items-center gap-1">
                    <button type="button" className={iconButton} onClick={() => movePlan(i, -1)} disabled={i === 0} aria-label={t('moveUp')} title={t('moveUp')}><ArrowUp className="w-4 h-4" /></button>
                    <button type="button" className={iconButton} onClick={() => movePlan(i, 1)} disabled={i === form.plans.length - 1} aria-label={t('moveDown')} title={t('moveDown')}><ArrowDown className="w-4 h-4" /></button>
                    <button type="button" className={`${iconButton} hover:!text-red-600 hover:!bg-red-50`} onClick={() => removePlan(i)} disabled={form.plans.length === 1} aria-label={t('removePlan')} title={t('removePlan')}><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                  {(['ar', 'en'] as const).map((lang) => (
                    <div key={`name-${lang}`} className="grid gap-1.5">
                      <label htmlFor={id(`name-${lang}`)} className={labelClass}>{t(lang === 'ar' ? 'nameAr' : 'nameEn')}</label>
                      <input id={id(`name-${lang}`)} dir={lang === 'ar' ? 'rtl' : 'ltr'} maxLength={60} value={plan.name[lang]} onChange={(e) => setText(i, 'name', lang, e.target.value)} aria-invalid={invalid.includes(`plans.${i}.name.${lang}`)} className={`${inputClass} ${field(`plans.${i}.name.${lang}`)}`} />
                      {errorText(`plans.${i}.name.${lang}`, t('required'))}
                    </div>
                  ))}
                  {(['ar', 'en'] as const).map((lang) => (
                    <div key={`desc-${lang}`} className="grid gap-1.5">
                      <label htmlFor={id(`desc-${lang}`)} className={labelClass}>{t(lang === 'ar' ? 'descriptionAr' : 'descriptionEn')}</label>
                      <input id={id(`desc-${lang}`)} dir={lang === 'ar' ? 'rtl' : 'ltr'} maxLength={200} value={plan.description[lang]} onChange={(e) => setText(i, 'description', lang, e.target.value)} className={`${inputClass} border-[#EEEEEE]`} />
                    </div>
                  ))}

                  <div className="grid gap-1.5">
                    <label htmlFor={id('price')} className={labelClass}>{t('price')}</label>
                    <input
                      id={id('price')}
                      type="number"
                      dir="ltr"
                      min={0}
                      step={50}
                      value={plan.price ?? ''}
                      onChange={(e) => updatePlan(i, { price: e.target.value === '' ? null : Number(e.target.value) }, `plans.${i}.price`)}
                      aria-invalid={invalid.includes(`plans.${i}.price`)}
                      className={`${inputClass} ${field(`plans.${i}.price`)}`}
                    />
                    <p className={`text-sm ${invalid.includes(`plans.${i}.price`) ? 'text-red-600' : 'text-gray-500'}`}>
                      {invalid.includes(`plans.${i}.price`) ? t('priceInvalid') : t('priceHelp')}
                    </p>
                  </div>
                  <div className="grid gap-1.5 content-start">
                    <label htmlFor={id('students')} className={labelClass}>{t('maxStudents')}</label>
                    <input
                      id={id('students')}
                      type="number"
                      dir="ltr"
                      min={1}
                      step={50}
                      value={Number.isFinite(plan.max_students) ? plan.max_students : ''}
                      onChange={(e) => updatePlan(i, { max_students: e.target.value === '' ? Number.NaN : Number(e.target.value) }, `plans.${i}.max_students`)}
                      aria-invalid={invalid.includes(`plans.${i}.max_students`)}
                      className={`${inputClass} ${field(`plans.${i}.max_students`)}`}
                    />
                    {errorText(`plans.${i}.max_students`, t('numberInvalid'))}
                  </div>

                  {(['ar', 'en'] as const).map((lang) => (
                    <div key={`badge-${lang}`} className="grid gap-1.5">
                      <label htmlFor={id(`badge-${lang}`)} className={labelClass}>{t(lang === 'ar' ? 'badgeAr' : 'badgeEn')}</label>
                      <input id={id(`badge-${lang}`)} dir={lang === 'ar' ? 'rtl' : 'ltr'} maxLength={40} value={plan.badge[lang]} onChange={(e) => setText(i, 'badge', lang, e.target.value)} placeholder={t('badgeHelp')} className={`${inputClass} border-[#EEEEEE]`} />
                    </div>
                  ))}

                  {(['ar', 'en'] as const).map((lang) => (
                    <div key={`features-${lang}`} className="grid gap-1.5">
                      <label htmlFor={id(`features-${lang}`)} className={labelClass}>{t(lang === 'ar' ? 'featuresAr' : 'featuresEn')}</label>
                      <textarea
                        id={id(`features-${lang}`)}
                        dir={lang === 'ar' ? 'rtl' : 'ltr'}
                        rows={6}
                        value={plan.features[lang].join('\n')}
                        onChange={(e) => setFeatures(i, lang, e.target.value)}
                        aria-invalid={invalid.includes(`plans.${i}.features.${lang}`)}
                        className={`${inputClass} ${field(`plans.${i}.features.${lang}`)} leading-7 resize-y`}
                      />
                      {errorText(`plans.${i}.features.${lang}`, t('featuresRequired'))}
                    </div>
                  ))}
                </div>

                <label className="mt-6 flex items-center gap-3 cursor-pointer w-max">
                  <input type="checkbox" checked={plan.highlighted} onChange={(e) => updatePlan(i, { highlighted: e.target.checked })} className="w-4 h-4 accent-[#2137D6]" />
                  <span className="text-[14px] font-medium text-[#111827]">{t('highlighted')}</span>
                </label>
              </SettingsSection>
            );
          })}

          <div className="flex flex-wrap gap-3 mb-6">
            <button
              type="button"
              onClick={() => setDraft({ ...form, plans: [...form.plans, emptyLandingPlan()] })}
              disabled={form.plans.length >= MAX_LANDING_PLANS}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-[14px] font-semibold text-[#2137D6] bg-white border border-dashed border-[#2137D6]/40 hover:bg-[#F4F5FD] rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              {t('addPlan')}
            </button>
            <button
              type="button"
              onClick={() => { setDraft({ ...DEFAULT_LANDING_PLANS, contact_url: form.contact_url }); setInvalid([]); }}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-[14px] font-semibold text-[#4B5563] bg-white border border-[#EEEEEE] hover:bg-[#F9FAFB] rounded-xl transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              {t('resetDefaults')}
            </button>
          </div>
        </>
      )}

      <div className="flex justify-end gap-4 mt-2 pb-8">
        <button
          onClick={() => { setDraft(null); setInvalid([]); }}
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
