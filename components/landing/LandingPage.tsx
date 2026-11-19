import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  Building2,
  Check,
  ChevronDown,
  ClipboardCheck,
  EyeOff,
  FileText,
  Fingerprint,
  Globe,
  KeyRound,
  LayoutDashboard,
  Library,
  Link2,
  Lock,
  LogIn,
  MessagesSquare,
  MonitorPlay,
  Radio,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Stamp,
  Users,
  Video,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { STORE_LINKS } from '@/src/lib/store-links';
import type { LandingPlans } from '@/src/lib/landing-plans';
import { LANDING_CONTENT, type LandingLocale } from './content';
import LangToggle from './LangToggle';
import MobileMenu from './MobileMenu';
import PhoneMockup from './PhoneMockup';
import JoinDialog from './JoinDialog';
import DashboardMockup from './DashboardMockup';

const SUPPORT_EMAIL = 'applearnoo@gmail.com';

const STUDENT_ICONS: Record<string, LucideIcon> = {
  video: Video,
  live: Radio,
  exam: ClipboardCheck,
  notes: FileText,
  library: Library,
  community: MessagesSquare,
};
const LECTURER_ICONS: LucideIcon[] = [Link2, LayoutDashboard, MonitorPlay, KeyRound, BarChart3, Smartphone];
const PROTECTION_ICONS: LucideIcon[] = [Lock, EyeOff, Stamp, Smartphone, Fingerprint, ShieldCheck];
const EXPERT_ICONS: LucideIcon[] = [Building2, Users, Bell];

const number = new Intl.NumberFormat('en-US');

function Eyebrow({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-bold ${dark ? 'bg-white/10 text-[#BFDBFE] ring-1 ring-white/15' : 'bg-[#2137D6]/[0.07] text-[#2137D6]'}`}>
      <Sparkles className="h-3.5 w-3.5" aria-hidden />
      {children}
    </span>
  );
}

function SectionHead({ eyebrow, title, lead, dark = false }: { eyebrow: string; title: string; lead?: string; dark?: boolean }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <Eyebrow dark={dark}>{eyebrow}</Eyebrow>
      <h2 className={`mt-4 text-[clamp(1.6rem,1.1rem+2.4vw,2.5rem)] font-extrabold leading-tight ${dark ? 'text-white' : 'text-[#0B1437]'}`}>{title}</h2>
      {lead && <p className={`mt-4 text-[15.5px] leading-8 sm:text-[17px] ${dark ? 'text-[#C7D2FE]' : 'text-[#475569]'}`}>{lead}</p>}
    </div>
  );
}

function StoreBadges({ locale, label, className = '' }: { locale: LandingLocale; label: string; className?: string }) {
  const badges = [
    { name: 'Google Play', href: STORE_LINKS.googlePlay, src: `/images/store-badges/google-play-${locale}.png`, width: 646, height: 250, className: 'h-[62px] w-auto -my-[7px]' },
    { name: 'App Store', href: STORE_LINKS.appStore, src: '/images/store-badges/app-store-en.svg', width: 250, height: 83, className: 'h-12 w-auto' },
    { name: 'Huawei AppGallery', href: STORE_LINKS.appGallery, src: '/images/store-badges/appgallery-en.png', width: 3545, height: 1064, className: 'h-12 w-auto' },
  ];
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {badges.map((b) => (
        <a
          key={b.name}
          href={b.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${label} ${b.name}`}
          className="rounded-lg transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <Image src={b.src} alt={b.name} width={b.width} height={b.height} sizes="170px" className={b.className} />
        </a>
      ))}
    </div>
  );
}

export default function LandingPage({ locale, plans, apiBaseUrl }: { locale: LandingLocale; plans: LandingPlans; apiBaseUrl: string }) {
  const c = LANDING_CONTENT[locale];
  const ar = locale === 'ar';
  const Forward = ar ? ArrowLeft : ArrowRight;
  const year = new Date().getFullYear();

  const navLinks = [
    { href: '#features', label: c.nav.features },
    { href: '#lecturers', label: c.nav.lecturers },
    { href: '#protection', label: c.nav.protection },
    { href: '#pricing', label: c.nav.pricing },
    { href: '#faq', label: c.nav.faq },
  ];

  return (
    <div className="landing w-full overflow-x-clip bg-white text-[#0F172A] antialiased" data-locale={locale}>
      <style>{`
        html { scroll-behavior: smooth; }
        .landing { --font-display: var(--font-landing-display-en); --font-text: var(--font-landing-text-en); font-family: var(--font-text), system-ui, sans-serif; text-rendering: optimizeLegibility; }
        .landing[data-locale="ar"] { --font-display: var(--font-landing-display-ar); --font-text: var(--font-landing-text-ar); }
        .landing :is(h1, h2, h3, summary, .font-display) { font-family: var(--font-display), var(--font-text), system-ui, sans-serif; }
        .landing[data-locale="ar"] :is(h1, h2, h3) { letter-spacing: 0; }
        .landing [dir="ltr"] { font-family: var(--font-landing-display-en), var(--font-text), system-ui, sans-serif; }
        .landing h1 { font-weight: 800; }
        .landing[data-locale="ar"] h1 { line-height: 1.35; }
        .landing[data-locale="ar"] :is(h2, h3) { line-height: 1.45; }
        .landing p { text-wrap: pretty; }
        .landing :is(h1, h2) { text-wrap: balance; }
        .landing section[id] { scroll-margin-top: 84px; }
        @keyframes float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-10px) } }
        @media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto } .landing * { animation: none !important; transition: none !important; } }
        .landing details > summary::-webkit-details-marker { display: none; }
      `}</style>

      {/* ================= Header ================= */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#071450]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Learnoo">
            <Image src="/Logo.jpeg" alt="" width={38} height={38} className="rounded-xl shadow-lg shadow-blue-500/30" priority />
            <span className="text-[21px] font-extrabold tracking-tight text-white" dir="ltr">Learnoo</span>
          </Link>

          <nav className="hidden items-center gap-1 xl:flex" aria-label={c.nav.menu}>
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="whitespace-nowrap rounded-full px-3.5 py-2 text-[14.5px] font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white">{l.label}</a>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <LangToggle to={ar ? 'en' : 'ar'} label={c.langSwitch} className="text-white/85 hover:bg-white/10 hover:text-white" />
            <Link href="/login" className="hidden items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold text-white ring-1 ring-white/25 transition hover:bg-white/10 sm:inline-flex">
              <LogIn className="h-4 w-4 rtl:-scale-x-100" aria-hidden />{c.nav.login}
            </Link>
            <a href="#pricing" className="hidden whitespace-nowrap rounded-full bg-white px-4 py-2 text-sm font-bold text-[#1530C8] shadow-lg shadow-black/10 transition hover:bg-[#EEF2FF] md:inline-flex">{c.nav.join}</a>

            <MobileMenu label={c.nav.menu} links={navLinks} login={c.nav.login} join={c.nav.join} />
          </div>
        </div>
      </header>

      <main>
        {/* ================= Hero ================= */}
        <section className="relative isolate overflow-hidden bg-[#06124A] pb-16 pt-[104px] text-white sm:pb-24 sm:pt-[132px] lg:pb-28 lg:pt-[148px]">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_70%_20%,#1D4ED8_0%,transparent_60%),radial-gradient(ellipse_60%_50%_at_10%_90%,#1530C8_0%,transparent_60%),linear-gradient(160deg,#06124A_0%,#0A1E8C_55%,#0B2BC0_100%)]" />
          <svg className="absolute -bottom-10 start-0 -z-10 w-full opacity-40" viewBox="0 0 1440 320" preserveAspectRatio="none" aria-hidden>
            <path d="M0 250 C 360 150, 720 330, 1440 170" fill="none" stroke="url(#swoosh)" strokeWidth="3" />
            <path d="M0 290 C 420 200, 820 340, 1440 220" fill="none" stroke="url(#swoosh)" strokeWidth="1.5" />
            <defs><linearGradient id="swoosh" x1="0" x2="1"><stop offset="0" stopColor="#38BDF8" stopOpacity="0" /><stop offset=".5" stopColor="#7DD3FC" /><stop offset="1" stopColor="#38BDF8" stopOpacity="0" /></linearGradient></defs>
          </svg>
          <div className="absolute inset-0 -z-10 opacity-[0.07] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />

          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:gap-16 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:gap-10 xl:gap-16">
            <div className="text-center lg:text-start">
              <Eyebrow dark>{c.hero.eyebrow}</Eyebrow>
              <h1 className="mt-6 text-[clamp(2.1rem,1.2rem+4.2vw,3.9rem)] font-extrabold leading-[1.2] tracking-tight">
                {c.hero.title[0]}
                <span className="block bg-gradient-to-r from-[#7DD3FC] via-[#BFDBFE] to-white bg-clip-text text-transparent rtl:bg-gradient-to-l">{c.hero.title[1]}</span>
              </h1>
              <p className="mx-auto mt-6 max-w-xl text-[16px] leading-8 text-[#C7D2FE] sm:text-[18.5px] lg:mx-0">{c.hero.lead}</p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center lg:justify-start">
                <a href="#download" className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-[16px] font-bold text-[#1530C8] shadow-xl shadow-black/20 transition hover:-translate-y-0.5 hover:bg-[#EEF2FF]">
                  {c.hero.primary}
                  <Forward className="h-5 w-5 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" aria-hidden />
                </a>
                <a href="#lecturers" className="inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-[16px] font-bold text-white ring-1 ring-white/30 transition hover:bg-white/10">
                  {c.hero.secondary}
                </a>
              </div>

              <ul className="mt-8 flex flex-wrap justify-center gap-2 sm:gap-2.5 lg:justify-start">
                {c.hero.chips.map((chip) => (
                  <li key={chip} className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] px-3.5 py-1.5 text-[13.5px] font-semibold text-white/90 ring-1 ring-white/10">
                    <Check className="h-3.5 w-3.5 text-[#7DD3FC]" aria-hidden />{chip}
                  </li>
                ))}
              </ul>

              <div className="mt-10">
                <p className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-white/60">{c.hero.availableOn}</p>
                <StoreBadges locale={locale} label={c.download.badges} className="justify-center lg:justify-start" />
              </div>
            </div>

            <div className="relative">
              <PhoneMockup c={c.mock} />
            </div>
          </div>
        </section>

        {/* ================= Platforms strip ================= */}
        <section className="border-b border-[#E2E8F0] bg-white">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-4 py-8 sm:px-6 md:flex-row">
            <p className="text-[15px] font-bold text-[#334155]">{c.platforms.title}</p>
            <ul className="flex flex-wrap items-center justify-center gap-3">
              {c.platforms.items.map((p, i) => {
                const Icon = i === 3 ? Globe : Smartphone;
                return (
                  <li key={p} className="inline-flex items-center gap-2 rounded-xl bg-[#F1F5FF] px-4 py-2.5 text-[14.5px] font-bold text-[#1E293B]">
                    <Icon className="h-4 w-4 text-[#2137D6]" aria-hidden />{p}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* ================= Students ================= */}
        <section id="features" className="bg-white py-16 sm:py-24 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <SectionHead eyebrow={c.students.eyebrow} title={c.students.title} lead={c.students.lead} />
            <div className="mt-10 grid gap-4 sm:mt-14 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
              {c.students.items.map((item) => {
                const Icon = STUDENT_ICONS[item.icon];
                return (
                  <article key={item.title} className="group relative overflow-hidden rounded-3xl border border-[#E7ECF7] bg-white p-6 sm:p-7 transition duration-300 hover:-translate-y-1 hover:border-[#2137D6]/25 hover:shadow-[0_24px_50px_-20px_rgba(33,55,214,0.35)]">
                    <div className="absolute -end-10 -top-10 h-32 w-32 rounded-full bg-[#2137D6]/[0.04] transition group-hover:bg-[#2137D6]/[0.08]" />
                    <div className="relative grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[#1530C8] to-[#3B82F6] text-white shadow-lg shadow-blue-600/25">
                      <Icon className="h-6 w-6" aria-hidden />
                    </div>
                    <h3 className="relative mt-5 text-[19px] font-extrabold text-[#0B1437]">{item.title}</h3>
                    <p className="relative mt-2.5 text-[15px] leading-7 text-[#475569]">{item.text}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ================= Steps ================= */}
        <section className="bg-[#F5F8FF] py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHead eyebrow={c.steps.eyebrow} title={c.steps.title} />
            <div className="relative mt-10 sm:mt-14">
            <div className="absolute inset-x-[16%] top-8 hidden h-0.5 bg-gradient-to-r from-transparent via-[#2137D6]/30 to-transparent md:block" aria-hidden />
            <ol className="relative grid gap-6 md:grid-cols-3">
              {c.steps.items.map((step, i) => (
                <li key={step.title} className="relative rounded-3xl bg-white p-7 text-center shadow-[0_10px_40px_-20px_rgba(15,23,42,0.25)]">
                  <span className="relative mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-[#1530C8] to-[#3B82F6] text-[24px] font-extrabold text-white shadow-lg shadow-blue-600/30" dir="ltr">{i + 1}</span>
                  <h3 className="mt-5 text-[18px] font-extrabold text-[#0B1437]">{step.title}</h3>
                  <p className="mt-2 text-[15px] leading-7 text-[#475569]">{step.text}</p>
                </li>
              ))}
            </ol>
            </div>
          </div>
        </section>

        {/* ================= Experts ================= */}
        <section className="bg-white py-16 sm:py-24 lg:py-28">
          <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2">
            <div>
              <Eyebrow>{c.experts.eyebrow}</Eyebrow>
              <h2 className="mt-4 text-[clamp(1.6rem,1.1rem+2.4vw,2.5rem)] font-extrabold leading-tight text-[#0B1437]">{c.experts.title}</h2>
              <p className="mt-4 text-[15.5px] leading-8 text-[#475569] sm:text-[16.5px]">{c.experts.lead}</p>
              <ul className="mt-7 space-y-3.5">
                {c.experts.points.map((p) => (
                  <li key={p} className="flex items-center gap-3 text-[16px] font-semibold text-[#1E293B]">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600"><Check className="h-4 w-4" aria-hidden /></span>{p}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-br from-[#2137D6]/10 to-[#38BDF8]/10 blur-2xl" aria-hidden />
              <div className="relative grid gap-4 rounded-[2rem] bg-gradient-to-br from-[#0A1A7A] via-[#1530C8] to-[#2563EB] p-6 sm:p-8">
                <div className="flex items-center gap-4 rounded-2xl bg-white/10 p-5 ring-1 ring-white/15">
                  <Image src="/Logo.jpeg" alt="" width={56} height={56} className="rounded-2xl" />
                  <div>
                    <p className="text-[20px] font-extrabold text-white" dir="ltr">Learnoo</p>
                    <p className="text-[14px] text-[#C7D2FE]">{c.footer.tagline}</p>
                  </div>
                </div>
                {c.experts.cards.map((card, i) => {
                  const Icon = EXPERT_ICONS[i];
                  return (
                    <div key={card.title} className="flex items-start gap-4 rounded-2xl bg-white p-5 shadow-lg shadow-black/10 transition hover:translate-x-1 rtl:hover:-translate-x-1">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#EEF2FF] text-[#2137D6]"><Icon className="h-5 w-5" aria-hidden /></span>
                      <div>
                        <h3 className="text-[16px] font-extrabold text-[#0B1437]">{card.title}</h3>
                        <p className="mt-1 text-[14px] leading-6 text-[#475569]">{card.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ================= Lecturers ================= */}
        <section id="lecturers" className="relative overflow-hidden bg-[#F5F8FF] py-16 sm:py-24 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <SectionHead eyebrow={c.lecturers.eyebrow} title={c.lecturers.title} lead={c.lecturers.lead} />

            <div className="mt-10 grid items-center gap-12 sm:mt-14 xl:grid-cols-[1fr_1.1fr]">
              {/* the lecturer's dashboard on their own domain, with moving numbers */}
              <DashboardMockup locale={locale} domain={c.lecturers.domain} domainLabel={c.lecturers.domainLabel} />

              <div>
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2">
                  {c.lecturers.items.map((item, i) => {
                    const Icon = LECTURER_ICONS[i];
                    return (
                      <li key={item.title} className="rounded-2xl bg-white p-5 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.3)] ring-1 ring-[#E7ECF7] transition hover:ring-[#2137D6]/30">
                        <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#EEF2FF] text-[#2137D6]"><Icon className="h-5 w-5" aria-hidden /></span>
                        <h3 className="mt-3.5 text-[16.5px] font-extrabold text-[#0B1437]">{item.title}</h3>
                        <p className="mt-1.5 text-[14.5px] leading-6 text-[#475569]">{item.text}</p>
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center xl:justify-start">
                  <a href="#pricing" className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-[#2137D6] px-6 py-3.5 text-[16px] font-bold text-white shadow-lg shadow-blue-600/25 transition hover:-translate-y-0.5 hover:bg-[#1C2EB8]">
                    {c.lecturers.cta}<Forward className="h-5 w-5" aria-hidden />
                  </a>
                  <a href="#join" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-[16px] font-bold text-[#2137D6] ring-1 ring-[#2137D6]/25 transition hover:bg-[#EEF2FF]">
                    {c.nav.join}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================= Protection ================= */}
        <section id="protection" className="relative isolate overflow-hidden bg-[#06124A] py-16 text-white sm:py-24 lg:py-28">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,#1D4ED8_0%,transparent_65%),linear-gradient(180deg,#06124A,#081A6B)]" />
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mx-auto mb-8 grid h-16 w-16 place-items-center rounded-3xl sm:mb-12 sm:h-20 sm:w-20 bg-gradient-to-br from-[#38BDF8] to-[#2137D6] shadow-[0_0_60px_rgba(56,189,248,0.45)]">
              <ShieldCheck className="h-10 w-10" aria-hidden />
            </div>
            <SectionHead eyebrow={c.protection.eyebrow} title={c.protection.title} lead={c.protection.lead} dark />
            <div className="mt-10 sm:mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {c.protection.items.map((item, i) => {
                const Icon = PROTECTION_ICONS[i];
                return (
                  <div key={item.title} className="rounded-3xl bg-white/[0.05] p-6 ring-1 ring-white/10 backdrop-blur transition hover:bg-white/[0.08] hover:ring-[#7DD3FC]/30">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#38BDF8]/15 text-[#7DD3FC] ring-1 ring-[#7DD3FC]/25"><Icon className="h-6 w-6" aria-hidden /></span>
                    <h3 className="mt-4 text-[18px] font-extrabold">{item.title}</h3>
                    <p className="mt-2 text-[15px] leading-7 text-[#C7D2FE]">{item.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ================= Pricing ================= */}
        <section id="pricing" className="bg-white py-16 sm:py-24 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <SectionHead eyebrow={c.pricing.eyebrow} title={c.pricing.title} lead={c.pricing.lead} />
            {/* Odd counts stack in one centred column until there is room for all of them in a row, so no card is left alone on a line. */}
            <div className={`mx-auto mt-10 grid items-stretch gap-6 sm:mt-14 ${plans.plans.length === 1 ? 'max-w-md'
              : plans.plans.length === 2 ? 'max-w-lg md:max-w-4xl md:grid-cols-2'
              : plans.plans.length % 2 === 0 ? 'max-w-lg md:max-w-none md:grid-cols-2 xl:grid-cols-4'
              : 'max-w-lg lg:max-w-none lg:grid-cols-3'}`}>
              {plans.plans.map((plan, i) => {
                const hot = plan.highlighted;
                const name = plan.name[locale] || plan.name.ar || plan.name.en;
                const description = plan.description[locale];
                const badge = plan.badge[locale];
                const features = plan.features[locale].length > 0 ? plan.features[locale] : plan.features[ar ? 'en' : 'ar'];
                return (
                  <article
                    key={`${name}-${i}`}
                    className={`relative flex flex-col rounded-[28px] p-6 sm:p-8 transition duration-300 hover:-translate-y-1 ${hot
                      ? 'bg-gradient-to-b from-[#0A1A7A] via-[#1530C8] to-[#2563EB] text-white shadow-[0_30px_70px_-25px_rgba(21,48,200,0.7)] lg:-my-4 lg:py-11'
                      : 'bg-white ring-1 ring-[#E2E8F0] shadow-[0_14px_40px_-24px_rgba(15,23,42,0.35)]'}`}
                  >
                    {badge && (
                      <span className={`absolute -top-3.5 start-7 rounded-full px-3.5 py-1 text-[12.5px] font-bold shadow-md ${hot ? 'bg-[#FBBF24] text-[#0B1437]' : 'bg-[#2137D6] text-white'}`}>{badge}</span>
                    )}
                    <h3 className={`text-[22px] font-extrabold ${hot ? 'text-white' : 'text-[#0B1437]'}`}>{name}</h3>
                    {description && <p className={`mt-1.5 text-[14.5px] lg:min-h-[48px] leading-6 ${hot ? 'text-[#C7D2FE]' : 'text-[#64748B]'}`}>{description}</p>}

                    <div className="mt-5 flex flex-wrap items-baseline gap-2">
                      {plan.price === null ? (
                        <span className="text-[34px] font-extrabold">{c.pricing.contactPrice}</span>
                      ) : (
                        <>
                          <span className="text-[40px] font-extrabold leading-none tracking-tight sm:text-[46px]" dir="ltr">{number.format(plan.price)}</span>
                          <span className={`text-[14px] font-semibold ${hot ? 'text-[#C7D2FE]' : 'text-[#64748B]'}`}>{c.pricing.perMonth}</span>
                        </>
                      )}
                    </div>

                    <span className={`mt-4 inline-flex w-max items-center gap-2 rounded-xl px-3 py-1.5 text-[14px] font-bold ${hot ? 'bg-white/15 text-white' : 'bg-[#EEF2FF] text-[#2137D6]'}`}>
                      <Users className="h-4 w-4" aria-hidden />{c.pricing.upTo(number.format(plan.max_students))}
                    </span>

                    <ul className="mb-8 mt-6 flex-1 space-y-3">
                      {features.map((f) => (
                        <li key={f} className="flex items-start gap-3 text-[15px] leading-6">
                          <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${hot ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-600'}`}><Check className="h-3.5 w-3.5" aria-hidden /></span>
                          <span className={hot ? 'text-white/95' : 'text-[#334155]'}>{f}</span>
                        </li>
                      ))}
                    </ul>

                    <a
                      href={`#join-${i}`}
                      className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-[15.5px] font-bold transition ${hot ? 'bg-white text-[#1530C8] hover:bg-[#EEF2FF]' : 'bg-[#2137D6] text-white hover:bg-[#1C2EB8]'}`}
                    >
                      {c.pricing.cta}<Forward className="h-4 w-4" aria-hidden />
                    </a>
                  </article>
                );
              })}
            </div>
            <p className="mx-auto mt-10 max-w-2xl text-center text-[15px] leading-7 text-[#64748B]">{c.pricing.note}</p>
          </div>
        </section>

        {/* ================= Download ================= */}
        <section id="download" className="bg-white pb-16 sm:pb-24 lg:pb-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="relative isolate overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#0A1A7A] via-[#1530C8] to-[#2563EB] px-5 py-10 text-center text-white sm:rounded-[2.2rem] sm:px-14 sm:py-16 xl:text-start">
              <div className="absolute -end-20 -top-24 -z-10 h-80 w-80 rounded-full bg-[#38BDF8]/30 blur-3xl" aria-hidden />
              <div className="absolute -bottom-24 -start-10 -z-10 h-72 w-72 rounded-full bg-[#1D4ED8]/60 blur-3xl" aria-hidden />
              <div className="grid items-center justify-items-center gap-8 sm:gap-10 xl:grid-cols-[auto_1fr_auto] xl:justify-items-stretch">
                <Image src="/Logo.jpeg" alt="Learnoo" width={112} height={112} className="h-20 w-20 rounded-[1.4rem] shadow-2xl shadow-black/30 ring-4 ring-white/15 sm:h-28 sm:w-28 sm:rounded-[1.8rem]" />
                <div>
                  <h2 className="text-[clamp(1.6rem,1.1rem+2.4vw,2.25rem)] font-extrabold leading-tight">{c.download.title}</h2>
                  <p className="mx-auto mt-3 max-w-xl text-[15.5px] leading-8 text-[#C7D2FE] sm:text-[16.5px] xl:mx-0">{c.download.lead}</p>
                  <div className="mt-6"><StoreBadges locale={locale} label={c.download.badges} className="justify-center xl:justify-start" /></div>
                </div>
                <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-6 py-3.5 text-[16px] font-bold ring-1 ring-white/25 transition hover:bg-white/20">
                  <Globe className="h-5 w-5" aria-hidden />{c.download.web}
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ================= FAQ ================= */}
        <section id="faq" className="bg-[#F5F8FF] py-16 sm:py-24 lg:py-28">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <SectionHead eyebrow={c.faq.eyebrow} title={c.faq.title} />
            <div className="mt-8 space-y-3 sm:mt-12">
              {c.faq.items.map((item, i) => (
                <details key={item.q} className="group rounded-2xl bg-white ring-1 ring-[#E2E8F0] transition open:shadow-[0_14px_40px_-24px_rgba(15,23,42,0.35)] open:ring-[#2137D6]/25" open={i === 0}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[15.5px] font-bold text-[#0B1437] sm:px-6 sm:py-5 sm:text-[16.5px]">
                    {item.q}
                    <ChevronDown className="h-5 w-5 shrink-0 text-[#2137D6] transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <p className="px-5 pb-5 text-[15px] leading-8 text-[#475569] sm:px-6 sm:pb-6 sm:text-[15.5px]">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ================= Contact CTA ================= */}
        <section id="contact" className="relative isolate overflow-hidden bg-[#06124A] py-16 text-center text-white sm:py-24">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_80%_at_50%_100%,#1D4ED8_0%,transparent_70%)]" />
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="text-[clamp(1.75rem,1.2rem+2.8vw,2.75rem)] font-extrabold leading-tight">{c.contact.title}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-[17px] leading-8 text-[#C7D2FE]">{c.contact.lead}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
              <a href="#join" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-7 py-4 text-[16px] font-bold text-[#1530C8] shadow-xl shadow-black/20 transition hover:-translate-y-0.5 hover:bg-[#EEF2FF]">
                {c.contact.join}<Forward className="h-5 w-5" aria-hidden />
              </a>
              <a href="#download" className="inline-flex items-center justify-center gap-2 rounded-2xl px-7 py-4 text-[16px] font-bold ring-1 ring-white/30 transition hover:bg-white/10">
                {c.contact.download}
              </a>
            </div>
          </div>
        </section>
      </main>

      <JoinDialog locale={locale} plans={plans} apiBaseUrl={apiBaseUrl} />

      {/* ================= Footer ================= */}
      <footer className="bg-[#040C33] text-[#94A3B8]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-10 px-4 py-12 sm:px-6 sm:py-14 md:grid-cols-[1.5fr_1fr_1fr]">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <Image src="/Logo.jpeg" alt="" width={40} height={40} className="rounded-xl" />
              <span className="text-[22px] font-extrabold text-white" dir="ltr">Learnoo</span>
            </div>
            <p className="mt-4 max-w-sm text-[15px] leading-7">{c.footer.tagline}</p>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="mt-3 inline-block text-[14.5px] font-semibold text-[#93C5FD] hover:text-white" dir="ltr">{SUPPORT_EMAIL}</a>
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-white">{c.footer.links}</h3>
            <ul className="mt-4 space-y-2.5 text-[14.5px]">
              {navLinks.map((l) => <li key={l.href}><a href={l.href} className="hover:text-white">{l.label}</a></li>)}
              <li><Link href="/login" className="hover:text-white">{c.nav.login}</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-white">{c.footer.legal}</h3>
            <ul className="mt-4 space-y-2.5 text-[14.5px]">
              <li><a href="/privacy.html" className="hover:text-white">{c.footer.privacy}</a></li>
              <li><a href="/support.html" className="hover:text-white">{c.footer.support}</a></li>
              <li><Link href="/delete-account" className="hover:text-white">{c.footer.deleteAccount}</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <p className="mx-auto max-w-7xl px-4 py-6 text-center text-[13.5px] sm:px-6">
            © <span dir="ltr">{year} Learnoo</span>. {c.footer.rights}
          </p>
        </div>
      </footer>
    </div>
  );
}
