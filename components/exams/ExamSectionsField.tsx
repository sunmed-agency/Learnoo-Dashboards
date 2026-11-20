"use client";

import { useRef } from "react";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { ImagePlus, Layers, Plus, Trash2, Upload } from "lucide-react";
import {
  createReplacementPreview,
  getExamBannerFileError,
  newExamSection,
  revokeObjectUrl,
  type ExamFormSection,
} from "@/src/lib/exam-form";

/**
 * Exam sections ("أقسام") editor for the exam create / edit forms: each section has an optional
 * title and one image (an equation, a chart, a case) that students see above every question of
 * that section, in order. Questions pick their section with <QuestionSectionSelect />.
 */
export function ExamSectionsField({
  value,
  onChange,
  questionCounts = {},
}: {
  value: ExamFormSection[];
  onChange: (sections: ExamFormSection[]) => void;
  /** section key -> how many questions use it (shown on each section). */
  questionCounts?: Record<string, number>;
}) {
  const ar = useLocale() === "ar";

  const update = (key: string, patch: Partial<ExamFormSection>) =>
    onChange(value.map((section) => (section.key === key ? { ...section, ...patch } : section)));

  const remove = (key: string) => {
    const section = value.find((s) => s.key === key);
    if (section) revokeObjectUrl(section.imagePreview);
    onChange(value.filter((s) => s.key !== key));
  };

  return (
    <section id="exam-sections" className="overflow-hidden rounded-2xl border border-[#F1F5F9] bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-[#F1F5F9] bg-[#F8FAFC]/50 px-6 py-4">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-[#2137D6]" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#1E293B]">{ar ? "الأقسام" : "Sections"}</h2>
        </div>
        <button
          type="button"
          onClick={() => onChange([...value, newExamSection()])}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#EEF2FF] px-3 py-1.5 text-xs font-bold text-[#2137D6] transition hover:bg-[#E0E7FF]"
        >
          <Plus className="h-4 w-4" />
          {ar ? "إضافة قسم" : "Add section"}
        </button>
      </div>

      <div className="flex flex-col gap-4 p-6">
        <p className="text-[13px] leading-relaxed text-[#64748B]">
          {ar
            ? "القسم مجموعة أسئلة عليها صورة واحدة (معادلة، رسم، حالة). الصورة بتظهر للطالب فوق كل سؤال في القسم بالترتيب، بدل ما تحط نفس الصورة في كل سؤال. اختار القسم من داخل كل سؤال."
            : "A section is a group of questions that share one image (an equation, a chart, a case). Students see it above each question of the section, in order. Pick the section inside each question."}
        </p>

        {value.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#E2E8F0] bg-[#F8FAFC] px-4 py-5 text-center text-[13px] text-[#94A3B8]">
            {ar ? "لا توجد أقسام. الأسئلة هتظهر من غير صورة مشتركة." : "No sections. Questions show without a shared image."}
          </p>
        ) : (
          value.map((section, index) => (
            <SectionRow
              key={section.key}
              index={index}
              section={section}
              count={questionCounts[section.key] ?? 0}
              ar={ar}
              onChange={(patch) => update(section.key, patch)}
              onRemove={() => remove(section.key)}
            />
          ))
        )}
      </div>
    </section>
  );
}

function SectionRow({
  index,
  section,
  count,
  ar,
  onChange,
  onRemove,
}: {
  index: number;
  section: ExamFormSection;
  count: number;
  ar: boolean;
  onChange: (patch: Partial<ExamFormSection>) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = (file: File | undefined) => {
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    const error = getExamBannerFileError(file);
    if (error) {
      toast.error(
        error === "type"
          ? ar ? "الصورة لازم تكون JPG أو PNG أو WebP" : "Use a JPG, PNG or WebP image"
          : ar ? "حجم الصورة أكبر من 2 ميجا" : "The image is larger than 2 MB",
      );
      return;
    }
    onChange({ image: file, imagePreview: createReplacementPreview(section.imagePreview, file) });
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[#E2E8F0] p-4 sm:flex-row sm:items-start">
      <div className="flex shrink-0 flex-col items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0])}
        />
        {section.imagePreview ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob or API image */}
            <img src={section.imagePreview} alt="" className="h-28 w-44 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] object-contain" />
            <button
              type="button"
              onClick={() => {
                revokeObjectUrl(section.imagePreview);
                onChange({ image: null, imagePreview: "" });
              }}
              className="absolute end-1.5 top-1.5 rounded-full bg-white/90 p-1 text-[#EF4444] shadow-sm hover:bg-white"
              aria-label={ar ? "إزالة الصورة" : "Remove image"}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-28 w-44 flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-[#CBD5E1] bg-[#F8FAFC] text-xs font-semibold text-[#64748B] transition hover:border-[#2137D6] hover:text-[#2137D6]"
          >
            <ImagePlus className="h-5 w-5" />
            {ar ? "صورة القسم" : "Section image"}
          </button>
        )}
        {section.imagePreview ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#2137D6] hover:underline"
          >
            <Upload className="h-3.5 w-3.5" />
            {ar ? "تغيير الصورة" : "Change image"}
          </button>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-bold text-[#475569]">
            {ar ? `القسم ${index + 1}` : `Section ${index + 1}`}
            <span className="ms-2 rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[11px] font-bold text-[#2137D6]">
              {ar ? `${count} سؤال` : `${count} questions`}
            </span>
          </span>
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#EF4444] hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {ar ? "حذف القسم" : "Delete section"}
          </button>
        </div>
        <input
          type="text"
          dir="auto"
          value={section.title}
          maxLength={255}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder={ar ? "عنوان القسم (اختياري)، مثلاً: من المعادلة التالية أجب عن الأسئلة" : "Section title (optional), e.g. Use the equation below"}
          className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2137D6] focus:ring-opacity-10"
        />
        <p className="text-[12px] text-[#94A3B8]">
          {ar ? "لو حذفت القسم، أسئلته بتفضل في الامتحان من غير الصورة." : "Deleting a section keeps its questions, without the image."}
        </p>
      </div>
    </div>
  );
}

/** The section picker shown inside each question card. Hidden when the exam has no sections. */
export function QuestionSectionSelect({
  sections,
  value,
  onChange,
}: {
  sections: ExamFormSection[];
  value?: string;
  onChange: (sectionKey: string) => void;
}) {
  const ar = useLocale() === "ar";
  if (!sections.length) return null;
  const current = sections.some((s) => s.key === value) ? value : "";
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[13px] font-bold text-[#475569]">{ar ? "القسم" : "Section"}</label>
      <select
        value={current}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2137D6] focus:ring-opacity-10"
      >
        <option value="">{ar ? "بدون قسم" : "No section"}</option>
        {sections.map((section, index) => (
          <option key={section.key} value={section.key}>
            {(ar ? `القسم ${index + 1}` : `Section ${index + 1}`) + (section.title.trim() ? ` · ${section.title.trim()}` : "")}
          </option>
        ))}
      </select>
    </div>
  );
}
