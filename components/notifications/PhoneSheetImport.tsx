"use client";

import { useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { toast } from 'sonner';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import api from '@/src/lib/api';
import type { PickedStudent } from '@/components/notifications/StudentPicker';

/** Every cell that looks like a phone number (9 to 15 digits once spaces, +, - are removed). */
export function phonesFromRows(rows: unknown[][]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of rows) {
    for (const cell of row ?? []) {
      if (cell == null) continue;
      // A number cell can arrive as 1002744764 or 1.002744764E9: read it as a whole number.
      const text = typeof cell === 'number' ? Math.round(cell).toString() : String(cell);
      for (const piece of text.split(/[,;/\n|]+/)) {
        const digits = piece.replace(/\D/g, '');
        if (digits.length >= 9 && digits.length <= 15 && !seen.has(digits)) {
          seen.add(digits);
          out.push(piece.trim());
        }
      }
    }
  }
  return out;
}

/**
 * «رفع شيت إكسل»: reads every phone number in an Excel / CSV file, finds the students with those
 * numbers and adds them to the chosen students. Shows how many were added and which numbers belong
 * to no student (or to a stopped account).
 */
export default function PhoneSheetImport({
  onAdd,
  disabled = false,
}: {
  onAdd: (students: PickedStudent[]) => void;
  disabled?: boolean;
}) {
  const ar = useLocale() === 'ar';
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<{ added: number; checked: number; notFound: string[]; inactive: string[] } | null>(null);

  const read = async (file: File | undefined) => {
    if (inputRef.current) inputRef.current.value = '';
    if (!file) return;
    setBusy(true);
    setReport(null);
    try {
      const XLSX = await import('xlsx');
      const book = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const rows: unknown[][] = book.SheetNames.flatMap((name) =>
        XLSX.utils.sheet_to_json<unknown[]>(book.Sheets[name], { header: 1, raw: true, defval: null }),
      );
      const phones = phonesFromRows(rows);
      if (!phones.length) {
        toast.error(ar ? 'مفيش أرقام تليفونات في الملف ده' : 'No phone numbers were found in this file');
        return;
      }
      if (phones.length > 5000) {
        toast.error(ar ? `الملف فيه ${phones.length} رقم. الحد 5000 رقم في المرة.` : `The file has ${phones.length} numbers; the limit is 5000 at a time.`);
        return;
      }
      const result = await api.notifications.matchPhones(phones);
      onAdd(result.students.map((s) => ({ id: s.id, name: s.name || s.id, phone: s.phone, code: s.code })));
      setReport({
        added: result.students.length,
        checked: result.checked,
        notFound: result.not_found,
        inactive: result.inactive.map((s) => `${s.name}${s.phone ? ` (${s.phone})` : ''}`),
      });
      if (result.students.length) {
        toast.success(ar ? `اتحدد ${result.students.length} طالب من الملف` : `${result.students.length} students chosen from the file`);
      } else {
        toast.error(ar ? 'ولا رقم في الملف تبع طالب نشط' : 'No number in the file belongs to an active student');
      }
    } catch {
      toast.error(ar ? 'تعذر قراءة الملف. استخدم ملف Excel أو CSV.' : 'Could not read the file. Use an Excel or CSV file.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2 rounded-xl border border-dashed border-[#C7D2FE] bg-[#F5F7FF] p-3">
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
        className="hidden"
        onChange={(e) => void read(e.target.files?.[0])}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[#475569]">
          {ar ? 'عندك شيت بأرقام تليفونات الطلاب؟ ارفعه وكل طالب رقمه في الشيت هيتحدد.' : 'Have a sheet of student phone numbers? Upload it and every student whose number is in it is chosen.'}
        </p>
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-xl bg-[#16A34A] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#15803D] disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
          {ar ? 'رفع شيت إكسل' : 'Upload Excel sheet'}
        </button>
      </div>

      {report ? (
        <div className="space-y-1.5 text-sm" aria-live="polite">
          <p className="font-semibold text-[#15803D]">
            {ar ? `اتحدد ${report.added} طالب من ${report.checked} رقم في الملف.` : `${report.added} students chosen from ${report.checked} numbers in the file.`}
          </p>
          {report.inactive.length ? (
            <details className="text-[#B45309]">
              <summary className="cursor-pointer">{ar ? `${report.inactive.length} رقم تبع حسابات موقوفة (ما اتحددتش)` : `${report.inactive.length} numbers belong to stopped accounts (not chosen)`}</summary>
              <p className="mt-1 break-words text-xs" dir="auto">{report.inactive.join('، ')}</p>
            </details>
          ) : null}
          {report.notFound.length ? (
            <details className="text-[#B91C1C]">
              <summary className="cursor-pointer">{ar ? `${report.notFound.length} رقم مش تبع أي طالب` : `${report.notFound.length} numbers belong to no student`}</summary>
              <p className="mt-1 break-words text-xs" dir="ltr">{report.notFound.join(', ')}</p>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
