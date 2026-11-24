'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import type { ContentAuditSnapshot, StaffActivity } from '@/src/lib/api';
import { examActivityRows, examChangeRows, liveSessionActivityRows, liveSessionChangeRows, notificationAudience, type ActivityRow } from '@/src/lib/staff-activity';

function SavedContent({ heading, rows, changes, href, linkLabel, changesLabel }: { heading: string; rows: ActivityRow[]; changes: ActivityRow[]; href: string; linkLabel: string; changesLabel: string }) {
  return <div className="mt-2 break-words rounded-lg bg-slate-50 p-3 text-sm">
    <p className="font-semibold">{heading}</p>
    <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">{rows.map(row => <div key={row.label} className="contents"><dt className="text-gray-600">{row.label}</dt><dd>{row.value}</dd></div>)}</dl>
    {!!changes.length && <><p className="mt-2 font-semibold">{changesLabel}</p>
      <ul className="mt-1 list-disc ps-5">{changes.map(row => <li key={row.label}>{row.label}: {row.value}</li>)}</ul></>}
    <Link href={href} className="mt-2 inline-block text-primary underline">{linkLabel}</Link>
  </div>;
}

export default function StaffActivityDetails({ details }: { details: StaffActivity['details'] }) {
  const ar = useLocale() === 'ar';
  if (!details) return null;
  const { course, lecture, chapter, import: activationImport, pre_activation: pendingDeleted, notification, exam, live_session: live, before, after, view_history = [] } = details;
  const locale = ar ? 'ar' : 'en';
  const changesLabel = ar ? 'ما تغيّر في هذا التعديل' : 'Changed in this edit';
  const itemLabels = ar
    ? { course: 'مادة', chapter: 'درس', library: 'مكتبة', category: 'تصنيف', quiz: 'اختبار' }
    : { course: 'Course', chapter: 'Lesson', library: 'Library', category: 'Category', quiz: 'Quiz' };
  const fields: [keyof ContentAuditSnapshot, string][] = [
    ['title', ar ? 'العنوان' : 'Title'], ['video', ar ? 'ملف الفيديو' : 'Video file'],
    ['lecture_id', ar ? 'رقم المحاضرة' : 'Lecture ID'], ['course_id', ar ? 'رقم المادة' : 'Course ID'],
    ['status', ar ? 'حالة النشر' : 'Publish status'],
    ['max_views', ar ? 'حد المشاهدات' : 'View limit'], ['view_by_minute', ar ? 'دقايق احتساب المشاهدة' : 'View threshold (minutes)'],
  ];
  const person = details.target_user;
  const roleNames: Record<number, [string, string]> = { 0: ['طالب', 'Student'], 1: ['مدرّس', 'Teacher'], 2: ['أدمن / مشرف', 'Admin / supervisor'], 3: ['ولي أمر', 'Parent'], 4: ['دعم', 'Support'], 5: ['المالك', 'Owner'] };
  const statusNames: Record<number, [string, string]> = { 0: ['موقوف', 'Stopped'], 1: ['نشط', 'Active'], 2: ['معلّق', 'Pending'] };
  const fieldNames: Record<string, [string, string]> = {
    name: ['الاسم', 'Name'], phone: ['التليفون', 'Phone'], email: ['الإيميل', 'Email'], student_code: ['كود الطالب', 'Student code'],
    status: ['الحالة', 'Status'], university: ['الجامعة', 'University'], faculty: ['الكلية', 'Faculty'], centers: ['السناتر', 'Centers'],
    role: ['نوع الحساب', 'Account type'], password: ['كلمة المرور', 'Password'],
  };
  const showValue = (field: string, value: string | number | null) => {
    if (value === null || value === '') return '—';
    if (field === 'status') return (statusNames[Number(value)] ?? [String(value), String(value)])[ar ? 0 : 1];
    if (field === 'role') return (roleNames[Number(value)] ?? [String(value), String(value)])[ar ? 0 : 1];
    return String(value);
  };
  const profileHref = person ? (person.role === 0 ? `/students/${person.id}` : person.role === 1 ? `/instructors/${person.id}/edit` : null) : null;
  return <>
    {person && <div className="mt-2 break-words rounded-lg border border-[#2137D6]/15 bg-[#F4F5FD] p-3 text-sm">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-semibold">{ar ? 'الحساب' : 'Account'}:</span>
        {profileHref ? <Link href={profileHref} className="font-semibold text-primary underline">{person.name || '—'}</Link> : <span className="font-semibold">{person.name || '—'}</span>}
        <span className="rounded-full bg-white px-2 py-0.5 text-xs">{(roleNames[person.role] ?? ['', ''])[ar ? 0 : 1]}</span>
      </p>
      <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-gray-700">
        {person.phone && <span>{ar ? 'التليفون' : 'Phone'}: <bdi dir="ltr">{person.phone}</bdi></span>}
        {person.student_code && <span>{ar ? 'الكود' : 'Code'}: <bdi>{person.student_code}</bdi></span>}
        {person.email && <span>{ar ? 'الإيميل' : 'Email'}: <bdi dir="ltr">{person.email}</bdi></span>}
      </p>
      {details.target_changes?.length ? <table className="mt-2 w-full text-start text-[13px]">
        <thead><tr className="text-gray-600"><th className="p-1 text-start">{ar ? 'اللي اتغيّر' : 'Changed'}</th><th className="p-1 text-start">{ar ? 'قبل' : 'Before'}</th><th className="p-1 text-start">{ar ? 'بعد' : 'After'}</th></tr></thead>
        <tbody>{details.target_changes.map((change) => <tr key={change.field} className="border-t border-white">
          <th className="p-1 text-start font-semibold">{(fieldNames[change.field] ?? [change.field, change.field])[ar ? 0 : 1]}</th>
          {change.field === 'password'
            ? <td className="p-1" colSpan={2}>{ar ? 'اتغيّرت (الكلمة نفسها مش بتتسجّل)' : 'Changed (never recorded)'}</td>
            : <><td className="break-all p-1 text-gray-600">{showValue(change.field, change.from)}</td><td className="break-all p-1">{showValue(change.field, change.to)}</td></>}
        </tr>)}</tbody>
      </table> : null}
      {details.views_adjust && <p className="mt-1">{ar ? 'المشاهدات' : 'Views'}: <bdi dir="ltr">{details.views_adjust.delta > 0 ? `+${details.views_adjust.delta}` : details.views_adjust.delta}</bdi>{details.views_adjust.note && <> · {details.views_adjust.note}</>}</p>}
      {details.student_note && <p className="mt-1 whitespace-pre-wrap">{ar ? 'الملاحظة' : 'Note'}: {details.student_note}</p>}
    </div>}
    {(course || lecture || chapter || activationImport || pendingDeleted) && <div className="mt-2 break-words rounded-lg bg-slate-50 p-3 text-sm">
      {course && <p className="font-semibold">{ar ? 'المادة' : 'Course'}: {course.title || (ar ? 'تفاصيل المادة غير متاحة' : 'Course details unavailable')} <bdi>#{course.id}</bdi></p>}
      {!!course?.category_path.length && <p className="mt-1 text-gray-600">{ar ? 'المسار الدراسي' : 'Academic path'}: {course.category_path.join(' / ')}</p>}
      {details.course_context_current && course?.title && <p className="mt-1 text-xs text-gray-500">{ar ? 'بيانات المادة الحالية؛ لم تُحفظ تفاصيلها وقت العملية القديمة.' : 'Current course details; no snapshot was saved for this older activity.'}</p>}
      {lecture && <p>{ar ? 'المحاضرة' : 'Lecture'}: {lecture.title} <bdi>#{lecture.id}</bdi></p>}
      {chapter && <p>{chapter.type === 'note' ? (ar ? 'الملاحظة' : 'Note') : (ar ? 'الدرس' : 'Lesson')}: {chapter.title} <bdi>#{chapter.id}</bdi></p>}
      {activationImport && <>
        <p>{ar ? 'هدف الاستيراد' : 'Import target'}: {itemLabels[activationImport.item.type]} — {activationImport.item.title} <bdi>#{activationImport.item.id}</bdi></p>
        <p>{ar ? 'إجمالي الأرقام' : 'Total numbers'}: {activationImport.total_phones} · {ar ? 'تم التفعيل' : 'Activated'}: {activationImport.activated} · {ar ? 'قيد الانتظار' : 'Pending'}: {activationImport.pending} · {ar ? 'تم التخطي' : 'Skipped'}: {activationImport.skipped}</p>
      </>}
      {pendingDeleted && <p>{ar ? 'الرقم المحذوف' : 'Deleted number'}: <bdi dir="ltr">{pendingDeleted.phone}</bdi> · {itemLabels[pendingDeleted.item.type]} — {pendingDeleted.item.title || (ar ? 'محتوى لم يعد متاحًا' : 'Content no longer available')} <bdi>#{pendingDeleted.item.id}</bdi></p>}
    </div>}
    {notification && <div className="mt-2 break-words rounded-lg bg-slate-50 p-3 text-sm">
      <p className="font-semibold">{ar ? 'عنوان الإشعار' : 'Notification title'}: {notification.title}</p>
      <p className="mt-1 text-gray-600">{ar ? 'نص الإشعار' : 'Message'}:</p>
      <p className="whitespace-pre-wrap">{notification.message}</p>
      <p className="mt-1">{ar ? 'أُرسل إلى' : 'Sent to'}: {notificationAudience(notification, locale)}
        {notification.recipients !== undefined && <> · {ar ? 'عدد الطلاب المستلمين' : 'Students reached'}: {notification.recipients}</>}
      </p>
    </div>}
    {exam && <>
      {details.exam_context_current && <p className="mt-2 text-xs text-gray-500">{ar ? 'تفاصيل الامتحان الحالية؛ لم تُحفظ التفاصيل وقت العملية القديمة.' : 'Current exam details; no snapshot was saved for this older activity.'}</p>}
      <SavedContent heading={`${ar ? 'الامتحان' : 'Exam'}: ${exam.title} #${exam.id}`} rows={examActivityRows(exam, locale)} changes={examChangeRows(exam, locale)}
        href={`/exams/${exam.id}/edit`} linkLabel={ar ? 'فتح الامتحان' : 'Open exam'} changesLabel={changesLabel} />
    </>}
    {live && <SavedContent heading={`${ar ? 'جلسة البث المباشر' : 'Live session'}: ${live.title} #${live.id}`} rows={liveSessionActivityRows(live, locale)} changes={liveSessionChangeRows(live, locale)}
      href={`/live-sessions/${live.id}`} linkLabel={ar ? 'فتح جلسة البث' : 'Open live session'} changesLabel={changesLabel} />}
    {before && <details className="mt-2 rounded-lg bg-slate-50 p-3 text-sm">
    <summary className="cursor-pointer font-bold">{after ? (ar ? 'تعديل المحتوى' : 'Content updated') : (ar ? 'حذف المحتوى' : 'Content deleted')}: {before.title} #{before.id}</summary>
    <table className="mt-3 w-full text-start"><thead><tr><th>{ar ? 'البيان' : 'Field'}</th><th>{ar ? 'قبل' : 'Before'}</th><th>{ar ? 'بعد' : 'After'}</th></tr></thead>
      <tbody>{fields.filter(([key]) => !after || before[key] !== after[key]).map(([key, label]) => <tr key={key}>
        <th className="p-2">{label}</th>{[before, after].map((snapshot, i) => <td key={i} className="break-all p-2">{key === 'video' ? String(snapshot?.video ?? '—').split('/').pop() : String(snapshot?.[key] ?? '—')}</td>)}
      </tr>)}</tbody></table>
    <p className="mt-3">{ar ? 'المشاهدات قبل العملية' : 'Views before this action'}: {view_history.reduce((sum, view) => sum + Number(view.count), 0)} · {ar ? 'الطلاب' : 'Students'}: {view_history.length}</p>
    <ul className="mt-2 max-h-48 overflow-y-auto">{view_history.map(view => <li key={view.student_id}>{view.name || view.student_id}: {view.count}</li>)}</ul>
  </details>}
  </>;
}
