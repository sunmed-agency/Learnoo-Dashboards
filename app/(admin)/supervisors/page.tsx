'use client';

import React, { useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { useDebounce } from 'use-debounce';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast, { Toaster } from 'react-hot-toast';
import { Activity, History, Pause, Pencil, Play, Plus, Search, ShieldCheck, Trash2, UserCheck, Users } from 'lucide-react';
import { useCurrentUser } from '@/src/hooks/useAuth';
import api, { getApiErrorMessage, type PermissionCatalog, type Supervisor } from '@/src/lib/api';
import SupervisorEditor, { matchingPreset } from '@/components/supervisors/SupervisorEditor';
import SupervisorActivity from '@/components/supervisors/SupervisorActivity';

const number = new Intl.NumberFormat('en-US');

export default function SupervisorsPage() {
  const locale = useLocale();
  const ar = locale === 'ar';
  const { role, isLoading: authLoading } = useCurrentUser();
  const isOwner = role === 'Super Admin';
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search.trim(), 400);
  const [editing, setEditing] = useState<Supervisor | 'new' | null>(null);
  const [viewing, setViewing] = useState<Supervisor | null>(null);

  const catalogQuery = useQuery({
    queryKey: ['supervisor-catalog'],
    queryFn: () => api.supervisors.catalog(),
    enabled: isOwner,
    staleTime: 10 * 60 * 1000,
  });
  // Unfiltered list feeds the stats; the filtered one feeds the table.
  const allQuery = useQuery({
    queryKey: ['supervisors', ''],
    queryFn: () => api.supervisors.list(),
    enabled: isOwner,
  });
  const listQuery = useQuery({
    queryKey: ['supervisors', debouncedSearch],
    queryFn: () => api.supervisors.list(debouncedSearch),
    enabled: isOwner,
    placeholderData: (previous) => previous,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['supervisors'] });

  const toggleActive = useMutation({
    mutationFn: (s: Supervisor) => api.supervisors.update(s.id, { active: !s.active }),
    onSuccess: (_res, s) => {
      toast.success(s.active ? (ar ? 'المشرف اتوقف ومش هيقدر يدخل' : 'Supervisor stopped') : (ar ? 'المشرف اتفعّل تاني' : 'Supervisor activated'));
      refresh();
    },
    onError: (error) => toast.error(getApiErrorMessage(error, ar ? 'ماقدرناش نغيّر الحالة' : 'Could not change the status')),
  });

  const remove = useMutation({
    mutationFn: (s: Supervisor) => api.supervisors.remove(s.id),
    onSuccess: () => { toast.success(ar ? 'المشرف اتمسح' : 'Supervisor deleted'); refresh(); },
    onError: (error) => toast.error(getApiErrorMessage(error, ar ? 'ماقدرناش نمسح المشرف' : 'Could not delete the supervisor')),
  });

  const all = allQuery.data?.data;
  const stats = useMemo(() => ({
    total: all?.length ?? 0,
    active: all?.filter((s) => s.active).length ?? 0,
    actions: all?.reduce((sum, s) => sum + (s.actions_30_days ?? 0), 0) ?? 0,
  }), [all]);

  const catalog = catalogQuery.data?.data;
  const rows = listQuery.data?.data ?? [];

  const formatDate = (iso?: string | null) => (iso ? new Intl.DateTimeFormat(ar ? 'ar-EG' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso)) : null);

  const summary = (s: Supervisor, c?: PermissionCatalog) => {
    const preset = c ? matchingPreset(s.permissions, c) : undefined;
    if (preset) return { text: ar ? preset.label.ar : preset.label.en || preset.label.ar, preset: true };
    const n = s.permissions.length;
    return { text: ar ? (n === 1 ? 'صلاحية واحدة' : n === 2 ? 'صلاحيتين' : `${number.format(n)} صلاحيات`) : `${number.format(n)} permission${n === 1 ? '' : 's'}`, preset: false };
  };

  const confirmDelete = (s: Supervisor) => {
    if (!window.confirm(ar ? `متأكد إنك عايز تمسح المشرف "${s.first_name} ${s.last_name}"؟ مش هيقدر يدخل تاني، وسجل نشاطه هيفضل محفوظ.` : `Delete supervisor "${s.first_name} ${s.last_name}"? They will no longer be able to sign in; their activity log is kept.`)) return;
    remove.mutate(s);
  };

  const openEditor = (target: Supervisor | 'new') => {
    if (!catalog) {
      toast.error(catalogQuery.isError ? getApiErrorMessage(catalogQuery.error, ar ? 'ماقدرناش نحمّل الصلاحيات' : 'Could not load permissions') : (ar ? 'استنى ثانية لحد ما الصلاحيات تتحمّل' : 'Permissions are still loading'));
      if (catalogQuery.isError) catalogQuery.refetch();
      return;
    }
    setEditing(target);
  };

  if (authLoading) {
    return <div className="h-40 animate-pulse rounded-2xl bg-gray-100" />;
  }

  if (!isOwner) {
    return (
      <div className="rounded-2xl border border-[#EEEEEE] bg-white p-8 text-center text-[15px] text-[#4B5563]">
        {ar ? 'الصفحة دي لصاحب المنصة بس.' : 'This page is for the platform owner only.'}
      </div>
    );
  }

  const busy = (s: Supervisor) => (toggleActive.isPending && toggleActive.variables?.id === s.id) || (remove.isPending && remove.variables?.id === s.id);
  const iconButton = 'rounded-lg p-2 text-[#6B7280] transition hover:bg-[#F3F4F6] hover:text-[#111827] disabled:opacity-40';

  const statusTag = (s: Supervisor) => (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold ring-1 ring-inset ${s.active ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-gray-100 text-gray-600 ring-gray-500/20'}`}>
      {s.active ? (ar ? 'شغال' : 'Active') : (ar ? 'متوقف' : 'Stopped')}
    </span>
  );

  const actions = (s: Supervisor) => (
    <div className="flex items-center gap-0.5">
      <button type="button" className={iconButton} onClick={() => openEditor(s)} aria-label={ar ? 'تعديل' : 'Edit'} title={ar ? 'تعديل' : 'Edit'}><Pencil className="h-4 w-4" /></button>
      <button type="button" className={iconButton} onClick={() => setViewing(s)} aria-label={ar ? 'النشاط' : 'Activity'} title={ar ? 'النشاط' : 'Activity'}><History className="h-4 w-4" /></button>
      <button type="button" className={iconButton} disabled={busy(s)} onClick={() => toggleActive.mutate(s)} aria-label={s.active ? (ar ? 'إيقاف' : 'Stop') : (ar ? 'تفعيل' : 'Activate')} title={s.active ? (ar ? 'إيقاف' : 'Stop') : (ar ? 'تفعيل' : 'Activate')}>
        {s.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
      <button type="button" className={`${iconButton} hover:!bg-red-50 hover:!text-red-600`} disabled={busy(s)} onClick={() => confirmDelete(s)} aria-label={ar ? 'مسح' : 'Delete'} title={ar ? 'مسح' : 'Delete'}><Trash2 className="h-4 w-4" /></button>
    </div>
  );

  const tiles = [
    { label: ar ? 'كل المشرفين' : 'All supervisors', value: stats.total, icon: Users },
    { label: ar ? 'الشغالين دلوقتي' : 'Active now', value: stats.active, icon: UserCheck },
    { label: ar ? 'إجراءات آخر 30 يوم' : 'Actions in last 30 days', value: stats.actions, icon: Activity },
  ];

  return (
    <div className="flex flex-col pb-10">
      <Toaster position="top-right" />

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-[#111827]">{ar ? 'المشرفين' : 'Supervisors'}</h1>
          <p className="mt-1 max-w-2xl text-[14px] text-[#6B7280]">
            {ar ? 'حسابات بتشتغل نيابة عنك بصلاحيات إنت بتحددها، وكل حاجة بيعملوها بتتسجل عشان تعرف مين عمل إيه.' : 'Accounts that work on your behalf with permissions you choose; everything they do is logged so you know who did what.'}
          </p>
        </div>
        <button type="button" onClick={() => openEditor('new')} className="inline-flex items-center gap-2 rounded-xl bg-[#2137D6] px-4 py-2.5 text-[14px] font-semibold text-white shadow-md shadow-[#2137D6]/20 transition hover:bg-[#1C2EB8]">
          <Plus className="h-4 w-4" />{ar ? 'مشرف جديد' : 'New supervisor'}
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {tiles.map(({ label, value, icon: Icon }, i) => (
          <div key={label} className={`flex items-center justify-between gap-3 rounded-2xl p-5 ${i === 0 ? 'bg-[#0A1033] text-white' : 'border border-[#EEEEEE] bg-white text-[#111827]'}`}>
            <div>
              <p className={`text-[13px] ${i === 0 ? 'text-white/70' : 'text-[#6B7280]'}`}>{label}</p>
              <p className="mt-1 text-[26px] font-bold leading-none">{allQuery.isLoading ? '…' : number.format(value)}</p>
            </div>
            <span className={`rounded-xl p-2.5 ${i === 0 ? 'bg-white/10' : 'bg-[#F4F5FD] text-[#2137D6]'}`}><Icon className="h-5 w-5" /></span>
          </div>
        ))}
      </div>

      <label className="relative mb-4 w-full sm:w-80">
        <span className="sr-only">{ar ? 'دوّر' : 'Search'}</span>
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={ar ? 'دوّر بالاسم أو الإيميل أو الموبايل' : 'Search by name, email or phone'} className="w-full rounded-xl border border-[#EEEEEE] bg-white py-2.5 pe-3 ps-9 text-[14px] focus:border-[#2137D6] focus:outline-none focus:ring-2 focus:ring-[#2137D6]/20" />
      </label>

      {listQuery.isLoading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-100" />)}</div>
      ) : listQuery.isError ? (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#EEEEEE] bg-white p-6">
          <p className="text-[14px] text-red-600">{getApiErrorMessage(listQuery.error, ar ? 'ماقدرناش نحمّل المشرفين' : 'Could not load supervisors')}</p>
          <button type="button" onClick={() => listQuery.refetch()} className="rounded-xl bg-[#2137D6]/5 px-4 py-2 text-[14px] font-semibold text-[#2137D6] hover:bg-[#2137D6]/10">{ar ? 'حاول تاني' : 'Retry'}</button>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#E5E7EB] bg-white px-6 py-14 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-[#C7CDF5]" />
          <p className="mt-3 text-[16px] font-semibold text-[#111827]">{debouncedSearch ? (ar ? 'مفيش مشرف بالبحث ده' : 'No supervisor matches this search') : (ar ? 'لسه مفيش مشرفين' : 'No supervisors yet')}</p>
          {!debouncedSearch && <p className="mt-1 text-[14px] text-[#6B7280]">{ar ? 'ضيف مشرف وحدد له يقدر يعمل إيه بالظبط.' : 'Add a supervisor and choose exactly what they can do.'}</p>}
        </div>
      ) : (
        <div className={`transition-opacity ${listQuery.isFetching ? 'opacity-70' : ''}`}>
          {/* Wide screens: table */}
          <div className="hidden overflow-x-auto rounded-2xl border border-[#EEEEEE] bg-white lg:block">
            <table className="w-full text-start text-[14px]">
              <thead className="bg-[#F9FAFB] text-[12px] text-[#6B7280]">
                <tr>
                  <th className="px-4 py-3 text-start font-semibold">{ar ? 'المشرف' : 'Supervisor'}</th>
                  <th className="px-4 py-3 text-start font-semibold">{ar ? 'الموبايل' : 'Phone'}</th>
                  <th className="px-4 py-3 text-start font-semibold">{ar ? 'الصلاحيات' : 'Permissions'}</th>
                  <th className="px-4 py-3 text-start font-semibold">{ar ? 'آخر ظهور' : 'Last seen'}</th>
                  <th className="px-4 py-3 text-start font-semibold">{ar ? 'إجراءات 30 يوم' : 'Actions (30d)'}</th>
                  <th className="px-4 py-3 text-start font-semibold">{ar ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3"><span className="sr-only">{ar ? 'إجراءات' : 'Actions'}</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {rows.map((s) => {
                  const perm = summary(s, catalog);
                  return (
                    <tr key={s.id} className="align-middle">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[#111827]">{s.first_name} {s.last_name}</p>
                        <p className="text-[12px] text-[#6B7280]" dir="ltr">{s.email}</p>
                      </td>
                      <td className="px-4 py-3 text-[#4B5563]">{s.phone ? <span dir="ltr">{s.phone}</span> : '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-lg px-2 py-1 text-[12px] font-semibold ${perm.preset ? 'bg-[#F4F5FD] text-[#2137D6]' : 'bg-[#F3F4F6] text-[#4B5563]'}`}>{perm.text}</span>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[#4B5563]">{formatDate(s.last_seen_at ?? s.last_action_at) ?? (ar ? 'لسه مادخلش' : 'Never')}</td>
                      <td className="px-4 py-3 font-semibold text-[#111827]">{number.format(s.actions_30_days ?? 0)}</td>
                      <td className="px-4 py-3">{statusTag(s)}</td>
                      <td className="px-4 py-3">{actions(s)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Phones and tablets: cards */}
          <div className="space-y-3 lg:hidden">
            {rows.map((s) => {
              const perm = summary(s, catalog);
              return (
                <article key={s.id} className="rounded-2xl border border-[#EEEEEE] bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-[#111827]">{s.first_name} {s.last_name}</p>
                      <p className="truncate text-[12px] text-[#6B7280]" dir="ltr">{s.email}</p>
                      {s.phone && <p className="text-[12px] text-[#6B7280]" dir="ltr">{s.phone}</p>}
                    </div>
                    {statusTag(s)}
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
                    <div className="col-span-2 flex flex-wrap items-center gap-2">
                      <dt className="text-[#6B7280]">{ar ? 'الصلاحيات:' : 'Permissions:'}</dt>
                      <dd className={`rounded-lg px-2 py-0.5 font-semibold ${perm.preset ? 'bg-[#F4F5FD] text-[#2137D6]' : 'bg-[#F3F4F6] text-[#4B5563]'}`}>{perm.text}</dd>
                    </div>
                    <div>
                      <dt className="text-[#6B7280]">{ar ? 'آخر ظهور' : 'Last seen'}</dt>
                      <dd className="text-[#111827]">{formatDate(s.last_seen_at ?? s.last_action_at) ?? (ar ? 'لسه مادخلش' : 'Never')}</dd>
                    </div>
                    <div>
                      <dt className="text-[#6B7280]">{ar ? 'إجراءات 30 يوم' : 'Actions (30d)'}</dt>
                      <dd className="font-semibold text-[#111827]">{number.format(s.actions_30_days ?? 0)}</dd>
                    </div>
                  </dl>
                  <div className="mt-3 flex justify-end border-t border-[#F3F4F6] pt-2">{actions(s)}</div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {editing && catalog && (
        <SupervisorEditor
          catalog={catalog}
          supervisor={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refresh(); }}
        />
      )}
      {viewing && <SupervisorActivity supervisor={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
