"use client";

import Link from "next/link";
import { BookOpen, ClipboardList, FileText, GraduationCap, Video } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { IStudent } from "@/src/interfaces/student.interface";

type StudentHeroProps = {
  student: IStudent | null;
  coursesCount: number;
  notesCount: number;
  liveSessionsCount: number;
  /** Available (not expired) exams in the student's courses. */
  examsCount?: number;
};

/**
 * Student home hero: the same greeting and counts as the old WelcomeSection, in the Learnoo identity
 * (Midnight → Royal with Coral accents) and with an original study illustration. Looks only.
 */
export default function StudentHero({ student, coursesCount, notesCount, liveSessionsCount, examsCount = 0 }: StudentHeroProps) {
  const locale = useLocale();
  const t = useTranslations("students.home.welcome");
  const tC = useTranslations("universities");
  const university = student?.university?.data?.attributes?.name || tC("notFound");

  const stats: { icon: typeof BookOpen; value: number; label: string; tone: string; href?: string }[] = [
    { icon: BookOpen, value: coursesCount, label: t("activeCourses"), tone: "bg-white/15 text-white" },
    { icon: Video, value: liveSessionsCount, label: t("liveToday"), tone: "bg-[#E8766A] text-white" },
    { icon: FileText, value: notesCount, label: t("notes"), tone: "bg-[#14B8A6] text-white" },
    { icon: ClipboardList, value: examsCount, label: t("exams"), tone: "bg-[#F5A524] text-white", href: `/${locale}/student/exams` },
  ];

  return (
    <section className="relative isolate overflow-hidden rounded-[28px] bg-[#0A1033] px-5 py-6 text-white shadow-[0_24px_60px_-30px_rgba(45,70,232,0.8)] sm:px-8 sm:py-8 lg:px-10 lg:py-10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_90%_at_85%_10%,#3550F0_0%,transparent_60%),radial-gradient(ellipse_55%_70%_at_5%_100%,rgba(232,118,106,0.55)_0%,transparent_60%),linear-gradient(135deg,#0A1033_0%,#141C66_55%,#1F33C4_100%)]" aria-hidden />
      <div className="absolute inset-0 -z-10 opacity-[0.07] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]" aria-hidden />

      <div className="grid items-center gap-6 xl:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <span className="inline-flex max-w-full items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[12.5px] font-semibold text-white/90 ring-1 ring-white/15 backdrop-blur">
            <GraduationCap className="size-4 shrink-0 text-[#FFC2B9]" aria-hidden />
            <span className="truncate">{university}</span>
          </span>

          <h2 className="mt-4 text-[clamp(1.6rem,1.1rem+2.4vw,2.75rem)] font-extrabold leading-tight tracking-tight">
            {t("title")}{" "}
            <span className="bg-gradient-to-l from-[#FFB4A9] via-[#FFD9D3] to-white bg-clip-text text-transparent ltr:bg-gradient-to-r">
              {student?.first_name || "Student"}
            </span>{" "}
            <span aria-hidden>👋</span>
          </h2>

          <ul className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 xl:max-w-3xl">
            {stats.map(({ icon: Icon, value, label, tone, href }) => {
              const body = (
              <>
                <span className={`grid size-9 shrink-0 place-items-center rounded-xl sm:size-10 ${tone}`}>
                  <Icon className="size-[18px]" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-xl font-extrabold leading-none sm:text-2xl" dir="ltr">{value}</span>
                  <span className="mt-1 block text-[11.5px] leading-snug text-white/75 sm:text-[12.5px] xl:truncate">{label}</span>
                </span>
              </>
              );
              const box = "flex h-full min-w-0 flex-col gap-2 rounded-2xl bg-white/[0.08] p-3 ring-1 ring-white/10 backdrop-blur sm:flex-row sm:items-center sm:gap-3 sm:p-3.5";
              return (
                <li key={label}>
                  {href ? (
                    <Link href={href} className={`${box} transition hover:bg-white/[0.14] hover:ring-white/25`}>{body}</Link>
                  ) : (
                    <div className={box}>{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <HeroArt />
      </div>
    </section>
  );
}

/** Original illustration: an open book with a graduation cap, a progress ring and floating study cards. */
function HeroArt() {
  return (
    <div className="relative mx-auto hidden h-[190px] w-[240px] xl:block 2xl:h-[210px] 2xl:w-[270px]" aria-hidden>
      <svg viewBox="0 0 270 210" className="h-full w-full">
        <defs>
          <linearGradient id="lr-page" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset="1" stopColor="#E3E8FF" />
          </linearGradient>
          <linearGradient id="lr-coral" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#F49A8F" />
            <stop offset="1" stopColor="#D2584B" />
          </linearGradient>
          <linearGradient id="lr-royal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#5B73FF" />
            <stop offset="1" stopColor="#1F33C4" />
          </linearGradient>
        </defs>

        <circle cx="140" cy="110" r="92" fill="none" stroke="#FFFFFF" strokeOpacity="0.12" strokeDasharray="3 9" className="lr-spin" />
        <circle cx="140" cy="110" r="66" fill="#FFFFFF" fillOpacity="0.05" />

        {/* open book */}
        <path d="M70 150c22-10 46-10 70 2v-62c-24-12-48-12-70-2z" fill="url(#lr-page)" />
        <path d="M210 150c-22-10-46-10-70 2v-62c24-12 48-12 70-2z" fill="url(#lr-page)" />
        <path d="M140 90v62" stroke="#C7D0FF" strokeWidth="2" />
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <path d={`M82 ${104 + i * 12}c16-6 32-6 46 0`} stroke="#B7C2FB" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d={`M152 ${104 + i * 12}c14-6 30-6 46 0`} stroke="#B7C2FB" strokeWidth="3" strokeLinecap="round" fill="none" />
          </g>
        ))}
        <path d="M66 154c24-11 50-11 74 2 24-13 50-13 74-2v6c-24-10-50-10-74 2-24-12-50-12-74-2z" fill="url(#lr-royal)" />

        {/* graduation cap */}
        <g className="lr-float">
          <path d="M140 38l44 18-44 18-44-18z" fill="url(#lr-coral)" />
          <path d="M116 64v14c0 6 11 11 24 11s24-5 24-11V64l-24 10z" fill="#C24A3E" />
          <path d="M184 56v22" stroke="#FFD2CB" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="184" cy="81" r="4" fill="#FFD2CB" />
        </g>

        {/* progress ring card */}
        <g className="lr-float-slow">
          <rect x="196" y="22" width="62" height="62" rx="16" fill="#FFFFFF" fillOpacity="0.12" stroke="#FFFFFF" strokeOpacity="0.2" />
          <circle cx="227" cy="53" r="18" fill="none" stroke="#FFFFFF" strokeOpacity="0.2" strokeWidth="5" />
          <circle cx="227" cy="53" r="18" fill="none" stroke="#14B8A6" strokeWidth="5" strokeLinecap="round" strokeDasharray="113" strokeDashoffset="34" transform="rotate(-90 227 53)" />
          <text x="227" y="57" textAnchor="middle" fontSize="11" fontWeight="800" fill="#FFFFFF">70%</text>
        </g>

        {/* play card */}
        <g className="lr-float">
          <rect x="12" y="40" width="60" height="44" rx="14" fill="#FFFFFF" fillOpacity="0.12" stroke="#FFFFFF" strokeOpacity="0.2" />
          <circle cx="42" cy="62" r="13" fill="#E8766A" />
          <path d="M38 55.5v13l11-6.5z" fill="#FFFFFF" />
        </g>

        <circle cx="30" cy="160" r="5" fill="#FFB4A9" />
        <circle cx="250" cy="150" r="4" fill="#9FB0FF" />
        <circle cx="96" cy="26" r="3" fill="#FFFFFF" fillOpacity="0.6" />
      </svg>
    </div>
  );
}
