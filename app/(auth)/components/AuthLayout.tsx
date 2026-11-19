import Link from 'next/link';
import Logo from '@/components/Logo';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import AppDownloadLink from '@/src/components/AppDownloadLink';
import AuthShowcase from './AuthShowcase';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

/** Shared shell for every sign-in / sign-up page: form column + Learnoo brand panel on large screens. */
export default function AuthPageLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen w-full bg-[#F5F7FF] font-sans lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-4 lg:p-4">
      <div className="relative flex min-h-screen min-w-0 flex-col lg:min-h-[calc(100vh-2rem)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_70%_100%_at_50%_0%,rgba(37,99,235,0.12),transparent_70%)] lg:hidden" aria-hidden />

        <header className="relative flex items-center justify-between gap-3 px-4 pt-4 sm:px-8 sm:pt-6">
          <Link href="/" className="flex items-center gap-2.5 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" aria-label="Learnoo">
            <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5">
              <Logo className="h-8 w-8" />
            </span>
            <span className="text-[19px] font-extrabold tracking-tight text-[#0B1437]" dir="ltr">Learnoo</span>
          </Link>
          <LanguageSwitcher />
        </header>

        <main className="relative flex flex-1 items-center justify-center px-4 py-8 sm:px-8 sm:py-10">
          <div className="w-full max-w-[440px]">
            <div className="mb-6 sm:mb-7">
              <h1 className="text-[24px] font-bold leading-tight text-text-dark sm:text-[28px]">{title}</h1>
              <p className="mt-2 text-[13px] leading-6 text-text-muted sm:text-[14px]">{subtitle}</p>
            </div>
            <div className="w-full rounded-2xl border border-[#E6EAF5] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_32px_-12px_rgba(33,55,214,0.18)] sm:p-7">
              {children}
            </div>
          </div>
        </main>

        <div className="relative px-4 sm:px-8">
          <AppDownloadLink />
        </div>
      </div>

      <AuthShowcase />
    </div>
  );
}
