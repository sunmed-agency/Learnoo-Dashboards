"use client";

import { useLocale } from "next-intl";
import { Database } from "lucide-react";
import { QuestionBankBrowser } from "@/components/exams/QuestionBankBrowser";

/** Question bank page: every question of every exam (instructors: their own exams), saved automatically with the exams. */
export function QuestionBankPage() {
  const ar = useLocale() === "ar";
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 pb-12" dir={ar ? "rtl" : "ltr"}>
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#2D46E8]/10 text-[#2D46E8]"><Database size={22} /></span>
        <div>
          <h1 className="text-[22px] font-bold text-[#111827]">{ar ? "بنك الأسئلة" : "Question bank"}</h1>
          <p className="mt-1 text-sm text-slate-600">{ar
            ? "كل سؤال في أي امتحان بيتحفظ هنا لوحده. دوّر وفلتر بالمادة أو الامتحان، واستورد أي سؤال من صفحة إنشاء أو تعديل الامتحان بزرار «استيراد من بنك الأسئلة»."
            : "Every question of every exam is kept here automatically. Search and filter by subject or exam, and reuse any question with “Import from question bank” on the exam form."}</p>
        </div>
      </div>
      <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
        <QuestionBankBrowser />
      </div>
    </div>
  );
}
