'use client';

import React from 'react';
import { BookOpen, ClipboardCheck, Download, Eye, FileText, Percent, Radio, Smartphone, UserRound } from 'lucide-react';
import type { StudentDevices, StudentViews } from '@/src/lib/api';
import { Card, EmptyState, KeyValueList, StatTile, type ProfileStudent, deviceLabel, formatDate, useTr } from './shared';

export default function OverviewTab({ student, views, devices, onShowViews }: {
  student: ProfileStudent;
  views: StudentViews | undefined;
  devices: StudentDevices | undefined;
  /** Opens the views tab; undefined when the user can't see it. */
  onShowViews?: () => void;
}) {
  const { ar, tr } = useTr();
  const dash = '—';

  const scored = student.exams.filter((e) => Number.isFinite(e.percentage));
  const average = scored.length ? Math.round(scored.reduce((sum, e) => sum + e.percentage, 0) / scored.length) : null;

  const latest = [...(views?.chapters ?? [])]
    .filter((c) => c.count > 0 || c.last_viewed_at)
    .sort((a, b) => (b.last_viewed_at ?? '').localeCompare(a.last_viewed_at ?? ''))
    .slice(0, 5);

  const tiles = [
    { label: tr('المواد المفعّلة', 'Enrolled subjects'), value: student.courses.length, icon: BookOpen },
    { label: tr('إجمالي المشاهدات', 'Total views'), value: views ? views.total_views : dash, icon: Eye },
    { label: tr('متوسط درجات الاختبارات', 'Average exam score'), value: average === null ? dash : `${average}%`, icon: Percent },
    { label: tr('تغييرات الجهاز', 'Device changes'), value: devices ? `${devices.changes_used}/${devices.changes_limit}` : dash, icon: Smartphone },
    { label: tr('اختبارات اتحلّت', 'Exams taken'), value: student.exams.length, icon: ClipboardCheck },
    { label: tr('ملاحظات', 'Notes'), value: student.activity.notesCreated, icon: FileText },
    { label: tr('تحميلات', 'Downloads'), value: student.activity.downloads, icon: Download },
    { label: tr('حضور لايف', 'Live attendance'), value: student.activity.liveAttendance, icon: Radio },
  ];

  const lastDevice = devices?.bound_device ? deviceLabel(devices.bound_device) : (devices?.last_session?.device || student.device.name);
  const lastIp = devices?.last_session?.last_ip || student.device.lastIp;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((tile, i) => <StatTile key={tile.label} {...tile} filled={i === 0} />)}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card
          title={tr('آخر مشاهداته', 'Latest views')}
          icon={Eye}
          action={onShowViews && latest.length > 0 ? (
            <button type="button" onClick={onShowViews} className="text-[13px] font-semibold text-[#2137D6] hover:underline">{tr('كل المشاهدات', 'All views')}</button>
          ) : undefined}
        >
          {!views ? (
            <EmptyState>{tr('المشاهدات مش متاحة', 'Views are not available')}</EmptyState>
          ) : latest.length === 0 ? (
            <EmptyState>{tr('الطالب لسه ماتفرجش على أي درس', 'The student has not watched any lesson yet')}</EmptyState>
          ) : (
            <ul className="flex flex-col gap-4">
              {latest.map((c) => {
                const unlimited = c.base_limit === 0;
                const pct = unlimited || c.max_views <= 0 ? 0 : Math.min(100, Math.round((c.count / c.max_views) * 100));
                return (
                  <li key={c.chapter_id} className="flex flex-col gap-1.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-semibold text-[#111827]">{c.chapter}</p>
                        <p className="truncate text-[12px] text-[#6B7280]">{[c.course, c.lecture].filter(Boolean).join(' · ') || dash}</p>
                      </div>
                      <span className="shrink-0 text-[13px] font-bold text-[#111827]" dir="ltr">
                        {c.count}/{unlimited ? '∞' : c.max_views}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#F4F6FD]">
                      <div className={`h-full rounded-full ${pct >= 100 ? 'bg-[#E8766A]' : 'bg-[#2137D6]'}`} style={{ width: `${unlimited ? 100 : pct}%`, opacity: unlimited ? 0.25 : 1 }} />
                    </div>
                    <p className="text-[11px] text-[#9CA3AF]">{formatDate(c.last_viewed_at, ar)}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title={tr('بيانات الحساب', 'Account details')} icon={UserRound}>
          <KeyValueList rows={[
            { label: tr('تاريخ التسجيل', 'Registered'), value: student.joined ? formatDate(student.joined, ar, false) : dash },
            { label: tr('آخر جهاز', 'Last device'), value: lastDevice || dash },
            { label: tr('آخر IP', 'Last IP'), value: lastIp ? <span dir="ltr">{lastIp}</span> : dash },
            { label: tr('الجامعة', 'University'), value: student.university || dash },
            { label: tr('الكلية', 'Faculty'), value: student.faculty || dash },
            { label: tr('السناتر', 'Centers'), value: student.centers.length ? student.centers.join('، ') : dash },
            { label: tr('طلبات تغيير الجهاز', 'Device requests sent'), value: devices ? devices.requests_sent : dash },
            { label: tr('التفعيلات النشطة', 'Active activations'), value: student.courses.length },
            { label: tr('مشاركات المجتمع', 'Community posts'), value: student.activity.communityPosts },
          ]} />
        </Card>
      </div>
    </div>
  );
}
