'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { CheckCircle2, ClipboardList, HardDrive, Link2Off, Loader2, XCircle } from 'lucide-react';
import SettingsPageHeader from '@/components/settings/SettingsPageHeader';
import { useCurrentUser } from '@/src/hooks/useAuth';
import { API_BASE_URL, googleApi, type GooglePurpose, type GoogleStatus } from '@/src/lib/api';
import { openGoogleConsent } from '@/src/lib/google-forms-import';

const TEXT: Record<GooglePurpose, { icon: typeof HardDrive; title: [string, string]; about: [string, string]; link: [string, string]; off: [string, string]; unlinkConfirm: [string, string] }> = {
  backup: {
    icon: HardDrive,
    title: ['حساب النسخ الاحتياطي (Google Drive)', 'Backup account (Google Drive)'],
    about: ['نسخة يومية من قاعدة البيانات تُرفع الساعة 3:30 صباحًا بتوقيت القاهرة، ونحتفظ بآخر 30 يومًا. Learnoo يرى فقط المجلد الذي ينشئه بنفسه («Learnoo Backups»).', 'A database backup is uploaded every day at 3:30 AM Cairo time; the last 30 days are kept. Learnoo only sees the folder it creates (“Learnoo Backups”).'],
    link: ['ربط حساب النسخ الاحتياطي', 'Link the backup account'],
    off: ['غير مربوط — لا توجد نسخ احتياطية خارج السيرفر.', 'Not linked — no backups outside the server.'],
    unlinkConfirm: ['إيقاف النسخ الاحتياطي على Google Drive؟ النسخ الموجودة على Drive لن تُحذف.', 'Stop backups to Google Drive? Backups already on Drive are kept.'],
  },
  forms: {
    icon: ClipboardList,
    title: ['حساب الامتحانات (Google Forms)', 'Exams account (Google Forms)'],
    about: ['الحساب اللي فيه نماذج Google Forms اللي بتتستورد كامتحانات. كل المدرسين والإدارة بيستوردوا منه.', 'The account holding the Google Forms that are imported as exams. Every teacher and admin imports from it.'],
    link: ['ربط حساب الامتحانات', 'Link the exams account'],
    off: ['غير مربوط — استيراد Google Forms مقفول.', 'Not linked — Google Forms import is off.'],
    unlinkConfirm: ['فصل حساب الامتحانات؟ الاستيراد من Google Forms هيقف عند الكل لحد ما تربطه تاني.', 'Unlink the exams account? Google Forms import stops for everyone until you link it again.'],
  },
};

function GoogleAccountCard({ purpose, ar, other }: { purpose: GooglePurpose; ar: boolean; other: string | null | undefined }) {
  const t = TEXT[purpose];
  const L = (pair: [string, string]) => (ar ? pair[0] : pair[1]);
  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try { setStatus(await googleApi.status(purpose)); } catch { setError(ar ? 'تعذّر تحميل حالة الربط.' : 'Could not load the link status.'); }
  }, [ar, purpose]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { window.dispatchEvent(new CustomEvent('learnoo-google-status', { detail: { purpose, email: status?.connected ? status.email : null } })); }, [purpose, status]);

  async function connect() {
    setError(''); setBusy(true);
    try {
      const result = await openGoogleConsent(async () => (await googleApi.connect(purpose)).url, new URL(API_BASE_URL).origin);
      if (!result.ok && result.reason === 'same_account') setError(ar ? 'الحساب ده مربوط بالفعل للاستخدام التاني. اختار حساب Google مختلف: واحد للنسخ الاحتياطي وواحد للامتحانات.' : 'This account is already linked for the other use. Pick a different Google account: one for backups, one for exams.');
      else if (!result.ok && result.reason !== 'closed') setError(ar ? 'لم يتم الربط. حاول مرة أخرى ووافق على كل الصلاحيات.' : 'Not linked. Try again and allow all permissions.');
      await load();
    } catch (e) {
      setError(e instanceof Error && e.message === 'POPUP_BLOCKED'
        ? (ar ? 'المتصفح منع نافذة Google. اسمح بالنوافذ المنبثقة.' : 'The browser blocked the Google window. Allow pop-ups.')
        : (ar ? 'حدث خطأ. حاول مرة أخرى.' : 'Something went wrong. Try again.'));
    } finally { setBusy(false); }
  }

  async function disconnect() {
    if (!window.confirm(L(t.unlinkConfirm))) return;
    setBusy(true);
    try { await googleApi.disconnect(purpose); await load(); } finally { setBusy(false); }
  }

  const last = purpose === 'backup' ? status?.last_backup : null;

  return (
    <section className="space-y-4 rounded-2xl border border-[#E5E7EB] bg-white p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2137D6]/10 text-[#2137D6]"><t.icon size={22} /></span>
        <div className="min-w-0">
          <p className="font-bold text-[#111827]">{L(t.title)}</p>
          <p className="text-sm text-[#6B7280]">
            {!status ? (ar ? 'جارٍ التحميل...' : 'Loading...')
              : status.connected ? <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700"><CheckCircle2 size={15} /><bdi>{status.email ?? 'Google'}</bdi></span>
              : status.needs_reconnect ? (ar ? 'انتهى الربط، اربطه مرة أخرى.' : 'The link expired, reconnect it.')
              : L(t.off)}
          </p>
        </div>
      </div>
      <p className="text-sm leading-6 text-[#4B5563]">{L(t.about)}</p>
      {!status?.connected && other && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{ar ? <>اختار حساب غير <bdi>{other}</bdi> (المربوط للاستخدام التاني).</> : <>Pick an account other than <bdi>{other}</bdi> (linked for the other use).</>}</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {status?.configured === false && <p className="text-sm text-amber-700">{ar ? 'الربط مع Google غير مُفعّل على السيرفر بعد.' : 'Google integration isn’t configured on the server yet.'}</p>}
      <div className="flex flex-wrap gap-3">
        {status && !status.connected && status.configured && <button type="button" disabled={busy} onClick={connect} className="flex items-center gap-2 rounded-xl bg-[#2137D6] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#1B2DB3] disabled:opacity-60">
          {busy && <Loader2 size={16} className="animate-spin" />}{L(t.link)}
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
  );
}

/** Owner only: two separate Google accounts, one for the nightly backups and one for Google Forms exams. */
export default function GoogleAccountsSettingsPage() {
  const ar = useLocale() === 'ar';
  const { role } = useCurrentUser();
  const [emails, setEmails] = useState<Record<GooglePurpose, string | null>>({ backup: null, forms: null });
  useEffect(() => {
    const onStatus = (e: Event) => {
      const { purpose, email } = (e as CustomEvent<{ purpose: GooglePurpose; email: string | null }>).detail;
      setEmails((current) => (current[purpose] === email ? current : { ...current, [purpose]: email }));
    };
    window.addEventListener('learnoo-google-status', onStatus);
    return () => window.removeEventListener('learnoo-google-status', onStatus);
  }, []);

  if (role !== 'Super Admin') {
    return <p className="p-6 text-sm text-slate-600">{ar ? 'هذه الصفحة لمالك المنصة فقط.' : 'This page is for the platform owner only.'}</p>;
  }

  return (
    <div className="flex flex-col gap-6" dir={ar ? 'rtl' : 'ltr'}>
      <SettingsPageHeader title={ar ? 'حسابات Google' : 'Google accounts'} description={ar ? 'حساب للنسخ الاحتياطي وحساب تاني للامتحانات. لازم يكونوا إيميلين مختلفين.' : 'One account for backups and another for exams. They must be two different emails.'} />
      <div className="grid max-w-5xl grid-cols-1 gap-5 lg:grid-cols-2">
        <GoogleAccountCard purpose="backup" ar={ar} other={emails.forms} />
        <GoogleAccountCard purpose="forms" ar={ar} other={emails.backup} />
      </div>
    </div>
  );
}
