"use client";

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocale } from 'next-intl';
import { useDebounce } from 'use-debounce';
import { toast } from 'sonner';
import api, { getApiErrorMessage, type LessonViewerRow } from '@/src/lib/api';
import { useCurrentUser } from '@/src/hooks/useAuth';
import { can } from '@/src/lib/permissions';

export default function LessonViewers({ chapterId }: { chapterId: number }) {
  const ar = useLocale() === 'ar';
  const { user, role } = useCurrentUser();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search.trim(), 400);
  const [adjusting, setAdjusting] = useState<LessonViewerRow | null>(null);
  const [amount, setAmount] = useState('1');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: debouncedSearch ? ['lessonViewers', chapterId, page, debouncedSearch] : ['lessonViewers', chapterId, page],
    queryFn: () => debouncedSearch ? api.chapters.viewers(chapterId, page, debouncedSearch) : api.chapters.viewers(chapterId, page),
  });
  // The adjust API is admin-only; supervisors also need views.manage. Hidden when the lesson has no limit.
  const canAdjust = (role === 'Admin' || role === 'Super Admin') && can(user, 'views.manage') && !!data?.max_views;
  const n = Math.floor(Number(amount));
  const validAmount = Number.isFinite(n) && n >= 1 && n <= 100;
  const unlimited = ar ? 'غير محدود' : 'Unlimited';

  const openAdjust = (row: LessonViewerRow) => { setAdjusting(row); setAmount('1'); setNote(''); };
  const submitAdjust = async (sign: 1 | -1) => {
    if (!adjusting || !validAmount) return;
    setSaving(true);
    try {
      const result = await api.chapters.adjustViews(chapterId, adjusting.user.id, sign * n, note.trim() || undefined);
      const limit = result.data.max_views;
      toast.success(ar
        ? `تم التعديل. الحد الجديد لـ ${adjusting.user.first_name}: ${limit || unlimited} (المتبقي ${result.data.remaining_views})`
        : `Updated. New limit for ${adjusting.user.first_name}: ${limit || unlimited} (${result.data.remaining_views} left)`);
      setAdjusting(null);
      void refetch?.();
    } catch (err) {
      toast.error(getApiErrorMessage(err, ar ? 'تعذر تعديل المشاهدات' : 'Could not change the views'));
    } finally { setSaving(false); }
  };

  const searchLabel = ar ? 'ابحث برقم الموبايل أو الاسم أو الكود' : 'Search by phone, name or code';
  const searchBox = <input
    type="search"
    value={search}
    onChange={e => { setSearch(e.target.value); setPage(1); }}
    placeholder={searchLabel}
    aria-label={searchLabel}
    className="w-full rounded-lg border px-3 py-2 text-sm"
  />;

  if (error) return <div className="space-y-3">{searchBox}<p role="alert">{ar ? 'تعذر تحميل مشاهدات الدرس' : 'Could not load lesson views'}</p></div>;
  if (isLoading || !data) return <div className="space-y-3">{searchBox}<p role="status">{ar ? 'جارٍ تحميل المشاهدات…' : 'Loading lesson views…'}</p></div>;
  return <div className="space-y-3">
    {searchBox}
    <p className="text-sm text-gray-600">{ar ? 'المشاهدات تخص هذا الدرس فقط، ولكل طالب عدّاد مستقل.' : 'Views are for this lesson only. Each student has an independent counter.'}</p>
    <p className="text-sm">{ar ? 'الحد المسموح لكل طالب' : 'Limit per student'}: {data.max_views || (ar ? 'بلا حد' : 'Unlimited')}</p>
    {!data.data.length && <p>{debouncedSearch ? (ar ? 'مفيش طالب مطابق للبحث' : 'No student matches your search') : (ar ? 'لا توجد مشاهدات مسجلة لهذا الدرس' : 'No views recorded for this lesson')}</p>}
    {data.data.map(view => {
      const extra = view.extra_views ?? 0;
      const limit = view.max_views ?? data.max_views;
      return <article key={view.id ?? `u-${view.user.id}`} className="flex flex-wrap items-center justify-between gap-3 border-b py-3">
        <div className="min-w-0"><p className="font-medium">{view.user.first_name} {view.user.last_name}</p><p className="break-words text-xs text-gray-500">{[view.user.phone, view.user.email || view.user.student_code].filter(Boolean).join(' · ')}</p></div>
        <div className="text-sm">
          <p>{ar ? 'المشاهدات المستخدمة' : 'Used views'}: {view.count}</p>
          <p className="flex flex-wrap items-center gap-1">{ar ? 'حد الطالب' : 'Student limit'}: {limit || unlimited}
            {extra !== 0 && <span dir="ltr" className={`rounded-full px-2 py-0.5 text-xs font-semibold ${extra > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{extra > 0 ? `+${extra}` : `−${Math.abs(extra)}`}</span>}
          </p>
          <p>{ar ? 'المشاهدات المتبقية' : 'Remaining views'}: {view.remaining_views ?? (ar ? 'بلا حد' : 'Unlimited')}</p>
          {view.created_at && <time className="text-xs text-gray-500">{new Date(view.created_at).toLocaleString(ar ? 'ar' : 'en')}</time>}
        </div>
        {canAdjust && <button type="button" onClick={() => openAdjust(view)} className="rounded-lg border border-primary px-3 py-1.5 text-sm text-primary hover:bg-blue-50">{ar ? 'زوّد / قلّل' : 'Add / reduce'}</button>}
      </article>;
    })}
    {data.last_page > 1 && <div className="flex items-center justify-between">
      <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>{ar ? 'السابق' : 'Previous'}</button>
      <span>{page} / {data.last_page}</span>
      <button type="button" disabled={page >= data.last_page} onClick={() => setPage(page + 1)}>{ar ? 'التالي' : 'Next'}</button>
    </div>}
    {adjusting && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="adjust-views-title">
      <form className="w-full max-w-sm space-y-3 rounded-xl bg-white p-4 shadow-xl" onSubmit={e => { e.preventDefault(); void submitAdjust(1); }}>
        <h4 id="adjust-views-title" className="font-semibold">{ar ? 'تعديل مشاهدات' : 'Change views for'} {adjusting.user.first_name} {adjusting.user.last_name}</h4>
        <p className="text-sm text-gray-600">{ar ? 'الحد الحالي' : 'Current limit'}: {(adjusting.max_views ?? data.max_views) || unlimited} · {ar ? 'استخدم' : 'Used'}: {adjusting.count}</p>
        <label className="block text-sm">{ar ? 'عدد المشاهدات' : 'Number of views'}
          <input type="number" inputMode="numeric" min={1} max={100} step={1} required value={amount} onChange={e => setAmount(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
        </label>
        {!validAmount && <p className="text-xs text-red-600">{ar ? 'اكتب رقم من 1 لـ 100' : 'Enter a number from 1 to 100'}</p>}
        <label className="block text-sm">{ar ? 'ملاحظة (اختياري)' : 'Note (optional)'}
          <input type="text" maxLength={255} value={note} onChange={e => setNote(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={saving || !validAmount} className="flex-1 rounded-lg bg-green-600 px-3 py-2 text-sm text-white disabled:opacity-50">{ar ? 'زوّد' : 'Add'}</button>
          <button type="button" disabled={saving || !validAmount} onClick={() => void submitAdjust(-1)} className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm text-white disabled:opacity-50">{ar ? 'قلّل' : 'Reduce'}</button>
          <button type="button" disabled={saving} onClick={() => setAdjusting(null)} className="rounded-lg border px-3 py-2 text-sm">{ar ? 'رجوع' : 'Back'}</button>
        </div>
      </form>
    </div>}
  </div>;
}
