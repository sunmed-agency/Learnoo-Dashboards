import Link from 'next/link';
import Logo from '@/components/Logo';
import AuthLangToggle from './AuthLangToggle';
import AppDownloadLink from '@/src/components/AppDownloadLink';
import AuthShowcase from './AuthShowcase';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

/** Shared shell for every sign-in / sign-up page: Learnoo brand panel (start side) + form column on large screens. */
export default function AuthPageLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen w-full bg-[#F3F5FE] font-sans lg:grid lg:h-screen lg:min-h-0 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-4 lg:overflow-hidden lg:p-4">
      {/* Brand panel on the start side: right in Arabic, left in English */}
      <AuthShowcase />

      <div className="relative flex min-h-screen min-w-0 flex-col overflow-x-hidden lg:h-full lg:min-h-0 lg:overflow-y-auto">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_70%_100%_at_50%_0%,rgba(45,70,232,0.12),transparent_70%)] lg:hidden" aria-hidden />

        <header className="relative flex shrink-0 items-center justify-between gap-3 px-4 pt-4 sm:px-8 sm:pt-5">
          <Link href="/" className="flex items-center gap-2.5 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" aria-label="Learnoo">
            <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5">
              <Logo className="h-8 w-8" />
            </span>
            <span className="text-[19px] font-extrabold tracking-tight text-[#0A1033]" dir="ltr">Learnoo</span>
          </Link>
          <AuthLangToggle />
        </header>

        <main className="relative flex flex-1 items-center justify-center px-4 py-6 sm:px-8 sm:py-8 lg:py-4">
          <div className="w-full max-w-[440px]">
            <div className="mb-5 sm:mb-6">
              <h1 className="text-[24px] font-bold leading-tight text-text-dark sm:text-[28px]">{title}</h1>
              <p className="mt-2 text-[13px] leading-6 text-text-muted sm:text-[14px]">{subtitle}</p>
            </div>
            <div className="w-full rounded-2xl border border-[#E6EAF8] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_32px_-12px_rgba(45,70,232,0.18)] sm:p-7">
              {children}
            </div>
          </div>
        </main>

        <div className="relative shrink-0 px-4 sm:px-8 [&_footer]:mt-2 [&_footer]:py-4">
          <AppDownloadLink />
        </div>
      </div>
    </div>
  );
}
