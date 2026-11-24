'use client';

import React, { useEffect } from 'react';
import { useLocale } from 'next-intl';
import { X } from 'lucide-react';
import type { DeviceDetails } from '@/src/lib/api';

/** The student record, already flattened from the JSON:API response. */
export interface ProfileStudent {
  id: string;
  name: string;
  code: string | null;
  email: string | null;
  phone: string | null;
  image: string | null;
  active: boolean;
  joined: string | null;
  university: string | null;
  faculty: string | null;
  centers: string[];
  courses: { title: string; subtitle: string; thumbnail: string | null; lectures: number; chapters: number; exams: number }[];
  exams: { name: string; score: number; total: number; percentage: number; date: string | null }[];
  activity: { notesCreated: number; downloads: number; liveAttendance: number; communityPosts: number };
  device: { name: string | null; lastIp: string | null };
}

/** `tr('عربي', 'English')` picks the string for the current locale. */
export function useTr() {
  const ar = useLocale() === 'ar';
  return { ar, tr: (arabic: string, english: string) => (ar ? arabic : english) };
}

export function formatDate(value: string | null | undefined, ar: boolean, withTime = true): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(ar ? 'ar-EG' : 'en-GB', withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' }).format(date);
}

export function deviceLabel(device: DeviceDetails | null | undefined): string {
  if (!device) return '—';
  return [device.device, device.browser].filter(Boolean).join(' · ') || device.identifier || '—';
}

export function Card({ title, icon: Icon, action, children, className = '', bodyClassName = 'p-5' }: {
  title?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`min-w-0 rounded-2xl border border-[#EEEEEE] bg-white ${className}`}>
      {title && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F3F4F6] px-5 py-4">
          <h2 className="flex items-center gap-2 text-[15px] font-bold text-[#111827]">
            {Icon && <Icon className="h-4 w-4 text-[#2137D6]" />}
            {title}
          </h2>
          {action}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function StatTile({ label, value, hint, icon: Icon, filled = false }: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  filled?: boolean;
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-2 rounded-2xl border p-4 ${filled ? 'border-[#0A1033] bg-[#0A1033] text-white' : 'border-[#EEEEEE] bg-white text-[#111827]'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[13px] font-medium ${filled ? 'text-white/70' : 'text-[#6B7280]'}`}>{label}</span>
        {Icon && (
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${filled ? 'bg-white/10 text-white' : 'bg-[#F4F6FD] text-[#2137D6]'}`}>
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <span className="text-[24px] font-bold leading-none" dir="ltr" style={{ textAlign: 'start' }}>{value}</span>
      {hint && <span className={`text-[12px] ${filled ? 'text-white/60' : 'text-[#6B7280]'}`}>{hint}</span>}
    </div>
  );
}

export function KeyValueList({ rows }: { rows: { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className="divide-y divide-[#F3F4F6]">
      {rows.map((row) => (
        <div key={row.label} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
          <dt className="shrink-0 text-[13px] text-[#6B7280]">{row.label}</dt>
          <dd className="min-w-0 break-words text-end text-[14px] font-semibold text-[#111827]">{row.value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl bg-[#F9FAFB] px-4 py-8 text-center text-[14px] text-[#6B7280]">{children}</div>;
}

export function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0A1033]/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-md sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-[16px] font-bold text-[#111827]">{title}</h3>
          <button type="button" onClick={onClose} aria-label="close" className="rounded-lg p-1.5 text-[#6B7280] hover:bg-[#F3F4F6]">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const inputClass = 'w-full rounded-xl border border-[#EEEEEE] bg-white px-3 py-2.5 text-[14px] text-[#111827] focus:border-[#2137D6] focus:outline-none focus:ring-2 focus:ring-[#2137D6]/20';
export const thClass = 'whitespace-nowrap px-4 py-3 text-start text-[12px] font-semibold text-[#6B7280]';
export const tdClass = 'whitespace-nowrap px-4 py-3 text-[14px] text-[#111827]';
