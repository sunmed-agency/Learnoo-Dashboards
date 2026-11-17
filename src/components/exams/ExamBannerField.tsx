"use client";

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ImagePlus, Trash2, Upload } from 'lucide-react';
import {
  EXAM_BANNER,
  createReplacementPreview,
  getExamBannerFileError,
  revokeObjectUrl,
  type ExamBannerState,
} from '@/src/lib/exam-form';

interface ExamBannerFieldProps {
  value: ExamBannerState;
  onChange: (value: ExamBannerState) => void;
}

/** Banner picker shown at the top of the exam create/edit forms. */
export function ExamBannerField({ value, onChange }: ExamBannerFieldProps) {
  const t = useTranslations('exams.create');
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef(value.preview);

  useEffect(() => {
    previewRef.current = value.preview;
  }, [value.preview]);
  useEffect(() => () => revokeObjectUrl(previewRef.current), []);

  const pick = (file: File | undefined) => {
    if (inputRef.current) inputRef.current.value = '';
    if (!file) return;
    const error = getExamBannerFileError(file);
    if (error) {
      toast.error(error === 'type' ? t('bannerTypeError') : t('bannerSizeError'));
      return;
    }
    onChange({ file, preview: createReplacementPreview(value.preview, file) });
  };

  const remove = () => {
    revokeObjectUrl(value.preview);
    onChange({ file: null, preview: '' });
  };

  return (
    <section id="exam-banner" className="bg-white rounded-2xl border border-[#F1F5F9] shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-[#F1F5F9] bg-[#F8FAFC]/50 flex items-center gap-2">
        <ImagePlus className="w-4 h-4 text-[#2137D6]" />
        <h2 className="text-sm font-bold text-[#1E293B] uppercase tracking-wider">{t('bannerTitle')}</h2>
      </div>
      <div className="p-6 flex flex-col gap-4">
        <p className="text-[13px] text-[#64748B] leading-relaxed">{t('bannerHint')}</p>
        <input
          ref={inputRef}
          type="file"
          accept={EXAM_BANNER.mimeTypes.join(',')}
          className="hidden"
          data-testid="exam-banner-input"
          onChange={(event) => pick(event.target.files?.[0])}
        />
        {value.preview ? (
          <div className="flex flex-col gap-3">
            <div className="w-full aspect-[4/1] overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]">
              {/* eslint-disable-next-line @next/next/no-img-element -- blob: previews and API URLs */}
              <img src={value.preview} alt={t('bannerAlt')} className="h-full w-full object-contain" />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#E2E8F0] text-sm font-bold text-[#475569] hover:bg-[#F8FAFC] transition-colors"
              >
                <Upload className="w-4 h-4" />
                {t('bannerReplace')}
              </button>
              <button
                type="button"
                onClick={remove}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-100 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                {t('bannerRemove')}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full aspect-[4/1] max-h-48 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#CBD5E1] bg-[#F8FAFC] text-[#64748B] hover:border-[#2137D6] hover:text-[#2137D6] transition-colors"
          >
            <ImagePlus className="w-6 h-6" />
            <span className="text-sm font-bold">{t('bannerUpload')}</span>
            <span className="text-xs" dir="ltr">{EXAM_BANNER.width} × {EXAM_BANNER.height} px</span>
          </button>
        )}
      </div>
    </section>
  );
}
