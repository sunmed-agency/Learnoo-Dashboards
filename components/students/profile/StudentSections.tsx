'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { BookOpen, Building2, ClipboardList, GraduationCap, Mail, Phone, Calendar } from 'lucide-react';
import { Card, EmptyState, KeyValueList, type ProfileStudent, formatDate, tdClass, thClass, useTr } from './shared';

/** "المواد والتفعيل": the courses the student is enrolled in, with their stats. */
export function CoursesTab({ student }: { student: ProfileStudent }) {
  const t = useTranslations();
  return (
    <Card title={t('students.form.view.sections.enrolledCourses')} icon={BookOpen}>
      {student.courses.length === 0 ? (
        <EmptyState>{t('students.form.view.noCourses')}</EmptyState>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {student.courses.map((course, idx) => (
            <div key={idx} className="flex flex-col gap-3 rounded-2xl border border-[#EEEEEE] p-4">
              <div className="flex items-start gap-3">
                {course.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={course.thumbnail} alt={course.title} className="h-14 w-14 shrink-0 rounded-xl border border-[#EEEEEE] object-cover" />
                ) : (
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#F4F6FD] text-[#2137D6]"><BookOpen className="h-5 w-5" /></span>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[14px] font-bold text-[#111827]">{course.title}</h3>
                  {course.subtitle && <p className="mt-1 truncate text-[12px] text-[#6B7280]">{course.subtitle}</p>}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[12px] text-[#6B7280]">
                <span className="rounded-lg bg-[#F9FAFB] px-2 py-1"><strong className="text-[#111827]">{course.lectures}</strong> {t('students.form.view.fields.lectures')}</span>
                <span className="rounded-lg bg-[#F9FAFB] px-2 py-1"><strong className="text-[#111827]">{course.chapters}</strong> {t('students.form.view.fields.chapters')}</span>
                <span className="rounded-lg bg-[#F9FAFB] px-2 py-1"><strong className="text-[#111827]">{course.exams}</strong> {t('students.form.view.fields.exams')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/** "الاختبارات": exam results table. */
export function ExamsTab({ student }: { student: ProfileStudent }) {
  const t = useTranslations();
  const { ar } = useTr();
  return (
    <Card title={t('students.form.view.sections.examResults')} icon={ClipboardList} bodyClassName="p-0">
      {student.exams.length === 0 ? (
        <div className="p-5"><EmptyState>{t('students.form.view.noExams')}</EmptyState></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse">
            <thead className="bg-[#F9FAFB]">
              <tr>
                <th className={thClass}>{t('students.form.view.fields.exam')}</th>
                <th className={thClass}>{t('students.form.view.fields.score')}</th>
                <th className={thClass}>{t('students.form.view.fields.date')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {student.exams.map((exam, idx) => (
                <tr key={idx} className="hover:bg-[#F9FAFB]">
                  <td className={`${tdClass} font-semibold`}>{exam.name}</td>
                  <td className={tdClass}>
                    <span className="font-bold" dir="ltr">{exam.score}/{exam.total}</span>{' '}
                    <span className={`rounded-full px-2 py-0.5 text-[12px] font-semibold ${exam.percentage >= 50 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`} dir="ltr">{exam.percentage}%</span>
                  </td>
                  <td className={`${tdClass} text-[#6B7280]`}>{formatDate(exam.date, ar, false)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/** "الكلية والسنتر": academic info + centers + contact (the API has no guardian data per student). */
export function CentersTab({ student }: { student: ProfileStudent }) {
  const t = useTranslations();
  const { ar } = useTr();
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card title={t('students.form.view.sections.academic')} icon={GraduationCap}>
        <KeyValueList rows={[
          { label: t('students.form.view.fields.university'), value: student.university || '—' },
          { label: t('students.form.view.fields.faculty'), value: student.faculty || '—' },
          { label: t('students.form.view.fields.email'), value: student.email ? <span dir="ltr" className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-[#6B7280]" />{student.email}</span> : '—' },
          { label: t('students.form.view.fields.phone'), value: student.phone ? <span dir="ltr" className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-[#6B7280]" />{student.phone}</span> : '—' },
          { label: t('students.form.view.fields.joined'), value: student.joined ? <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-[#6B7280]" />{formatDate(student.joined, ar, false)}</span> : '—' },
        ]} />
      </Card>
      <Card title={t('students.form.view.sections.centers')} icon={Building2}>
        {student.centers.length === 0 ? (
          <EmptyState>{t('students.form.view.noCenters')}</EmptyState>
        ) : (
          <ul className="flex flex-col gap-2">
            {student.centers.map((name, i) => (
              <li key={`${name}-${i}`} className="flex items-center gap-3 rounded-xl bg-[#F9FAFB] px-4 py-3 text-[14px] font-semibold text-[#111827]">
                <span className="h-2 w-2 shrink-0 rounded-full bg-[#2137D6]" />{name}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
