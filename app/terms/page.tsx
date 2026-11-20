import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Learnoo — شروط الاستخدام | Terms of Service',
  description: 'The terms for using the Learnoo education platform.',
};

const CONTACT = 'applearnoo@gmail.com';

const ar: { title: string; body: string }[] = [
  { title: '1. قبول الشروط', body: 'باستخدامك Learnoo فإنك توافق على هذه الشروط. إذا لم توافق عليها فلا تستخدم المنصة.' },
  { title: '2. الحسابات', body: 'أنت مسؤول عن سرية بيانات حسابك وعن كل نشاط يتم من خلاله، ويجب أن تكون البيانات التي تقدمها صحيحة.' },
  { title: '3. المحتوى التعليمي', body: 'المحتوى مقدم للاستخدام التعليمي الشخصي فقط. يُمنع نسخه أو تسجيله أو مشاركته أو توزيعه دون إذن.' },
  { title: '4. نزاهة الامتحانات', body: 'يجب حل الامتحانات بأمانة وبشكل فردي. أي محاولة غش قد تؤدي إلى إيقاف الحساب.' },
  { title: '5. خدمات Google', body: 'ربط حساب Google اختياري، ويخضع استخدامه أيضًا لشروط Google. يقر المدرس بأن له حق استخدام محتوى النماذج التي يستوردها، ويمكنه فصل الحساب في أي وقت.' },
  { title: '6. المدفوعات', body: 'تتم المدفوعات عبر الطرق المعتمدة، وقد تختلف سياسة الاسترداد حسب المادة أو المركز.' },
  { title: '7. إيقاف الحساب', body: 'يجوز لنا إيقاف أي حساب يخالف هذه الشروط أو يسيء استخدام المنصة.' },
  { title: '8. التواصل', body: `للاستفسارات: ${CONTACT}` },
];

const en: { title: string; body: string }[] = [
  { title: '1. Acceptance', body: 'By using Learnoo you agree to these terms. If you do not agree, do not use the platform.' },
  { title: '2. Accounts', body: 'You are responsible for keeping your account credentials confidential and for all activity under your account. Information you provide must be accurate.' },
  { title: '3. Learning content', body: 'Content is provided for personal educational use only. Copying, recording, sharing or distributing it without permission is prohibited.' },
  { title: '4. Exam integrity', body: 'Exams must be taken honestly and individually. Cheating may lead to account suspension.' },
  { title: '5. Google services', body: 'Connecting a Google account is optional and is also subject to Google’s terms. Instructors confirm they have the right to use the content of forms they import, and can disconnect at any time.' },
  { title: '6. Payments', body: 'Payments are made through approved methods; refund policies may differ by subject or center.' },
  { title: '7. Suspension', body: 'We may suspend any account that violates these terms or misuses the platform.' },
  { title: '8. Contact', body: `Questions: ${CONTACT}` },
];

export default function TermsPage() {
  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-10">
        {[{ dir: 'rtl', lang: 'ar', heading: 'شروط الاستخدام — Learnoo', items: ar }, { dir: 'ltr', lang: 'en', heading: 'Learnoo Terms of Service', items: en }].map((version) => (
          <article key={version.lang} dir={version.dir} lang={version.lang} className="rounded-2xl bg-white p-6 shadow-sm sm:p-10">
            <h1 className="mb-8 text-2xl font-extrabold text-slate-900">{version.heading}</h1>
            <div className="space-y-6">
              {version.items.map((item) => (
                <section key={item.title}>
                  <h2 className="text-lg font-bold text-slate-900">{item.title}</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-700">{item.body}</p>
                </section>
              ))}
            </div>
          </article>
        ))}
        <p className="text-center text-sm text-slate-500">
          <Link href="/privacy" className="text-blue-700 underline">سياسة الخصوصية · Privacy Policy</Link>
          {' · '}
          <Link href="/" className="text-blue-700 underline">Learnoo</Link>
        </p>
      </div>
    </main>
  );
}
