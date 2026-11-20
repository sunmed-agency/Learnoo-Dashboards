'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { CheckCircle2, HardDrive, Link2Off, Loader2, XCircle } from 'lucide-react';
import SettingsPageHeader from '@/components/settings/SettingsPageHeader';
import { useCurrentUser } from '@/src/hooks/useAuth';
import { API_BASE_URL, googleApi, type GoogleStatus } from '@/src/lib/api';
import { openGoogleConsent } from '@/src/lib/google-forms-import';

/** Owner only: link the Google Drive that receives the nightly database backup (03:30 Cairo time). */
export default function BackupsSettingsPage() {
  const ar = useLocale() === 'ar';
  const { role } = useCurrentUser();
  const isOwner = role === 'Super Admin';
  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try { setStatus(await googleApi.status('backup')); } catch { setError(ar ? 'تعذّر تحميل حالة النسخ الاحتياطي.' : 'Could not load the backup status.'); }
  }, [ar]);

  useEffect(() => { if (isOwner) void load(); }, [isOwner, load]);

  async function connect() {
    setError(''); setBusy(true);
    try {
      const result = await openGoogleConsent(async () => (await googleApi.connect('backup')).url, new URL(API_BASE_URL).origin);
      if (!result.ok && result.reason !== 'closed') setError(ar ? 'لم يتم ربط Google Drive. حاول مرة أخرى ووافق على كل الصلاحيات.' : 'Google Drive was not linked. Try again and allow all permissions.');
      await load();
    } catch (e) {
      setError(e instanceof Error && e.message === 'POPUP_BLOCKED'
        ? (ar ? 'المتصفح منع نافذة Google. اسمح بالنوافذ المنبثقة.' : 'The browser blocked the Google window. Allow pop-ups.')
        : (ar ? 'حدث خطأ. حاول مرة أخرى.' : 'Something went wrong. Try again.'));
    } finally { setBusy(false); }
  }

  async function disconnect() {
    if (!window.confirm(ar ? 'إيقاف النسخ الاحتياطي على Google Drive؟ النسخ الموجودة على Drive لن تُحذف.' : 'Stop backups to Google Drive? Backups already on Drive are kept.')) return;
    setBusy(true);
    try { await googleApi.disconnect('backup'); await load(); } finally { setBusy(false); }
  }

  if (!isOwner) {
    return <p className="p-6 text-sm text-slate-600">{ar ? 'هذه الصفحة لمالك المنصة فقط.' : 'This page is for the platform owner only.'}</p>;
  }

  const last = status?.last_backup;

  return (
    <div className="flex flex-col gap-6" dir={ar ? 'rtl' : 'ltr'}>
      <SettingsPageHeader title={ar ? 'النسخ الاحتياطي على Google Drive' : 'Google Drive backups'} description={ar ? 'نسخة يومية من قاعدة البيانات تُرفع الساعة 3:30 صباحًا بتوقيت القاهرة، ونحتفظ بآخر 30 يومًا على Drive.' : 'A database backup is uploaded every day at 3:30 AM Cairo time; the last 30 days are kept on Drive.'} />

      <section className="max-w-2xl space-y-4 rounded-2xl border border-[#E5E7EB] bg-white p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><HardDrive size={22} /></span>
          <div>
            <p className="font-bold text-[#111827]">{ar ? 'حساب Google Drive' : 'Google Drive account'}</p>
            <p className="text-sm text-[#6B7280]">
              {!status ? (ar ? 'جارٍ التحميل...' : 'Loading...')
                : status.connected ? <bdi>{status.email ?? 'Google'}</bdi>
                : status.needs_reconnect ? (ar ? 'انتهى الربط، اربطه مرة أخرى.' : 'The link expired, reconnect it.')
                : (ar ? 'غير مربوط — لا توجد نسخ احتياطية خارج السيرفر.' : 'Not linked — no backups outside the server.')}
            </p>
          </div>
        </div>

        <p className="text-sm leading-6 text-[#4B5563]">{ar
          ? 'يصل Learnoo فقط إلى المجلد الذي ينشئه بنفسه («Learnoo Backups») ولا يرى باقي ملفات Drive. يُنصح باستخدام حساب Google الخاص بالمنصة.'
          : 'Learnoo can only see the folder it creates itself (“Learnoo Backups”), not the rest of the Drive. Use the platform’s own Google account.'}</p>

        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {status?.configured === false && <p className="text-sm text-amber-700">{ar ? 'الربط مع Google غير مُفعّل على السيرفر بعد.' : 'Google integration isn’t configured on the server yet.'}</p>}

        <div className="flex flex-wrap gap-3">
          {status && !status.connected && status.configured && <button type="button" disabled={busy} onClick={connect} className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
            {busy && <Loader2 size={16} className="animate-spin" />}{ar ? 'ربط Google Drive' : 'Link Google Drive'}
          </button>}
          {status?.connected && <button type="button" disabled={busy} onClick={disconnect} className="flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            <Link2Off size={16} />{ar ? 'إيقاف الربط' : 'Unlink'}
          </button>}
        </div>

        {last && <div className={`flex items-start gap-2 rounded-xl p-3 text-sm ${last.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>
          {last.ok ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> : <XCircle size={18} className="mt-0.5 shrink-0" />}
          <div>
            <p className="font-semibold">{last.ok ? (ar ? 'آخر نسخة احتياطية نجحت' : 'Last backup succeeded') : (ar ? 'آخر نسخة احتياطية فشلت' : 'Last backup failed')} — {new Date(last.at).toLocaleString(ar ? 'ar-EG' : 'en-GB')}</p>
            <p className="mt-0.5 break-all text-xs opacity-80"><bdi>{last.detail}</bdi></p>
          </div>
        </div>}
      </section>
    </div>
  );
}
