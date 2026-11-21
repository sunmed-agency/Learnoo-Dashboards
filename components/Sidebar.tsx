'use client';

import React, { useEffect } from 'react';

import Link from 'next/link';

import { usePathname } from 'next/navigation';

import { useTranslations } from 'next-intl';

import {

  LayoutDashboard,

  Users,

  BookOpen,

  Video,

  ClipboardList,

  MessageCircle,

  MessageSquare,

  Users2,

  StickyNote,

  Bell,

  Settings,

  LogOut,

  ChevronLeft,

  ChevronRight,

  ChevronDown,

  Download,

  ShieldCheck,

  School,

  Power,

  Smartphone,

  GraduationCap,

  LifeBuoy,

  Clock,

  TrendingUp,

  Inbox,

  Activity,

  CalendarDays,

  UserCog,

  KeyRound

} from 'lucide-react';



import Image from 'next/image';

import { logout } from '@/lib/auth';

import { useCurrentUser } from '@/src/hooks/useAuth';

import { usePlatformFeature } from '@/src/hooks';

import { initializeAuthStore } from '@/src/stores/authStore';

import { can, isSupervisor } from '@/src/lib/permissions';



interface SidebarProps {

  isCollapsed: boolean;

  onToggle: () => void;

}



interface MenuItem {

  name: string;

  icon: React.ElementType;

  path?: string;

  comingSoon?: boolean;

  children?: MenuItem[];

  roles?: string[];

  /** A group heading (الأكاديمي، الطلاب...), not a link. */
  section?: boolean;

  /** Supervisor permission that shows this page (`a|b` = either, `-` = never for supervisors). */
  permission?: string;

  /** Shown to supervisors only. */
  supervisorsOnly?: boolean;

  hidden?: boolean;

}



const getMenuItems = (t: (key: string) => string, role: string | null | undefined, studentId?: string | null): MenuItem[] => {

  const items: MenuItem[] = [];

  if (role === 'Parent') {
    items.push({ name: t('sidebar.dashboard'), icon: LayoutDashboard, path: '/parent/dashboard' });
    items.push({ name: t('sidebar.attendance'), icon: Clock, path: studentId ? `/parent/students/${studentId}/activity` : '/parent/students' });
    // items.push({ name: t('sidebar.examsAndResults'), icon: ClipboardList, path: studentId ? `/parent/students/${studentId}/weekly-stats` : '/parent/students' });
    items.push({ name: t('sidebar.courseProgress'), icon: BookOpen, path: studentId ? `/parent/students/${studentId}/progress` : '/parent/students' });
    items.push({ name: t('sidebar.engagement'), icon: TrendingUp, path: studentId ? `/parent/students/${studentId}/weekly-stats` : '/parent/students' });
    items.push({ name: t('sidebar.teacherFeedback'), icon: MessageSquare, path: studentId ? `/parent/students/${studentId}/feedback` : '/parent/students' });
    items.push({ name: t('sidebar.notifications'), icon: Bell, path: '/parent/notifications' });
    // items.push({ name: t('sidebar.profileSettings'), icon: Settings, path: '/settings' });
    return items;
  }

  // Grouped like the EduMedix dashboard: a heading, then its pages. `permission`
  // hides the page from supervisors who were not given it.
  const owner = role === 'Super Admin';
  const section = (key: string) => items.push({ name: t(`sidebar.sections.${key}`), icon: LayoutDashboard, section: true });

  if (owner) {
    items.push({ name: t('sidebar.dashboard'), icon: LayoutDashboard, path: '/dashboard' });
  } else {
    items.push({ name: t('sidebar.dashboard'), icon: LayoutDashboard, path: '/dashboard', permission: 'dashboard.view', supervisorsOnly: true });
  }

  // Same order and names as the EduMedix dashboard.
  section('academic');
  items.push({ name: t('sidebar.academicStructure'), icon: School, path: '/departments', permission: 'structure.view' });
  items.push({ name: t('sidebar.schedules'), icon: CalendarDays, path: '/schedules', permission: 'schedules.manage' });
  items.push({ name: t('sidebar.liveSessions'), icon: Video, path: '/live-sessions', permission: 'live.manage' });
  items.push({ name: t('sidebar.examsAndQA'), icon: ClipboardList, path: '/exams', permission: 'exams.manage' });
  items.push({ name: t('sidebar.notesSummaries'), icon: StickyNote, path: '/notes-summaries', permission: 'notes.manage' });
  items.push({ name: t('sidebar.electronicLibrary'), icon: BookOpen, path: '/electronic-library', permission: 'library.manage' });

  section('users');
  items.push({ name: t('sidebar.instructors'), icon: GraduationCap, path: '/instructors', permission: '-' });
  if (owner) items.push({ name: t('sidebar.supervisors'), icon: UserCog, path: '/supervisors' });

  section('students');
  items.push({ name: t('sidebar.students'), icon: Users2, path: '/students', permission: 'students.view' });
  items.push({ name: t('sidebar.guardians'), icon: Users2, path: '/guardians', permission: 'students.view' });
  // The owner's device requests sit at the top of the platform activity page.
  items.push({ name: t('sidebar.deviceApprovals'), icon: Smartphone, path: owner ? '/activity#devices' : '/activity', permission: 'devices.manage' });
  items.push({ name: t('sidebar.activation'), icon: Power, path: '/activation', permission: 'activation.codes|activation.sheet' });
  // Owner tools a supervisor can be given; plain admins don't see them.
  items.push({ name: t('sidebar.pendingActivations'), icon: KeyRound, path: '/pre-activations', ...(owner ? {} : { permission: 'preactivations.manage', supervisorsOnly: true }) });
  items.push({ name: t('sidebar.subscriptionRequests'), icon: Inbox, path: '/subscription-requests', ...(owner ? {} : { permission: 'subscriptions.manage', supervisorsOnly: true }) });

  section('community');
  items.push({ name: t('sidebar.discussions'), icon: MessageCircle, path: '/discussions', permission: 'discussions.manage' });
  items.push({ name: t('sidebar.community'), icon: MessageSquare, path: '/community', permission: 'community.manage' });

  section('support');
  items.push({ name: t('sidebar.support'), icon: LifeBuoy, path: owner ? '/issues/inbox' : '/issues', permission: 'support.manage' });

  section('system');
  items.push({ name: t('sidebar.notifications'), icon: Bell, path: '/notifications', permission: 'notifications.send' });
  if (owner) items.push({ name: t('sidebar.activity'), icon: Activity, path: '/activity' });
  items.push({ name: t('sidebar.downloads'), icon: Download, path: '/downloads', permission: 'downloads.view' });
  items.push({ name: t('sidebar.profileSettings'), icon: Settings, path: '/settings', permission: '-' });
  items.push({ name: t('sidebar.featureControl'), icon: ShieldCheck, path: '/feature-control', permission: '-' });
  items.push({ name: t('sidebar.otaUpload'), icon: Smartphone, path: '/ota-upload', permission: '-' });

  return items;

};

/**
 * Supervisors see only pages they were given ('-' = never for supervisors);
 * full admins and the owner see everything except supervisor-only entries.
 * Headings with nothing under them are dropped.
 */
const filterForUser = (items: MenuItem[], user: Parameters<typeof can>[0]): MenuItem[] => {
  const supervisor = isSupervisor(user);
  const visible = items.filter((item) => {
    if (item.section) return true;
    if (item.supervisorsOnly && !supervisor) return false;
    if (!supervisor || !item.permission) return !item.supervisorsOnly || supervisor;
    return item.permission !== '-' && can(user, item.permission);
  });
  return visible.filter((item, i) => !item.section || (visible[i + 1] && !visible[i + 1].section));
};



export default function Sidebar({ isCollapsed, onToggle }: SidebarProps) {

  const t = useTranslations();

  const pathname = usePathname();

  const { user, fullName, role, isLoading } = useCurrentUser();

  const { data: features } = usePlatformFeature();

  const [openDropdowns, setOpenDropdowns] = React.useState<Record<string, boolean>>({});

  const [activeStudentId, setActiveStudentId] = React.useState<string | null>(null);

  useEffect(() => {
    const syncStudent = () => {
      const parts = pathname.split('/');
      const index = parts.indexOf('students');
      const studentId = index !== -1 ? parts[index + 1] : null;
      if (studentId) localStorage.setItem('parentStudentId', studentId);
      setActiveStudentId(studentId || localStorage.getItem('parentStudentId'));
    };
    syncStudent();
    window.addEventListener('parent-student-change', syncStudent);
    return () => window.removeEventListener('parent-student-change', syncStudent);
  }, [pathname]);

  const menuItems = React.useMemo(() => {
    if (isLoading && !role) {
      return [];
    }

    const items = getMenuItems(t, role, activeStudentId);
    return role === 'Parent' ? items : filterForUser(items, user).filter((item) => !item.hidden);
  }, [t, role, activeStudentId, isLoading, user]);



  // Initialize auth store from cookies on mount

  useEffect(() => {

    initializeAuthStore();

  }, []);



  // Get platform branding from features

  const getFeatureValue = (key: string, defaultValue: string = ''): string => {

    if (!features) return defaultValue;

    const feature = features.find((f) => f.attributes.key === key);

    return feature?.attributes.value || defaultValue;

  };



  const platformName = getFeatureValue('platform_name', 'MedLearn');

  const primaryColor = getFeatureValue('primary_color', '#4F46E5');


  const tagline = getFeatureValue('tagline', '');



  // Get user initials

  const getInitials = () => {

    if (!user) return '??';

    const first = user.attributes.first_name?.charAt(0) || '';

    const last = user.attributes.last_name?.charAt(0) || '';

    return `${first}${last}`.toUpperCase() || '??';

  };



  // Get display name

  const getDisplayName = () => {

    if (fullName) return fullName;

    if (user) return `${user.attributes.first_name} ${user.attributes.last_name}`;

    return 'User';

  };



  // Get role display text

  const getRoleDisplay = () => {

    if (isSupervisor(user)) return t('sidebar.supervisorRole');

    if (role === 'Admin') return t('sidebar.adminDashboard');

    if (role === 'Doctor') return t('sidebar.doctorDashboard');

    if (role === 'Parent') return t('sidebar.parentDashboard') || 'Parent Dashboard';

    return role || 'User';

  };



  const toggleDropdown = (name: string) => {

    setOpenDropdowns((prev) => ({ ...prev, [name]: !prev[name] }));

  };



  const isDropdownActive = (item: MenuItem): boolean => {

    if (!item.children) return false;

    return item.children.some((child) => pathname === child.path);

  };



  const renderMenuItem = (item: MenuItem, isChild = false) => {

    if (item.section) {
      return isCollapsed
        ? <div key={`section-${item.name}`} className="mx-4 my-2 h-px bg-[#E2E8F0]" aria-hidden />
        : <p key={`section-${item.name}`} className="px-3 pb-1 pt-4 text-[11px] font-bold tracking-wide text-[#94A3B8]">{item.name}</p>;
    }

    const Icon = item.icon;

    // Inner pages (e.g. /students/123) keep their section highlighted.
    const isActive = pathname === item.path || (item.path === '/dashboard' && pathname === '/')
      || (!!item.path && item.path !== '/dashboard' && item.path !== '/settings' && pathname.startsWith(`${item.path}/`));

    const hasChildren = !!item.children;

    const isOpen = openDropdowns[item.name] || isDropdownActive(item);



    if (hasChildren && !isCollapsed) {

      return (

        <div key={item.name} className="flex flex-col">

          <button

            onClick={() => toggleDropdown(item.name)}

            className={`group flex items-center p-3 rounded-xl transition-all duration-300 w-full ${
              isDropdownActive(item)
                ? 'bg-gradient-to-l from-[var(--primary)] to-[#5B73FF] text-white shadow-[0_10px_24px_-12px_rgba(45,70,232,0.75)] ltr:bg-gradient-to-r'
                : 'text-[#475569] hover:bg-[#EAEEFE] hover:text-[var(--primary)]'
            }`}

          >

            <div className="shrink-0 mx-3">

              <Icon className="w-5 h-5 transition-transform duration-200" />

            </div>

            <span className="text-[13px] font-medium flex-1 text-left">{item.name}</span>

            <ChevronDown

              className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}

            />

          </button>

          {isOpen && (

            <div className="ml-4 pl-4 border-l border-[#E5E7EB] mt-1 flex flex-col gap-1">

              {item.children?.map((child) => renderMenuItem(child, true))}

            </div>

          )}

        </div>

      );

    }



    if (hasChildren && isCollapsed) {

      // When collapsed, show first child's path or just icon

      return (

        <Link

          key={`${item.name}-${item.children?.[0]?.path ?? 'no-path'}-collapsed`}

          href={item.children?.[0]?.path || '#'}

          className={`group flex items-center p-3 rounded-xl transition-all duration-300 relative ${
            isDropdownActive(item)
              ? 'bg-gradient-to-br from-[var(--primary)] to-[#5B73FF] text-white shadow-[0_10px_24px_-12px_rgba(45,70,232,0.75)] z-10'
              : 'text-[#475569] hover:bg-[#EAEEFE] hover:text-[var(--primary)]'
          } justify-center mx-1.5`}

          title={item.name}

        >

          <div className="shrink-0">

            <Icon className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />

          </div>

        </Link>

      );

    }



    return (

      <Link

        key={`${item.name}-${item.path || 'no-path'}`}

        href={item.path || '#'}

        className={`group flex items-center p-3 rounded-xl transition-all duration-300 relative ${
          isActive
            ? isCollapsed
              ? 'bg-gradient-to-br from-[var(--primary)] to-[#5B73FF] text-white shadow-[0_10px_24px_-12px_rgba(45,70,232,0.75)] z-10'
              : 'bg-gradient-to-l from-[var(--primary)] to-[#5B73FF] text-white shadow-[0_10px_24px_-12px_rgba(45,70,232,0.75)] ltr:bg-gradient-to-r'
            : 'text-[#475569] hover:bg-[#EAEEFE] hover:text-[var(--primary)]'
        } ${isCollapsed ? 'justify-center mx-1.5' : ''} ${isChild ? 'text-[12px]' : ''}`}

        title={isCollapsed ? item.name : ''}

      >

        {isActive && !isCollapsed && !isChild && (

          <div className="absolute -start-4 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-[#E8766A] rounded-e-full shadow-[0_0_12px_rgba(232,118,106,0.55)]" />

        )}

        <div className={`shrink-0 ${isCollapsed ? '' : 'mx-3'}`}>

          <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />

        </div>

        {!isCollapsed && (

          <div className="flex items-center gap-2 flex-1">

            <span className={`font-medium ${isActive ? 'font-bold' : ''} ${isChild ? 'text-[12px]' : 'text-[13px]'}`}>

              {item.name}

            </span>

            {item.comingSoon && (

              <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-[#FEF3C7] text-[#D97706] rounded-full">

                {t('common.soon')}

              </span>

            )}

          </div>

        )}

        {isActive && isCollapsed && (

          <div className="absolute -start-[15px] top-1/2 -translate-y-1/2 w-1.5 h-10 bg-[#E8766A] rounded-e-full shadow-[0_0_12px_rgba(232,118,106,0.55)] animate-in fade-in slide-in-from-left-2 duration-300" />

        )}

      </Link>

    );

  };



  return (

    <aside

      className={`bg-white/85 backdrop-blur-xl flex flex-col min-h-full border-e border-[#E6EAF6] transition-all duration-300 ease-in-out z-50 ${isCollapsed ? 'w-20' : 'w-64'
        }`}

    >

      {/* Brand Logo and Title */}

      <div className={`h-20 flex items-center px-4 gap-3 border-b border-[#EEF1F8] ${isCollapsed ? 'justify-center px-0' : ''}`}>

        {/* Always the official Learnoo logo (mark + wordmark) */}
        <Image
          src="/brand/learnoo-logo-blue.svg"
          alt={platformName}
          width={545}
          height={478}
          unoptimized
          priority
          className={isCollapsed ? 'h-10 w-auto' : 'h-14 w-auto shrink-0'}
        />

        {!isCollapsed && tagline && (
          <span className="flex items-center gap-1.5 rounded-full bg-[#FDEEEB] px-2.5 py-1 text-[10px] font-semibold text-[#D2584B]">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-[#E8766A]"></span>
            {tagline}
          </span>
        )}

      </div>



      {/* Navigation Menu */}

      <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-hide flex flex-col gap-1">

        {!isCollapsed && (

          <p className="flex items-center gap-2 text-[10px] font-bold tracking-[1.5px] text-[#94A3B8] uppercase px-3 mb-4"><span className="size-1.5 rounded-full bg-[#E8766A]" aria-hidden />{t('common.mainMenu')}</p>

        )}

        <nav className="flex flex-col gap-1.5">

          {menuItems.map((item) => renderMenuItem(item))}

        </nav>

      </div>



      {/* Admin Profile Section */}

      <div className={`p-4 border-t border-[#F0F2F5] mt-auto ${isCollapsed ? 'items-center' : ''}`}>

        {!isCollapsed && (

          <div className="bg-white rounded-2xl p-3 shadow-sm border border-[#F1F5F9] mb-3 flex items-center gap-3">

            <div 

              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"

              style={{ 

                backgroundColor: `${primaryColor}15`,

                borderColor: `${primaryColor}20`,

              }}

            >

              <span 

                className="text-[15px] font-bold"

                style={{ color: primaryColor }}

              >

                {getInitials()}

              </span>

            </div>

            <div className="flex flex-col min-w-0">

              <p className="text-[13px] font-bold text-[#1E293B] truncate">{getDisplayName()}</p>

              <p className="text-[11px] font-medium text-[#64748B] truncate">{getRoleDisplay()}</p>

            </div>

            <button

              onClick={logout}

              className="ml-auto text-[#64748B] hover:text-[#EF4444] transition-colors p-1.5 rounded-lg hover:bg-[#FEF2F2]"

            >

              <LogOut className="w-4 h-4" />

            </button>

          </div>

        )}

        {isCollapsed && (

          <div className="flex flex-col gap-4 items-center">

            <div 

              className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shrink-0 border border-[#F1F5F9] shadow-sm"

            >

              <span 

                className="text-[14px] font-bold"

                style={{ color: primaryColor }}

              >

                {getInitials()}

              </span>

            </div>

            <button

              onClick={logout}

              className="text-[#64748B] hover:text-[#EF4444] transition-colors p-2.5 rounded-xl hover:bg-[#FEF2F2] bg-white border border-[#F1F5F9] shadow-sm"

            >

              <LogOut className="w-5 h-5" />

            </button>

          </div>

        )}

      </div>



      {/* Sidebar toggle button */}

      <button

        onClick={onToggle}

        className="absolute right-[-14px] top-[100px] w-7 h-7 bg-white rounded-full border border-[#E5E7EB] flex items-center justify-center shadow-md hover:shadow-lg hover:scale-110 active:scale-95 transition-all z-[60]"

        style={{ color: primaryColor }}

      >

        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}

      </button>

    </aside>

  );

}
