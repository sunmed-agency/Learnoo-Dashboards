'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, ClipboardCheck, Globe, LayoutDashboard, Lock, Radio, Users, Video } from 'lucide-react';
import type { LandingLocale } from './content';

const TEXT = {
  ar: { students: 'الطلاب', completion: 'نسبة الإنجاز', live: 'مباشر الآن', week: 'المشاهدات هذا الأسبوع', lessons: ['محاضرة 4 · التشريح', 'مراجعة الدرس الثالث'] },
  en: { students: 'Students', completion: 'Completion', live: 'Live now', week: 'Views this week', lessons: ['Lecture 4 · Anatomy', 'Chapter 3 review'] },
} as const;

const MENU = [LayoutDashboard, Video, Radio, ClipboardCheck, Users];
const TICK_MS = 2400;

type Snapshot = { bars: number[]; students: number; completion: number; live: number; rows: number[]; active: number };

// Same on the server and the first client render, so hydration matches.
const START: Snapshot = { bars: [40, 65, 50, 80, 60, 95, 75], students: 1240, completion: 86, live: 32, rows: [72, 45], active: 0 };

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const drift = (v: number, step: number, min: number, max: number) => clamp(Math.round(v + (Math.random() * 2 - 1) * step), min, max);

function next(s: Snapshot): Snapshot {
  return {
    bars: s.bars.map((b) => drift(b, 28, 22, 98)),
    students: drift(s.students, 45, 1150, 1360),
    completion: drift(s.completion, 5, 72, 97),
    live: drift(s.live, 7, 14, 58),
    rows: s.rows.map((r) => drift(r, 18, 15, 100)),
    active: (s.active + 1) % MENU.length,
  };
}

/** Counts from the previous value to the new one. */
function useTween(target: number, duration = 900) {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = performance.now();
    const begin = from.current;
    let frame = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(begin + (target - begin) * eased));
      if (p < 1) frame = requestAnimationFrame(step);
      else from.current = target;
    };
    frame = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(frame); from.current = target; };
  }, [target, duration]);
  return value;
}

const number = new Intl.NumberFormat('en-US');

function Stat({ label, value, suffix = '', color, up }: { label: string; value: number; suffix?: string; color: string; up: boolean | null }) {
  const shown = useTween(value);
  const Trend = up ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="rounded-xl bg-[#F8FAFC] p-2.5 ring-1 ring-[#EEF2F7] sm:p-3">
      <div className="flex items-center justify-between gap-1">
        <span className="block h-1.5 w-6 rounded-full sm:w-8" style={{ background: color }} />
        {up !== null && <Trend className={`h-3.5 w-3.5 transition-colors ${up ? 'text-emerald-500' : 'text-rose-500'}`} aria-hidden />}
      </div>
      <span className="mt-2 block text-[14px] font-extrabold tabular-nums text-[#0F172A] sm:text-[17px]" dir="ltr">{number.format(shown)}{suffix}</span>
      <span className="mt-0.5 block truncate text-[10.5px] font-semibold text-[#94A3B8] sm:text-[11.5px]">{label}</span>
    </div>
  );
}

/** The lecturer dashboard drawn in the landing page's "your own space" section, with live-looking numbers. */
export default function DashboardMockup({ locale, domain, domainLabel }: { locale: LandingLocale; domain: string; domainLabel: string }) {
  const t = TEXT[locale];
  const [snap, setSnap] = useState<Snapshot>(START);
  const [prev, setPrev] = useState<Snapshot | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const current = useRef<Snapshot>(START);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let visible = false;
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { threshold: 0.2 });
    if (box.current) observer.observe(box.current);
    const timer = window.setInterval(() => {
      if (!visible || document.hidden) return;
      const before = current.current;
      const after = next(before);
      current.current = after;
      setPrev(before);
      setSnap(after);
    }, TICK_MS);
    return () => { observer.disconnect(); window.clearInterval(timer); };
  }, []);

  const trend = (key: 'students' | 'completion' | 'live') => (prev ? snap[key] >= prev[key] : null);
  const rowPercent = [useTween(snap.rows[0]), useTween(snap.rows[1])];

  return (
    <div ref={box} className="relative mx-auto w-full max-w-2xl" aria-hidden>
      <div className="absolute -inset-6 rounded-[2.5rem] bg-[#2D46E8]/10 blur-3xl" />
      <div className="relative overflow-hidden rounded-3xl bg-white shadow-[0_40px_80px_-30px_rgba(15,23,42,0.45)] ring-1 ring-[#E2E8F0]">
        <div className="flex items-center gap-3 border-b border-[#EEF2F7] bg-[#F8FAFC] px-4 py-3" dir="ltr">
          <div className="flex gap-1.5"><span className="h-3 w-3 rounded-full bg-[#FF5F57]" /><span className="h-3 w-3 rounded-full bg-[#FEBC2E]" /><span className="h-3 w-3 rounded-full bg-[#28C840]" /></div>
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-[13px] font-semibold text-[#334155] ring-1 ring-[#E2E8F0]">
            <Lock className="h-3.5 w-3.5 shrink-0 text-emerald-600" /><span className="truncate">{domain}</span>
          </div>
        </div>

        <div className="grid grid-cols-[56px_1fr] sm:grid-cols-[150px_1fr]">
          <div className="relative space-y-2 border-e border-[#EEF2F7] bg-[#FBFCFF] p-3">
            {/* the highlight slides to the active item */}
            <span className="absolute inset-x-3 top-3 h-9 rounded-lg bg-[#2D46E8] shadow-md shadow-blue-600/30 transition-transform duration-700 ease-out" style={{ transform: `translateY(${snap.active * 44}px)` }} />
            {MENU.map((Icon, i) => (
              <div key={i} className={`relative flex h-9 items-center gap-2 rounded-lg px-2.5 transition-colors duration-500 ${i === snap.active ? 'text-white' : 'text-[#64748B]'}`}>
                <Icon className="h-4 w-4 shrink-0" /><span className="hidden h-2 flex-1 rounded-full bg-current opacity-30 sm:block" />
              </div>
            ))}
          </div>

          <div className="min-w-0 space-y-3 p-3 sm:space-y-4 sm:p-5">
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <Stat label={t.students} value={snap.students} color="#2D46E8" up={trend('students')} />
              <Stat label={t.completion} value={snap.completion} suffix="%" color="#10B981" up={trend('completion')} />
              <Stat label={t.live} value={snap.live} color="#F59E0B" up={trend('live')} />
            </div>

            <div className="rounded-xl bg-[#F8FAFC] p-3 ring-1 ring-[#EEF2F7]">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#64748B] sm:text-[12px]">{t.week}</span>
                <span className="flex items-center gap-1.5 text-[10.5px] font-bold text-rose-500"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />LIVE</span>
              </div>
              <div className="flex h-24 items-end gap-2 sm:h-28">
                {snap.bars.map((h, i) => (
                  <span
                    key={i}
                    className="flex-1 rounded-t-md bg-gradient-to-t from-[#2D46E8] to-[#60A5FA] transition-[height] duration-1000 ease-[cubic-bezier(.34,1.56,.64,1)]"
                    style={{ height: `${h}%`, transitionDelay: `${i * 60}ms` }}
                  />
                ))}
              </div>
            </div>

            {t.lessons.map((lesson, i) => (
              <div key={lesson} className="flex items-center gap-3 rounded-xl p-2 ring-1 ring-[#EEF2F7]">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#E9EDFD] text-[#2D46E8]"><Video className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-[11.5px] font-bold text-[#334155] sm:text-[12.5px]">{lesson}</span>
                  <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-[#E2E8F0]">
                    <span className="block h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-[width] duration-1000 ease-out rtl:bg-gradient-to-l" style={{ width: `${snap.rows[i]}%` }} />
                  </span>
                </div>
                <span className="w-10 shrink-0 text-end text-[12px] font-extrabold tabular-nums text-emerald-600" dir="ltr">{rowPercent[i]}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="absolute -bottom-5 start-6 inline-flex items-center gap-2 rounded-2xl bg-[#0A1033] px-4 py-3 text-[13px] font-bold text-white shadow-xl">
        <Globe className="h-4 w-4 text-[#FFB088]" />{domainLabel}
      </div>
    </div>
  );
}
