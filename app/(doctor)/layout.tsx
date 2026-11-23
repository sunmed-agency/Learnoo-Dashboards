"use client"
import React, { useState, useEffect } from 'react';
import DoctorSidebar from '../../components/DoctorSidebar';
import DoctorHeader from '../../components/DoctorHeader';
import { usePathname, useRouter } from 'next/navigation';

export default function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const readOnlyRoute = /^\/doctor\/(universities|centers|faculties|departments)\/(add|[^/]+\/edit)$/.test(pathname) || /^\/doctor\/courses\/[^/]+\/edit$/.test(pathname);
  useEffect(() => {
    if (readOnlyRoute) router.replace('/doctor/departments');
  }, [readOnlyRoute, router]);
  if (readOnlyRoute) return null;

  return (
    <div className="staff-theme relative flex h-screen overflow-hidden bg-[#F8FAFC] font-sans">
      {/* Soft Royal / Coral glow behind the dashboard */}
      <div className="student-bg-art" aria-hidden />
      {/* Sidebar - Dynamically handle width based on collapse state */}
      <DoctorSidebar 
        isCollapsed={isSidebarCollapsed} 
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
      />
      
      {/* Main Content Area */}
      {/* No z-index here, so popups inside a page rise above the sidebar. */}
      <div className={`relative flex-1 flex flex-col min-w-0 h-screen overflow-hidden transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'ml-0' : ''}`}>
        <DoctorHeader />
        <main className="staff-scroll flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="w-full mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
