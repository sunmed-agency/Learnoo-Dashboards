'use client';

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Loader2, Send } from 'lucide-react';
import { api, getApiErrorMessage } from '@/src/lib/api';
import { Modal, inputClass, useTr } from './shared';

export default function NotifyStudentModal({ open, onClose, studentId, studentName }: {
  open: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
}) {
  const { tr } = useTr();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  const send = useMutation({
    mutationFn: () => api.notifications.send({ title: title.trim(), message: message.trim(), user_ids: [studentId] }),
    onSuccess: (res) => {
      const sent = (res as { sent?: number } | undefined)?.sent;
      toast.success(sent === 0
        ? tr('الإشعار ماوصلش لحد. ممكن الطالب مش مسجل دخول على الأبلكيشن.', 'The notification reached no one. The student may not be signed in on the app.')
        : tr(`الإشعار اتبعت لـ ${studentName}`, `Notification sent to ${studentName}`));
      setTitle('');
      setMessage('');
      onClose();
    },
    onError: (error) => toast.error(getApiErrorMessage(error, tr('الإشعار مااتبعتش. جرّب تاني.', 'Could not send the notification. Try again.'))),
  });

  const valid = title.trim().length > 0 && message.trim().length > 0;

  return (
    <Modal open={open} onClose={onClose} title={tr(`إرسال إشعار لـ ${studentName}`, `Send a notification to ${studentName}`)}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => { e.preventDefault(); if (valid && !send.isPending) send.mutate(); }}
      >
        <label className="grid gap-1.5">
          <span className="text-[13px] font-medium text-[#4B5563]">{tr('العنوان', 'Title')}</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={255} className={inputClass} placeholder={tr('مثلاً: تنبيه بخصوص المحاضرات', 'e.g. About your lectures')} />
        </label>
        <label className="grid gap-1.5">
          <span className="text-[13px] font-medium text-[#4B5563]">{tr('الرسالة', 'Message')}</span>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} maxLength={2000} className={`${inputClass} resize-y`} />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-[#EEEEEE] px-4 py-2.5 text-[14px] font-semibold text-[#374151] hover:bg-[#F9FAFB]">{tr('إلغاء', 'Cancel')}</button>
          <button type="submit" disabled={!valid || send.isPending} className="inline-flex items-center gap-2 rounded-xl bg-[#2137D6] px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-[#1C2EB8] disabled:opacity-50">
            {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {tr('إرسال', 'Send')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
