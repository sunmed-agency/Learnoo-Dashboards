'use client';

import React, { useState } from 'react';
import { useLocale } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast, { Toaster } from 'react-hot-toast';
import { Info, Loader2, Pencil, Plus, ShieldCheck, Trash2, X } from 'lucide-react';
import { ApiError, getApiErrorMessage, permissionProfilesApi, supervisorsApi, type PermissionCatalog, type PermissionProfile } from '@/src/lib/api';
import { withRequirements } from '@/components/supervisors/SupervisorEditor';
import SettingsPageHeader from '@/components/settings/SettingsPageHeader';
import { useCurrentUser } from '@/src/hooks/useAuth';

/**
 * Settings → permission profiles (owner only): named permission sets. When adding a staff account
 * on the supervisors page, the owner picks a profile; editing a profile updates everyone on it.
 */
export default function PermissionProfilesPage() {
  const ar = useLocale() === 'ar';
  const { role } = useCurrentUser();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<PermissionProfile | 'new' | null>(null);

  const catalog = useQuery({ queryKey: ['supervisor-catalog'], queryFn: () => supervisorsApi.catalog(), enabled: role === 'Super Admin' });
  const profiles = useQuery({ queryKey: ['permission-profiles'], queryFn: () => permissionProfilesApi.list(), enabled: role === 'Super Admin' });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['permission-profiles'] });
    void queryClient.invalidateQueries({ queryKey: ['supervisor-catalog'] });
    void queryClient.invalidateQueries({ queryKey: ['supervisors'] });
  };

  const remove = useMutation({
    mutationFn: (profile: PermissionProfile) => permissionProfilesApi.remove(profile.id),
    onSuccess: () => { toast.success(ar ? 'اتمسح الملف' : 'Profile deleted'); refresh(); },
    onError: (error) => toast.error(getApiErrorMessage(error, ar ? 'ماقدرناش نمسح الملف' : 'Could not delete the profile')),
  });

  if (role && role !== 'Super Admin') {
    return <p className="p-8 text-center text-sm text-slate-600">{ar ? 'الصفحة دي للمالك بس.' : 'This page is for the owner only.'}</p>;
  }

  const permissionNames = (keys: string[], c?: PermissionCatalog) => {
    const byKey = new Map((c?.permissions ?? []).map((p) => [p.key, p]));
    return keys.map((key) => { const p = byKey.get(key); return p ? (ar ? p.label.ar : p.label.en) : key; });
  };

  const confirmDelete = (profile: PermissionProfile) => {
    const message = profile.users_count > 0
      ? (ar ? `مسح ملف «${profile.name}»؟ الـ ${profile.users_count} حساب اللي عليه هيفضلوا بنفس صلاحياتهم الحالية، بس مش هيتحدّثوا مع الملف تاني.` : `Delete “${profile.name}”? Its ${profile.users_count} accounts keep their current permissions but no longer follow the profile.`)
      : (ar ? `مسح ملف «${profile.name}»؟` : `Delete “${profile.name}”?`);
    if (window.confirm(message)) remove.mutate(profile);
  };

  const list = profiles.data?.data ?? [];

  return (
    <div className="flex h-full flex-col">
      <Toaster position="top-center" />
      <SettingsPageHeader
        title={ar ? 'ملفات الصلاحيات' : 'Permission profiles'}
        description={ar ? 'اعمل ملف لكل نوع شغل (مثلًا: مشرف امتحانات، خدمة عملاء، أدمن كامل)، وبعدها لما تضيف حساب في «المشرفين» تختار له الملف المناسب. أي تعديل في الملف بيتطبّق على كل الحسابات اللي عليه.' : 'Make a profile for each kind of job (e.g. exams supervisor, customer service, full admin). When you add an account on the Supervisors page, pick its profile. Editing a profile updates every account on it.'}
      />

      <div className="mb-4 flex justify-end">
        <button type="button" onClick={() => setEditing('new')} disabled={!catalog.data} className="inline-flex items-center gap-2 rounded-xl bg-[#2137D6] px-4 py-2.5 text-[14px] font-semibold text-white shadow-md shadow-[#2137D6]/20 hover:bg-[#1C2EB8] disabled:opacity-50">
          <Plus className="h-4 w-4" />{ar ? 'ملف جديد' : 'New profile'}
        </button>
      </div>

      {(profiles.isLoading || catalog.isLoading) && <p role="status" className="flex items-center gap-2 text-sm text-slate-600"><Loader2 className="h-4 w-4 animate-spin" />{ar ? 'جارٍ التحميل...' : 'Loading...'}</p>}
      {(profiles.isError || catalog.isError) && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{ar ? 'تعذّر تحميل ملفات الصلاحيات.' : 'Could not load the permission profiles.'}</p>}
      {profiles.data && list.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[#D1D5DB] bg-white p-8 text-center text-sm text-slate-600">
          {ar ? 'مفيش ملفات لسه. اعمل أول ملف بزرار «ملف جديد».' : 'No profiles yet. Create the first one with “New profile”.'}
        </div>
      )}

      <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {list.map((profile) => {
          const names = permissionNames(profile.permissions, catalog.data?.data);
          return (
            <li key={profile.id} className="flex flex-col gap-3 rounded-2xl border border-[#EEEEEE] bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#2137D6]/10 text-[#2137D6]"><ShieldCheck className="h-5 w-5" /></span>
                  <div className="min-w-0">
                    <h2 className="truncate text-[16px] font-bold text-[#111827]">{profile.name}</h2>
                    <p className="text-[12px] text-[#6B7280]">
                      {profile.full_access ? (ar ? 'كل الصلاحيات' : 'Full access') : (ar ? `${profile.permissions.length} صلاحية` : `${profile.permissions.length} permissions`)}
                      {' · '}
                      {ar ? `${profile.users_count} حساب` : `${profile.users_count} accounts`}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button type="button" onClick={() => setEditing(profile)} disabled={!catalog.data} className="rounded-lg p-2 text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]" aria-label={ar ? 'تعديل' : 'Edit'} title={ar ? 'تعديل' : 'Edit'}><Pencil className="h-4 w-4" /></button>
                  <button type="button" onClick={() => confirmDelete(profile)} disabled={remove.isPending} className="rounded-lg p-2 text-[#6B7280] hover:bg-red-50 hover:text-red-600" aria-label={ar ? 'مسح' : 'Delete'} title={ar ? 'مسح' : 'Delete'}><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              {!profile.full_access && names.length > 0 && (
                <ul className="flex flex-wrap gap-1.5">
                  {names.map((name) => <li key={name} className="rounded-lg bg-[#F4F5FD] px-2 py-1 text-[12px] text-[#1F33C4]">{name}</li>)}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      {editing && catalog.data && (
        <ProfileEditor
          catalog={catalog.data.data}
          profile={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refresh(); }}
        />
      )}
    </div>
  );
}

function ProfileEditor({ catalog, profile, onClose, onSaved }: { catalog: PermissionCatalog; profile: PermissionProfile | null; onClose: () => void; onSaved: () => void }) {
  const ar = useLocale() === 'ar';
  const label = (l: { ar: string; en: string }) => (ar ? l.ar : l.en) || l.ar || l.en;
  const [name, setName] = useState(profile?.name ?? '');
  const [fullAccess, setFullAccess] = useState(profile?.full_access ?? false);
  const [permissions, setPermissions] = useState<Set<string>>(() => new Set(profile?.permissions ?? []));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const toggle = (key: string, on: boolean) => {
    if (on) { setPermissions(withRequirements([...permissions, key], catalog)); return; }
    // Turning one off also turns off what depends on it.
    const removed = new Set([key]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const p of catalog.permissions) if (!removed.has(p.key) && p.requires.some((r) => removed.has(r))) { removed.add(p.key); grew = true; }
    }
    setPermissions(new Set([...permissions].filter((k) => !removed.has(k))));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) { setError(ar ? 'اكتب اسم الملف.' : 'Enter a profile name.'); return; }
    if (!fullAccess && permissions.size === 0) { setError(ar ? 'اختار صلاحية واحدة على الأقل، أو «كل الصلاحيات».' : 'Choose at least one permission, or full access.'); return; }
    setError(''); setSaving(true);
    try {
      const data = { name: name.trim(), full_access: fullAccess, permissions: fullAccess ? [] : [...permissions] };
      if (profile) await permissionProfilesApi.update(profile.id, data); else await permissionProfilesApi.create(data);
      toast.success(profile ? (ar ? 'اتحفظ الملف، والحسابات اللي عليه اتحدّثت' : 'Profile saved; its accounts were updated') : (ar ? 'اتعمل الملف' : 'Profile created'));
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError && err.errors?.name ? (ar ? 'فيه ملف تاني بنفس الاسم.' : 'Another profile has this name.') : getApiErrorMessage(err, ar ? 'ماقدرناش نحفظ الملف' : 'Could not save the profile'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="profile-editor-title" noValidate className="flex max-h-[95dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-[#F3F4F6] px-5 py-4">
          <h2 id="profile-editor-title" className="text-[18px] font-bold text-[#111827]">{profile ? (ar ? 'تعديل ملف الصلاحيات' : 'Edit permission profile') : (ar ? 'ملف صلاحيات جديد' : 'New permission profile')}</h2>
          <button type="button" onClick={onClose} disabled={saving} aria-label={ar ? 'إغلاق' : 'Close'} className="rounded-xl p-2 text-[#6B7280] hover:bg-[#F3F4F6]"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <div className="grid gap-1.5">
            <label htmlFor="profile-name" className="text-[13px] font-medium text-[#4B5563]">{ar ? 'اسم الملف' : 'Profile name'}</label>
            <input id="profile-name" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} placeholder={ar ? 'مثلًا: مشرف امتحانات' : 'e.g. Exams supervisor'} className="w-full rounded-xl border border-[#EEEEEE] bg-white px-3 py-2.5 text-[14px] focus:border-[#2137D6] focus:outline-none focus:ring-2 focus:ring-[#2137D6]/20" />
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-[#F9FAFB] p-3">
            <input type="checkbox" checked={fullAccess} onChange={(e) => setFullAccess(e.target.checked)} className="mt-1 h-4 w-4 accent-[#2137D6]" />
            <span>
              <span className="block text-[14px] font-semibold text-[#111827]">{ar ? 'كل الصلاحيات (أدمن كامل)' : 'Full access (full admin)'}</span>
              <span className="block text-[12px] text-[#6B7280]">{ar ? 'الحساب يقدر يعمل كل حاجة الأدمن بيعملها. صفحات المالك بتفضل ليك بس.' : 'The account can do everything an admin can. Owner-only pages stay yours.'}</span>
            </span>
          </label>
          {!fullAccess && (
            <div className="space-y-3">
              <p className="flex items-start gap-2 text-[12px] text-[#6B7280]"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />{ar ? 'الصلاحيات اللي محتاجة صلاحية تانية بتشغّلها معاها تلقائيًا.' : 'Permissions that need another one turn it on automatically.'}</p>
              {catalog.groups.map((group) => {
                const items = catalog.permissions.filter((p) => p.group === group.key);
                if (!items.length) return null;
                return (
                  <fieldset key={group.key} className="rounded-2xl border border-[#EEEEEE] p-4">
                    <legend className="px-1 text-[14px] font-bold text-[#111827]">{label(group.label)}</legend>
                    <ul className="space-y-2">
                      {items.map((permission) => (
                        <li key={permission.key}>
                          <label className="flex cursor-pointer items-center gap-3 text-[14px] text-[#111827]">
                            <input type="checkbox" checked={permissions.has(permission.key)} onChange={(e) => toggle(permission.key, e.target.checked)} className="h-4 w-4 accent-[#2137D6]" />
                            {label(permission.label)}
                          </label>
                        </li>
                      ))}
                    </ul>
                  </fieldset>
                );
              })}
            </div>
          )}
          {error && <p role="alert" className="text-[13px] text-red-600">{error}</p>}
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-[#F3F4F6] px-5 py-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-[#EEEEEE] bg-white px-5 py-2.5 text-[14px] font-semibold text-[#4B5563] hover:bg-[#F9FAFB]">{ar ? 'إلغاء' : 'Cancel'}</button>
          <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2137D6] px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-[#1C2EB8] disabled:opacity-50">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}{profile ? (ar ? 'حفظ' : 'Save') : (ar ? 'إنشاء الملف' : 'Create profile')}
          </button>
        </div>
      </form>
    </div>
  );
}
