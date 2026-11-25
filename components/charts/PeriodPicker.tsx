"use client";

export type PeriodPreset = '7d' | '30d' | '90d' | 'month' | 'lastMonth' | 'quarter' | 'year' | 'all' | 'custom';

export const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function presetRange(preset: PeriodPreset, now = new Date()): { from: string; to: string } {
  const back = (days: number) => ({ from: ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate() - days + 1)), to: ymd(now) });
  switch (preset) {
    case '7d': return back(7);
    case '30d': return back(30);
    case '90d': return back(90);
    case 'month': return { from: ymd(new Date(now.getFullYear(), now.getMonth(), 1)), to: ymd(now) };
    case 'lastMonth': return { from: ymd(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: ymd(new Date(now.getFullYear(), now.getMonth(), 0)) };
    case 'quarter': { const q = Math.floor(now.getMonth() / 3) * 3; return { from: ymd(new Date(now.getFullYear(), q, 1)), to: ymd(now) }; }
    case 'year': return { from: ymd(new Date(now.getFullYear(), 0, 1)), to: ymd(now) };
    default: return { from: '', to: '' };
  }
}

const LABELS: Record<PeriodPreset, [string, string]> = {
  '7d': ['آخر 7 أيام', 'Last 7 days'],
  '30d': ['آخر 30 يوم', 'Last 30 days'],
  '90d': ['آخر 90 يوم', 'Last 90 days'],
  month: ['الشهر الحالي', 'This month'],
  lastMonth: ['الشهر السابق', 'Last month'],
  quarter: ['الربع الحالي', 'This quarter'],
  year: ['السنة الحالية', 'This year'],
  all: ['كل الفترات', 'All time'],
  custom: ['فترة مخصصة', 'Custom'],
};

/** Presets in one row, then from/to dates; every change reports the new range. */
export default function PeriodPicker({ ar, presets, value, from, to, onChange, note }: {
  ar: boolean;
  presets: PeriodPreset[];
  value: PeriodPreset;
  from: string;
  to: string;
  onChange: (next: { preset: PeriodPreset; from: string; to: string }) => void;
  note?: string;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={ar ? 'الفترة' : 'Period'}>
        {presets.map((p) => (
          <button key={p} type="button" aria-pressed={value === p}
            onClick={() => onChange({ preset: p, ...presetRange(p) })}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${value === p ? 'bg-[#2137D6] text-white' : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'}`}>
            {ar ? LABELS[p][0] : LABELS[p][1]}
          </button>
        ))}
      </div>
      <label className="text-xs text-[#64748B]">{ar ? 'من' : 'From'}
        <input type="date" value={from} max={to || undefined} onChange={(e) => onChange({ preset: 'custom', from: e.target.value, to })} className="mt-1 block rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-sm text-[#0F172A]" />
      </label>
      <label className="text-xs text-[#64748B]">{ar ? 'إلى' : 'To'}
        <input type="date" value={to} min={from || undefined} onChange={(e) => onChange({ preset: 'custom', from, to: e.target.value })} className="mt-1 block rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-sm text-[#0F172A]" />
      </label>
      {note && <p className="ms-auto text-xs text-[#64748B]">{note}</p>}
    </div>
  );
}
