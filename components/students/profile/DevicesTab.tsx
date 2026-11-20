'use client';

import React from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Check, Clock, History, Loader2, MonitorSmartphone, Send, ShieldCheck, Smartphone, X } from 'lucide-react';
import { api, getApiErrorMessage, type DeviceDetails, type DeviceRequestStatus, type StudentDevices } from '@/src/lib/api';
import { Card, EmptyState, KeyValueList, StatTile, deviceLabel, formatDate, useTr } from './shared';

const STATUS_STYLE: Record<DeviceRequestStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  cancelled: 'bg-gray-100 text-gray-600 ring-gray-500/20',
  reset: 'bg-blue-50 text-[#2137D6] ring-[#2137D6]/20',
};

function DeviceRows({ device }: { device: DeviceDetails | null | undefined }) {
  const { ar, tr } = useTr();
  if (!device) return <EmptyState>{tr('مفيش جهاز', 'No device')}</EmptyState>;
  return (
    <KeyValueList rows={[
      { label: tr('الجهاز', 'Device'), value: device.device || '—' },
      { label: tr('المتصفح', 'Browser'), value: device.browser || '—' },
      { label: tr('المعرّف', 'Identifier'), value: device.identifier ? <span dir="ltr" className="break-all font-mono text-[12px]">{device.identifier}</span> : '—' },
      { label: 'IP', value: device.ip ? <span dir="ltr">{device.ip}</span> : '—' },
      { label: tr('التاريخ', 'Date'), value: formatDate(device.at, ar) },
    ]} />
  );
}


export default function DevicesTab({ studentId, devices, isLoading, isError, canManage, onChanged }: {
  studentId: string;
  devices: StudentDevices | undefined;
  isLoading: boolean;
  isError: boolean;
  canManage: boolean;
  onChanged: () => void;
}) {
  const { ar, tr } = useTr();

  const decide = useMutation({
    mutationFn: (action: 'approve' | 'cancel') => action === 'approve' ? api.ownerOperations.approve(studentId) : api.ownerOperations.cancel(studentId),
    onSuccess: (_res, action) => {
      toast.success(action === 'approve' ? tr('تمت الموافقة على الجهاز الجديد', 'New device approved') : tr('الطلب اترفض', 'Request refused'));
      onChanged();
    },
    onError: (error) => toast.error(getApiErrorMessage(error, tr('حصلت مشكلة. جرّب تاني.', 'Something went wrong. Try again.'))),
  });

  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-[#2137D6]" /></div>;
  }
  if (isError || !devices) {
    return <EmptyState>{tr('مقدرناش نجيب بيانات الأجهزة. جرّب تحدّث الصفحة.', 'Could not load the devices. Try refreshing the page.')}</EmptyState>;
  }

  const statusLabel: Record<DeviceRequestStatus, string> = {
    pending: tr('مستني', 'Pending'),
    approved: tr('اتوافق عليه', 'Approved'),
    cancelled: tr('اترفض', 'Refused'),
    reset: tr('اتفك', 'Reset'),
  };

  const approve = () => {
    if (!window.confirm(tr('الموافقة على الجهاز الجديد؟ الجهاز القديم هيخرج والطالب هيكمّل من الجديد.', 'Approve the new device? The old device will be signed out.'))) return;
    decide.mutate('approve');
  };
  const refuse = () => {
    if (!window.confirm(tr('رفض طلب تغيير الجهاز؟ الطالب هيفضل على جهازه الحالي.', 'Refuse the device change request? The student stays on the current device.'))) return;
    decide.mutate('cancel');
  };

  const noChangesLeft = devices.changes_remaining <= 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile filled icon={Send} label={tr('طلبات تغيير الجهاز اللي بعتها', 'Device change requests sent')} value={devices.requests_sent} />
        <StatTile icon={Check} label={tr('تغييرات اتوافق عليها', 'Approved changes')} value={`${devices.changes_used}/${devices.changes_limit}`} />
        <StatTile icon={Clock} label={tr('المتبقي', 'Remaining')} value={devices.changes_remaining} />
      </div>

      {devices.pending_device && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-[15px] font-bold text-amber-800"><Clock className="h-4 w-4" />{tr('طلب مستني الموافقة', 'Request waiting for approval')}</h2>
              <p className="mt-1 text-[14px] font-semibold text-[#111827]">{deviceLabel(devices.pending_device)}</p>
              <p className="mt-0.5 text-[12px] text-amber-800/80">
                {devices.pending_device.ip && <span dir="ltr">{devices.pending_device.ip} · </span>}
                {formatDate(devices.pending_device.at, ar)}
              </p>
              {noChangesLeft && <p className="mt-2 text-[12px] font-semibold text-red-700">{tr('الطالب خلّص عدد مرات تغيير الجهاز. فك الجهاز لو عايز تسمحله.', 'No device changes left. Use "Reset device" to allow it anyway.')}</p>}
            </div>
            {canManage && (
              <div className="flex gap-2">
                <button type="button" onClick={approve} disabled={decide.isPending || noChangesLeft} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-[14px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                  {decide.isPending && decide.variables === 'approve' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{tr('موافقة', 'Approve')}
                </button>
                <button type="button" onClick={refuse} disabled={decide.isPending} className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 py-2 text-[14px] font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
                  {decide.isPending && decide.variables === 'cancel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}{tr('رفض', 'Refuse')}
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title={tr('الجهاز المعتمد', 'Approved device')} icon={ShieldCheck}>
          <DeviceRows device={devices.bound_device} />
        </Card>
        <Card title={tr('آخر جلسة', 'Last session')} icon={MonitorSmartphone}>
          {devices.last_session ? (
            <KeyValueList rows={[
              { label: tr('الجهاز', 'Device'), value: devices.last_session.device || '—' },
              { label: 'IP', value: devices.last_session.last_ip ? <span dir="ltr">{devices.last_session.last_ip}</span> : '—' },
              ...(typeof devices.last_session.last_used_at === 'string' || typeof devices.last_session.created_at === 'string'
                ? [{ label: tr('التاريخ', 'Date'), value: formatDate(String(devices.last_session.last_used_at ?? devices.last_session.created_at), ar) }]
                : []),
            ]} />
          ) : (
            <EmptyState>{tr('مفيش جلسات', 'No sessions')}</EmptyState>
          )}
        </Card>
      </div>

      <Card title={tr('سجل طلبات تغيير الجهاز', 'Device change requests')} icon={History}>
        {devices.requests.length === 0 ? (
          <EmptyState>{tr('الطالب ماطلبش يغيّر جهازه قبل كده', 'The student has never asked to change device')}</EmptyState>
        ) : (
          <ul className="flex flex-col gap-3">
            {devices.requests.map((r) => (
              <li key={r.id} className="rounded-xl border border-[#EEEEEE] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ring-1 ring-inset ${STATUS_STYLE[r.status]}`}>{statusLabel[r.status]}</span>
                  <span className="text-[12px] text-[#9CA3AF]">{formatDate(r.created_at, ar)}</span>
                </div>
                <div className="mt-3 grid gap-2 text-[13px] sm:grid-cols-2">
                  <div className="flex min-w-0 items-start gap-2">
                    <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-[#2137D6]" />
                    <div className="min-w-0">
                      <p className="text-[12px] text-[#6B7280]">{tr('الجهاز المطلوب', 'Requested device')}</p>
                      <p className="break-words font-semibold text-[#111827]">{deviceLabel(r.device)}</p>
                    </div>
                  </div>
                  <div className="flex min-w-0 items-start gap-2">
                    <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-[#9CA3AF]" />
                    <div className="min-w-0">
                      <p className="text-[12px] text-[#6B7280]">{tr('الجهاز اللي قبله', 'Previous device')}</p>
                      <p className="break-words font-semibold text-[#111827]">{deviceLabel(r.previous_device)}</p>
                    </div>
                  </div>
                </div>
                {(r.decided_by || r.decided_at) && (
                  <p className="mt-3 border-t border-[#F3F4F6] pt-2 text-[12px] text-[#6B7280]">
                    {tr('القرار', 'Decided by')}: <span className="font-semibold text-[#111827]">{r.decided_by || '—'}</span>
                    {r.decided_at && <> · {formatDate(r.decided_at, ar)}</>}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
