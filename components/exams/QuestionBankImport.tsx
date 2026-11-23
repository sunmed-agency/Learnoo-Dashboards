"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { Library, X } from "lucide-react";
import type { BankQuestion } from "@/src/lib/api";
import type { ExamFormQuestion } from "@/src/lib/exam-form";
import { mapBankQuestions } from "@/src/lib/question-bank";
import { QuestionBankBrowser } from "@/components/exams/QuestionBankBrowser";

type Props = {
  /** Called with the picked questions as new exam questions (nothing is saved until the exam is saved). */
  onApply: (questions: ExamFormQuestion[]) => void;
  /** The exam being edited: its own questions are hidden. */
  excludeQuizId?: string | number;
};

/** "Import from the question bank": search and filter every question, tick some, add them to this exam. */
export function QuestionBankImport({ onApply, excludeQuizId }: Props) {
  const ar = useLocale() === "ar";
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Map<number, BankQuestion>>(new Map());

  useEffect(() => {
    if (open) dialog.current?.showModal(); else dialog.current?.close();
  }, [open]);

  const toggle = (question: BankQuestion, checked: boolean) => setSelected((current) => {
    const next = new Map(current);
    if (checked) next.set(question.id, question); else next.delete(question.id);
    return next;
  });

  function apply() {
    if (selected.size === 0) return;
    onApply(mapBankQuestions([...selected.values()]));
    setSelected(new Map());
    setOpen(false);
  }

  return <>
    <button type="button" onClick={() => { setSelected(new Map()); setOpen(true); }} className="flex items-center gap-2 rounded-xl bg-[#0A1033] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#1F33C4]">
      <Library size={16} />{ar ? "استيراد من بنك الأسئلة" : "Import from question bank"}
    </button>
    <dialog ref={dialog} onCancel={() => setOpen(false)} aria-labelledby="question-bank-title" dir={ar ? "rtl" : "ltr"} className="font-sans m-auto max-h-[92dvh] w-[min(96vw,60rem)] overflow-auto rounded-2xl p-0 shadow-xl backdrop:bg-black/50">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b bg-white px-6 py-4">
        <h2 id="question-bank-title" className="text-lg font-bold">{ar ? "استيراد من بنك الأسئلة" : "Import from the question bank"}</h2>
        <button type="button" onClick={() => setOpen(false)} aria-label={ar ? "إغلاق" : "Close"}><X size={20} /></button>
      </div>
      <div className="px-6 py-4">
        {open && <QuestionBankBrowser selectable selected={selected} onToggle={toggle} excludeQuizId={excludeQuizId} />}
      </div>
      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t bg-white px-6 py-4">
        <p className="text-sm text-slate-600">{selected.size > 0
          ? (ar ? `تم اختيار ${selected.size} سؤال. هتتضاف للامتحان بصورها، راجعها ثم احفظ الامتحان.` : `${selected.size} selected. They are added with their images; review them, then save the exam.`)
          : (ar ? "اختر الأسئلة اللي عايز تضيفها." : "Tick the questions to add.")}</p>
        <div className="flex gap-2">
          {selected.size > 0 && <button type="button" onClick={() => setSelected(new Map())} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold">{ar ? "إلغاء الاختيار" : "Clear"}</button>}
          <button type="button" disabled={selected.size === 0} onClick={apply} className="rounded-xl bg-[#2D46E8] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#1F33C4] disabled:opacity-50">
            {ar ? `إضافة ${selected.size} سؤال` : `Add ${selected.size} questions`}
          </button>
        </div>
      </div>
    </dialog>
  </>;
}
