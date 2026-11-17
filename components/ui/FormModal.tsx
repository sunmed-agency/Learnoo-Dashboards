'use client';

import React, { useId } from 'react';
import { X } from 'lucide-react';

interface FormModalProps {
  title: React.ReactNode;
  onClose: () => void;
  closeLabel: string;
  footer: React.ReactNode;
  children: React.ReactNode;
  widthClassName?: string;
}

// The overlay is fixed to the visible screen, so the panel is capped with
// max-h-full instead of a vh value: on iPhone Safari vh is the height with the
// toolbars hidden, and a vh-sized panel ends under Safari's bar. Only the body
// scrolls; the title and the save/cancel buttons always stay on screen.
// On phones the fields use 16px text: iPhone Safari zooms the page into any
// smaller field on focus, which pushes the buttons off screen while typing.
export default function FormModal({ title, onClose, closeLabel, footer, children, widthClassName = 'max-w-md' }: FormModalProps) {
  const titleId = useId();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`flex max-h-full w-full ${widthClassName} flex-col overflow-hidden rounded-2xl bg-white shadow-xl`}
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[#F1F5F9] px-6 py-4">
          <h2 id={titleId} className="text-xl font-bold text-[#1E293B]">{title}</h2>
          <button type="button" onClick={onClose} aria-label={closeLabel} className="text-[#94A3B8] hover:text-[#475569]">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-6 py-4 max-sm:[&_input]:text-base max-sm:[&_select]:text-base max-sm:[&_textarea]:text-base">
          {children}
        </div>
        <div className="shrink-0 border-t border-[#F1F5F9] px-6 py-4">{footer}</div>
      </div>
    </div>
  );
}
