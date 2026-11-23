'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import toast from 'react-hot-toast';
import { Info, Link2, Loader2, X } from 'lucide-react';
import api, { ApiError, getApiErrorMessage, type PermissionCatalog, type Supervisor, type SupervisorInput } from '@/src/lib/api';

type Permission = PermissionCatalog['permissions'][number];

/** Adds every permission the given ones require, transitively. */
export function withRequirements(keys: Iterable<string>, catalog: PermissionCatalog): Set<string> {
  const byKey = new Map(catalog.permissions.map((p) => [p.key, p]));
  const result = new Set<string>();
  const stack = [...keys];
  while (stack.length) {
    const key = stack.pop()!;
    if (result.has(key)) continue;
    result.add(key);
    byKey.get(key)?.requires.forEach((r) => { if (!result.has(r)) stack.push(r); });
  }
  return result;
}

/** Every permission that (transitively) requires one of the given ones. */
function dependentsOf(keys: Iterable<string>, catalog: PermissionCatalog): Set<string> {
  const result = new Set<string>(keys);
  let grew = true;
  while (grew) {
    grew = false;
    for (const p of catalog.permissions) {
      if (!result.has(p.key) && p.requires.some((r) => result.has(r))) { result.add(p.key); grew = true; }
    }
  }
  return result;
}

const sameSet = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((k) => b.has(k));

/** The preset whose permissions match exactly (with or without its dependencies), if any. */
export function matchingPreset(permissions: string[], catalog: PermissionCatalog) {
  const current = new Set(permissions);
  return catalog.presets.find((preset) => sameSet(current, new Set(preset.permissions)) || sameSet(current, withRequirements(preset.permissions, catalog)));
}

const inputClass = 'w-full rounded-xl border border-[#EEEEEE] bg-white px-3 py-2.5 text-[14px] text-[#111827] focus:border-[#2137D6] focus:outline-none focus:ring-2 focus:ring-[#2137D6]/20';
const labelClass = 'text-[13px] font-medium text-[#4B5563]';

function Switch({ checked, onChange, label, id }: { checked: boolean; onChange: (value: boolean) => void; label: string; id?: string }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${checked ? 'bg-[#2137D6]' : 'bg-[#D1D5DB]'}`}
    >
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[22px] rtl:-translate-x-[22px]' : 'translate-x-0.5 rtl:-translate-x-0.5'}`} />
    </button>
  );
}

interface Props {
  catalog: PermissionCatalog;
  /** null = create a new supervisor */
  supervisor: Supervisor | null;
  onClose: () => void;
  onSaved: (supervisor: Supervisor) => void;
}

export default function SupervisorEditor({ catalog, supervisor, onClose, onSaved }: Props) {
  const locale = useLocale();
  const ar = locale === 'ar';
  const label = (l: { ar: string; en: string }) => (ar ? l.ar : l.en) || l.ar || l.en;
  const isEdit = supervisor !== null;

  const [firstName, setFirstName] = useState(supervisor?.first_name ?? '');
  const [lastName, setLastName] = useState(supervisor?.last_name ?? '');
  const [email, setEmail] = useState(supervisor?.email ?? '');
  const [phone, setPhone] = useState(supervisor?.phone ?? '');
  const [password, setPassword] = useState('');
  const [active, setActive] = useState(supervisor?.active ?? true);
  const [permissions, setPermissions] = useState<Set<string>>(() => new Set(supervisor?.permissions ?? []));
  const [custom, setCustom] = useState(() => (supervisor ? !matchingPreset(supervisor.permissions, catalog) : false));
  // A permission profile (from Settings → permission profiles), or full access (a full admin), or the switches below.
  const profiles = catalog.profiles ?? [];
  const [profileId, setProfileId] = useState<number | null>(supervisor?.permission_profile?.id ?? null);
  const [fullAccess, setFullAccess] = useState(Boolean(supervisor?.full_access) && !supervisor?.permission_profile);
  const profile = profiles.find((p) => p.id === profileId) ?? null;
  const [note, setNote] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const byKey = useMemo(() => new Map(catalog.permissions.map((p) => [p.key, p])), [catalog]);
  const names = (keys: Iterable<string>) => [...keys].map((k) => (byKey.get(k) ? label(byKey.get(k)!.label) : k)).join(ar ? '، ' : ', ');
  const activePreset = custom || profileId !== null || fullAccess ? undefined : matchingPreset([...permissions], catalog);
  const allAccess = fullAccess || Boolean(profile?.full_access);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; };
  }, [onClose, saving]);

  const clearError = (key: string) => setErrors((prev) => {
    if (!prev[key]) return prev;
    const next = { ...prev };
    delete next[key];
    return next;
  });

  const turnOn = (keys: string[]) => {
    const next = withRequirements([...permissions, ...keys], catalog);
    const extra = [...next].filter((k) => !permissions.has(k) && !keys.includes(k));
    setPermissions(next);
    setNote(extra.length ? (ar ? `اتشغّل معاها تلقائيًا (لازمة عشان تشتغل): ${names(extra)}` : `Also turned on (required): ${names(extra)}`) : null);
    clearError('permissions');
  };

  const turnOff = (keys: string[]) => {
    const removed = dependentsOf(keys.filter((k) => permissions.has(k)), catalog);
    const extra = [...removed].filter((k) => permissions.has(k) && !keys.includes(k));
    setPermissions(new Set([...permissions].filter((k) => !removed.has(k))));
    setNote(extra.length ? (ar ? `اتقفل معاها كمان لأنها معتمدة عليها: ${names(extra)}` : `Also turned off (they depend on it): ${names(extra)}`) : null);
  };

  const togglePermission = (permission: Permission, on: boolean) => {
    setCustom(true); setProfileId(null); setFullAccess(false);
    if (on) turnOn([permission.key]); else turnOff([permission.key]);
  };

  const choosePreset = (key: string | null) => {
    setNote(null); setProfileId(null); setFullAccess(false);
    if (key === null) { setCustom(true); return; }
    const preset = catalog.presets.find((p) => p.key === key);
    if (!preset) return;
    setCustom(false);
    setPermissions(withRequirements(preset.permissions, catalog));
    clearError('permissions');
  };

  const chooseProfile = (id: number) => {
    const chosen = profiles.find((p) => p.id === id);
    if (!chosen) return;
    setNote(null); setCustom(false); setFullAccess(false); setProfileId(id);
    setPermissions(new Set(chosen.permissions));
    clearError('permissions');
  };

  const chooseFullAccess = () => {
    setNote(null); setCustom(false); setProfileId(null); setFullAccess(true);
    clearError('permissions');
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!firstName.trim()) next.first_name = ar ? 'اكتب الاسم الأول' : 'First name is required';
    if (!lastName.trim()) next.last_name = ar ? 'اكتب اسم العائلة' : 'Last name is required';
    if (!email.trim()) next.email = ar ? 'اكتب الإيميل' : 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = ar ? 'الإيميل مش مكتوب صح' : 'Email is not valid';
    if (!isEdit && !password) next.password = ar ? 'اكتب كلمة سر للمشرف' : 'Password is required';
    else if (password && password.length < 8) next.password = ar ? 'كلمة السر لازم تكون 8 حروف على الأقل' : 'Password must be at least 8 characters';
    if (!fullAccess && profileId === null && permissions.size === 0) next.permissions = ar ? 'اختار صلاحية واحدة على الأقل' : 'Choose at least one permission';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const data: SupervisorInput = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
      phone: phone.trim() || null,
      active,
      ...(profileId !== null
        ? { permission_profile_id: profileId }
        : fullAccess
          ? { full_access: true, permission_profile_id: null }
          : { permissions: [...permissions], full_access: false, permission_profile_id: null }),
    };
    if (password) data.password = password;
    setSaving(true);
    try {
      const res = isEdit ? await api.supervisors.update(supervisor.id, data) : await api.supervisors.create(data);
      toast.success(isEdit ? (ar ? 'اتحفظت التعديلات' : 'Changes saved') : (ar ? 'المشرف اتضاف' : 'Supervisor added'));
      onSaved(res.data);
    } catch (error) {
      if (error instanceof ApiError && error.errors) {
        const fieldErrors: Record<string, string> = {};
        const known: Record<string, string> = {
          email: ar ? 'الإيميل ده مستخدم في حساب تاني' : 'This email is already used by another account',
          phone: ar ? 'رقم الموبايل ده مستخدم في حساب تاني' : 'This phone number is already used by another account',
        };
        for (const [key, messages] of Object.entries(error.errors)) {
          const field = key.split('.')[0];
          const message = messages?.[0] ?? '';
          fieldErrors[field] = known[field] && /taken|exist|used|unique|مستخدم|موجود/i.test(message) ? known[field] : message;
        }
        setErrors(fieldErrors);
        const first = Object.values(fieldErrors).find(Boolean);
        toast.error(first || getApiErrorMessage(error, ar ? 'راجع البيانات' : 'Please check the form'));
      } else {
        toast.error(getApiErrorMessage(error, ar ? 'ماقدرناش نحفظ المشرف' : 'Could not save the supervisor'));
      }
    } finally {
      setSaving(false);
    }
  };

  const fieldClass = (key: string) => `${inputClass} ${errors[key] ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : ''}`;
  const fieldError = (key: string) => (errors[key] ? <p className="text-[12px] text-red-600">{errors[key]}</p> : null);

  const chip = (selected: boolean) => `rounded-xl px-3.5 py-2 text-[13px] font-semibold transition ${selected ? 'bg-[#2137D6] text-white shadow-md shadow-[#2137D6]/20' : 'bg-white text-[#4B5563] ring-1 ring-[#EEEEEE] hover:bg-[#F9FAFB]'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="supervisor-editor-title"
        className="flex max-h-[95vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
        noValidate
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#F3F4F6] px-5 py-4 sm:px-6">
          <div>
            <h2 id="supervisor-editor-title" className="text-[18px] font-bold text-[#111827]">
              {isEdit ? (ar ? 'تعديل المشرف' : 'Edit supervisor') : (ar ? 'مشرف جديد' : 'New supervisor')}
            </h2>
            <p className="mt-0.5 text-[13px] text-[#6B7280]">
              {ar ? 'المشرف بيشوف ويعمل بس اللي إنت مسموح له بيه، وكل حاجة بيعملها بتتسجل.' : 'The supervisor only sees and does what you allow, and everything they do is logged.'}
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label={ar ? 'إغلاق' : 'Close'} className="rounded-xl p-2 text-[#6B7280] hover:bg-[#F3F4F6]"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label htmlFor="sup-first" className={labelClass}>{ar ? 'الاسم الأول' : 'First name'}</label>
              <input id="sup-first" value={firstName} maxLength={60} onChange={(e) => { setFirstName(e.target.value); clearError('first_name'); }} className={fieldClass('first_name')} />
              {fieldError('first_name')}
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="sup-last" className={labelClass}>{ar ? 'اسم العائلة' : 'Last name'}</label>
              <input id="sup-last" value={lastName} maxLength={60} onChange={(e) => { setLastName(e.target.value); clearError('last_name'); }} className={fieldClass('last_name')} />
              {fieldError('last_name')}
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="sup-email" className={labelClass}>{ar ? 'الإيميل (بيدخل بيه)' : 'Email (used to sign in)'}</label>
              <input id="sup-email" type="email" dir="ltr" autoComplete="off" value={email} onChange={(e) => { setEmail(e.target.value); clearError('email'); }} className={fieldClass('email')} />
              {fieldError('email')}
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="sup-phone" className={labelClass}>{ar ? 'رقم الموبايل (اختياري)' : 'Phone (optional)'}</label>
              <input id="sup-phone" type="tel" dir="ltr" value={phone} onChange={(e) => { setPhone(e.target.value); clearError('phone'); }} className={fieldClass('phone')} />
              {fieldError('phone')}
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="sup-password" className={labelClass}>{ar ? 'كلمة السر' : 'Password'}</label>
              <input id="sup-password" type="password" dir="ltr" autoComplete="new-password" value={password} onChange={(e) => { setPassword(e.target.value); clearError('password'); }} placeholder={isEdit ? (ar ? 'سيبها فاضية لو مش عايز تغيّرها' : 'Leave empty to keep the current one') : ''} className={fieldClass('password')} />
              {fieldError('password')}
            </div>
            <div className="flex items-center gap-3 self-end rounded-xl bg-[#F9FAFB] px-3 py-2.5">
              <Switch id="sup-active" checked={active} onChange={setActive} label={ar ? 'الحساب شغال' : 'Account active'} />
              <label htmlFor="sup-active" className="cursor-pointer text-[14px] font-medium text-[#111827]">
                {active ? (ar ? 'الحساب شغال' : 'Account active') : (ar ? 'الحساب متوقف (مش هيقدر يدخل)' : 'Stopped (cannot sign in)')}
              </label>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-[15px] font-bold text-[#111827]">{ar ? 'نوع المشرف' : 'Supervisor type'}</h3>
            {profiles.length > 0 && (
              <div className="space-y-2 rounded-2xl bg-[#F4F5FD] p-3">
                <p className="text-[12px] font-semibold text-[#2137D6]">{ar ? 'ملفات الصلاحيات' : 'Permission profiles'}</p>
                <div className="flex flex-wrap gap-2">
                  {profiles.map((p) => (
                    <button key={p.id} type="button" onClick={() => chooseProfile(p.id)} className={chip(profileId === p.id)} aria-pressed={profileId === p.id}>
                      {p.name}{p.full_access ? (ar ? ' (كل الصلاحيات)' : ' (full access)') : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={chooseFullAccess} className={chip(fullAccess)} aria-pressed={fullAccess}>
                {ar ? 'كل الصلاحيات (أدمن)' : 'Full access (admin)'}
              </button>
              {catalog.presets.map((preset) => (
                <button key={preset.key} type="button" onClick={() => choosePreset(preset.key)} className={chip(activePreset?.key === preset.key)} aria-pressed={activePreset?.key === preset.key}>
                  {label(preset.label)}
                </button>
              ))}
              <button type="button" onClick={() => choosePreset(null)} className={chip(!activePreset && !fullAccess && profileId === null)} aria-pressed={!activePreset && !fullAccess && profileId === null}>
                {ar ? 'مخصص' : 'Custom'}
              </button>
            </div>
            <p className="text-[12px] text-[#6B7280]">
              {ar ? 'اختار نوع جاهز يملالك الصلاحيات، وبعدها تقدر تعدّل فيها براحتك تحت.' : 'Pick a ready type to fill the permissions, then adjust them below as you like.'}
            </p>
            {profile && (
              <p className="flex items-start gap-2 rounded-xl bg-[#F4F5FD] px-3 py-2 text-[13px] text-[#1F33C4]" role="status">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                {ar ? `الحساب ماشي على ملف «${profile.name}»: أي تعديل في الملف من الإعدادات بيتطبّق عليه على طول. لو غيّرت صلاحية هنا، الحساب هيبقى مخصص ومش مربوط بالملف.` : `This account follows the “${profile.name}” profile: editing the profile in Settings updates it at once. Changing a permission here makes it custom and unlinks it.`}
              </p>
            )}
          </section>

          {allAccess ? (
            <p className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800" role="status">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              {ar ? 'الحساب ده هيقدر يعمل كل حاجة الأدمن بيعملها. صفحات المالك بس (المشرفين، ملفات الصلاحيات، النسخ الاحتياطي) بتفضل ليك إنت.' : 'This account can do everything an admin can. Owner-only pages (supervisors, permission profiles, backups) stay yours.'}
            </p>
          ) : (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-[15px] font-bold text-[#111827]">{ar ? 'الصلاحيات' : 'Permissions'}</h3>
              <span className="rounded-full bg-[#F4F5FD] px-2.5 py-0.5 text-[12px] font-semibold text-[#2137D6]">
                {ar ? `${permissions.size} صلاحية مختارة` : `${permissions.size} selected`}
              </span>
            </div>
            {errors.permissions && <p role="alert" className="text-[13px] text-red-600">{errors.permissions}</p>}
            {note && (
              <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[13px] text-amber-800" role="status">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />{note}
              </p>
            )}
            <div className="space-y-3">
              {catalog.groups.map((group) => {
                const items = catalog.permissions.filter((p) => p.group === group.key);
                if (!items.length) return null;
                const on = items.filter((p) => permissions.has(p.key)).length;
                return (
                  <fieldset key={group.key} className="rounded-2xl border border-[#EEEEEE] p-4">
                    <legend className="sr-only">{label(group.label)}</legend>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <span aria-hidden="true" className="text-[14px] font-bold text-[#111827]">{label(group.label)}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] text-[#6B7280]">{ar ? `${on} من ${items.length}` : `${on} of ${items.length}`}</span>
                        <button type="button" onClick={() => { setCustom(true); turnOn(items.map((p) => p.key)); }} disabled={on === items.length} className="rounded-lg px-2.5 py-1 text-[12px] font-semibold text-[#2137D6] hover:bg-[#F4F5FD] disabled:opacity-40">{ar ? 'الكل' : 'All'}</button>
                        <button type="button" onClick={() => { setCustom(true); turnOff(items.map((p) => p.key)); }} disabled={on === 0} className="rounded-lg px-2.5 py-1 text-[12px] font-semibold text-[#6B7280] hover:bg-[#F3F4F6] disabled:opacity-40">{ar ? 'ولا حاجة' : 'None'}</button>
                      </div>
                    </div>
                    <ul className="divide-y divide-[#F3F4F6]">
                      {items.map((permission) => {
                        const checked = permissions.has(permission.key);
                        const id = `perm-${permission.key.replace(/[^a-z0-9_-]/gi, '-')}`;
                        return (
                          <li key={permission.key} className="flex items-center justify-between gap-3 py-2.5">
                            <div className="min-w-0">
                              <label htmlFor={id} className="cursor-pointer text-[14px] text-[#111827]">{label(permission.label)}</label>
                              {permission.requires.length > 0 && (
                                <p className="mt-0.5 flex items-center gap-1 text-[12px] text-[#6B7280]">
                                  <Link2 className="h-3 w-3 shrink-0" />
                                  {ar ? `بتحتاج: ${names(permission.requires)}` : `Needs: ${names(permission.requires)}`}
                                </p>
                              )}
                            </div>
                            <Switch id={id} checked={checked} onChange={(value) => togglePermission(permission, value)} label={label(permission.label)} />
                          </li>
                        );
                      })}
                    </ul>
                  </fieldset>
                );
              })}
            </div>
          </section>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-[#F3F4F6] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-[#EEEEEE] bg-white px-5 py-2.5 text-[14px] font-semibold text-[#4B5563] hover:bg-[#F9FAFB] disabled:opacity-50">
            {ar ? 'إلغاء' : 'Cancel'}
          </button>
          <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2137D6] px-5 py-2.5 text-[14px] font-semibold text-white shadow-md shadow-[#2137D6]/20 hover:bg-[#1C2EB8] disabled:opacity-50">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? (ar ? 'حفظ التعديلات' : 'Save changes') : (ar ? 'إضافة المشرف' : 'Add supervisor')}
          </button>
        </div>
      </form>
    </div>
  );
}
