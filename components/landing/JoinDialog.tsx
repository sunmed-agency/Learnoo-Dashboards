'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, MessageCircle, X } from 'lucide-react';
import type { LandingPlans } from '@/src/lib/landing-plans';
import type { LandingLocale } from './content';

const TEXT = {
  ar: {
    title: 'انضم كمحاضر على Learnoo',
    lead: 'سيب بياناتك وفريقنا هيتواصل معاك خلال يوم عمل عشان نجهّز مساحتك.',
    plan: 'الباقة',
    noPlan: 'لسه مش متأكد، ساعدوني أختار',
    perMonth: 'ج.م / شهريًا',
    custom: 'حسب الاتفاق',
    name: 'الاسم بالكامل',
    namePh: 'د. أحمد محمد',
    phone: 'رقم الموبايل / واتساب',
    email: 'البريد الإلكتروني (اختياري)',
    university: 'الجامعة',
    faculty: 'الكلية',
    subjects: 'المواد اللي بتدرّسها',
    subjectsPh: 'مثلًا: التشريح، الفسيولوجي',
    students: 'عدد الطلاب المتوقع',
    message: 'ملاحظات (اختياري)',
    messagePh: 'أي حاجة تحب تقولها لنا',
    submit: 'إرسال الطلب',
    sending: 'جاري الإرسال...',
    close: 'إغلاق',
    required: 'مطلوب.',
    phoneInvalid: 'اكتب رقم موبايل صحيح.',
    emailInvalid: 'اكتب بريد إلكتروني صحيح.',
    studentsInvalid: 'اكتب رقم من 1 أو أكتر.',
    tooMany: 'بعت طلبات كتير في وقت قصير. حاول تاني بعد شوية.',
    failed: 'حصلت مشكلة ومقدرناش نبعت الطلب. حاول تاني.',
    doneTitle: 'وصلنا طلبك، شكرًا!',
    doneText: 'فريق Learnoo هيتواصل معاك قريب على الرقم اللي سيبته عشان نكمّل الاشتراك.',
    whatsapp: 'أو كلّمنا واتساب',
    privacy: 'بنستخدم بياناتك عشان نتواصل معاك بخصوص الاشتراك بس.',
  },
  en: {
    title: 'Join Learnoo as a lecturer',
    lead: 'Leave your details and our team will contact you within one working day to set up your space.',
    plan: 'Plan',
    noPlan: 'Not sure yet, help me choose',
    perMonth: 'EGP / month',
    custom: 'Custom',
    name: 'Full name',
    namePh: 'Dr. Ahmed Mohamed',
    phone: 'Mobile / WhatsApp number',
    email: 'Email (optional)',
    university: 'University',
    faculty: 'Faculty',
    subjects: 'Subjects you teach',
    subjectsPh: 'e.g. Anatomy, Physiology',
    students: 'Expected number of students',
    message: 'Notes (optional)',
    messagePh: 'Anything you would like to tell us',
    submit: 'Send request',
    sending: 'Sending...',
    close: 'Close',
    required: 'Required.',
    phoneInvalid: 'Enter a valid mobile number.',
    emailInvalid: 'Enter a valid email.',
    studentsInvalid: 'Enter 1 or more.',
    tooMany: 'Too many requests in a short time. Please try again later.',
    failed: 'Something went wrong and the request was not sent. Please try again.',
    doneTitle: 'We got your request, thank you!',
    doneText: 'The Learnoo team will contact you soon on the number you left to complete your subscription.',
    whatsapp: 'Or message us on WhatsApp',
    privacy: 'We only use your details to contact you about your subscription.',
  },
} as const;

type Form = { plan: string; name: string; phone: string; email: string; university: string; faculty: string; subjects: string; students_count: string; message: string; website: string };
const EMPTY: Form = { plan: '', name: '', phone: '', email: '', university: '', faculty: '', subjects: '', students_count: '', message: '', website: '' };

const number = new Intl.NumberFormat('en-US');
const input = 'w-full rounded-xl border bg-white px-4 py-3 text-[15px] text-[#0F172A] outline-none transition placeholder:text-[#94A3B8] focus:border-[#2137D6] focus:ring-4 focus:ring-[#2137D6]/10';

/**
 * The lecturer sign-up form. Any link to `#join` opens it; `#join-2` opens it
 * with the third plan already chosen. Sends to POST /v1/subscription-requests.
 */
export default function JoinDialog({ locale, plans, apiBaseUrl }: { locale: LandingLocale; plans: LandingPlans; apiBaseUrl: string }) {
  const t = TEXT[locale];
  const ref = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [failure, setFailure] = useState('');

  const openFromHash = useCallback(() => {
    const match = window.location.hash.match(/^#join(?:-(\d+))?$/);
    if (!match) return;
    const index = match[1];
    setForm((f) => ({ ...f, plan: index !== undefined && plans.plans[Number(index)] ? index : f.plan }));
    setState((s) => (s === 'done' ? 'idle' : s));
    setFailure('');
    if (!ref.current?.open) ref.current?.showModal();
  }, [plans.plans]);

  useEffect(() => {
    // A link straight to /#join-1 opens the form once the page has painted.
    const frame = requestAnimationFrame(openFromHash);
    window.addEventListener('hashchange', openFromHash);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('hashchange', openFromHash); };
  }, [openFromHash]);

  const close = () => ref.current?.close();
  const onClose = () => {
    if (/^#join/.test(window.location.hash)) history.replaceState(null, '', window.location.pathname + window.location.search);
    if (state === 'done') { setForm(EMPTY); setState('idle'); }
  };

  const set = (key: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((errs) => { const next = { ...errs }; delete next[key]; return next; });
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (form.name.trim().length < 2) errs.name = t.required;
    if (!form.phone.trim()) errs.phone = t.required;
    else if (!/^\+?[0-9][0-9\s-]{6,24}$/.test(form.phone.trim())) errs.phone = t.phoneInvalid;
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = t.emailInvalid;
    if (form.students_count && !(Number(form.students_count) >= 1)) errs.students_count = t.studentsInvalid;
    return errs;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    setFailure('');
    if (Object.keys(errs).length > 0) return;
    setState('sending');
    try {
      const res = await fetch(`${apiBaseUrl}/v1/subscription-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'Accept-Language': locale },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || null,
          university: form.university.trim() || null,
          faculty: form.faculty.trim() || null,
          subjects: form.subjects.trim() || null,
          students_count: form.students_count ? Number(form.students_count) : null,
          message: form.message.trim() || null,
          plan: form.plan === '' ? null : Number(form.plan),
          locale,
          website: form.website,
        }),
      });
      if (res.ok) { setState('done'); return; }
      setState('idle');
      if (res.status === 429) { setFailure(t.tooMany); return; }
      if (res.status === 422) {
        const body = (await res.json().catch(() => ({}))) as { errors?: Record<string, string[]> };
        const map: Record<string, string> = {};
        for (const key of Object.keys(body.errors ?? {})) map[key] = key === 'phone' ? t.phoneInvalid : key === 'email' ? t.emailInvalid : t.required;
        setErrors(map);
        if (Object.keys(map).length === 0) setFailure(t.failed);
        return;
      }
      setFailure(t.failed);
    } catch {
      setState('idle');
      setFailure(t.failed);
    }
  };

  const field = (key: keyof Form, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="grid gap-1.5">
      <span className="text-[13.5px] font-semibold text-[#334155]">{label}</span>
      <input value={form[key]} onChange={set(key)} aria-invalid={!!errors[key]} className={`${input} ${errors[key] ? 'border-red-400' : 'border-[#E2E8F0]'}`} {...props} />
      {errors[key] && <span className="text-[13px] text-red-600">{errors[key]}</span>}
    </label>
  );

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) close(); }}
      aria-labelledby="join-title"
      className="m-auto w-[calc(100%-1.5rem)] max-w-2xl overflow-visible rounded-[28px] bg-transparent p-0 backdrop:bg-[#040C33]/70 backdrop:backdrop-blur-sm"
    >
      <div className="max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-[28px] bg-white shadow-2xl" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0A1A7A] via-[#1530C8] to-[#2563EB] px-6 pb-7 pt-6 text-white sm:px-8">
          <div className="absolute -end-16 -top-20 h-56 w-56 rounded-full bg-[#38BDF8]/30 blur-3xl" aria-hidden />
          <button type="button" onClick={close} aria-label={t.close} className="absolute end-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20">
            <X className="h-5 w-5" />
          </button>
          <h2 id="join-title" className="relative pe-10 text-[24px] font-extrabold leading-tight sm:text-[28px]">{t.title}</h2>
          <p className="relative mt-2 max-w-lg text-[15px] leading-7 text-[#C7D2FE]">{t.lead}</p>
        </div>

        {state === 'done' ? (
          <div className="px-6 py-12 text-center sm:px-8">
            <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" aria-hidden />
            <h3 className="mt-4 text-[22px] font-extrabold text-[#0B1437]">{t.doneTitle}</h3>
            <p className="mx-auto mt-2 max-w-md text-[15.5px] leading-7 text-[#475569]">{t.doneText}</p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              {plans.contact_url && (
                <a href={plans.contact_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3 font-bold text-white transition hover:bg-emerald-600">
                  <MessageCircle className="h-5 w-5" aria-hidden />{t.whatsapp}
                </a>
              )}
              <button type="button" onClick={close} className="rounded-2xl px-6 py-3 font-bold text-[#2137D6] ring-1 ring-[#2137D6]/25 transition hover:bg-[#EEF2FF]">{t.close}</button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="grid gap-4 px-6 py-6 sm:grid-cols-2 sm:px-8 sm:py-7">
            <label className="grid gap-1.5 sm:col-span-2">
              <span className="text-[13.5px] font-semibold text-[#334155]">{t.plan}</span>
              <select value={form.plan} onChange={set('plan')} className={`${input} border-[#E2E8F0]`}>
                <option value="">{t.noPlan}</option>
                {plans.plans.map((plan, i) => (
                  <option key={i} value={String(i)}>
                    {(plan.name[locale] || plan.name.ar || plan.name.en)} · {plan.price === null ? t.custom : `${number.format(plan.price)} ${t.perMonth}`}
                  </option>
                ))}
              </select>
            </label>
            <div className="sm:col-span-2">{field('name', t.name, { placeholder: t.namePh, autoComplete: 'name', required: true, maxLength: 120 })}</div>
            {field('phone', t.phone, { type: 'tel', dir: 'ltr', inputMode: 'tel', autoComplete: 'tel', placeholder: '01xxxxxxxxx', required: true, maxLength: 32 })}
            {field('email', t.email, { type: 'email', dir: 'ltr', autoComplete: 'email', placeholder: 'name@example.com', maxLength: 190 })}
            {field('university', t.university, { maxLength: 150 })}
            {field('faculty', t.faculty, { maxLength: 150 })}
            {field('subjects', t.subjects, { placeholder: t.subjectsPh, maxLength: 255 })}
            {field('students_count', t.students, { type: 'number', min: 1, inputMode: 'numeric', dir: 'ltr', placeholder: '300' })}
            <label className="grid gap-1.5 sm:col-span-2">
              <span className="text-[13.5px] font-semibold text-[#334155]">{t.message}</span>
              <textarea value={form.message} onChange={set('message')} rows={3} maxLength={2000} placeholder={t.messagePh} className={`${input} resize-y border-[#E2E8F0] leading-7`} />
            </label>
            {/* Hidden from people; bots fill it in. */}
            <input type="text" name="website" value={form.website} onChange={set('website')} tabIndex={-1} autoComplete="off" aria-hidden className="absolute -start-[9999px] h-px w-px opacity-0" />

            {failure && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[14px] font-semibold text-red-700 sm:col-span-2">{failure}</p>}

            <div className="flex flex-col-reverse items-center gap-3 sm:col-span-2 sm:flex-row sm:justify-between">
              <p className="text-[12.5px] text-[#64748B]">{t.privacy}</p>
              <button type="submit" disabled={state === 'sending'} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2137D6] px-7 py-3.5 text-[16px] font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-[#1C2EB8] disabled:opacity-60 sm:w-auto">
                {state === 'sending' && <Loader2 className="h-5 w-5 animate-spin" aria-hidden />}
                {state === 'sending' ? t.sending : t.submit}
              </button>
            </div>
          </form>
        )}
      </div>
    </dialog>
  );
}
