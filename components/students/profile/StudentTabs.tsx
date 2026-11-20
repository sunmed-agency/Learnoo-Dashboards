'use client';

import React from 'react';

export interface ProfileTab<K extends string = string> {
  key: K;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

/** Underline tabs; the active one gets a coral bar. Scrolls sideways on phones. */
export default function StudentTabs<K extends string>({ tabs, active, onChange }: { tabs: ProfileTab<K>[]; active: K; onChange: (key: K) => void }) {
  return (
    <div className="-mx-4 overflow-x-auto border-b border-[#EEEEEE] px-4 sm:mx-0 sm:px-0">
      <div role="tablist" className="flex min-w-max gap-1">
        {tabs.map(({ key, label, icon: Icon, badge }) => {
          const selected = key === active;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(key)}
              className={`relative inline-flex shrink-0 items-center gap-2 whitespace-nowrap px-3.5 pb-3 pt-2 text-[14px] font-semibold transition ${selected ? 'text-[#0A1033]' : 'text-[#6B7280] hover:text-[#111827]'}`}
            >
              <Icon className={`h-4 w-4 ${selected ? 'text-[#E8766A]' : ''}`} />
              {label}
              {badge !== undefined && badge > 0 && (
                <span className="rounded-full bg-amber-100 px-1.5 text-[11px] font-bold text-amber-700">{badge}</span>
              )}
              <span className={`absolute inset-x-2 -bottom-px h-[3px] rounded-full ${selected ? 'bg-[#E8766A]' : 'bg-transparent'}`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
