'use client';

import Cookies from 'js-cookie';
import { Globe } from 'lucide-react';

/** Switches the landing page language the same way the dashboard switcher does (locale cookie + reload). */
export default function LangToggle({ to, label, className = '' }: { to: 'ar' | 'en'; label: string; className?: string }) {
  return (
    <button
      type="button"
      lang={to}
      aria-label={label}
      onClick={() => {
        Cookies.set('locale', to, { expires: 365, path: '/' });
        window.location.reload();
      }}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold transition-colors ${className}`}
    >
      <Globe className="h-4 w-4" aria-hidden />
      <span className="hidden min-[400px]:inline">{label}</span>
    </button>
  );
}
