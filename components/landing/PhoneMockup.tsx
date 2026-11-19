import Image from 'next/image';
import { Bell, ClipboardCheck, FileText, PlayCircle, Radio } from 'lucide-react';
import type { LandingContent } from './content';

/** A drawn Learnoo app screen for the hero (no screenshots needed). */
export default function PhoneMockup({ c }: { c: LandingContent['mock'] }) {
  return (
    <div className="relative mx-auto w-[270px] sm:w-[300px]" aria-hidden>
      {/* glow */}
      <div className="absolute -inset-10 rounded-full bg-[#3B82F6]/40 blur-3xl" />

      <div className="relative rounded-[2.6rem] border-[10px] border-[#0A1240] bg-[#F5F8FF] shadow-[0_40px_80px_-20px_rgba(2,8,60,0.7)] overflow-hidden">
        <div className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-[#0A1240]" />

        {/* app header */}
        <div className="bg-gradient-to-br from-[#1530C8] to-[#2563EB] px-5 pb-6 pt-10 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Image src="/Logo.jpeg" alt="" width={28} height={28} className="rounded-lg" />
              <span className="font-bold tracking-tight" dir="ltr">Learnoo</span>
            </div>
            <Bell className="h-4 w-4 opacity-90" />
          </div>
          <p className="mt-4 text-sm opacity-90">{c.greeting}</p>
        </div>

        <div className="-mt-4 space-y-3 px-4 pb-6">
          <div className="rounded-2xl bg-white p-3.5 shadow-sm">
            <p className="text-[11px] font-medium text-[#64748B]">{c.continue}</p>
            <div className="mt-2 flex items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#EEF2FF] text-[#2137D6]"><PlayCircle className="h-6 w-6" /></div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-[#0F172A]">{c.course}</p>
                <div className="mt-1.5 h-1.5 rounded-full bg-[#E2E8F0]"><div className="h-full w-[68%] rounded-full bg-gradient-to-r from-[#2137D6] to-[#38BDF8] rtl:bg-gradient-to-l" /></div>
                <p className="mt-1 text-[10px] text-[#64748B]">{c.progress}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-[#0B1A6E] to-[#1E3AE0] p-3.5 text-white shadow-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />{c.live}</span>
            <p className="mt-2 flex items-center gap-2 text-[13px] font-bold"><Radio className="h-4 w-4" />{c.liveTitle}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white p-3 shadow-sm">
              <ClipboardCheck className="h-5 w-5 text-emerald-500" />
              <p className="mt-2 text-[11px] text-[#64748B]">{c.exam}</p>
              <p className="text-[15px] font-extrabold text-[#0F172A]" dir="ltr">{c.examScore}</p>
            </div>
            <div className="rounded-2xl bg-white p-3 shadow-sm">
              <FileText className="h-5 w-5 text-amber-500" />
              <p className="mt-2 text-[11px] text-[#64748B]">{c.summary}</p>
              <p className="text-[12px] font-bold leading-snug text-[#0F172A]">{c.summaryTitle}</p>
            </div>
          </div>
        </div>
      </div>

      {/* floating chips */}
      <div className="absolute -end-10 top-24 hidden rounded-2xl bg-white px-3.5 py-2.5 shadow-xl sm:flex items-center gap-2 animate-[float_6s_ease-in-out_infinite]">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-red-50 text-red-500"><Radio className="h-4 w-4" /></span>
        <span className="text-[12px] font-bold text-[#0F172A]">{c.live}</span>
      </div>
      <div className="absolute -start-12 bottom-24 hidden rounded-2xl bg-white px-3.5 py-2.5 shadow-xl sm:flex items-center gap-2 animate-[float_7s_ease-in-out_infinite_1s]">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-50 text-emerald-500"><ClipboardCheck className="h-4 w-4" /></span>
        <span className="text-[12px] font-bold text-[#0F172A]" dir="ltr">{c.examScore}</span>
      </div>
    </div>
  );
}
