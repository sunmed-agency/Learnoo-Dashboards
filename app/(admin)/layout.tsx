"use client";

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="staff-theme relative flex h-screen bg-[#FFFFFB] font-sans overflow-hidden">
      {/* Soft Royal / Coral glow behind the dashboard */}
      <div className="student-bg-art" aria-hidden />
      {/* Sidebar - Fixed, scrollable independently */}
      <div className={`relative z-[2] flex-shrink-0 h-screen overflow-y-auto overflow-x-hidden transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <Sidebar 
          isCollapsed={isSidebarCollapsed} 
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
        />
      </div>
      
      {/* Main Content Area - Scrollable independently */}
      <div className="relative z-[1] flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12">
          <div className="w-full mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
