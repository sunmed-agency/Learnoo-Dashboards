'use client';

import { useLocale } from 'next-intl';
import LangToggle from '@/components/landing/LangToggle';

/** One tap switches the sign-in pages to the other language, like the landing page (no dropdown). */
export default function AuthLangToggle() {
  const ar = useLocale() === 'ar';
  return (
    <LangToggle
      to={ar ? 'en' : 'ar'}
      label={ar ? 'English' : 'العربية'}
      className="bg-white text-[#2D46E8] ring-1 ring-[#E6EAF8] shadow-sm hover:bg-[#E9EDFD] [&>span]:inline"
    />
  );
}
