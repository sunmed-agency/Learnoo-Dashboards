"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import dynamic from "next/dynamic";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { CalendarDays, FileText, ImageIcon, Loader2, Maximize2, Plus, RefreshCw, Search, Trash2, Upload } from "lucide-react";
import api, { type TimetableEntry } from "@/src/lib/api";
import type { Attachment } from "@/src/types";
import { useCourses } from "@/src/hooks/useCourses";
import { CourseTreeSelect } from "@/src/components/admin/CourseTreeSelect";
import { ExamImageViewer } from "@/components/student/exams/ExamImageViewer";

const PdfPreviewModal = dynamic(() => import("@/components/student/PdfPreviewModal"), { ssr: false });
const PdfFirstPageThumb = dynamic(() => import("@/components/schedules/PdfFirstPageThumb"), { ssr: false });

const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp";

const isPdf = (doc: Attachment) => String(doc.attributes.extension ?? "").toLowerCase() === "pdf";
const displayName = (doc: Attachment) => (doc.attributes.name ?? "").replace(/\.[a-z0-9]{2,5}$/i, "") || "—";

/**
 * Subject schedules ("الجداول"). Staff add a schedule (a title + one image or PDF file) to one or more
 * subjects; a subject can have several. Everyone sees them as cards: an image shows itself, a PDF shows
 * its first page at the same size; tapping opens the image full screen (zoom) or the PDF viewer.
 * Staff can replace or delete each schedule.
 */
export default function SchedulesBoard({ canUpload = false }: { canUpload?: boolean }) {
  const ar = useLocale() === "ar";
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [openImage, setOpenImage] = useState<Attachment | null>(null);
  const [openPdf, setOpenPdf] = useState<Attachment | null>(null);

  // add form
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const replaceRef = useRef<HTMLInputElement | null>(null);
  const [replaceTarget, setReplaceTarget] = useState<{ courseId: number; doc: Attachment } | null>(null);
  const { data: courses } = useCourses({ per_page: 500 });

  const refresh = () =>
    api.timetable
      .list()
      .then((result) => {
        setEntries(result.entries);
        setError(false);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  useEffect(() => {
    void refresh();
  }, []);

  const subjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries
      .filter((entry) => entry.kind === "course" && (entry.documents?.length ?? 0) > 0)
      .map((entry) => ({
        ...entry,
        documents: (entry.documents ?? []).filter(
          (doc) => !q || `${entry.title} ${doc.attributes.name}`.toLowerCase().includes(q),
        ),
      }))
      .filter((entry) => entry.documents.length > 0);
  }, [entries, search]);

  const add = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedCourses.length) {
      toast.error(ar ? "اختر مادة واحدة على الأقل" : "Select at least one subject");
      return;
    }
    if (!file) {
      toast.error(ar ? "اختر صورة أو ملف الجدول" : "Choose the schedule image or file");
      return;
    }
    setBusy(true);
    try {
      for (const courseId of selectedCourses) {
        const data = new FormData();
        data.set("kind", "course");
        data.set("file", file);
        if (title.trim()) data.set("title", title.trim());
        await api.timetable.upload(courseId, data);
      }
      toast.success(ar ? "تمت إضافة الجدول" : "Schedule added");
      setTitle("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch {
      toast.error(ar ? "تعذر حفظ الجدول. حاول مرة أخرى." : "Could not save the schedule. Try again.");
    } finally {
      await refresh();
      setBusy(false);
    }
  };

  const replace = async (picked: File | undefined) => {
    if (replaceRef.current) replaceRef.current.value = "";
    const target = replaceTarget;
    setReplaceTarget(null);
    if (!picked || !target) return;
    setBusy(true);
    try {
      const data = new FormData();
      data.set("kind", "course");
      data.set("file", picked);
      data.set("attachment_id", String(target.doc.id));
      await api.timetable.upload(String(target.courseId), data);
      toast.success(ar ? "تم استبدال الملف" : "File replaced");
    } catch {
      toast.error(ar ? "تعذر استبدال الملف" : "Could not replace the file");
    } finally {
      await refresh();
      setBusy(false);
    }
  };

  const remove = async (courseId: number, doc: Attachment) => {
    if (!window.confirm(ar ? `حذف الجدول «${displayName(doc)}»؟` : `Delete the schedule "${displayName(doc)}"?`)) return;
    setBusy(true);
    try {
      await api.timetable.remove(courseId, doc.id);
      toast.success(ar ? "تم حذف الجدول" : "Schedule deleted");
    } catch {
      toast.error(ar ? "تعذر حذف الجدول" : "Could not delete the schedule");
    } finally {
      await refresh();
      setBusy(false);
    }
  };

  const open = (doc: Attachment) => {
    if (!doc.attributes.path) {
      toast.error(ar ? "الملف غير متاح لحسابك" : "This file is not available to your account");
      return;
    }
    if (isPdf(doc)) setOpenPdf(doc);
    else setOpenImage(doc);
  };

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-[#0A1033]">{ar ? "جداول المواد" : "Subject schedules"}</h1>
        <p className="mt-1 text-sm text-[#64748B]">
          {canUpload
            ? ar ? "أضف جدول لكل مادة (صورة أو ملف PDF). المادة الواحدة ممكن يكون ليها أكتر من جدول." : "Add schedules to each subject (an image or a PDF). A subject can have several."
            : ar ? "جداول موادك. دوس على أي جدول علشان تفتحه بالحجم الكامل." : "Your subjects' schedules. Tap one to open it full size."}
        </p>
      </div>

      {canUpload ? (
        <form onSubmit={add} className="space-y-4 rounded-2xl border border-[#E6EAF6] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-[#EEF2FF] text-[#2137D6]">
              <Plus className="h-5 w-5" />
            </span>
            <h2 className="text-base font-bold text-[#0A1033]">{ar ? "إضافة جدول" : "Add a schedule"}</h2>
          </div>
          <CourseTreeSelect label={ar ? "المادة" : "Subject"} multiple value={selectedCourses} onMultiChange={setSelectedCourses} coursesData={courses ?? []} required />
          <label className="block text-sm font-semibold text-[#475569]">
            {ar ? "اسم الجدول" : "Schedule name"}
            <input
              type="text"
              dir="auto"
              maxLength={150}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={ar ? "مثلاً: جدول محاضرات الترم الأول" : "e.g. First term lectures"}
              className="mt-1.5 w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-[#2137D6] focus:ring-opacity-10"
            />
          </label>
          <div>
            <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-4 text-start transition hover:border-[#2137D6]"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-white text-[#2137D6] ring-1 ring-[#E2E8F0]">
                <Upload className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-[#0A1033]">
                  {file ? file.name : ar ? "اختر صورة أو ملف PDF" : "Choose an image or a PDF"}
                </span>
                <span className="block text-xs text-[#94A3B8]">JPG · PNG · WebP · PDF {ar ? "— لحد 20 ميجا" : "— up to 20 MB"}</span>
              </span>
            </button>
          </div>
          <button
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2137D6] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#1B2DB0] disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {ar ? "إضافة الجدول" : "Add schedule"}
          </button>
        </form>
      ) : null}

      <div className="relative">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
        <input
          type="search"
          aria-label={ar ? "البحث في الجداول" : "Search schedules"}
          placeholder={ar ? "ابحث باسم المادة أو الجدول" : "Search by subject or schedule name"}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-[#E2E8F0] bg-white py-3 pe-3 ps-9 text-sm focus:outline-none focus:ring-2 focus:ring-[#2137D6] focus:ring-opacity-10"
        />
      </div>

      <input ref={replaceRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => void replace(e.target.files?.[0])} />

      {error ? (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{ar ? "تعذر تحميل الجداول" : "Could not load schedules"}</p>
      ) : loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
      ) : !subjects.length ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#E2E8F0] bg-white px-4 py-12 text-center text-sm text-[#64748B]">
          <span className="grid size-12 place-items-center rounded-2xl bg-[#EAEEFE] text-[#2D46E8]">
            <CalendarDays className="h-6 w-6" />
          </span>
          {search.trim() ? (ar ? "لا توجد جداول مطابقة للبحث" : "No matching schedules") : ar ? "لا توجد جداول بعد." : "No schedules yet."}
        </div>
      ) : (
        subjects.map((subject) => (
          <section key={subject.id} className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="flex items-center gap-2 text-base font-bold text-[#0A1033]">
                  <CalendarDays className="h-4 w-4 text-[#2D46E8]" />
                  {subject.title}
                </h2>
                {subject.start ? (
                  <p className="mt-0.5 text-xs text-[#64748B]" data-testid="subject-dates">
                    {new Date(subject.start).toLocaleString(ar ? "ar" : "en")}
                    {subject.end ? ` — ${new Date(subject.end).toLocaleString(ar ? "ar" : "en")}` : ""}
                  </p>
                ) : null}
              </div>
              <span className="rounded-full bg-[#EEF2FF] px-2.5 py-0.5 text-xs font-bold text-[#2137D6]">
                {subject.documents.length} {ar ? "جدول" : subject.documents.length === 1 ? "schedule" : "schedules"}
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {subject.documents.map((doc) => (
                <article key={doc.id} className="group overflow-hidden rounded-2xl border border-[#E6EAF6] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <button type="button" onClick={() => open(doc)} className="relative block w-full cursor-zoom-in text-start" aria-label={ar ? `فتح ${displayName(doc)}` : `Open ${displayName(doc)}`}>
                    <div className="aspect-[4/3] w-full overflow-hidden border-b border-[#EEF1F8] bg-[#F8FAFC]">
                      {!doc.attributes.path ? (
                        <div className="flex h-full items-center justify-center text-[#94A3B8]">
                          <FileText className="h-8 w-8" />
                        </div>
                      ) : isPdf(doc) ? (
                        <PdfFirstPageThumb pdfUrl={doc.attributes.path} className="h-full w-full" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element -- signed API image
                        <img src={doc.attributes.path} alt={displayName(doc)} loading="lazy" className="h-full w-full object-contain" />
                      )}
                    </div>
                    <span className="pointer-events-none absolute end-2 top-2 grid size-8 place-items-center rounded-full bg-[#0A1033]/70 text-white opacity-90 transition group-hover:opacity-100">
                      <Maximize2 className="h-4 w-4" />
                    </span>
                  </button>
                  <div className="flex items-center gap-3 p-3">
                    <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${isPdf(doc) ? "bg-[#FDEEEB] text-[#E8766A]" : "bg-[#E6F7F4] text-[#0F9F8C]"}`}>
                      {isPdf(doc) ? <FileText className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p dir="auto" className="truncate text-sm font-bold text-[#0A1033]">{displayName(doc)}</p>
                      <p className="text-xs text-[#94A3B8]">
                        {isPdf(doc) ? "PDF" : ar ? "صورة" : "Image"}
                        {doc.attributes.created_at ? ` · ${new Date(doc.attributes.created_at).toLocaleDateString(ar ? "ar-EG" : "en-GB")}` : ""}
                      </p>
                    </div>
                    {canUpload ? (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setReplaceTarget({ courseId: subject.id, doc });
                            replaceRef.current?.click();
                          }}
                          className="grid size-8 place-items-center rounded-lg text-[#2137D6] hover:bg-[#EEF2FF] disabled:opacity-50"
                          title={ar ? "استبدال الملف" : "Replace file"}
                          aria-label={ar ? "استبدال الملف" : "Replace file"}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void remove(subject.id, doc)}
                          className="grid size-8 place-items-center rounded-lg text-[#EF4444] hover:bg-red-50 disabled:opacity-50"
                          title={ar ? "حذف الجدول" : "Delete schedule"}
                          aria-label={ar ? "حذف الجدول" : "Delete schedule"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))
      )}

      {openImage?.attributes.path ? (
        <ExamImageViewer src={openImage.attributes.path} alt={displayName(openImage)} onClose={() => setOpenImage(null)} />
      ) : null}
      <PdfPreviewModal
        open={Boolean(openPdf)}
        onClose={() => setOpenPdf(null)}
        pdfUrl={openPdf?.attributes.path ?? null}
        title={openPdf ? displayName(openPdf) : ""}
      />
    </div>
  );
}
