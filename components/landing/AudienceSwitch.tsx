'use client';

import { useEffect, useState } from 'react';

/** Anchors that belong to the lecturer view. Any other anchor (#top, #features, #faq, ...) shows the student view. */
const LECTURER_HASH = /^#(lecturers|lecturer-features|protection|pricing|lecturer-faq|lecturer-contact|join(-\d+)?)$/;

/**
 * The landing page shows student content by default. Lecturer content appears only after a
 * "Join as a lecturer" link (any lecturer anchor), and the student anchors bring the student view back.
 */
export default function AudienceSwitch({ students, lecturers }: { students: React.ReactNode; lecturers: React.ReactNode }) {
  const [mode, setMode] = useState<'students' | 'lecturers'>('students');

  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash;
      if (LECTURER_HASH.test(hash)) setMode('lecturers');
      else if (hash && hash !== '#') setMode('students');
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  // The target was hidden when the link was clicked, so scroll to it once its view is shown.
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || hash === '#' || hash.startsWith('#join')) return;
    const frame = requestAnimationFrame(() => {
      const target = hash === '#top' || hash === '#lecturers' ? null : document.getElementById(hash.slice(1));
      if (target) target.scrollIntoView();
      else window.scrollTo({ top: 0 });
    });
    return () => cancelAnimationFrame(frame);
  }, [mode]);

  return (
    <>
      <div hidden={mode !== 'students'}>{students}</div>
      <div hidden={mode !== 'lecturers'}>{lecturers}</div>
    </>
  );
}
