'use client';

import React, { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { History, X } from 'lucide-react';
import api, { getApiErrorMessage, type Supervisor } from '@/src/lib/api';
import StaffActivityDetails from '@/components/dashboard/StaffActivityDetails';

const METHODS: Record<string, readonly [string, string]> = {
  POST: ['إضافة', 'Added'],
  PUT: ['تعديل', 'Edited'],
  PATCH: ['تعديل', 'Edited'],
  DELETE: ['حذف', 'Deleted'],
  GET: ['عرض', 'Viewed'],
};

const SECTIONS: [RegExp, readonly [string, string]][] = [
  [/^code(\/|$)/, ['الأكواد', 'activation codes']],
  [/^pre-activation(\/|$)/, ['التفعيل المسبق', 'pre-activation']],
  [/^quiz/, ['الامتحانات', 'exams']],
  [/^post(\/|$)/, ['المجتمع', 'community']],
  [/^timetable(\/|$)/, ['الجداول', 'schedules']],
  [/^student(\/|$)/, ['الطلاب', 'students']],
  [/^(chapter|lecture|course)(\/|$)/, ['المخطط الأكاديمي', 'academic plan']],
  [/^notifications(\/|$)/, ['الإشعارات', 'notifications']],
  [/^(owner\/)?device-transfers(\/|$)/, ['الأجهزة', 'devices']],
];

/** "POST v1/code" -> "إضافة · الأكواد" */
export function describeSupervisorAction(action: string, ar: boolean): { verb: string; section: string } {
  const [rawMethod = '', rawPath = ''] = action.trim().split(/\s+/);
  const method = rawMethod.toUpperCase();
  const path = rawPath.split(/[?#]/)[0].replace(/^\/?(?:api\/)?v1\//, '').replace(/^\//, '').replace(/\/$/, '');
  const lang = ar ? 0 : 1;
  const verb = METHODS[method]?.[lang] ?? method;
  const section = SECTIONS.find(([pattern]) => pattern.test(path))?.[1][lang] ?? path;
  return { verb, section };
}

interface Props {
  supervisor: Supervisor;
  onClose: () => void;
}

export default function SupervisorActivity({ supervisor, onClose }: Props) {
  const locale = useLocale();
  const ar = locale === 'ar';
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['supervisor-activity', supervisor.id, page],
    queryFn: () => api.supervisors.activity(supervisor.id, page),
    placeholderData: (previous) => previous,
  });
  const lastPage = data?.last_page ?? 1;
  const formatDate = (iso: string) => new Intl.DateTimeFormat(ar ? 'ar-EG' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside role="dialog" aria-modal="true" aria-labelledby="supervisor-activity-title" className="flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-[#F3F4F6] px-5 py-4">
          <div className="min-w-0">
            <h2 id="supervisor-activity-title" className="text-[17px] font-bold text-[#111827]">{ar ? 'سجل نشاط المشرف' : 'Supervisor activity'}</h2>
            <p className="mt-0.5 truncate text-[13px] text-[#6B7280]">{supervisor.first_name} {supervisor.last_name}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={ar ? 'إغلاق' : 'Close'} className="rounded-xl p-2 text-[#6B7280] hover:bg-[#F3F4F6]"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isLoading ? (
            <div className="space-y-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />)}</div>
          ) : isError ? (
            <div className="space-y-3 rounded-2xl border border-[#EEEEEE] p-4">
              <p className="text-[14px] text-red-600">{getApiErrorMessage(error, ar ? 'ماقدرناش نحمّل النشاط' : 'Could not load activity')}</p>
              <button type="button" onClick={() => refetch()} className="rounded-xl bg-[#2137D6]/5 px-4 py-2 text-[14px] font-semibold text-[#2137D6] hover:bg-[#2137D6]/10">{ar ? 'حاول تاني' : 'Retry'}</button>
            </div>
          ) : !data?.data.length ? (
            <div className="px-4 py-14 text-center">
              <History className="mx-auto h-10 w-10 text-[#C7CDF5]" />
              <p className="mt-3 text-[15px] font-semibold text-[#111827]">{ar ? 'لسه ماعملش أي حاجة' : 'No activity yet'}</p>
              <p className="mt-1 text-[13px] text-[#6B7280]">{ar ? 'أول ما المشرف يعمل أي إجراء هيظهر هنا.' : 'Actions this supervisor takes will show up here.'}</p>
            </div>
          ) : (
            <ol className={`space-y-2.5 transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
              {data.data.map((item) => {
                const { verb, section } = describeSupervisorAction(item.action, ar);
                return (
                  <li key={item.id} className="rounded-xl border border-[#EEEEEE] p-3">
                    <p className="text-[14px] text-[#111827]">
                      <span className="font-bold">{verb}</span>
                      <span className="text-[#6B7280]"> · </span>
                      <span>{section}</span>
                    </p>
                    <StaffActivityDetails details={item.details} />
                    <time dateTime={item.created_at} className="mt-1 block text-[12px] text-[#6B7280]">{formatDate(item.created_at)}</time>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {lastPage > 1 && (
          <div className="flex items-center justify-center gap-3 border-t border-[#F3F4F6] px-5 py-3">
            <button type="button" onClick={() => setPage((p) => p - 1)} disabled={page <= 1 || isFetching} className="rounded-xl border border-[#EEEEEE] bg-white px-4 py-2 text-[14px] font-semibold disabled:opacity-40">{ar ? 'السابق' : 'Previous'}</button>
            <span className="text-[14px] text-[#6B7280]">{ar ? `صفحة ${page} من ${lastPage}` : `Page ${page} of ${lastPage}`}</span>
            <button type="button" onClick={() => setPage((p) => p + 1)} disabled={page >= lastPage || isFetching} className="rounded-xl border border-[#EEEEEE] bg-white px-4 py-2 text-[14px] font-semibold disabled:opacity-40">{ar ? 'التالي' : 'Next'}</button>
          </div>
        )}
      </aside>
    </div>
  );
}
