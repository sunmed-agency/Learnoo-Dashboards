"use client";

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocale } from 'next-intl';
import { useDebounce } from 'use-debounce';
import api from '@/src/lib/api';
import PhoneSheetImport from '@/components/notifications/PhoneSheetImport';

/** Chips shown at once; a whole Excel sheet can choose hundreds of students. */
const VISIBLE_CHIPS = 40;

export interface PickedStudent {
  id: string;
  /** Empty while the name of a preselected id (from the URL) is still loading. */
  name: string;
  phone?: string | null;
  code?: string | null;
}

type StudentLike = { id: string; attributes: { first_name?: string; last_name?: string; full_name?: string; phone?: string | null; student_code?: string | null } };

const toPicked = (s: StudentLike): PickedStudent => ({
  id: String(s.id),
  name: s.attributes.full_name || `${s.attributes.first_name ?? ''} ${s.attributes.last_name ?? ''}`.trim(),
  phone: s.attributes.phone ?? null,
  code: s.attributes.student_code ?? null,
});

/** Search students (name, phone or code) and pick one or several of them. */
export default function StudentPicker({ value, onChange, disabled = false }: { value: PickedStudent[]; onChange: (next: PickedStudent[] | ((prev: PickedStudent[]) => PickedStudent[])) => void; disabled?: boolean }) {
  const ar = useLocale() === 'ar';
  const [search, setSearch] = useState('');
  const [debounced] = useDebounce(search.trim(), 400);
  const selectedIds = new Set(value.map(s => s.id));

  const { data, isFetching, isError } = useQuery({
    queryKey: ['notificationStudentPicker', debounced],
    queryFn: () => api.students.list({ search: debounced, per_page: 20 }),
    enabled: debounced.length > 0,
    staleTime: 30_000,
  });
  const results = (data?.data ?? []).map(s => toPicked(s as unknown as StudentLike));

  // Students preselected by id (e.g. ?students=a,b) arrive without names: load them once.
  const unnamed = value.filter(s => !s.name).map(s => s.id).join(',');
  useEffect(() => {
    if (!unnamed) return;
    let active = true;
    Promise.all(unnamed.split(',').map(id => api.students.get(id).then(r => toPicked(r.data as unknown as StudentLike)).catch(() => null)))
      .then(found => {
        if (!active) return;
        const byId = new Map(found.filter((s): s is PickedStudent => !!s).map(s => [s.id, s]));
        // Keep unknown ids visible (labelled by id) so nothing is silently dropped.
        onChange(prev => prev.map(s => s.name ? s : (byId.get(s.id) ?? { ...s, name: s.id })));
      });
    return () => { active = false; };
    // Only re-run when the set of unnamed ids changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unnamed]);

  const toggle = (student: PickedStudent) => onChange(selectedIds.has(student.id) ? value.filter(s => s.id !== student.id) : [...value, student]);
  const label = ar ? 'ابحث عن طالب بالاسم أو رقم الموبايل أو الكود' : 'Search students by name, phone or code';

  return <div className="min-w-0 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="font-medium">{ar ? 'الطلاب المختارين' : 'Chosen students'}</span>
      <span className="flex items-center gap-2">
        {value.length > 1 ? <button type="button" disabled={disabled} onClick={() => onChange([])} className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50">{ar ? 'إلغاء اختيار الكل' : 'Clear all'}</button> : null}
        <span className="rounded-full bg-blue-50 px-3 py-1 text-sm text-primary" aria-live="polite">{ar ? `${value.length} طالب` : `${value.length} student${value.length === 1 ? '' : 's'}`}</span>
      </span>
    </div>
    <PhoneSheetImport
      disabled={disabled}
      onAdd={(list) => onChange((prev) => {
        const ids = new Set(prev.map((s) => s.id));
        return [...prev, ...list.filter((s) => !ids.has(s.id))];
      })}
    />
    {value.length > 0 ? <ul className="flex flex-wrap gap-2">
      {value.slice(0, VISIBLE_CHIPS).map(s => <li key={s.id} className="flex max-w-full items-center gap-1 rounded-full border bg-gray-50 py-1 pe-1 ps-3 text-sm">
        <span className="truncate">{s.name || (ar ? 'جارٍ التحميل…' : 'Loading…')}</span>
        <button type="button" disabled={disabled} onClick={() => onChange(value.filter(x => x.id !== s.id))} aria-label={ar ? `شيل ${s.name || s.id}` : `Remove ${s.name || s.id}`} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800">×</button>
      </li>)}
      {value.length > VISIBLE_CHIPS ? <li className="self-center text-sm text-gray-600">{ar ? `و ${value.length - VISIBLE_CHIPS} كمان` : `and ${value.length - VISIBLE_CHIPS} more`}</li> : null}
    </ul> : <p className="text-sm text-gray-600">{ar ? 'لسه مفيش طلاب مختارين. ابحث واختار من القائمة.' : 'No students chosen yet. Search and pick from the list.'}</p>}
    <input type="search" value={search} disabled={disabled} onChange={e => setSearch(e.target.value)} placeholder={label} aria-label={label} className="w-full rounded-xl border p-3" />
    {debounced && <div className="max-h-72 overflow-y-auto rounded-xl border">
      {isError ? <p role="alert" className="p-3 text-sm">{ar ? 'تعذر البحث عن الطلاب' : 'Could not search students'}</p>
        : isFetching && !results.length ? <p role="status" className="p-3 text-sm text-gray-600">{ar ? 'جارٍ البحث…' : 'Searching…'}</p>
        : !results.length ? <p className="p-3 text-sm text-gray-600">{ar ? 'مفيش طلاب مطابقين' : 'No matching students'}</p>
        : <ul className="divide-y">
          {results.map(s => <li key={s.id}>
            <label className="flex cursor-pointer items-center gap-3 p-3 hover:bg-gray-50">
              <input type="checkbox" disabled={disabled} checked={selectedIds.has(s.id)} onChange={() => toggle(s)} className="h-4 w-4 shrink-0" />
              <span className="min-w-0">
                <span className="block truncate font-medium">{s.name}</span>
                <span className="block truncate text-xs text-gray-500">{[s.phone && <bdi key="p" dir="ltr">{s.phone}</bdi>, s.code].filter(Boolean).map((part, i) => <span key={i}>{i > 0 && ' · '}{part}</span>)}</span>
              </span>
            </label>
          </li>)}
        </ul>}
    </div>}
  </div>;
}
