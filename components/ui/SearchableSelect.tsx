'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { Check, ChevronDown, Search } from 'lucide-react';

export type SearchableOption<V extends string | number> = { value: V; label: string };

type Props<V extends string | number> = {
  value: V | '';
  options: SearchableOption<V>[];
  onChange: (value: V | '') => void;
  /** Label of the "everything" choice (value ''). */
  allLabel: string;
  ariaLabel: string;
  className?: string;
};

/** Arabic letters that people type interchangeably (أ/إ/آ/ا, ة/ه, ى/ي) match each other. */
export function normalizeForSearch(text: string): string {
  return text.toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[ً-ْ]/g, '').trim();
}

/** A dropdown with a search box at the top, for long lists (subjects, exams). Keyboard: arrows, Enter, Escape. */
export default function SearchableSelect<V extends string | number>({ value, options, onChange, allLabel, ariaLabel, className = '' }: Props<V>) {
  const ar = useLocale() === 'ar';
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const all: SearchableOption<V | ''>[] = useMemo(() => [{ value: '' as const, label: allLabel }, ...options], [allLabel, options]);
  const shown = useMemo(() => {
    const q = normalizeForSearch(query);
    return q ? all.filter((option) => option.value === '' || normalizeForSearch(option.label).includes(q)) : all;
  }, [all, query]);
  const selected = all.find((option) => option.value === value) ?? all[0];

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    window.setTimeout(() => input.current?.focus(), 0);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const choose = (option: SearchableOption<V | ''>) => {
    onChange(option.value);
    setOpen(false);
    setQuery('');
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive((i) => Math.min(shown.length - 1, i + 1)); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    else if (event.key === 'Enter') { event.preventDefault(); if (shown[active]) choose(shown[active]); }
    else if (event.key === 'Escape') { event.preventDefault(); setOpen(false); }
  };

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => { setOpen((current) => !current); setActive(0); }}
        className={`flex w-full items-center justify-between gap-2 text-start ${className}`}
      >
        <span className="truncate">{selected.label}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full z-30 mt-1 min-w-[16rem] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="relative border-b border-slate-100 p-2">
            <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={input}
              value={query}
              onChange={(event) => { setQuery(event.target.value); setActive(0); }}
              onKeyDown={onKeyDown}
              placeholder={ar ? 'ابحث...' : 'Search...'}
              aria-controls={`${id}-list`}
              aria-activedescendant={shown[active] ? `${id}-${active}` : undefined}
              className="w-full rounded-lg border border-slate-200 py-2 pe-3 ps-8 text-sm outline-none focus:border-[#2D46E8] focus:ring-2 focus:ring-[#2D46E8]/15"
            />
          </div>
          <ul id={`${id}-list`} role="listbox" aria-label={ariaLabel} className="max-h-72 overflow-y-auto py-1">
            {shown.length <= 1 && query && <li className="px-3 py-2 text-sm text-slate-500">{ar ? 'مفيش نتايج' : 'No results'}</li>}
            {shown.map((option, index) => {
              const isSelected = option.value === value;
              return (
                <li
                  key={String(option.value) || '__all'}
                  id={`${id}-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActive(index)}
                  onMouseDown={(event) => { event.preventDefault(); choose(option); }}
                  className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm ${index === active ? 'bg-[#F3F5FE]' : ''} ${isSelected ? 'font-semibold text-[#1F33C4]' : 'text-slate-700'}`}
                >
                  <Check className={`h-4 w-4 shrink-0 ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                  <bdi className="min-w-0 flex-1 truncate">{option.label}</bdi>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
