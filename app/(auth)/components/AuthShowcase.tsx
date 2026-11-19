'use client';

import { useLocale } from 'next-intl';
import { BookOpenCheck, Radio, ShieldCheck, Sparkles, Trophy } from 'lucide-react';

const COPY = {
  ar: {
    eyebrow: 'دخول آمن برقم موبايلك',
    title: ['ذاكر في أي وقت،', 'وكمّل من مكان ما وقفت'],
    body: 'شروحات، محاضرات مباشرة، اختبارات وملخصات في مكان واحد. حسابك مربوط بجهازك عشان محدش غيرك يدخل عليه.',
    points: ['محاضرات مباشرة مع دكاترتك', 'اختبارات بنتيجة فورية', 'حسابك محمي على جهازك'],
    live: 'محاضرة مباشرة الآن',
    liveSub: 'تشريح · د. أحمد',
    score: 'نتيجة الاختبار',
    secure: 'تم التحقق',
    welcome: 'أهلًا بيك من جديد',
  },
  en: {
    eyebrow: 'Secure sign-in with your phone',
    title: ['Study anytime,', 'pick up where you left off'],
    body: 'Lessons, live lectures, exams and summaries in one place. Your account is tied to your device, so only you can get in.',
    points: ['Live lectures with your professors', 'Exams with instant results', 'Your account stays on your device'],
    live: 'Live lecture now',
    liveSub: 'Anatomy · Dr. Ahmed',
    score: 'Exam score',
    secure: 'Verified',
    welcome: 'Welcome back',
  },
};

const POINT_ICONS = [Radio, Trophy, ShieldCheck];

/** Brand panel beside the sign-in forms: a phone unlocking into Learnoo, with floating study cards. */
export default function AuthShowcase() {
  const c = COPY[useLocale() === 'ar' ? 'ar' : 'en'];

  return (
    <aside className="relative isolate hidden min-h-0 overflow-hidden rounded-[2rem] bg-[#0A1033] text-white lg:flex lg:h-full lg:flex-col lg:gap-6 lg:p-8 xl:p-10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_70%_15%,#3550F0_0%,transparent_60%),radial-gradient(ellipse_60%_50%_at_10%_95%,#1F33C4_0%,transparent_60%),linear-gradient(160deg,#0A1033_0%,#141C66_55%,#1F33C4_100%)]" aria-hidden />
      <div className="absolute inset-0 -z-10 opacity-[0.07] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:44px_44px]" aria-hidden />

      <div className="flex min-h-0 flex-1 items-center justify-center" aria-hidden>
      <div className="relative aspect-[440/400] h-full max-h-[400px] max-w-full">
        <LoginIllustration welcome={c.welcome} secure={c.secure} />

        <div className="auth-float absolute -top-2 start-0 flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 shadow-xl shadow-black/20 backdrop-blur-md xl:-start-4">
          <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-rose-500/90">
            <Radio className="h-4 w-4" />
            <span className="absolute -end-0.5 -top-0.5 h-2.5 w-2.5 animate-ping rounded-full bg-rose-300" />
          </span>
          <span className="leading-tight">
            <span className="block text-[13px] font-bold">{c.live}</span>
            <span className="block text-[11px] text-blue-100/80">{c.liveSub}</span>
          </span>
        </div>

        <div className="auth-float-delayed absolute bottom-6 end-0 flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 shadow-xl shadow-black/20 backdrop-blur-md xl:-end-4">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/90"><BookOpenCheck className="h-4 w-4" /></span>
          <span className="leading-tight">
            <span className="block text-[11px] text-blue-100/80">{c.score}</span>
            <span className="block text-[15px] font-extrabold" dir="ltr">48 / 50</span>
          </span>
        </div>
      </div>
      </div>

      <div className="relative shrink-0">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[12px] font-semibold text-blue-100">
          <Sparkles className="h-3.5 w-3.5" /> {c.eyebrow}
        </span>
        <h2 className="mt-4 text-[clamp(1.6rem,1rem+1.6vw,2.25rem)] font-extrabold leading-tight">
          {c.title[0]}{' '}
          <span className="bg-gradient-to-r from-[#FFB088] via-[#FFD3BD] to-white bg-clip-text text-transparent rtl:bg-gradient-to-l">{c.title[1]}</span>
        </h2>
        <p className="mt-3 max-w-[460px] text-[14px] leading-7 text-blue-100/85 [@media(max-height:700px)]:hidden">{c.body}</p>
        <ul className="mt-5 grid gap-3 xl:grid-cols-3 [@media(max-height:820px)]:hidden">
          {c.points.map((point, i) => {
            const Icon = POINT_ICONS[i];
            return (
              <li key={point} className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-[12.5px] font-medium text-blue-50">
                <Icon className="h-4 w-4 shrink-0 text-[#FFB088]" /> {point}
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}

function LoginIllustration({ welcome, secure }: { welcome: string; secure: string }) {
  return (
    <svg viewBox="0 0 440 400" className="h-full w-full" role="presentation">
      <defs>
        <linearGradient id="auth-phone" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#141C66" />
          <stop offset="1" stopColor="#0A1033" />
        </linearGradient>
        <linearGradient id="auth-screen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#EEF3FF" />
        </linearGradient>
        <linearGradient id="auth-accent" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2D46E8" />
          <stop offset="1" stopColor="#5B73FF" />
        </linearGradient>
        <radialGradient id="auth-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#60A5FA" stopOpacity="0.55" />
          <stop offset="1" stopColor="#60A5FA" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="220" cy="205" r="190" fill="url(#auth-glow)" />
      <circle cx="220" cy="205" r="150" fill="none" stroke="#FFB088" strokeOpacity="0.25" strokeDasharray="4 8" className="auth-spin" />
      <circle cx="220" cy="205" r="112" fill="none" stroke="#FFB088" strokeOpacity="0.18" />

      {/* phone */}
      <rect x="140" y="40" width="160" height="320" rx="30" fill="url(#auth-phone)" stroke="#FFB088" strokeOpacity="0.35" strokeWidth="1.5" />
      <rect x="150" y="52" width="140" height="296" rx="22" fill="url(#auth-screen)" />
      <rect x="196" y="60" width="48" height="10" rx="5" fill="#0A1033" />

      {/* avatar + shield */}
      <circle cx="220" cy="128" r="34" fill="url(#auth-accent)" />
      <path d="M220 106l20 8v14c0 12-8.5 21-20 25-11.5-4-20-13-20-25v-14z" fill="#fff" fillOpacity="0.95" />
      <path d="M211 129l6 6 13-13" fill="none" stroke="#2D46E8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="auth-check" />

      <text x="220" y="186" textAnchor="middle" fontSize="13" fontWeight="700" fill="#0A1033">{welcome}</text>
      <rect x="182" y="196" width="76" height="16" rx="8" fill="#DCFCE7" />
      <text x="220" y="208" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#15803D">{secure} ✓</text>

      {/* code boxes */}
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x={166 + i * 28} y="226" width="24" height="30" rx="7" fill="#fff" stroke={i === 3 ? '#2D46E8' : '#CBD5E1'} strokeWidth={i === 3 ? 2 : 1.2} />
          {i < 3 ? <circle cx={178 + i * 28} cy="241" r="4" fill="#0A1033" /> : <rect x={177 + i * 28} y="233" width="2" height="16" rx="1" fill="#2D46E8" className="auth-caret" />}
        </g>
      ))}

      {/* button */}
      <rect x="166" y="274" width="108" height="34" rx="10" fill="url(#auth-accent)" />
      <path d="M210 291h20m-6-6l6 6-6 6" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="rtl:hidden" />
      <path d="M230 291h-20m6-6l-6 6 6 6" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="hidden rtl:block" />
      <rect x="196" y="326" width="48" height="4" rx="2" fill="#CBD5E1" />

      {/* orbiting dots */}
      <circle cx="70" cy="205" r="6" fill="#FF7A45" />
      <circle cx="370" cy="160" r="4" fill="#A5B4FC" />
      <circle cx="350" cy="320" r="5" fill="#FFB088" />
    </svg>
  );
}
