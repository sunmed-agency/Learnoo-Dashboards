const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');
const compiled = ts.transpileModule(readFileSync(`${__dirname}/staff-activity.ts`, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const loaded = { exports: {} };
new Function('exports', compiled)(loaded.exports);
const { formatStaffActivity: format, examActivityRows, examChangeRows, liveSessionActivityRows, liveSessionChangeRows, notificationAudience } = loaded.exports;

test('client login and lecture examples have readable bilingual labels', () => {
  assert.equal(format('POST v1/auth/login', 'ar'), 'تسجيل دخول');
  assert.equal(format('POST v1/auth/login', 'en'), 'Signed in');
  assert.equal(format('POST v1/lecture', 'ar'), 'إضافة محاضرة');
  assert.equal(format('POST v1/lecture', 'en'), 'Create lecture');
  assert.equal(format('POST v1/student', 'ar'), 'إضافة حساب مستخدم');
});

test('resource updates and deletions hide numeric and ULID identifiers', () => {
  assert.equal(format('PATCH /api/v1/course/123?source=dashboard', 'ar'), 'تعديل دورة');
  assert.equal(format('DELETE v1/student/01m4xsdmyvgpesc873pzeghed8', 'en'), 'Delete user account');
  assert.equal(format('PUT v1/live-room/139', 'ar'), 'تعديل جلسة بث مباشر');
});

test('custom actions describe what happened instead of pretending every POST creates content', () => {
  assert.equal(format('POST v1/owner/device-transfers/01ky3bkhbsmnsqmqcm7c5fzw6d/cancel', 'ar'), 'إلغاء طلب نقل الجهاز');
  assert.equal(format('POST v1/course/12/subscribers/remove', 'en'), 'Removed course subscriptions');
  assert.equal(format('POST v1/owner/device-transfers/01ky3bkhbsmnsqmqcm7c5fzw6d/approve', 'ar'), 'اعتماد الجهاز الجديد');
  assert.equal(format('POST v1/owner/device-transfers/01ky3bkhbsmnsqmqcm7c5fzw6d/reset', 'ar'), 'السماح للطالب بتغيير الجهاز وإلغاء الجلسات السابقة');
  assert.equal(format('POST v1/owner/device-transfers/01ky3bkhbsmnsqmqcm7c5fzw6d/reset', 'en'), 'Allowed a student device change and revoked previous sessions');
  assert.equal(format('POST v1/chapter/711/copy', 'en'), 'Copied a lesson');
  assert.equal(format('DELETE v1/pre-activation/88', 'ar'), 'حذف رقم تفعيل مسبق معلق');
  assert.equal(format('DELETE v1/pre-activation/88', 'en'), 'Deleted a pending pre-activation number');
  assert.equal(format('POST v1/chapter/711/retry-conversion', 'ar'), 'إعادة معالجة فيديو');
  assert.equal(format('POST v1/notifications/send', 'ar'), 'إرسال إشعار للطلاب');
  assert.equal(format('PATCH v1/notifications/read-all', 'en'), 'Marked all notifications as read');
  assert.equal(format('POST v1/feature/store-or-update', 'ar'), 'تحديث إعدادات الميزات');
});

test('unknown actions remain readable without exposing endpoint codes', () => {
  assert.equal(format('POST v1/new-resource/123', 'ar'), 'إجراء على المنصة');
  assert.equal(format('unexpected', 'en'), 'Platform action');
});

const course = (id, title) => ({ id, title, category_path: ['Main center', 'Third year'] });
const exam = {
  id: 7, title: 'Midterm', type: 'exam', status: 'active', is_public: 'included', question_count: 2, total_marks: 10, passing_marks: 60,
  duration: 45, max_attempts: 2, start_time: '2026-12-01T10:00:00+02:00', end_time: null, courses: [course(1, 'Accounting')],
};
const rows = list => Object.fromEntries(list.map(row => [row.label, row.value]));

test('exam, live session and notification entries have readable labels', () => {
  assert.equal(format('POST v1/quiz', 'ar'), 'إضافة امتحان');
  assert.equal(format('PUT v1/quiz/7', 'ar'), 'تعديل امتحان');
  assert.equal(format('POST v1/live-room', 'ar'), 'إضافة جلسة بث مباشر');
  assert.equal(format('PUT v1/live-room/3', 'en'), 'Update live session');
});

test('an exam entry lists every setting the Owner asked for in Arabic and English', () => {
  assert.deepEqual(rows(examActivityRows(exam, 'ar')), {
    'النوع': 'امتحان', 'حالة النشر': 'منشور', 'الإتاحة': 'مشمول مع الدورة', 'عدد الأسئلة': '2', 'الدرجة الكلية': '10',
    'درجة النجاح': '60%', 'المدة': '45 دقيقة', 'عدد المحاولات': '2', 'يفتح': new Date(exam.start_time).toLocaleString('ar'), 'يغلق': 'بدون موعد إغلاق',
  });
  const en = rows(examActivityRows({ ...exam, type: 'homework', status: 'draft', is_public: 'false', start_time: null, courses: [course(1, 'Accounting'), course(2, 'Economics')] }, 'en'));
  assert.equal(en.Type, 'Homework');
  assert.equal(en['Publish status'], 'Draft');
  assert.equal(en.Access, 'Private');
  assert.equal(en.Duration, '45 min');
  assert.equal(en.Opens, 'Open right away');
  assert.equal(en.Courses, 'Accounting, Economics');
  assert.equal(rows(examActivityRows({ ...exam, courses: [] }, 'ar'))['الدورات'], 'غير مرتبط بدورة');
});

test('an exam edit lists only what changed, from the old value to the new one', () => {
  const edited = { ...exam, title: 'Midterm (fixed)', passing_marks: 50, previous: { title: 'Midterm', passing_marks: 60, end_time: '2026-12-02T10:00:00+02:00' } };
  assert.deepEqual(examChangeRows(edited, 'ar'), [
    { label: 'العنوان', value: 'من Midterm إلى Midterm (fixed)' },
    { label: 'درجة النجاح', value: 'من 60% إلى 50%' },
    { label: 'يغلق', value: `من ${new Date('2026-12-02T10:00:00+02:00').toLocaleString('ar')} إلى بدون موعد إغلاق` },
  ]);
  assert.deepEqual(examChangeRows({ ...exam, previous: [] }, 'en'), []);
  assert.deepEqual(examChangeRows(exam, 'en'), []);
});

test('a live session entry shows access, publication, times and course changes', () => {
  const live = { id: 3, title: 'Revision', is_public: 'true', publication_status: 'draft', started_at: '2026-12-05T18:00:00+02:00', ended_at: null,
    courses: [course(1, 'Accounting'), course(2, 'Economics')], previous: { is_public: 'false', courses: [course(1, 'Accounting')] } };
  assert.deepEqual(rows(liveSessionActivityRows(live, 'ar')), {
    'الإتاحة': 'عام', 'حالة النشر': 'مسودة', 'يبدأ': new Date(live.started_at).toLocaleString('ar'), 'ينتهي': '—', 'الدورات': 'Accounting، Economics',
  });
  assert.deepEqual(liveSessionChangeRows(live, 'en'), [
    { label: 'Access', value: 'from Private to Public' },
    { label: 'Courses', value: 'from Accounting to Accounting, Economics' },
  ]);
});

test('a notification names who it was sent to', () => {
  const sent = { title: 'T', message: 'M', recipients: 5 };
  assert.equal(notificationAudience({ ...sent, audience: 'all', courses: [] }, 'ar'), 'كل الطلاب');
  assert.equal(notificationAudience({ ...sent, audience: 'courses', courses: [course(1, 'Accounting')] }, 'ar'), 'طلاب الدورة');
  assert.equal(notificationAudience({ ...sent, audience: 'courses', courses: [course(1, 'Accounting'), course(2, null)] }, 'en'), 'Students of: Accounting, #2');
});
