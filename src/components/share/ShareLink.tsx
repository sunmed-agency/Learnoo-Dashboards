'use client';

import { useState } from 'react';
import { Check, Link2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

async function copyLink(url: string, copied: string, failed: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url);
    toast.success(copied);
    return true;
  } catch {
    toast.error(failed);
    return false;
  }
}

/**
 * Copies the student link: an icon in the exam table, a labelled button on
 * live session cards ([className] set).
 */
export function CopyShareLinkButton({ url, className }: { url: string; className?: string }) {
  const t = useTranslations('shareLink');
  const [done, setDone] = useState(false);
  const text = t('copy');

  return (
    <button
      type="button"
      onClick={async () => {
        if (await copyLink(url, t('copied'), t('copyFailed'))) {
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        }
      }}
      aria-label={text}
      title={text}
      data-share-url={url}
      className={className ?? 'rounded-full p-2 text-[#64748B] transition hover:bg-indigo-50 hover:text-[#2137D6]'}
    >
      {done ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
      {className ? text : null}
    </button>
  );
}

/**
 * Shown right after an exam is created or a live session scheduled: the
 * student link, ready to copy and send (like a Google Forms link).
 */
export function ShareLinkDialog({
  url,
  title,
  hint,
  onDone,
}: {
  url: string;
  title: string;
  hint: string;
  onDone: () => void;
}) {
  const t = useTranslations('shareLink');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="share-link-title" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="shrink-0 rounded-full bg-emerald-100 p-2.5 text-emerald-700">
            <Check className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 id="share-link-title" className="text-lg font-bold text-[#0F172A]">{title}</h2>
            <p className="mt-1 text-sm text-[#64748B]">{hint}</p>
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <input
            readOnly
            value={url}
            dir="ltr"
            onFocus={(e) => e.currentTarget.select()}
            aria-label={t('copy')}
            className="h-11 min-w-0 flex-1 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-sm text-[#0F172A]"
          />
          <button
            type="button"
            onClick={() => void copyLink(url, t('copied'), t('copyFailed'))}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2137D6] px-4 text-sm font-bold text-white transition hover:bg-[#1a2bb3]"
          >
            <Link2 className="h-4 w-4" />
            {t('copy')}
          </button>
        </div>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onDone}
            className="h-10 rounded-xl border border-[#E2E8F0] px-5 text-sm font-semibold text-[#0F172A] transition hover:bg-[#F8FAFC]"
          >
            {t('done')}
          </button>
        </div>
      </div>
    </div>
  );
}
