"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import { questionBankApi, type BankQuestion } from "@/src/lib/api";
import { BANK_TYPE_LABELS } from "@/src/lib/question-bank";

type Props = {
  /** Import mode: a checkbox on each question. */
  selectable?: boolean;
  selected?: Map<number, BankQuestion>;
  onToggle?: (question: BankQuestion, checked: boolean) => void;
  /** Hide the questions of the exam being edited. */
  excludeQuizId?: string | number;
};

const PER_PAGE = 20;

/** The question bank: search, filter by subject / exam / type, and read each question with its answers. */
export function QuestionBankBrowser({ selectable = false, selected, onToggle, excludeQuizId }: Props) {
  const locale = useLocale();
  const ar = locale === "ar";
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [courseId, setCourseId] = useState<number | "">("");
  const [quizId, setQuizId] = useState<number | "">("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useEffect(() => {
    const timer = window.setTimeout(() => { setDebounced(search.trim()); setPage(1); }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const filters = useQuery({ queryKey: ["question-bank", "filters"], queryFn: () => questionBankApi.filters(), staleTime: 60_000 });
  const quizzes = useMemo(() => (filters.data?.quizzes ?? [])
    .filter((quiz) => String(quiz.id) !== String(excludeQuizId ?? ""))
    .filter((quiz) => courseId === "" || quiz.course_ids.includes(courseId)), [filters.data, courseId, excludeQuizId]);

  const list = useQuery({
    queryKey: ["question-bank", debounced, courseId, quizId, type, page, excludeQuizId ?? ""],
    queryFn: () => questionBankApi.list({ search: debounced, course_id: courseId, quiz_id: quizId, type, page, per_page: PER_PAGE, exclude_quiz_id: excludeQuizId ?? "" }),
    placeholderData: (previous) => previous,
  });
  const questions = list.data?.data ?? [];
  const meta = list.data?.meta;

  const toggleExpanded = (id: number) => setExpanded((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const field = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2D46E8] focus:ring-2 focus:ring-[#2D46E8]/15";
  const Prev = ar ? ChevronRight : ChevronLeft;
  const Next = ar ? ChevronLeft : ChevronRight;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="relative sm:col-span-2 lg:col-span-1">
          <span className="sr-only">{ar ? "ابحث في نص السؤال أو الإجابات" : "Search question or answer text"}</span>
          <Search size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={ar ? "ابحث في نص السؤال أو الإجابات..." : "Search question or answer text..."} className={`${field} ps-9`} />
        </label>
        <select aria-label={ar ? "المادة" : "Subject"} value={courseId} onChange={(event) => { setCourseId(event.target.value ? Number(event.target.value) : ""); setQuizId(""); setPage(1); }} className={field}>
          <option value="">{ar ? "كل المواد" : "All subjects"}</option>
          {(filters.data?.courses ?? []).map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
        </select>
        <select aria-label={ar ? "الامتحان" : "Exam"} value={quizId} onChange={(event) => { setQuizId(event.target.value ? Number(event.target.value) : ""); setPage(1); }} className={field}>
          <option value="">{ar ? "كل الامتحانات" : "All exams"}</option>
          {quizzes.map((quiz) => <option key={quiz.id} value={quiz.id}>{quiz.title}</option>)}
        </select>
        <select aria-label={ar ? "نوع السؤال" : "Question type"} value={type} onChange={(event) => { setType(event.target.value); setPage(1); }} className={field}>
          <option value="">{ar ? "كل الأنواع" : "All types"}</option>
          {Object.entries(BANK_TYPE_LABELS).map(([key, label]) => <option key={key} value={key}>{ar ? label.ar : label.en}</option>)}
        </select>
      </div>

      <div className="flex items-center justify-between gap-3 text-sm text-slate-600">
        <span>{meta ? (ar ? `${meta.total} سؤال` : `${meta.total} questions`) : ""}</span>
        {list.isFetching && <Loader2 size={16} className="animate-spin text-[#2D46E8]" />}
      </div>

      {list.isLoading && <p role="status" className="flex items-center gap-2 py-8 text-sm text-slate-600"><Loader2 size={16} className="animate-spin" />{ar ? "جارٍ تحميل الأسئلة..." : "Loading questions..."}</p>}
      {list.isError && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{ar ? "تعذّر تحميل بنك الأسئلة." : "Could not load the question bank."}</p>}
      {!list.isLoading && !list.isError && questions.length === 0 && (
        <p className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-600">{debounced || courseId !== "" || quizId !== "" || type
          ? (ar ? "لا توجد أسئلة تطابق البحث." : "No questions match.")
          : (ar ? "لا توجد أسئلة بعد. أي امتحان تنشئه يظهر هنا تلقائيًا." : "No questions yet. Every exam you create shows up here.")}</p>
      )}

      <ul className="space-y-3">
        {questions.map((question) => {
          const isOpen = expanded.has(question.id);
          const checked = selected?.has(question.id) ?? false;
          const image = question.image ?? question.section?.image ?? null;
          const typeLabel = BANK_TYPE_LABELS[question.type] ?? BANK_TYPE_LABELS.single_choice;
          return (
            <li key={question.id} className={`rounded-2xl border bg-white p-4 transition ${checked ? "border-[#2D46E8] ring-2 ring-[#2D46E8]/15" : "border-slate-200"}`}>
              <div className="flex items-start gap-3">
                {selectable && (
                  <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-[#2D46E8]" checked={checked} onChange={(event) => onToggle?.(question, event.target.checked)} aria-label={ar ? "اختيار السؤال" : "Select question"} />
                )}
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap gap-1.5 text-xs">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-600">{ar ? typeLabel.ar : typeLabel.en}</span>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-600">{ar ? `${question.score} درجة` : `${question.score} pts`}</span>
                    {question.quiz && <span className="rounded-md bg-[#F3F5FE] px-2 py-0.5 text-[#1F33C4]"><bdi>{question.quiz.title}</bdi></span>}
                    {question.courses.map((course) => <span key={course.id} className="rounded-md bg-amber-50 px-2 py-0.5 text-amber-800"><bdi>{course.title}</bdi></span>)}
                  </div>
                  <button type="button" onClick={() => toggleExpanded(question.id)} className="flex w-full items-start gap-2 text-start" aria-expanded={isOpen}>
                    <bdi className={`min-w-0 flex-1 whitespace-pre-line font-semibold text-slate-900 ${isOpen ? "" : "line-clamp-2"}`}>{question.text || "—"}</bdi>
                    <ChevronDown size={18} className={`mt-0.5 shrink-0 text-slate-400 transition ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="mt-3 space-y-3">
                      {question.section?.title && <p className="text-xs text-slate-500">{ar ? "القسم: " : "Section: "}<bdi>{question.section.title}</bdi></p>}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {image && <img src={image} alt="" className="max-h-56 rounded-xl border object-contain" loading="lazy" />}
                      {question.answers.length > 0 && (
                        <ul className="space-y-1.5">
                          {question.answers.map((answer) => (
                            <li key={answer.id} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${answer.is_correct ? "border-green-500 bg-green-50 text-green-800" : "border-slate-200 text-slate-700"}`}>
                              {answer.is_correct ? <CheckCircle2 size={16} className="shrink-0" /> : <span className="h-4 w-4 shrink-0 rounded-full border border-slate-300" />}
                              <bdi className="min-w-0 flex-1">{answer.text}</bdi>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              {answer.image && <img src={answer.image} alt="" className="h-10 w-10 rounded object-cover" loading="lazy" />}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button type="button" disabled={page <= 1 || list.isFetching} onClick={() => setPage((current) => current - 1)} className="rounded-xl border border-slate-300 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40" aria-label={ar ? "الصفحة السابقة" : "Previous page"}><Prev size={16} /></button>
          <span className="text-sm text-slate-600">{ar ? `صفحة ${meta.current_page} من ${meta.last_page}` : `Page ${meta.current_page} of ${meta.last_page}`}</span>
          <button type="button" disabled={page >= meta.last_page || list.isFetching} onClick={() => setPage((current) => current + 1)} className="rounded-xl border border-slate-300 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40" aria-label={ar ? "الصفحة التالية" : "Next page"}><Next size={16} /></button>
        </div>
      )}
    </div>
  );
}
