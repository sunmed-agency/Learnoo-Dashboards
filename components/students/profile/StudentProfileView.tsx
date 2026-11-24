"use client";

/** The student profile (tabs). Admin dashboard: with the actions the user is allowed. Instructor dashboard: read only. */

import React, { useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { BookOpen, Building2, ChevronLeft, ChevronRight, ClipboardList, Eye, LayoutGrid, Loader2, MessageSquareText, Plus, Smartphone } from 'lucide-react';
import { api, studentNotesApi } from '@/src/lib/api';
import NotesTab, { NoteAuthor } from '@/components/students/profile/NotesTab';
import { can } from '@/src/lib/permissions';
import { useCurrentUser } from '@/src/hooks/useAuth';
import type { StudentAttributes } from '@/src/types';
import StudentHeader from '@/components/students/profile/StudentHeader';
import StudentTabs, { type ProfileTab } from '@/components/students/profile/StudentTabs';
import OverviewTab from '@/components/students/profile/OverviewTab';
import ViewsTab from '@/components/students/profile/ViewsTab';
import DevicesTab from '@/components/students/profile/DevicesTab';
import { CentersTab, CoursesTab, ExamsTab } from '@/components/students/profile/StudentSections';
import { type ProfileStudent, useTr } from '@/components/students/profile/shared';

type TabKey = 'overview' | 'notes' | 'courses' | 'views' | 'exams' | 'devices' | 'academic';

// ---- Flatten the JSON:API student into what the tabs show ----
type Loose = Record<string, unknown>;
const obj = (v: unknown): Loose => (v && typeof v === 'object' ? (v as Loose) : {});
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v : typeof v === 'number' ? String(v) : null);
const num = (v: unknown): number => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
/** JSON:API items come as `{ attributes }` or plain objects. */
const attrs = (v: unknown): Loose => { const o = obj(v); return o.attributes ? obj(o.attributes) : o; };

function toProfileStudent(id: string, a: StudentAttributes): ProfileStudent {
  const name = a.full_name || `${a.first_name || ''} ${a.last_name || ''}`.trim() || '—';
  return {
    id,
    name,
    code: str(a.student_code),
    email: str(a.email),
    phone: str(a.phone),
    image: str(a.image),
    active: (a.status ?? 1) === 1,
    joined: str(a.joined) ?? str(a.created_at),
    university: str(a.university?.data?.attributes?.name),
    faculty: str(a.faculty?.data?.attributes?.name),
    centers: (a.centers || []).map((c) => str(attrs(c).name)).filter((n): n is string => n !== null),
    courses: (a.enrolled_courses || []).map((c: unknown) => {
      const course = attrs(c);
      const stats = obj(course.stats);
      return {
        title: str(course.title) ?? '—',
        subtitle: str(course.sub_title) ?? '',
        thumbnail: str(course.thumbnail),
        lectures: num(stats.lectures),
        chapters: num(stats.chapters),
        exams: num(stats.exams),
      };
    }),
    exams: (a.exam_results || []).map((e: unknown) => {
      const exam = attrs(e);
      const quiz = attrs(obj(exam.quiz).data);
      return {
        name: str(quiz.title) ?? '—',
        score: num(exam.score),
        total: num(exam.total_score),
        percentage: num(exam.percentage),
        date: str(exam.finished_at) ?? str(exam.created_at),
      };
    }),
    activity: {
      notesCreated: num(a.activity_stats?.notes_created),
      downloads: num(a.activity_stats?.downloads),
      liveAttendance: num(a.activity_stats?.live_attendance),
      communityPosts: num(a.activity_stats?.community_posts),
    },
    device: { name: str(a.device_access?.device), lastIp: str(a.device_access?.last_ip) },
  };
}

export default function StudentProfileView({ readOnly = false, backHref = '/students' }: { readOnly?: boolean; backHref?: string }) {
  const t = useTranslations();
  const { ar, tr } = useTr();
  const params = useParams();
  const studentId = params.id as string;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user, role } = useCurrentUser();

  // Read only (instructor): every tab, no action.
  const canViews = readOnly || can(user, 'views.manage|students.view');
  const canManageViews = !readOnly && can(user, 'views.manage');
  const canDevices = !readOnly && can(user, 'devices.manage');
  const canNotify = !readOnly && can(user, 'notifications.send');
  const canEdit = !readOnly && can(user, 'students.manage');
  const isAdmin = !readOnly && (role === 'Admin' || role === 'Super Admin');

  const studentQuery = useQuery({
    queryKey: ['student-profile', studentId],
    queryFn: () => api.students.get(studentId),
    enabled: Boolean(studentId),
  });
  const viewsQuery = useQuery({
    queryKey: ['student-profile', studentId, 'views'],
    queryFn: () => api.studentInsights.views(studentId),
    enabled: Boolean(studentId) && canViews,
    retry: false,
  });
  // Notes on the student: staff with students.view and the student's own teachers (read only mode included).
  const canNotes = readOnly || can(user, 'students.view');
  const notesQuery = useQuery({
    queryKey: ['student-profile', studentId, 'notes'],
    queryFn: () => studentNotesApi.list(studentId),
    enabled: Boolean(studentId) && canNotes,
    retry: false,
  });
  const devicesQuery = useQuery({
    queryKey: ['student-profile', studentId, 'devices'],
    queryFn: () => api.studentInsights.devices(studentId),
    // Teachers don't see devices (read-only profile).
    enabled: Boolean(studentId) && !readOnly,
    retry: false,
  });

  const raw = studentQuery.data?.data;
  const student = useMemo(() => (raw?.attributes ? toProfileStudent(String(raw.id ?? studentId), raw.attributes as StudentAttributes) : null), [raw, studentId]);
  const views = viewsQuery.data?.data;
  const devices = devicesQuery.data?.data;
  const notes = notesQuery.data?.data;
  const latestNote = notes?.[0];

  const refetchViews = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['student-profile', studentId, 'views'] });
  }, [queryClient, studentId]);
  /** Device decisions change the student and the devices data: refetch every query of this profile. */
  const refetchDevices = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['student-profile', studentId] });
  }, [queryClient, studentId]);

  const tabs: ProfileTab<TabKey>[] = [
    { key: 'overview', label: tr('نظرة عامة', 'Overview'), icon: LayoutGrid },
    ...(canNotes ? [{ key: 'notes' as const, label: tr('الملاحظات', 'Notes'), icon: MessageSquareText, badge: notes?.length || undefined }] : []),
    { key: 'courses', label: tr('المواد والتفعيل', 'Subjects & activation'), icon: BookOpen },
    ...(canViews ? [{ key: 'views' as const, label: tr('المشاهدات', 'Views'), icon: Eye }] : []),
    { key: 'exams', label: tr('الاختبارات', 'Exams'), icon: ClipboardList },
    ...(readOnly ? [] : [{ key: 'devices' as const, label: tr('الأجهزة', 'Devices'), icon: Smartphone, badge: devices?.pending_device ? 1 : undefined }]),
    { key: 'academic', label: tr('الكلية والسنتر', 'Faculty & center'), icon: Building2 },
  ];
  const requested = searchParams.get('tab');
  const active: TabKey = tabs.find((tab) => tab.key === requested)?.key ?? 'overview';

  const selectTab = (key: TabKey) => {
    const next = new URLSearchParams(searchParams.toString());
    if (key === 'overview') next.delete('tab'); else next.set('tab', key);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  if (studentQuery.isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#2137D6]" />
      </div>
    );
  }

  if (studentQuery.isError || !student) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <p className="text-red-500">{t('students.form.view.loadError')}</p>
        <Link href={backHref} className="rounded-xl bg-[#2137D6] px-4 py-2 text-sm font-medium text-white">
          {t('students.form.view.backToStudents')}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-12">
      <Toaster position="top-center" />
      <StudentHeader
        student={student}
        canEdit={canEdit}
        canNotify={canNotify}
        canResetDevice={isAdmin && canDevices}
        onDeviceChanged={refetchDevices}
        backHref={backHref}
      />

      {canNotes && !notesQuery.isError && (
        latestNote ? (
          <button type="button" onClick={() => selectTab('notes')} className="group flex w-full items-start gap-3 rounded-2xl border border-[#E8766A]/30 bg-[#FFF7F5] p-4 text-start transition hover:border-[#E8766A]/60 hover:bg-[#FFF1ED]">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#E8766A]/15 text-[#C2554A]"><MessageSquareText className="h-4 w-4" /></span>
            <span className="min-w-0 flex-1">
              <span className="mb-1 flex flex-wrap items-center gap-x-2 text-[12px] font-bold text-[#C2554A]">
                {tr('آخر ملاحظة', 'Latest note')}
                {notes && notes.length > 1 && <span className="font-medium text-[#6B7280]">{tr(`(${notes.length} ملاحظة)`, `(${notes.length} notes)`)}</span>}
              </span>
              <span className="line-clamp-2 block whitespace-pre-line break-words text-[14px] font-medium text-[#111827]">{latestNote.body}</span>
              <span className="mt-1.5 block"><NoteAuthor note={latestNote} /></span>
            </span>
            {ar ? <ChevronLeft className="mt-2 h-4 w-4 shrink-0 text-[#C2554A] transition group-hover:-translate-x-0.5" /> : <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-[#C2554A] transition group-hover:translate-x-0.5" />}
          </button>
        ) : notes ? (
          <button type="button" onClick={() => selectTab('notes')} className="inline-flex w-fit items-center gap-2 rounded-xl border border-dashed border-[#D1D5DB] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#4B5563] hover:border-[#2137D6] hover:text-[#2137D6]">
            <Plus className="h-4 w-4" />{tr('إضافة ملاحظة على الطالب', 'Add a note on this student')}
          </button>
        ) : null
      )}

      <StudentTabs tabs={tabs} active={active} onChange={selectTab} />

      <div role="tabpanel">
        {active === 'overview' && (
          <OverviewTab student={student} views={views} devices={devices} onShowViews={canViews ? () => selectTab('views') : undefined} />
        )}
        {active === 'notes' && <NotesTab studentId={student.id} notes={notes} isLoading={notesQuery.isLoading} isError={notesQuery.isError} />}
        {active === 'courses' && <CoursesTab student={student} />}
        {active === 'views' && (
          <ViewsTab
            studentId={student.id}
            views={views}
            isLoading={viewsQuery.isLoading}
            isError={viewsQuery.isError}
            canManage={canManageViews}
            onChanged={refetchViews}
          />
        )}
        {active === 'exams' && <ExamsTab student={student} />}
        {active === 'devices' && (
          <DevicesTab
            studentId={student.id}
            devices={devices}
            isLoading={devicesQuery.isLoading}
            isError={devicesQuery.isError}
            canManage={canDevices}
            onChanged={refetchDevices}
          />
        )}
        {active === 'academic' && <CentersTab student={student} />}
      </div>
    </div>
  );
}
