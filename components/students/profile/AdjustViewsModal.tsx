'use client';

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Loader2, Minus, Plus } from 'lucide-react';
import { api, getApiErrorMessage, type StudentChapterViews } from '@/src/lib/api';
import { Modal, inputClass, useTr } from './shared';

/** Add or remove views of one lesson for one student. The backend never lets the limit go below 1. */
export default function AdjustViewsModal({ chapter, studentId, onClose, onDone }: {
  chapter: StudentChapterViews | null;
  studentId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const { tr } = useTr();
  const [amount, setAmount] = useState('1');
  const [note, setNote] = useState('');

  const close = () => { setAmount('1'); setNote(''); onClose(); };

  const adjust = useMutation({
    mutationFn: (delta: number) => api.chapters.adjustViews(chapter!.chapter_id, studentId, delta, note.trim() || undefined),
    onSuccess: (res, delta) => {
      const limit = res?.data?.max_views;
      toast.success(delta > 0
        ? tr(`اتزوّد ${delta} مشاهدة. الحد الجديد ${limit ?? '—'}`, `Added ${delta} views. New limit ${limit ?? '—'}`)
        : tr(`اتقلّل ${Math.abs(delta)} مشاهدة. الحد الجديد ${limit ?? '—'}`, `Removed ${Math.abs(delta)} views. New limit ${limit ?? '—'}`));
      onDone();
      close();
    },
    onError: (error) => toast.error(getApiErrorMessage(error, tr('مقدرناش نعدّل المشاهدات. جرّب تاني.', 'Could not adjust the views. Try again.'))),
  });

  const n = Math.floor(Number(amount));
  const valid = Number.isFinite(n) && n >= 1;

  return (
    <Modal open={chapter !== null} onClose={close} title={tr('زوّد / قلّل المشاهدات', 'Add / remove views')}>
      {chapter && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl bg-[#F4F6FD] px-4 py-3">
            <p className="text-[14px] font-semibold text-[#111827]">{chapter.chapter}</p>
            <p className="mt-1 text-[13px] text-[#6B7280]">
              {tr('شاف', 'Watched')} <strong className="text-[#111827]" dir="ltr">{chapter.count}</strong>
              {' · '}{tr('الحد الحالي', 'Current limit')} <strong className="text-[#111827]" dir="ltr">{chapter.max_views}</strong>
              {' · '}{tr('الأساسي', 'Base')} <strong className="text-[#111827]" dir="ltr">{chapter.base_limit}</strong>
            </p>
          </div>
          <label className="grid gap-1.5">
            <span className="text-[13px] font-medium text-[#4B5563]">{tr('عدد المشاهدات', 'Number of views')}</span>
            <input type="number" min={1} step={1} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} dir="ltr" />
          </label>
          <label className="grid gap-1.5">
            <span className="text-[13px] font-medium text-[#4B5563]">{tr('ملاحظة (اختياري)', 'Note (optional)')}</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={255} className={inputClass} placeholder={tr('مثلاً: النت فصل وهو بيتفرج', 'e.g. connection dropped while watching')} />
          </label>
          <p className="text-[12px] text-[#6B7280]">{tr('الحد عمره ما هيقل عن مشاهدة واحدة.', 'The limit never goes below 1 view.')}</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={!valid || adjust.isPending} onClick={() => adjust.mutate(n)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
              {adjust.isPending && adjust.variables > 0 ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{tr('زوّد', 'Add')}
            </button>
            <button type="button" disabled={!valid || adjust.isPending} onClick={() => adjust.mutate(-n)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-red-700 disabled:opacity-50">
              {adjust.isPending && adjust.variables < 0 ? <Loader2 className="h-4 w-4 animate-spin" /> : <Minus className="h-4 w-4" />}{tr('قلّل', 'Remove')}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
