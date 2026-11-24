'use client';

import { useLocale } from 'next-intl';

/** The teacher's share (%) of their subjects' revenue; the rest goes to the platform. Owner only. */
export default function InstructorRevenueShare({ value, onChange, disabled = false }: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const ar = useLocale() === 'ar';
  const share = Number(value);
  const valid = value !== '' && share >= 0 && share <= 100;

  return <fieldset disabled={disabled} className="min-w-0 rounded-2xl border border-[#F1F5F9] bg-white p-6 shadow-sm">
    <legend className="px-1 text-sm font-semibold text-[#1E293B]">{ar ? 'نسبة المدرس من الإيرادات' : "Teacher's revenue share"}</legend>
    <p className="mb-4 text-sm leading-6 text-[#64748B]">
      {ar ? 'النسبة اللي بياخدها المدرس من قيمة تفعيلات مواده ودروسه، والباقي للمنصة. بتظهر في التقارير المالية.' : "The share of their subjects' and lessons' activation value the teacher gets; the rest is the platform's. Shown in the financial reports."}
    </p>
    <div className="flex flex-wrap items-center gap-4">
      <div className="relative w-40">
        <input type="number" min={0} max={100} step="0.5" inputMode="decimal" value={value} onChange={e => onChange(e.target.value)}
          placeholder="0" className="w-full rounded-xl border border-[#E2E8F0] py-2.5 pe-9 ps-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2137D6]" />
        <span className="pointer-events-none absolute end-3 top-2.5 text-sm text-[#94A3B8]">%</span>
      </div>
      {valid && <p className="text-sm text-[#64748B]">
        {ar ? `المدرس ${share}% · المنصة ${Math.round((100 - share) * 100) / 100}%` : `Teacher ${share}% · Platform ${Math.round((100 - share) * 100) / 100}%`}
      </p>}
    </div>
  </fieldset>;
}
