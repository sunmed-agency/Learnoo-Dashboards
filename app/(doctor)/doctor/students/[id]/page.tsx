"use client";

import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import StudentProfileView from '@/components/students/profile/StudentProfileView';

/** Same profile as the admin dashboard, read only (no device, views, edit or notify actions). */
export default function DoctorStudentProfilePage() {
  return (
    <Suspense fallback={<div className="flex min-h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#2137D6]" /></div>}>
      <StudentProfileView readOnly backHref="/doctor/students" />
    </Suspense>
  );
}
