'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, ArrowRight, Bell, Edit2, Loader2, SmartphoneNfc } from 'lucide-react';
import { api, getApiErrorMessage } from '@/src/lib/api';
import NotifyStudentModal from './NotifyStudentModal';
import { type ProfileStudent, useTr } from './shared';

export default function StudentHeader({ student, canEdit, canNotify, canResetDevice, onDeviceChanged, backHref = '/students' }: {
  student: ProfileStudent;
  backHref?: string;
  canEdit: boolean;
  canNotify: boolean;
  /** Admin / Super Admin with devices.manage (same rule as StudentDeviceReset). */
  canResetDevice: boolean;
  onDeviceChanged: () => void;
}) {
  const { ar, tr } = useTr();
  const [notifyOpen, setNotifyOpen] = useState(false);
  const Back = ar ? ArrowRight : ArrowLeft;

  const reset = useMutation({
    mutationFn: () => api.ownerOperations.resetDevice(student.id),
    onSuccess: () => {
      toast.success(tr('تم السماح بتغيير الجهاز وإلغاء الجلسات السابقة. الطالب يقدر يدخل دلوقتي من الجهاز الجديد.', 'Device change allowed. Previous sessions revoked. The student can now sign in from the new device.'));
      onDeviceChanged();
    },
    onError: (error) => toast.error(getApiErrorMessage(error, tr('مقدرناش نفك الجهاز. جرّب تاني.', 'Could not allow the device change. Please try again.'))),
  });

  const resetDevice = () => {
    if (!window.confirm(tr(
      'السماح للطالب ده بتغيير جهازه؟ هتتلغي الجلسات وطلبات النقل اللي قبل كده، وأول جهاز يدخل منه الطالب بعد كده هيتعتمد. الحساب هيفضل محتفظ بتفعيلاته ومشاهداته.',
      'Allow this student to change devices? Previous sessions and transfer requests will be revoked. The first device used to sign in next will be approved. The account keeps its access and viewing history.',
    ))) return;
    reset.mutate();
  };

  const subtitle = [student.code, student.phone, student.email].filter(Boolean);

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <Link href={backHref} aria-label={tr('رجوع للطلاب', 'Back to students')} className="mt-0.5 shrink-0 rounded-xl border border-[#EEEEEE] bg-white p-2 text-[#6B7280] transition hover:text-[#111827]">
          <Back className="h-5 w-5" />
        </Link>
        {student.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={student.image} alt={student.name} className="hidden h-12 w-12 shrink-0 rounded-full object-cover sm:block" />
        ) : (
          <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#F4F6FD] text-[16px] font-bold text-[#2137D6] sm:flex">
            {student.name.trim().charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[22px] font-bold text-[#111827]">{student.name}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ring-1 ring-inset ${student.active ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-red-50 text-red-700 ring-red-600/20'}`}>
              {student.active ? tr('نشط', 'Active') : tr('موقوف', 'Stopped')}
            </span>
          </div>
          {subtitle.length > 0 && (
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[13px] text-[#6B7280]">
              {subtitle.map((part, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span aria-hidden>·</span>}
                  <span dir="ltr" className="break-all">{part}</span>
                </React.Fragment>
              ))}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {canEdit && (
          <Link href={`/students/${student.id}/edit`} className="inline-flex items-center gap-2 rounded-xl bg-[#2137D6] px-4 py-2.5 text-[14px] font-semibold text-white transition hover:bg-[#1C2EB8]">
            <Edit2 className="h-4 w-4" />{tr('تعديل', 'Edit')}
          </Link>
        )}
        {canNotify && (
          <button type="button" onClick={() => setNotifyOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-[#2137D6]/30 bg-white px-4 py-2.5 text-[14px] font-semibold text-[#2137D6] transition hover:bg-[#F4F6FD]">
            <Bell className="h-4 w-4" />{tr('إرسال إشعار', 'Send notification')}
          </button>
        )}
        {canResetDevice && (
          <button type="button" onClick={resetDevice} disabled={reset.isPending} className="inline-flex items-center gap-2 rounded-xl border border-[#E8766A]/40 bg-white px-4 py-2.5 text-[14px] font-semibold text-[#C2554A] transition hover:bg-[#E8766A]/10 disabled:opacity-50">
            {reset.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SmartphoneNfc className="h-4 w-4" />}
            {tr('فك الجهاز', 'Reset device')}
          </button>
        )}
      </div>

      {canNotify && <NotifyStudentModal open={notifyOpen} onClose={() => setNotifyOpen(false)} studentId={student.id} studentName={student.name} />}
    </div>
  );
}
