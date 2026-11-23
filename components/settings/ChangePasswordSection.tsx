'use client';

import React, { useState } from 'react';
import { useLocale } from 'next-intl';
import toast from 'react-hot-toast';
import { Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react';
import { ApiError, api } from '@/src/lib/api';
import SettingsSection from '@/components/settings/SettingsSection';

/** Change your own password (owner, admins, supervisors, instructors). The current password is required. */
export default function ChangePasswordSection() {
  const ar = useLocale() === 'ar';
  const tr = (arText: string, enText: string) => (ar ? arText : enText);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const field = 'w-full rounded-xl border border-[#EEEEEE] bg-white px-4 py-2.5 text-[14px] text-[#111827] transition-all hover:border-[#D1D5DB] focus:border-[#2137D6] focus:outline-none focus:ring-2 focus:ring-[#2137D6]/20';

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const local: Record<string, string> = {};
    if (!current) local.current_password = tr('اكتب كلمة المرور الحالية.', 'Enter your current password.');
    if (next.length < 8) local.password = tr('كلمة المرور الجديدة 8 حروف على الأقل.', 'The new password needs at least 8 characters.');
    else if (next !== confirm) local.password_confirmation = tr('تأكيد كلمة المرور مش مطابق.', 'The confirmation does not match.');
    setErrors(local);
    if (Object.keys(local).length > 0) return;

    setSaving(true);
    try {
      await api.auth.changePassword({ current_password: current, password: next, password_confirmation: confirm });
      toast.success(tr('تم تغيير كلمة المرور.', 'Password changed.'));
      setCurrent(''); setNext(''); setConfirm(''); setErrors({});
    } catch (error) {
      if (error instanceof ApiError && error.errors) {
        const server: Record<string, string> = {};
        if (error.errors.current_password) server.current_password = tr('كلمة المرور الحالية غلط.', 'The current password is incorrect.');
        if (error.errors.password) server.password = /different/i.test(error.errors.password.join(' '))
          ? tr('اختار كلمة مرور مختلفة عن الحالية.', 'Choose a password different from the current one.')
          : tr('كلمة المرور الجديدة مش مقبولة (8 حروف على الأقل).', 'The new password is not accepted (at least 8 characters).');
        setErrors(server);
        if (Object.keys(server).length === 0) toast.error(error.message);
      } else {
        toast.error(error instanceof ApiError && error.status === 429
          ? tr('محاولات كتير. استنى دقيقة وجرّب تاني.', 'Too many attempts. Wait a minute and try again.')
          : tr('تعذّر تغيير كلمة المرور. حاول مرة أخرى.', 'Could not change the password. Try again.'));
      }
    } finally {
      setSaving(false);
    }
  }

  const input = (id: string, label: string, value: string, set: (value: string) => void, autoComplete: string) => (
    <div className="grid grid-cols-1 gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium text-[#4B5563]">{label}</label>
      <input id={id} type={show ? 'text' : 'password'} dir="ltr" autoComplete={autoComplete} value={value} onChange={(event) => set(event.target.value)} aria-invalid={Boolean(errors[id])} aria-describedby={errors[id] ? `${id}-error` : undefined} className={`${field} ${errors[id] ? 'border-red-400' : ''}`} />
      {errors[id] && <p id={`${id}-error`} className="text-[12px] text-red-600">{errors[id]}</p>}
    </div>
  );

  return (
    <SettingsSection title={tr('تغيير كلمة المرور', 'Change password')}>
      <form onSubmit={save} className="space-y-4" noValidate>
        {input('current_password', tr('كلمة المرور الحالية', 'Current password'), current, setCurrent, 'current-password')}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {input('password', tr('كلمة المرور الجديدة', 'New password'), next, setNext, 'new-password')}
          {input('password_confirmation', tr('تأكيد كلمة المرور الجديدة', 'Confirm new password'), confirm, setConfirm, 'new-password')}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={() => setShow((value) => !value)} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#4B5563] hover:text-[#111827]">
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}{show ? tr('إخفاء', 'Hide') : tr('إظهار', 'Show')}
          </button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#2137D6] px-5 py-2.5 text-[14px] font-semibold text-white shadow-md shadow-[#2137D6]/20 transition-colors hover:bg-[#1C2EB8] disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}{tr('تغيير كلمة المرور', 'Change password')}
          </button>
        </div>
      </form>
    </SettingsSection>
  );
}
