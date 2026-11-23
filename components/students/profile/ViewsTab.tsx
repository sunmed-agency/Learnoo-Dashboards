'use client';

import React, { useMemo, useState } from 'react';
import { Clock3, Eye, History, Loader2, Search, SlidersHorizontal } from 'lucide-react';
import { formatClock, formatWatchTime, toMinutes } from '@/src/lib/watch-time';
import type { StudentChapterViews, StudentViews } from '@/src/lib/api';
import AdjustViewsModal from './AdjustViewsModal';
import { Card, EmptyState, formatDate, inputClass, tdClass, thClass, useTr } from './shared';

export default function ViewsTab({ studentId, views, isLoading, isError, canManage, onChanged }: {
  studentId: string;
  views: StudentViews | undefined;
  isLoading: boolean;
  isError: boolean;
  canManage: boolean;
  onChanged: () => void;
}) {
  const { ar, tr } = useTr();
  const [course, setCourse] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<StudentChapterViews | null>(null);

  const chapters = useMemo(() => views?.chapters ?? [], [views]);
  const courses = useMemo(() => Array.from(new Set(chapters.map((c) => c.course).filter((c): c is string => Boolean(c)))).sort(), [chapters]);
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return chapters.filter((c) => (!course || c.course === course) && (!q || c.chapter.toLowerCase().includes(q) || (c.lecture ?? '').toLowerCase().includes(q)));
  }, [chapters, course, search]);

  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-[#2137D6]" /></div>;
  }
  if (isError || !views) {
    return <EmptyState>{tr('مقدرناش نجيب المشاهدات. جرّب تحدّث الصفحة.', 'Could not load the views. Try refreshing the page.')}</EmptyState>;
  }

  return (
    <div className="flex flex-col gap-5">
      <Card
        title={<>{tr('المشاهدات', 'Views')} <span className="rounded-full bg-[#F4F6FD] px-2 py-0.5 text-[12px] font-bold text-[#2137D6]">{tr(`الإجمالي ${views.total_views}`, `Total ${views.total_views}`)}</span>{(views.total_watched_seconds ?? 0) > 0 && <span className="ms-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[12px] font-bold text-emerald-700"><Clock3 className="h-3 w-3" />{tr(`وقت المشاهدة ${formatWatchTime(views.total_watched_seconds, true)}`, `Watched ${formatWatchTime(views.total_watched_seconds, false)}`)}</span>}</>}
        icon={Eye}
        bodyClassName="p-0"
      >
        <div className="flex flex-col gap-2 border-b border-[#F3F4F6] p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tr('دوّر باسم الدرس', 'Search by lesson name')} className={`${inputClass} ps-9`} />
          </div>
          <select value={course} onChange={(e) => setCourse(e.target.value)} className={`${inputClass} font-semibold sm:w-60`}>
            <option value="">{tr('كل المواد', 'All subjects')}</option>
            {courses.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {rows.length === 0 ? (
          <div className="p-5"><EmptyState>{chapters.length === 0 ? tr('مفيش دروس عند الطالب ده لسه', 'This student has no lessons yet') : tr('مفيش نتايج للبحث ده', 'No results for this search')}</EmptyState></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] border-collapse">
              <thead className="bg-[#F9FAFB]">
                <tr>
                  <th className={thClass}>{tr('الدرس', 'Lesson')}</th>
                  <th className={thClass}>{tr('المادة', 'Subject')}</th>
                  <th className={thClass}>{tr('شاف', 'Views')}</th>
                  <th className={thClass}>{tr('الحد', 'Limit')}</th>
                  <th className={thClass}>{tr('المتبقي', 'Remaining')}</th>
                  <th className={thClass}>{tr('آخر دقيقة وصلها', 'Last position')}</th>
                  <th className={thClass}>{tr('إجمالي المشاهدة', 'Total watched')}</th>
                  <th className={thClass}>{tr('الرصيد للمشاهدة الجاية', 'Toward next view')}</th>
                  <th className={thClass}>{tr('آخر مشاهدة', 'Last viewed')}</th>
                  {canManage && <th className={thClass}><span className="sr-only">{tr('إجراءات', 'Actions')}</span></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {rows.map((c) => {
                  const unlimited = c.base_limit === 0;
                  const exhausted = !unlimited && c.remaining_views !== null && c.remaining_views <= 0;
                  return (
                    <tr key={c.chapter_id} className="hover:bg-[#F9FAFB]">
                      <td className="max-w-[260px] px-4 py-3">
                        <p className="truncate text-[14px] font-semibold text-[#111827]">{c.chapter}</p>
                        {c.lecture && <p className="truncate text-[12px] text-[#6B7280]">{c.lecture}</p>}
                      </td>
                      <td className={`${tdClass} text-[#4B5563]`}>{c.course || '—'}</td>
                      <td className={`${tdClass} font-bold`} dir="ltr" style={{ textAlign: 'start' }}>{c.count}</td>
                      <td className={tdClass}>
                        {unlimited ? (
                          <span className="text-[13px] text-[#6B7280]">{tr('غير محدود', 'Unlimited')}</span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="font-bold">{c.max_views}</span>
                            {c.extra_views !== 0 && (
                              <span dir="ltr" className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${c.extra_views > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                {c.extra_views > 0 ? `+${c.extra_views}` : `−${Math.abs(c.extra_views)}`}
                              </span>
                            )}
                          </span>
                        )}
                      </td>
                      <td className={tdClass}>
                        {unlimited || c.remaining_views === null ? '—' : <span className={`font-semibold ${exhausted ? 'text-red-600' : ''}`}>{c.remaining_views}</span>}
                      </td>
                      <td className={`${tdClass} font-semibold tabular-nums`} dir="ltr" style={{ textAlign: 'start' }}>{formatClock(c.last_position_seconds)}</td>
                      <td className={`${tdClass} text-[13px]`}>{formatWatchTime(c.watched_seconds, ar)}</td>
                      <td className={tdClass}>
                        {c.threshold_seconds && c.threshold_seconds > 60 ? (
                          <div className="min-w-[110px]">
                            <span className="text-[13px] font-semibold">{tr(`${toMinutes(c.balance_seconds)} من ${toMinutes(c.threshold_seconds)} دقيقة`, `${toMinutes(c.balance_seconds)} of ${toMinutes(c.threshold_seconds)} min`)}</span>
                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#EEF0FB]"><div className="h-full rounded-full bg-[#2137D6]" style={{ width: `${Math.min(100, Math.round(((c.balance_seconds ?? 0) / c.threshold_seconds) * 100))}%` }} /></div>
                          </div>
                        ) : '—'}
                      </td>
                      <td className={`${tdClass} text-[13px] text-[#6B7280]`}>{formatDate(c.last_viewed_at, ar)}</td>
                      {canManage && (
                        <td className={tdClass}>
                          {!unlimited && (
                            <button type="button" onClick={() => setEditing(c)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#2137D6]/30 px-3 py-1.5 text-[13px] font-semibold text-[#2137D6] hover:bg-[#F4F6FD]">
                              <SlidersHorizontal className="h-3.5 w-3.5" />{tr('زوّد / قلّل', 'Add / remove')}
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="border-t border-[#F3F4F6] px-4 py-2.5 text-[12px] text-[#6B7280]">{tr('المشاهدة بتتحسب لما الطالب يتفرج على مدة الدرس من الفيديو نفسه (التقديم مش بيتحسب، والسرعة مش بتفرق)، حتى لو على كذا مرة. وقت المشاهدة وآخر دقيقة بيتسجّلوا من 23 نوفمبر 2026.', 'A view counts once the student has played the lesson minutes of the video itself (skipping does not count, speed does not matter), across openings. Watch time and last position are recorded from 23 Nov 2026.')}</p>
      </Card>

      <Card title={tr('سجل الزيادة والتقليل', 'Adjustments log')} icon={History}>
        {views.adjustments.length === 0 ? (
          <EmptyState>{tr('محدش زوّد أو قلّل مشاهدات للطالب ده', 'No view adjustments for this student')}</EmptyState>
        ) : (
          <ul className="divide-y divide-[#F3F4F6]">
            {views.adjustments.map((a) => (
              <li key={a.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <span dir="ltr" className={`shrink-0 rounded-lg px-2 py-1 text-[13px] font-bold ${a.delta > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  {a.delta > 0 ? `+${a.delta}` : `−${Math.abs(a.delta)}`}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-[#111827]">{a.chapter || '—'}</p>
                  {a.note && <p className="mt-0.5 text-[13px] text-[#4B5563]">{a.note}</p>}
                  <p className="mt-0.5 text-[12px] text-[#9CA3AF]">{a.actor} · {formatDate(a.created_at, ar)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {canManage && <AdjustViewsModal chapter={editing} studentId={studentId} onClose={() => setEditing(null)} onDone={onChanged} />}
    </div>
  );
}
