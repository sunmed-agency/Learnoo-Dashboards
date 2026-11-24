"use client";

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { toast } from 'sonner';
import { Check, Loader2, Smartphone, X } from 'lucide-react';
import api, { type DeviceDetails, type DeviceTransfer } from '@/src/lib/api';
import { useCurrentUser } from '@/src/hooks/useAuth';
import { can } from '@/src/lib/permissions';

/** Students asking to move their account to a new device: approve the new device or cancel the request. */
export default function DeviceRequestsPage() {
  const ar = useLocale() === 'ar';
  const { role, user } = useCurrentUser();
  const allowed = role === 'Super Admin' || (role === 'Admin' && can(user, 'devices.manage'));
  const [devices, setDevices] = useState<DeviceTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    const load = () => api.ownerOperations.devices()
      .then(transfers => { if (active) { setDevices(transfers.data); setError(false); } })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    void load();
    // New requests show up on their own.
    const timer = window.setInterval(load, 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, [allowed]);

  async function resolveDevice(id: string, action: 'approve' | 'cancel') {
    if (action === 'cancel' && !window.confirm(ar ? 'إلغاء طلب نقل الجهاز؟ سيبقى الجهاز المعتمد والجلسات الحالية كما هما.' : 'Cancel this transfer request? The approved device and current sessions will be kept.')) return;
    setBusy(id);
    try {
      await api.ownerOperations[action](id);
      setDevices(prev => prev.filter(device => device.id !== id));
      toast.success(action === 'approve'
        ? (ar ? 'تم اعتماد الجهاز الجديد وإلغاء الجلسات السابقة' : 'New device approved. Previous sessions revoked.')
        : (ar ? 'تم إلغاء طلب النقل. الجهاز المعتمد والجلسات الحالية كما هما.' : 'Transfer request cancelled. The approved device and current sessions are unchanged.'));
    } catch {
      toast.error(ar ? 'تعذر تحديث طلب نقل الجهاز' : 'Could not update the transfer request');
    } finally { setBusy(null); }
  }

  if (role && !allowed) return <p className="p-8 text-center text-sm text-[#64748B]">{ar ? 'الصفحة دي محتاجة صلاحية الأجهزة.' : 'This page needs the devices permission.'}</p>;

  const deviceLine = (info: DeviceDetails | null) => info
    ? <>
        <p className="font-medium text-[#0F172A]">{info.device} · {info.browser} · <bdi dir="ltr">{info.identifier}</bdi></p>
        <p className="text-xs text-[#94A3B8]"><bdi dir="ltr">IP: {info.ip}</bdi> · {new Date(info.at).toLocaleString(ar ? 'ar-EG' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</p>
      </>
    : <p className="text-[#64748B]">{ar ? 'التفاصيل غير متاحة؛ تظهر بعد تسجيل الدخول من الجهاز' : 'Details unavailable; captured on the next sign-in from this device'}</p>;

  return <div className="space-y-5 pb-12">
    <div className="flex items-start gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#2137D6]/10 text-[#2137D6]"><Smartphone className="h-5 w-5" /></span>
      <div>
        <h1 className="text-[22px] font-bold text-[#0A1033]">{ar ? 'طلبات نقل الأجهزة' : 'Device transfer requests'}</h1>
        <p className="mt-1 text-sm text-[#64748B]">{ar ? 'طلاب عايزين ينقلوا حسابهم لجهاز جديد. اعتماد الجهاز الجديد بيلغي الجلسات القديمة. الصفحة بتتحدّث لوحدها كل 30 ثانية.' : 'Students moving their account to a new device. Approving revokes the old sessions. Refreshes every 30 seconds.'}</p>
      </div>
    </div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{ar ? 'تعذر تحميل الطلبات' : 'Could not load the requests'}</p>}
    {loading && <p role="status" className="flex items-center gap-2 text-sm text-[#64748B]"><Loader2 className="h-4 w-4 animate-spin" />{ar ? 'جارٍ التحميل…' : 'Loading…'}</p>}
    {!loading && !error && !devices.length && <p className="rounded-2xl border border-dashed border-[#D1D5DB] bg-white p-8 text-center text-sm text-[#64748B]">{ar ? 'لا توجد طلبات معلقة' : 'No pending requests'}</p>}
    <ul className="space-y-3">
      {devices.map(device => <li key={device.id} id={`device-${device.id}`} className="scroll-mt-24 rounded-2xl border border-[#EEF0F6] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-bold text-[#0F172A]">{device.first_name} {device.last_name} · <bdi dir="ltr">{device.phone}</bdi></p>
            {typeof device.remaining_device_transfers === 'number' && <p className="mt-0.5 text-sm text-[#64748B]">{ar ? `مرات تغيير الجهاز المتبقية: ${device.remaining_device_transfers} من 2` : `Device changes remaining: ${device.remaining_device_transfers} of 2`}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy === device.id || device.remaining_device_transfers === 0} onClick={() => resolveDevice(device.id, 'approve')} className="inline-flex items-center gap-1.5 rounded-xl bg-[#2137D6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1C2EB8] disabled:opacity-50">
              {busy === device.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{ar ? 'اعتماد الجهاز الجديد' : 'Approve new device'}
            </button>
            <button type="button" disabled={busy === device.id} onClick={() => resolveDevice(device.id, 'cancel')} className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">
              <X className="h-4 w-4" />{ar ? 'إلغاء الطلب' : 'Cancel request'}
            </button>
          </div>
        </div>
        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-xl bg-[#F8FAFC] p-3"><p className="mb-1 text-xs font-semibold text-[#64748B]">{ar ? 'الجهاز الحالي' : 'Current device'}</p>{deviceLine(device.current_device)}</div>
          <div className="rounded-xl bg-[#F4F5FD] p-3"><p className="mb-1 text-xs font-semibold text-[#2137D6]">{ar ? 'الجهاز المطلوب' : 'Requested device'}</p>{deviceLine(device.requested_device)}</div>
        </div>
      </li>)}
    </ul>
  </div>;
}
