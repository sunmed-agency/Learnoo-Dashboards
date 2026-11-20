import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Learnoo — سياسة الخصوصية | Privacy Policy',
  description: 'How Learnoo collects, uses and protects personal data, including data from Google accounts.',
};

const UPDATED_AR = 'آخر تحديث: 21 نوفمبر 2026';
const UPDATED_EN = 'Last updated: November 21, 2026';
const CONTACT = 'applearnoo@gmail.com';

const ar: { title: string; body: string[] }[] = [
  { title: '1. من نحن', body: ['Learnoo منصة تعليمية للطلاب وأعضاء هيئة التدريس والمراكز التعليمية. توضح هذه السياسة البيانات التي نجمعها وكيف نستخدمها ونحميها.'] },
  { title: '2. البيانات التي نجمعها', body: ['بيانات الحساب: الاسم ورقم الهاتف والبريد الإلكتروني والكلية أو المركز.', 'بيانات الاستخدام التعليمي: المواد والمحاضرات التي تشاهدها، ونتائج الامتحانات، والملاحظات.', 'بيانات الجهاز اللازمة للأمان، مثل معرّف الجهاز وتسجيلات الدخول.'] },
  { title: '3. كيف نستخدم البيانات', body: ['تقديم المحتوى التعليمي والامتحانات وحساب النتائج.', 'حماية الحسابات والمحتوى ومنع إساءة الاستخدام.', 'إرسال إشعارات تخص المواد والامتحانات.', 'لا نبيع بياناتك الشخصية لأي طرف.'] },
  { title: '4. بيانات حساب Google', body: [
    'يمكن لأعضاء هيئة التدريس ربط حساب Google اختياريًا لاستيراد اختبارات Google Forms إلى Learnoo. عند الربط نطلب فقط: البريد الإلكتروني للحساب لعرضه، وقراءة محتوى النماذج التي يختارها المدرس بنفسه من نافذة Google (الأسئلة والاختيارات والإجابات الصحيحة والدرجات والملاحظات والصور)، والوصول إلى الملفات التي يختارها المستخدم فقط عبر Google Picker.',
    'لا نطلب الوصول إلى كل ملفات Google Drive، ولا نقرأ ردود الطلاب على النماذج، ولا نعدّل أي نموذج.',
    'تُستخدم هذه البيانات فقط لإنشاء أسئلة الامتحان التي يراجعها المدرس ويحفظها في Learnoo. لا تُستخدم للإعلانات، ولا تُباع، ولا تُنقل لأي طرف آخر، ولا تُستخدم لتدريب نماذج الذكاء الاصطناعي.',
    'قد يربط مالك المنصة حساب Google Drive لحفظ النسخ الاحتياطية للمنصة. يصل التطبيق فقط إلى الملفات والمجلدات التي ينشئها بنفسه في هذا الحساب.',
    'رموز الوصول من Google تُحفظ مشفرة على خوادمنا ولا تُعرض لأي مستخدم آخر. يمكنك فصل حساب Google في أي وقت من Learnoo، فنلغي الصلاحية لدى Google ونحذف الرموز، أو من صفحة أذونات حسابك على Google.',
    'استخدام Learnoo للمعلومات الواردة من واجهات Google البرمجية ونقلها إلى أي تطبيق آخر يلتزم بسياسة بيانات المستخدم لخدمات Google API، بما في ذلك متطلبات الاستخدام المحدود (Limited Use).',
  ] },
  { title: '5. مشاركة البيانات', body: ['نشارك البيانات فقط مع مزودي الخدمة اللازمين لتشغيل المنصة (الاستضافة والإشعارات)، أو عند وجود التزام قانوني.'] },
  { title: '6. حفظ البيانات وحذفها', body: ['نحتفظ بالبيانات طوال مدة استخدام الحساب. يمكنك طلب حذف حسابك من صفحة حذف الحساب، وتُحذف البيانات بعد فترة السماح الموضحة هناك.'] },
  { title: '7. الأمان', body: ['نستخدم اتصالًا مشفرًا (HTTPS)، وتشفير الرموز الحساسة، وصلاحيات حسب الدور، لحماية البيانات.'] },
  { title: '8. التواصل', body: [`لأي سؤال عن الخصوصية: ${CONTACT}`] },
];

const en: { title: string; body: string[] }[] = [
  { title: '1. Who we are', body: ['Learnoo is an education platform for students, faculty and learning centers. This policy explains what data we collect and how we use and protect it.'] },
  { title: '2. Data we collect', body: ['Account data: name, phone number, email and faculty or center.', 'Learning data: subjects and lectures you watch, exam results and notes.', 'Device data needed for security, such as a device identifier and sign-ins.'] },
  { title: '3. How we use data', body: ['To deliver learning content and exams and to calculate results.', 'To protect accounts and content and prevent abuse.', 'To send notifications about subjects and exams.', 'We do not sell personal data.'] },
  { title: '4. Google user data', body: [
    'Instructors may optionally connect a Google account to import Google Forms quizzes into Learnoo. We request only: the account email (shown to the instructor), read-only access to the forms the instructor explicitly picks in the Google Picker (questions, options, correct answers, points, feedback and images), and per-file access to files the user picks (drive.file).',
    'We do not request access to the whole Google Drive, we do not read form responses, and we never modify a form.',
    'This data is used only to create exam questions that the instructor reviews and saves in Learnoo. It is not used for advertising, not sold, not transferred to third parties, and not used to train AI models.',
    'The platform owner may connect a Google Drive to store the platform backups. The app can access only the files and folders it creates in that Drive.',
    'Google tokens are stored encrypted on our servers and are never shown to other users. You can disconnect your Google account at any time in Learnoo (we revoke access at Google and delete the tokens) or from your Google Account permissions page.',
    'Learnoo’s use and transfer to any other app of information received from Google APIs will adhere to the Google API Services User Data Policy, including the Limited Use requirements.',
  ] },
  { title: '5. Sharing', body: ['We share data only with service providers needed to run the platform (hosting, notifications) or when legally required.'] },
  { title: '6. Retention and deletion', body: ['We keep data while the account is in use. You can request account deletion from the delete-account page; data is deleted after the grace period shown there.'] },
  { title: '7. Security', body: ['We use HTTPS, encryption of sensitive tokens and role-based access to protect data.'] },
  { title: '8. Contact', body: [`Privacy questions: ${CONTACT}`] },
];

function Sections({ items }: { items: { title: string; body: string[] }[] }) {
  return (
    <div className="space-y-6">
      {items.map((section) => (
        <section key={section.title}>
          <h2 className="text-lg font-bold text-slate-900">{section.title}</h2>
          <div className="mt-2 space-y-2 text-sm leading-7 text-slate-700">
            {section.body.map((line) => <p key={line}>{line}</p>)}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-10">
        <article dir="rtl" lang="ar" className="rounded-2xl bg-white p-6 shadow-sm sm:p-10">
          <h1 className="text-2xl font-extrabold text-slate-900">سياسة الخصوصية — Learnoo</h1>
          <p className="mb-8 mt-1 text-xs text-slate-500">{UPDATED_AR}</p>
          <Sections items={ar} />
        </article>
        <article dir="ltr" lang="en" className="rounded-2xl bg-white p-6 shadow-sm sm:p-10">
          <h1 className="text-2xl font-extrabold text-slate-900">Learnoo Privacy Policy</h1>
          <p className="mb-8 mt-1 text-xs text-slate-500">{UPDATED_EN}</p>
          <Sections items={en} />
        </article>
        <p className="text-center text-sm text-slate-500">
          <Link href="/terms" className="text-blue-700 underline">شروط الاستخدام · Terms of Service</Link>
          {' · '}
          <Link href="/" className="text-blue-700 underline">Learnoo</Link>
        </p>
      </div>
    </main>
  );
}
