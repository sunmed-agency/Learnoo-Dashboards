'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  LayoutDashboard,
  Download,
  BookOpen,
  School,
  Video,
  ClipboardList,
  MessageCircle,
  MessageSquare,
  Users,
  StickyNote,
  Library,
  Power,
  Bell,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  LifeBuoy
} from 'lucide-react';

import Image from 'next/image';
import { logout } from '@/lib/auth';
import { useCurrentUser } from '@/src/hooks/useAuth';
import { usePlatformFeature } from '@/src/hooks';
import { initializeAuthStore } from '@/src/stores/authStore';

interface DoctorSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function DoctorSidebar({ isCollapsed, onToggle }: DoctorSidebarProps) {
  const t = useTranslations('sidebar');
  const pathname = usePathname();
  const { user, fullName, role, canUseActivations } = useCurrentUser();
  const { data: features } = usePlatformFeature();

  const allMenuItems = [
    { name: t('dashboard'), icon: LayoutDashboard, path: '/doctor/dashboard' },
    { name: t('myCourses'), icon: BookOpen, path: '/doctor/courses' },
    { name: t('academicStructure'), icon: School, path: '/doctor/departments' },
    { name: t('liveSessions'), icon: Video, path: '/doctor/live-sessions' },
    { name: t('exams'), icon: ClipboardList, path: '/doctor/exams' },
    { name: t('discussions'), icon: MessageCircle, path: '/doctor/discussions' },
    { name: t('community'), icon: Users, path: '/doctor/community' },
    { name: t('notesSummaries'), icon: StickyNote, path: '/doctor/notes-summaries' },
    { name: t('electronicLibrary'), icon: Library, path: '/doctor/electronic-library' },
    { name: t('support'), icon: LifeBuoy, path: '/doctor/issues' },
    { name: t('schedules'), icon: ClipboardList, path: '/doctor/schedules' },
    { name: t('downloads'), icon: Download, path: '/doctor/downloads' },
    { name: t('guardians'), icon: Users, path: '/doctor/guardians' },
    { name: t('notifications'), icon: Bell, path: '/doctor/notifications' },
    // { name: 'Profile & Settings', icon: Settings, path: '/doctor/settings' },
  ];

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const menuItems = React.useMemo(() => {
    const items = [...allMenuItems];
    if (isMounted && canUseActivations) {
      items.push({ name: t('activation'), icon: Power, path: '/doctor/activation' });
    }
    return items;
  }, [isMounted, canUseActivations, t]);


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

  const platformName = getFeatureValue('platform_name', 'Learnoo');
  const primaryColor = getFeatureValue('primary_color', '#4F46E5');

  // Get user initials
  const getInitials = () => {
    if (!isMounted || !user) return '??';
    const first = user.attributes.first_name?.charAt(0) || '';
    const last = user.attributes.last_name?.charAt(0) || '';
    return `${first}${last}`.toUpperCase() || '??';
  };

  // Get display name
  const getDisplayName = () => {
    if (!isMounted) return 'User';
    if (fullName) return fullName;
    if (user) return `${user.attributes.first_name} ${user.attributes.last_name}`;
    return 'User';
  };

  return (
    <aside
      className={`bg-white/85 backdrop-blur-xl flex flex-col h-screen sticky top-0 border-e border-[#E6EAF6] transition-all duration-300 ease-in-out z-50 ${isCollapsed ? 'w-20' : 'w-64'
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
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-hide flex flex-col gap-1">
        {!isCollapsed && (
          <p className="flex items-center gap-2 text-[10px] font-bold tracking-[1.5px] text-[#94A3B8] uppercase px-3 mb-4"><span className="size-1.5 rounded-full bg-[#E8766A]" aria-hidden />MAIN MENU</p>
        )}
        <nav className="flex flex-col gap-1.5">
          {menuItems.map((item) => {
            const isActive = pathname === item.path || pathname.startsWith(item.path);
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                href={item.path}
                className={`group flex items-center p-3 rounded-xl transition-all duration-300 relative ${isActive
                  ? isCollapsed
                    ? "bg-gradient-to-br from-[var(--primary)] to-[#5B73FF] text-white shadow-[0_10px_24px_-12px_rgba(45,70,232,0.75)] z-10"
                    : "bg-gradient-to-l from-[var(--primary)] to-[#5B73FF] text-white shadow-[0_10px_24px_-12px_rgba(45,70,232,0.75)] ltr:bg-gradient-to-r"
                  : "text-[#475569] hover:bg-[#EAEEFE] hover:text-[var(--primary)]"
                  } ${isCollapsed ? 'justify-center mx-1.5' : ''}`}
                title={isCollapsed ? item.name : ''}
              >
                {isActive && !isCollapsed && (
                  <div className="absolute -start-4 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-[#E8766A] rounded-e-full shadow-[0_0_12px_rgba(232,118,106,0.55)]" />
                )}
                <div className={`shrink-0 ${isCollapsed ? '' : 'mx-3'}`}>
                  <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                </div>
                {!isCollapsed && (
                  <span className={`text-[13px] font-medium ${isActive ? "font-bold" : ""}`}>
                    {item.name}
                  </span>
                )}
                {/* {item.badge && !isCollapsed && (
                  <span className="ml-auto bg-[#EF4444] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {item.badge}
                  </span>
                )} */}
                {isActive && isCollapsed && (
                  <div className="absolute -start-[15px] top-1/2 -translate-y-1/2 w-1.5 h-10 bg-[#E8766A] rounded-e-full shadow-[0_0_12px_rgba(232,118,106,0.55)] animate-in fade-in slide-in-from-left-2 duration-300" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Doctor Profile Section */}
      <div className={`p-4 border-t border-[#F0F2F5] mt-auto ${isCollapsed ? 'items-center' : ''}`}>
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                backgroundColor: `${primaryColor}15`,
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
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                backgroundColor: `${primaryColor}15`,
              }}
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
              className="text-[#64748B] hover:text-[#EF4444] transition-colors p-2.5 rounded-xl hover:bg-[#FEF2F2]"
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
