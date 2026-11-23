"use client";

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useCurrentUser } from '@/src/hooks/useAuth';
import { canOpenPage, supervisorHome } from '@/src/lib/permissions';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useCurrentUser();
  // Supervisors only open the pages they were given (the API refuses the rest anyway).
  const blocked = !!user && !canOpenPage(user, pathname);

  useEffect(() => {
    if (blocked) router.replace(supervisorHome(user));
  }, [blocked, router, user]);

  return (
    <div className="staff-theme relative flex h-screen bg-[#FFFFFB] font-sans overflow-hidden">
      {/* Soft Royal / Coral glow behind the dashboard */}
      <div className="student-bg-art" aria-hidden />
      {/* Sidebar - Fixed, scrollable independently */}
      <div className={`relative z-[2] flex-shrink-0 h-screen overflow-hidden transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </div>

      {/* Main Content Area - Scrollable independently */}
      {/* No z-index here: popups (fixed, z-50) inside a page must rise above the sidebar (z-[2]). */}
      <div className="relative flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header />
        <main className="staff-scroll flex-1 overflow-y-auto p-4 md:p-8 lg:p-12">
          <div className="w-full mx-auto">
            {blocked ? null : children}
          </div>
        </main>
      </div>
    </div>
  );
}
