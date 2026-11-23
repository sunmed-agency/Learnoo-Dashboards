"use client";

/** The student profile (tabs). Admin dashboard: with the actions the user is allowed. Instructor dashboard: read only. */

import React, { useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { BookOpen, Building2, ClipboardList, Eye, LayoutGrid, Loader2, Smartphone } from 'lucide-react';
import { api } from '@/src/lib/api';
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

type TabKey = 'overview' | 'courses' | 'views' | 'exams' | 'devices' | 'academic';

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
  const { tr } = useTr();
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
  const devicesQuery = useQuery({
    queryKey: ['student-profile', studentId, 'devices'],
    queryFn: () => api.studentInsights.devices(studentId),
    enabled: Boolean(studentId),
    retry: false,
  });

  const raw = studentQuery.data?.data;
  const student = useMemo(() => (raw?.attributes ? toProfileStudent(String(raw.id ?? studentId), raw.attributes as StudentAttributes) : null), [raw, studentId]);
  const views = viewsQuery.data?.data;
  const devices = devicesQuery.data?.data;

  const refetchViews = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['student-profile', studentId, 'views'] });
  }, [queryClient, studentId]);
  /** Device decisions change the student and the devices data: refetch every query of this profile. */
  const refetchDevices = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['student-profile', studentId] });
  }, [queryClient, studentId]);

  const tabs: ProfileTab<TabKey>[] = [
    { key: 'overview', label: tr('نظرة عامة', 'Overview'), icon: LayoutGrid },
    { key: 'courses', label: tr('المواد والتفعيل', 'Subjects & activation'), icon: BookOpen },
    ...(canViews ? [{ key: 'views' as const, label: tr('المشاهدات', 'Views'), icon: Eye }] : []),
    { key: 'exams', label: tr('الاختبارات', 'Exams'), icon: ClipboardList },
    { key: 'devices', label: tr('الأجهزة', 'Devices'), icon: Smartphone, badge: devices?.pending_device ? 1 : undefined },
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

      <StudentTabs tabs={tabs} active={active} onChange={selectTab} />

      <div role="tabpanel">
        {active === 'overview' && (
          <OverviewTab student={student} views={views} devices={devices} onShowViews={canViews ? () => selectTab('views') : undefined} />
        )}
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
