"use client";

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useLocale } from 'next-intl';
import StaffActivityDetails from '@/components/dashboard/StaffActivityDetails';
import { formatStaffActivity } from '@/src/lib/staff-activity';
import { toast } from 'sonner';
import api, { type StaffActivity, type DeviceTransfer, type DeviceDetails } from '@/src/lib/api';
import { useCurrentUser } from '@/src/hooks/useAuth';

export default function OwnerActivityPage() {
  const ar = useLocale() === 'ar';
  const { role } = useCurrentUser();
  const [activity, setActivity] = useState<StaffActivity[]>([]);
  const [devices, setDevices] = useState<DeviceTransfer[]>([]);
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [lastPage, setLastPage] = useState(1);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [activityRole, setActivityRole] = useState<'' | 'Instructor' | 'Admin' | 'Supervisor'>('');
  const [activityLoading, setActivityLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => {
    const timer = window.setTimeout(() => { setQuery(search.trim()); setPage(1); }, 400);
    return () => window.clearTimeout(timer);
  }, [search]);
  const [activityType, setActivityType] = useState<NonNullable<Parameters<typeof api.ownerOperations.activity>[1]>['type'] | ''>('');
  // "Who": a person among those of the chosen group (instructors, admins, supervisors).
  const [personId, setPersonId] = useState('');
  const [people, setPeople] = useState<Awaited<ReturnType<typeof api.ownerOperations.activityPeople>>['data']>([]);
  useEffect(() => {
    if (role !== 'Super Admin') return;
    let active = true;
    api.ownerOperations.activityPeople().then(result => { if (active) setPeople(result.data); }).catch(() => {});
    return () => { active = false; };
  }, [role]);
  const peopleOfGroup = people.filter(person => !activityRole || person.group === activityRole);
  useEffect(() => {
    if (role !== 'Super Admin') return;
    let active = true;
    setActivityLoading(true);
    setActivity([]);
    setError(false);
    api.ownerOperations.activity(page, { from: from || undefined, to: to || undefined, role: activityRole || undefined, type: activityType || undefined, search: query || undefined, user_id: personId || undefined }).then(history => {
      if (!active) return;
      setActivity(history.data); setLastPage(history.last_page); setError(false);
    }).catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setActivityLoading(false); });
    return () => { active = false; };
  }, [role, page, from, to, activityRole, activityType, query, personId]);
  useEffect(() => {
    if (role !== 'Super Admin' && role !== 'Admin') return;
    let active = true;
    const load = () => api.ownerOperations.devices().then(transfers => { if (active) setDevices(transfers.data); }).catch(() => { if (active) setError(true); });
    load();
    const timer = window.setInterval(load, 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, [role]);
  async function resolveDevice(id: string, action: 'approve' | 'cancel') {
    if (action === 'cancel' && !window.confirm(ar ? 'إلغاء طلب نقل الجهاز؟ سيبقى الجهاز المعتمد والجلسات الحالية كما هما.' : 'Cancel this transfer request? The approved device and current sessions will be kept.')) return;
    setBusy(id);
    try {
      await api.ownerOperations[action](id);
      setDevices(prev => prev.filter(device => device.id !== id));
      toast.success(action === 'approve'
        ? (ar ? 'تم اعتماد الجهاز الجديد وإلغاء الجلسات السابقة' : 'New device approved. Previous sessions revoked.')
        : (ar ? 'تم إلغاء طلب النقل. الجهاز المعتمد والجلسات الحالية كما هما.' : 'Transfer request cancelled. The approved device and current sessions are unchanged.'));
    } catch {
      toast.error(ar ? 'تعذر تحديث طلب نقل الجهاز' : 'Could not update the transfer request');
    } finally { setBusy(null); }
  }
  if (role !== 'Super Admin' && role !== 'Admin') return <p>{ar ? 'هذه الصفحة متاحة للمالك والأدمن فقط' : 'This page is available to the Owner and Admin only'}</p>;
  return <div className="space-y-6 pb-12">
    <h1 className="text-2xl font-bold">{role === 'Admin' ? (ar ? 'طلبات الأجهزة' : 'Device requests') : (ar ? 'النشاط على المنصة' : 'Platform activity')}</h1>
    {error && <p role="alert">{ar ? 'تعذر تحميل البيانات' : 'Could not load data'}</p>}
    <h2 id="devices" className="scroll-mt-24 text-lg font-bold">{ar ? 'طلبات الأجهزة' : 'Device requests'}</h2>
    {!devices.length && <p>{ar ? 'لا توجد طلبات معلقة' : 'No pending requests'}</p>}
    {devices.map(device => <article key={device.id} id={`device-${device.id}`} className="flex scroll-mt-24 flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4"><div className="space-y-2"><p className="font-bold">{device.first_name} {device.last_name} · {device.phone}</p>
      {typeof device.remaining_device_transfers === 'number' && <p className="text-sm text-gray-600">{ar ? `مرات تغيير الجهاز المتبقية: ${device.remaining_device_transfers} من 2` : `Device changes remaining: ${device.remaining_device_transfers} of 2`}</p>}
      {([['current_device', ar ? 'الجهاز الحالي' : 'Current device'], ['requested_device', ar ? 'الجهاز المطلوب' : 'Requested device']] as const).map(([key, label]) => {
        const info: DeviceDetails | null = device[key];
        return <div key={key} className="text-sm"><p>{label}: {info ? `${info.device} · ${info.browser} · ${info.identifier}` : (ar ? 'التفاصيل غير متاحة؛ تظهر بعد تسجيل الدخول من الجهاز' : 'Details unavailable; captured on the next sign-in from this device')}</p>
          {info && <p className="text-xs text-gray-500"><span dir="ltr">IP: {info.ip}</span> · {new Date(info.at).toLocaleString(ar ? 'ar' : 'en')}</p>}</div>;
      })}
    </div><div className="flex flex-wrap gap-3">
      <button type="button" disabled={busy === device.id || device.remaining_device_transfers === 0} className="text-primary underline disabled:opacity-50" onClick={() => resolveDevice(device.id, 'approve')}>{ar ? 'اعتماد الجهاز الجديد' : 'Approve new device'}</button>
      <button type="button" disabled={busy === device.id} className="text-red-600 underline disabled:opacity-50" onClick={() => resolveDevice(device.id, 'cancel')}>{ar ? 'إلغاء الطلب' : 'Cancel request'}</button>
    </div></article>)}
    {role === 'Super Admin' && <>
    {/* Filters and search stay at the top while the activity scrolls under them. */}
    <div className="sticky -top-4 z-20 -mx-4 space-y-3 border-b border-[#E6EAF6] bg-[#F7F8FD] px-4 py-3 shadow-[0_6px_12px_-10px_rgba(15,23,42,0.25)] md:-top-8 md:-mx-8 md:px-8 lg:-top-12 lg:-mx-12 lg:px-12">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-[#0A1033]">{ar ? 'نشاط آخر ٩٠ يومًا' : 'Activity over the past 90 days'}</h2>
        {activityLoading && <span role="status" className="text-xs text-[#64748B]">{ar ? 'جارٍ التحميل…' : 'Loading…'}</span>}
      </div>
      <label className="relative block">
        <span className="sr-only">{ar ? 'بحث في النشاط' : 'Search activity'}</span>
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
        <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder={ar ? 'ابحث باسم اللي عمل العملية، أو اسم أو تليفون الطالب، أو اسم المادة أو الرابط…' : 'Search by who did it, a student name or phone, a course or link…'} className="w-full ps-9 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2137D6] focus:ring-2 focus:ring-[#2137D6]/15" />
      </label>
      <div className="flex flex-wrap items-end gap-2">
        <select aria-label={ar ? 'منفّذ العملية' : 'Performed by'} value={activityRole} onChange={event => { setActivityRole(event.target.value as typeof activityRole); setPersonId(''); setPage(1); }} className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2137D6] focus:ring-2 focus:ring-[#2137D6]/15">
          <option value="">{ar ? 'كل المنفّذين' : 'Everyone'}</option>
          <option value="Instructor">{ar ? 'المدرسون' : 'Instructors'}</option>
          <option value="Admin">{ar ? 'الأدمن' : 'Admins'}</option>
          <option value="Supervisor">{ar ? 'المشرفين' : 'Supervisors'}</option>
        </select>
        <select aria-label={ar ? 'الشخص' : 'Person'} value={personId} onChange={event => { setPersonId(event.target.value); setPage(1); }} className="max-w-[16rem] rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2137D6] focus:ring-2 focus:ring-[#2137D6]/15">
          <option value="">{activityRole === 'Instructor' ? (ar ? 'كل المدرسين' : 'All instructors') : activityRole === 'Supervisor' ? (ar ? 'كل المشرفين' : 'All supervisors') : activityRole === 'Admin' ? (ar ? 'كل الأدمن' : 'All admins') : (ar ? 'كل الأشخاص' : 'Everyone')}</option>
          {peopleOfGroup.map(person => <option key={person.id} value={person.id}>{person.name || '—'} ({person.actions})</option>)}
        </select>
        <select aria-label={ar ? 'نوع العملية' : 'Activity type'} value={activityType} onChange={event => { setActivityType(event.target.value as typeof activityType); setPage(1); }} className="max-w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2137D6] focus:ring-2 focus:ring-[#2137D6]/15">
          <option value="">{ar ? 'كل الأنواع' : 'All types'}</option>
          <option value="device-requests">{ar ? 'طلبات نقل الأجهزة' : 'Device transfer requests'}</option>
          <option value="device-decisions">{ar ? 'اعتماد الأجهزة وإلغاء الطلبات والسماح بالتغيير' : 'Device approvals, cancellations and resets'}</option>
          <option value="courses">{ar ? 'المواد' : 'Courses'}</option>
          <option value="lessons">{ar ? 'المحاضرات والدروس' : 'Lectures and lessons'}</option>
          <option value="accounts">{ar ? 'حسابات المستخدمين' : 'User accounts'}</option>
          <option value="activations">{ar ? 'التفعيلات' : 'Activations'}</option>
          <option value="exams">{ar ? 'الامتحانات وبنك الأسئلة' : 'Exams and question bank'}</option>
          <option value="live">{ar ? 'البث المباشر' : 'Live sessions'}</option>
          <option value="notes-library">{ar ? 'الملاحظات والمكتبة' : 'Notes and library'}</option>
          <option value="community">{ar ? 'المجتمع والنقاشات وروابط التواصل' : 'Community, discussions and links'}</option>
          <option value="notifications">{ar ? 'الإشعارات' : 'Notifications'}</option>
          <option value="structure">{ar ? 'المخطط الأكاديمي والجداول' : 'Academic plan and schedules'}</option>
          <option value="staff">{ar ? 'المشرفين وملفات الصلاحيات وملاحظات الطلاب' : 'Supervisors, permission profiles, student notes'}</option>
          <option value="settings">{ar ? 'الإعدادات' : 'Settings'}</option>
          <option value="logins">{ar ? 'تسجيل الدخول' : 'Sign-ins'}</option>
        </select>
        <button type="button" className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${from === new Date().toLocaleDateString('en-CA') && to === from ? 'border-[#2137D6] bg-[#2137D6] text-white' : 'border-[#E5E7EB] bg-white text-[#334155] hover:border-[#2137D6]/40'}`} onClick={() => { const today = new Date().toLocaleDateString('en-CA'); setFrom(today); setTo(today); setPage(1); }}>{ar ? 'اليوم' : 'Today'}</button>
        <button type="button" className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${Boolean(from) && from !== to ? 'border-[#2137D6] bg-[#2137D6] text-white' : 'border-[#E5E7EB] bg-white text-[#334155] hover:border-[#2137D6]/40'}`} onClick={() => { const today = new Date(); const start = new Date(); start.setDate(start.getDate() - 6); setFrom(start.toLocaleDateString('en-CA')); setTo(today.toLocaleDateString('en-CA')); setPage(1); }}>{ar ? 'آخر ٧ أيام' : 'Last 7 days'}</button>
        <button type="button" className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${!from && !to ? 'border-[#2137D6] bg-[#2137D6] text-white' : 'border-[#E5E7EB] bg-white text-[#334155] hover:border-[#2137D6]/40'}`} onClick={() => { setFrom(''); setTo(''); setPage(1); }}>{ar ? 'آخر ٩٠ يومًا' : 'Last 90 days'}</button>
        <label className="flex items-center gap-1.5 text-sm text-[#475569]">{ar ? 'من' : 'From'}<input type="date" value={from} max={to || undefined} onChange={event => { setFrom(event.target.value); setPage(1); }} className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2137D6] focus:ring-2 focus:ring-[#2137D6]/15" /></label>
        <label className="flex items-center gap-1.5 text-sm text-[#475569]">{ar ? 'إلى' : 'To'}<input type="date" value={to} min={from || undefined} onChange={event => { setTo(event.target.value); setPage(1); }} className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2137D6] focus:ring-2 focus:ring-[#2137D6]/15" /></label>
        {(search || activityRole || personId || activityType || from || to) && <button type="button" onClick={() => { setSearch(''); setActivityRole(''); setPersonId(''); setActivityType(''); setFrom(''); setTo(''); setPage(1); }} className="px-2 py-2.5 text-sm font-semibold text-[#2137D6] hover:underline">{ar ? 'مسح الفلاتر' : 'Clear filters'}</button>}
      </div>
    </div>
    {!activityLoading && !error && !activity.length && <p className="rounded-2xl border border-dashed border-[#D1D5DB] bg-white p-8 text-center text-sm text-[#64748B]">{ar ? 'لا توجد أنشطة تطابق البحث أو الفلاتر' : 'No activity matches the search or filters'}</p>}
    <ol className={`space-y-3 transition-opacity ${activityLoading ? 'opacity-60' : ''}`}>
      {activity.map(item => {
        const name = `${item.first_name ?? ''} ${item.last_name ?? ''}`.trim() || '—';
        const supervisor = Boolean((item as StaffActivity & { is_supervisor?: unknown }).is_supervisor);
        return <li key={item.id} className="rounded-2xl border border-[#EEF0F6] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#F4F6FD] text-sm font-bold text-[#2137D6]">{name.charAt(0)}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-semibold text-[#0F172A]">{name}</span>
                {supervisor && <span className="rounded-full bg-[#F4F5FD] px-2 py-0.5 text-xs font-semibold text-[#2137D6]">{ar ? 'مشرف' : 'Supervisor'}</span>}
                <time className="ms-auto text-xs text-[#94A3B8]" dateTime={item.created_at}>{new Date(item.created_at).toLocaleString(ar ? 'ar-EG' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</time>
              </div>
              <p className="mt-0.5 text-sm font-medium text-[#334155]">{formatStaffActivity(item.action, ar ? 'ar' : 'en')}</p>
              <StaffActivityDetails details={item.details} />
            </div>
          </div>
        </li>;
      })}
    </ol>
    {lastPage > 1 && <div className="flex items-center justify-center gap-3 pb-4">
      <button type="button" className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40" disabled={activityLoading || page <= 1} onClick={() => setPage(page - 1)}>{ar ? 'السابق' : 'Previous'}</button>
      <span className="text-sm text-[#475569]">{page} / {lastPage}</span>
      <button type="button" className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40" disabled={activityLoading || page >= lastPage} onClick={() => setPage(page + 1)}>{ar ? 'التالي' : 'Next'}</button>
    </div>}
    </>}
  </div>;
}
