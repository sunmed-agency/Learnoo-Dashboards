"use client";

import SchedulesBoard from '@/components/schedules/SchedulesBoard';

/**
 * Subject schedules page (admin / instructor with canUpload, student without). The UI lives in
 * components/schedules/SchedulesBoard.tsx (that folder is scanned by Tailwind; src/ is not).
 */
export default function PlatformTimetable({ canUpload = false }: { canUpload?: boolean }) {
  return <SchedulesBoard canUpload={canUpload} />;
}
