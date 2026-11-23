"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, FileSpreadsheet, Link2Off, Loader2, RefreshCw, Search, X } from "lucide-react";
import { API_BASE_URL, ApiError, googleApi, type GoogleFormFile, type GoogleStatus } from "@/src/lib/api";
import type { ExamFormQuestion, ExamFormSection } from "@/src/lib/exam-form";
import {
  mapGoogleFormToExam,
  openGoogleConsent,
  questionProblem,
  skipReasonText,
  warningText,
  type GoogleFormPreview,
  type GoogleFormQuestion,
} from "@/src/lib/google-forms-import";

type Props = {
  /** Called with the chosen questions; the page adds them to the exam form (nothing is saved until the exam is saved). */
  onApply: (questions: ExamFormQuestion[], title: string, sections: ExamFormSection[]) => void;
};

const ERRORS: Record<string, { ar: string; en: string }> = {
  reconnect: { ar: "انتهى ربط حساب Google. اربطه مرة أخرى.", en: "Your Google connection expired. Reconnect your Google account." },
  forbidden: { ar: "ليس لديك صلاحية تعديل هذا النموذج. اطلب من صاحبه إضافتك كمحرّر ثم حاول مرة أخرى.", en: "You don’t have edit access to this form. Ask its owner to add you as an editor, then try again." },
  needs_scope: { ar: "أعد ربط حساب Google مرة واحدة حتى تظهر نماذجك هنا مباشرة.", en: "Reconnect your Google account once so your forms show up here directly." },
  not_found: { ar: "النموذج غير موجود أو تم حذفه.", en: "Form not found or deleted." },
  unavailable: { ar: "خدمة Google غير متاحة مؤقتًا. حاول مرة أخرى.", en: "Google is temporarily unavailable, try again." },
  not_configured: { ar: "الربط مع Google غير مُفعّل على المنصة بعد.", en: "Google integration isn’t configured yet." },
  invalid_form: { ar: "تعذّر قراءة النموذج.", en: "The form could not be read." },
  POPUP_BLOCKED: { ar: "المتصفح منع نافذة Google. اسمح بالنوافذ المنبثقة ثم حاول مرة أخرى.", en: "The browser blocked the Google window. Allow pop-ups and try again." },
  denied: { ar: "تم إلغاء الربط من نافذة Google.", en: "Google sign-in was cancelled." },
  missing_scope: { ar: "يجب الموافقة على كل الصلاحيات المطلوبة حتى يعمل الاستيراد.", en: "Please allow all requested permissions for the import to work." },
  expired: { ar: "انتهت صلاحية طلب الربط. حاول مرة أخرى.", en: "The sign-in request expired. Try again." },
  PICKER_LOAD_FAILED: { ar: "تعذّر فتح نافذة اختيار النماذج من Google.", en: "Could not open the Google picker." },
  generic: { ar: "حدث خطأ. حاول مرة أخرى.", en: "Something went wrong. Try again." },
};

function reasonFrom(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409 && /list your forms/i.test(error.message)) return "needs_scope";
    return ({ 409: "reconnect", 403: "forbidden", 404: "not_found", 503: "not_configured", 422: "invalid_form", 502: "unavailable" } as Record<number, string>)[error.status] ?? "generic";
  }
  if (error instanceof Error && ERRORS[error.message]) return error.message;
  return "generic";
}

export function GoogleFormsImport({ onApply }: Props) {
  const locale = useLocale();
  const ar = locale === "ar";
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [busy, setBusy] = useState<"" | "status" | "connect" | "preview" | "disconnect">("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<GoogleFormPreview | null>(null);
  const [questions, setQuestions] = useState<GoogleFormQuestion[]>([]);
  const [included, setIncluded] = useState<boolean[]>([]);
  // The connected account's forms, listed by the site (no Google sign-in needed in the browser).
  const [forms, setForms] = useState<GoogleFormFile[] | null>(null);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [formsLoading, setFormsLoading] = useState<"" | "list" | "more">("");
  const [search, setSearch] = useState("");
  const [openingId, setOpeningId] = useState("");
  const listRequest = useRef(0);

  const say = (code: string) => setError(ar ? (ERRORS[code] ?? ERRORS.generic).ar : (ERRORS[code] ?? ERRORS.generic).en);
  const canList = Boolean(status?.connected && status.can_list_forms);

  useEffect(() => {
    if (open) dialog.current?.showModal(); else dialog.current?.close();
  }, [open]);

  async function loadStatus() {
    setBusy("status");
    try { setStatus(await googleApi.status("forms")); } catch (e) { say(reasonFrom(e)); } finally { setBusy(""); }
  }

  async function loadForms(query: string, pageToken = "") {
    const request = ++listRequest.current;
    setFormsLoading(pageToken ? "more" : "list");
    try {
      const data = await googleApi.listForms(query.trim(), pageToken);
      if (request !== listRequest.current) return;
      setForms((current) => pageToken && current ? [...current, ...data.forms] : data.forms);
      setNextPage(data.next_page_token);
    } catch (e) {
      if (request !== listRequest.current) return;
      const reason = reasonFrom(e);
      say(reason);
      if (reason === "reconnect" || reason === "needs_scope") void loadStatus();
    } finally {
      if (request === listRequest.current) setFormsLoading("");
    }
  }

  // List on open and while typing (short pause so each key isn't a Google call).
  useEffect(() => {
    if (!open || !canList || preview) return;
    const timer = window.setTimeout(() => { void loadForms(search); }, search ? 400 : 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadForms only reads state set here
  }, [open, canList, preview, search]);

  function start() {
    setError(""); setPreview(null); setQuestions([]); setIncluded([]);
    setForms(null); setNextPage(null); setSearch("");
    setOpen(true);
    void loadStatus();
  }

  async function connect() {
    setError(""); setBusy("connect");
    try {
      const result = await openGoogleConsent(async () => (await googleApi.connect("forms")).url, new URL(API_BASE_URL).origin);
      if (!result.ok) { if (result.reason !== "closed") say(result.reason ?? "generic"); return; }
      await loadStatus();
    } catch (e) { say(reasonFrom(e)); } finally { setBusy(""); }
  }

  async function disconnect() {
    setError(""); setBusy("disconnect");
    try { await googleApi.disconnect("forms"); setPreview(null); await loadStatus(); } catch (e) { say(reasonFrom(e)); } finally { setBusy(""); }
  }

  async function loadPreview(formId: string) {
    setError(""); setBusy("preview"); setOpeningId(formId);
    try {
      const data = await googleApi.previewForm(formId);
      setPreview(data);
      setQuestions(data.questions);
      setIncluded(data.questions.map((question) => question.include));
    } catch (e) {
      const reason = reasonFrom(e);
      say(reason);
      if (reason === "reconnect") void loadStatus();
    } finally { setBusy(""); setOpeningId(""); }
  }

  function setCorrect(questionIndex: number, answerIndex: number) {
    setQuestions((current) => current.map((question, qi) => qi !== questionIndex ? question : {
      ...question,
      answers: question.answers.map((answer, ai) => ({
        ...answer,
        is_correct: question.type === "multiple_choice" ? (ai === answerIndex ? !answer.is_correct : answer.is_correct) : ai === answerIndex,
      })),
    }));
  }

  const chosen = useMemo(() => questions.filter((_, index) => included[index]), [questions, included]);
  const blocked = chosen.filter((question) => questionProblem(question) !== null).length;

  function apply() {
    if (!preview || chosen.length === 0 || blocked > 0) return;
    const mapped = mapGoogleFormToExam(preview, chosen);
    onApply(mapped.questions, preview.title, mapped.sections);
    setOpen(false);
  }

  const typeLabel = (type: GoogleFormQuestion["type"]) => ar
    ? { single_choice: "اختيار واحد", multiple_choice: "اختيار متعدد", short_answer: "إجابة نصية (تصحيح يدوي)" }[type]
    : { single_choice: "Single choice", multiple_choice: "Multiple choice", short_answer: "Written answer (manual review)" }[type];

  return <>
    <button type="button" onClick={start} className="flex items-center gap-2 rounded-xl bg-[#673AB7] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#5E35B1]">
      <FileSpreadsheet size={16} />{ar ? "استيراد من Google Forms" : "Import from Google Forms"}
    </button>
    <dialog ref={dialog} onCancel={(event) => { if (busy) event.preventDefault(); else setOpen(false); }} aria-labelledby="google-forms-title" dir={ar ? "rtl" : "ltr"} className="font-sans m-auto max-h-[90dvh] w-[min(95vw,52rem)] overflow-auto rounded-2xl p-6 shadow-xl backdrop:bg-black/50">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 id="google-forms-title" className="text-lg font-bold">{ar ? "استيراد امتحان من Google Forms" : "Import a quiz from Google Forms"}</h2>
        <button type="button" disabled={Boolean(busy)} onClick={() => setOpen(false)} aria-label={ar ? "إغلاق" : "Close"}><X size={20} /></button>
      </div>

      {busy === "status" && <p role="status" className="flex items-center gap-2 text-sm"><Loader2 size={16} className="animate-spin" />{ar ? "جارٍ التحقق من حساب Google..." : "Checking your Google account..."}</p>}
      {error && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {status && !status.configured && <p className="text-sm text-slate-600">{ar ? ERRORS.not_configured.ar : ERRORS.not_configured.en}</p>}

      {status?.configured && !status.connected && <div className="space-y-3">
        <p className="text-sm leading-6 text-slate-600">{ar
          ? "اربط حساب Google مرة واحدة، وبعدها نماذج Google Forms بتاعتك هتظهر هنا مباشرة وتستورد أسئلتها بالإجابات الصحيحة والدرجات والملاحظات والصور. بنقرأ محتوى النماذج اللي تختارها بس، ومن باقي ملفاتك بنشوف أسماء النماذج فقط."
          : "Connect your Google account once, and your Google Forms show up here so you can import their questions with correct answers, points, feedback and images. We only read the content of forms you choose; for the rest we only see form names."}</p>
        {status.needs_reconnect && <p className="text-sm text-amber-700">{ar ? ERRORS.reconnect.ar : ERRORS.reconnect.en}</p>}
        <button type="button" disabled={Boolean(busy)} onClick={connect} className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
          {busy === "connect" && <Loader2 size={16} className="animate-spin" />}{ar ? "ربط حساب Google" : "Connect Google account"}
        </button>
      </div>}

      {status?.connected && !preview && <div className="space-y-4">
        <p className="text-sm text-slate-600">{ar ? "الحساب المربوط:" : "Connected account:"} <bdi className="font-semibold text-slate-900">{status.email ?? "Google"}</bdi></p>

        {!status.can_list_forms && <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm leading-6 text-amber-800">{ar ? ERRORS.needs_scope.ar : ERRORS.needs_scope.en}</p>
          <button type="button" disabled={Boolean(busy)} onClick={connect} className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
            {busy === "connect" && <Loader2 size={16} className="animate-spin" />}{ar ? "إعادة ربط حساب Google" : "Reconnect Google account"}
          </button>
        </div>}

        {status.can_list_forms && <div className="space-y-3">
          <div className="flex items-center gap-2">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">{ar ? "ابحث باسم النموذج" : "Search by form name"}</span>
              <Search size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} disabled={busy === "preview"} placeholder={ar ? "ابحث باسم النموذج..." : "Search by form name..."} className="w-full rounded-xl border border-slate-300 py-2.5 pe-3 ps-9 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </label>
            <button type="button" onClick={() => void loadForms(search)} disabled={Boolean(formsLoading) || busy === "preview"} aria-label={ar ? "تحديث القائمة" : "Refresh list"} title={ar ? "تحديث القائمة" : "Refresh list"} className="rounded-xl border border-slate-300 p-2.5 text-slate-600 hover:bg-slate-50 disabled:opacity-60">
              <RefreshCw size={16} className={formsLoading === "list" ? "animate-spin" : ""} />
            </button>
          </div>

          {formsLoading === "list" && !forms && <p role="status" className="flex items-center gap-2 text-sm text-slate-600"><Loader2 size={16} className="animate-spin" />{ar ? "جارٍ تحميل نماذجك..." : "Loading your forms..."}</p>}
          {forms && forms.length === 0 && !formsLoading && <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-600">{search.trim()
            ? (ar ? "لا توجد نماذج بهذا الاسم." : "No forms match this name.")
            : (ar ? "لا توجد نماذج Google Forms في هذا الحساب." : "There are no Google Forms in this account.")}</p>}

          {forms && forms.length > 0 && <ul className={`max-h-[50dvh] divide-y overflow-auto rounded-xl border ${formsLoading === "list" ? "opacity-60" : ""}`}>
            {forms.map((form) => <li key={form.id}>
              <button type="button" disabled={busy === "preview"} onClick={() => void loadPreview(form.id)} className="flex w-full items-center gap-3 px-4 py-3 text-start hover:bg-violet-50 disabled:cursor-wait">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#673AB7]/10 text-[#673AB7]"><FileSpreadsheet size={18} /></span>
                <span className="min-w-0 flex-1">
                  <bdi className="block truncate font-semibold text-slate-900">{form.name || (ar ? "بدون عنوان" : "Untitled")}</bdi>
                  <span className="block truncate text-xs text-slate-500">
                    {form.modified_at && `${ar ? "آخر تعديل" : "Modified"} ${new Date(form.modified_at).toLocaleDateString(locale)}`}
                    {!form.owned_by_me && form.owner && <> · {ar ? "مشارك من" : "Shared by"} <bdi>{form.owner}</bdi></>}
                  </span>
                </span>
                {openingId === form.id ? <Loader2 size={16} className="shrink-0 animate-spin text-[#673AB7]" /> : (ar ? <ChevronLeft size={16} className="shrink-0 text-slate-400" /> : <ChevronRight size={16} className="shrink-0 text-slate-400" />)}
              </button>
            </li>)}
          </ul>}

          {nextPage && <button type="button" disabled={Boolean(formsLoading) || busy === "preview"} onClick={() => void loadForms(search, nextPage)} className="flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline disabled:opacity-60">
            {formsLoading === "more" && <Loader2 size={14} className="animate-spin" />}{ar ? "عرض المزيد" : "Show more"}
          </button>}
        </div>}

        {busy === "preview" && <p role="status" className="flex items-center gap-2 text-sm text-slate-600"><Loader2 size={16} className="animate-spin" />{ar ? "جارٍ قراءة النموذج وتحميل الصور..." : "Reading the form and downloading images..."}</p>}

        <button type="button" disabled={Boolean(busy)} onClick={disconnect} className="flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
          <Link2Off size={16} />{ar ? "فصل حساب Google" : "Disconnect Google"}
        </button>
      </div>}

      {preview && <div className="space-y-4">
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="font-bold text-slate-900"><bdi>{preview.title || (ar ? "بدون عنوان" : "Untitled")}</bdi></p>
          {preview.description && <p className="mt-1 whitespace-pre-line text-sm text-slate-600"><bdi>{preview.description}</bdi></p>}
          <p className="mt-2 text-sm text-slate-600">{ar ? `${questions.length} سؤال قابل للاستيراد، ${preview.skipped.length} غير مدعوم` : `${questions.length} importable questions, ${preview.skipped.length} unsupported`}</p>
          {!preview.is_quiz && <p className="mt-2 text-sm text-amber-700">{ar ? "هذا النموذج ليس اختبارًا في Google Forms، لذلك لا توجد إجابات صحيحة. حدّدها لكل سؤال." : "This form isn’t a quiz in Google Forms, so there are no correct answers. Set them for each question."}</p>}
        </div>

        {preview.previous_imports.length > 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {ar ? "تم استيراد هذا النموذج من قبل في:" : "This form was imported before into:"}
          <ul className="mt-1 list-disc ps-5">{preview.previous_imports.map((item) => <li key={item.quiz_id}><bdi>{item.title}</bdi> — {new Date(item.imported_at).toLocaleDateString(locale)} ({item.questions})</li>)}</ul>
          <p className="mt-1">{ar ? "الإضافة الآن ستُنشئ نسخة جديدة من الأسئلة، ولن تتغير الأسئلة القديمة." : "Adding now creates a new copy; the earlier questions stay unchanged."}</p>
        </div>}

        {preview.skipped.length > 0 && <details className="rounded-xl border p-3 text-sm">
          <summary className="cursor-pointer font-semibold">{ar ? `عناصر لن تُستورد (${preview.skipped.length})` : `Items that won’t be imported (${preview.skipped.length})`}</summary>
          <ul className="mt-2 space-y-1">{preview.skipped.map((item) => <li key={item.item_id}><bdi>{item.title || "—"}</bdi>: {skipReasonText(item.reason, ar)}</li>)}</ul>
        </details>}

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <button type="button" className="underline" onClick={() => setIncluded(questions.map(() => true))}>{ar ? "تحديد الكل" : "Select all"}</button>
          <button type="button" className="underline" onClick={() => setIncluded(questions.map(() => false))}>{ar ? "إلغاء الكل" : "Select none"}</button>
        </div>

        <ol className="space-y-3">
          {questions.map((question, index) => {
            const problem = included[index] ? questionProblem(question) : null;
            return <li key={question.key} className={`rounded-xl border p-4 ${included[index] ? "border-slate-200" : "border-dashed border-slate-200 opacity-60"}`}>
              <label className="flex items-start gap-3">
                <input type="checkbox" className="mt-1 h-4 w-4" checked={included[index] ?? false} onChange={(event) => setIncluded((current) => current.map((value, i) => i === index ? event.target.checked : value))} />
                <span className="min-w-0 flex-1">
                  <span className="mb-1 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className="rounded bg-slate-100 px-2 py-0.5">{typeLabel(question.type)}</span>
                    <span className="rounded bg-slate-100 px-2 py-0.5">{ar ? `${question.score} درجة` : `${question.score} pts`}</span>
                    {question.section && <span className="rounded bg-blue-50 px-2 py-0.5 text-blue-700"><bdi>{question.section}</bdi></span>}
                  </span>
                  <span className="block whitespace-pre-line font-semibold text-slate-900"><bdi>{question.text || "—"}</bdi></span>
                </span>
              </label>
              {question.image && <img src={question.image.data} alt={question.image.alt} className="mt-3 max-h-40 rounded-lg border object-contain" />}
              {question.type !== "short_answer" && <ul className="mt-3 space-y-1.5">
                {question.answers.map((answer, answerIndex) => <li key={answerIndex}>
                  <button type="button" onClick={() => setCorrect(index, answerIndex)} className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-start text-sm ${answer.is_correct ? "border-green-500 bg-green-50 text-green-800" : "border-slate-200 hover:bg-slate-50"}`} aria-pressed={answer.is_correct}>
                    {answer.is_correct ? <CheckCircle2 size={16} className="shrink-0" /> : <span className="h-4 w-4 shrink-0 rounded-full border border-slate-300" />}
                    <bdi className="min-w-0 flex-1">{answer.text}</bdi>
                    {answer.image && <img src={answer.image.data} alt={answer.image.alt} className="h-10 w-10 rounded object-cover" />}
                  </button>
                </li>)}
              </ul>}
              {question.type === "short_answer" && question.accepted_answers.length > 0 && <p className="mt-3 text-sm text-slate-700">{ar ? "الإجابات المقبولة في Google:" : "Accepted answers in Google:"} <bdi className="font-semibold">{question.accepted_answers.join(" / ")}</bdi></p>}
              {question.feedback.combined && <p className="mt-2 whitespace-pre-line text-xs text-slate-500">{ar ? "الملاحظة: " : "Feedback: "}<bdi>{question.feedback.combined}</bdi></p>}
              {(question.warnings.length > 0 || problem) && <ul className="mt-3 space-y-1 text-sm text-amber-800">
                {question.warnings.filter((code) => code !== "no_answer_key" || question.answers.every((answer) => !answer.is_correct)).map((code) => <li key={code} className="flex gap-2"><AlertTriangle size={15} className="mt-0.5 shrink-0" />{warningText(code, ar)}</li>)}
                {problem === "no_correct" && !question.warnings.includes("no_answer_key") && <li className="flex gap-2"><AlertTriangle size={15} className="mt-0.5 shrink-0" />{ar ? "اختر الإجابة الصحيحة بالضغط عليها." : "Tap the correct answer to choose it."}</li>}
                {problem === "few_options" && <li className="flex gap-2"><AlertTriangle size={15} className="mt-0.5 shrink-0" />{ar ? "السؤال يحتاج اختيارين على الأقل؛ ألغِ تحديده أو أكمله بعد الإضافة." : "Needs at least two options; untick it or complete it after adding."}</li>}
              </ul>}
            </li>;
          })}
        </ol>

        <div className="sticky bottom-0 -mx-6 -mb-6 flex flex-wrap items-center justify-between gap-3 border-t bg-white px-6 py-4">
          <p className="text-sm text-slate-600">{blocked > 0
            ? (ar ? `${blocked} سؤال محدد يحتاج إجابة صحيحة.` : `${blocked} selected questions need a correct answer.`)
            : (ar ? `سيُضاف ${chosen.length} سؤال إلى الامتحان. راجعها ثم احفظ الامتحان.` : `${chosen.length} questions will be added. Review them, then save the exam.`)}</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => { setPreview(null); setError(""); }} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold">{ar ? "نموذج آخر" : "Another form"}</button>
            <button type="button" disabled={chosen.length === 0 || blocked > 0} onClick={apply} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">
              {ar ? `إضافة ${chosen.length} سؤال` : `Add ${chosen.length} questions`}
            </button>
          </div>
        </div>
      </div>}
    </dialog>
  </>;
}
