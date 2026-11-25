'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  Activity, AlertCircle, BookOpen, CalendarClock, ClipboardCheck, FileSpreadsheet, FileText, GraduationCap, Inbox, KeyRound,
  LifeBuoy, Loader2, MessageSquare, MonitorPlay, PlayCircle, Smartphone, Sparkles, UserPlus, Users, Video, Wallet,
} from 'lucide-react';
import QuickAction from '@/components/QuickAction';
import StaffActivitySummary from '@/components/dashboard/StaffActivitySummary';
import RecentActivity from '@/components/dashboard/RecentActivity';
import { useRecentActivity } from '@/src/hooks/useDashboard';
import { useCurrentUser } from '@/src/hooks/useAuth';
import api, { type DashboardKpiKey, type DashboardOverview, type DashboardSeriesKey } from '@/src/lib/api';
import PeriodPicker, { presetRange, type PeriodPreset } from '@/components/charts/PeriodPicker';
import { BarList, ChangeBadge, ColumnChart, Donut, SERIES, Sparkline, TrendChart } from '@/components/charts/Charts';
import { downloadWorkbook, htmlTable, openPrintableReport, shortDay, svgBars } from '@/src/lib/report-export';

type Kpi = { key: DashboardKpiKey; ar: string; en: string; icon: typeof Users; series?: DashboardSeriesKey; money?: boolean; percent?: boolean; inverse?: boolean; href?: string };

const KPIS: Kpi[] = [
  { key: 'new_students', ar: 'طلاب جدد', en: 'New students', icon: UserPlus, series: 'new_students', href: '/students' },
  { key: 'active_students', ar: 'طلاب نشطين', en: 'Active students', icon: Users },
  { key: 'activations', ar: 'التفعيلات', en: 'Activations', icon: KeyRound, series: 'activations', href: '/activation' },
  { key: 'revenue', ar: 'الإيرادات', en: 'Revenue', icon: Wallet, series: 'revenue', money: true, href: '/reports/finance' },
  { key: 'lessons_watched', ar: 'دروس اتشافت', en: 'Lessons watched', icon: PlayCircle, series: 'lessons_watched' },
  { key: 'exam_attempts', ar: 'امتحانات اتحلّت', en: 'Exams taken', icon: ClipboardCheck, series: 'exam_attempts', href: '/exams' },
  { key: 'average_exam_score', ar: 'متوسط الدرجات', en: 'Average score', icon: GraduationCap, percent: true },
  { key: 'buying_students', ar: 'طلاب فعّلوا مواد', en: 'Students who activated', icon: Sparkles },
  { key: 'live_sessions', ar: 'بث مباشر', en: 'Live sessions', icon: Video, href: '/live-sessions' },
  { key: 'community_posts', ar: 'منشورات المجتمع', en: 'Community posts', icon: MessageSquare, href: '/community' },
  { key: 'support_issues', ar: 'بلاغات الدعم', en: 'Support issues', icon: LifeBuoy, inverse: true },
  { key: 'device_requests', ar: 'طلبات نقل جهاز', en: 'Device requests', icon: Smartphone, inverse: true },
];

const TREND_METRICS: { key: DashboardSeriesKey; ar: string; en: string; money?: boolean }[] = [
  { key: 'activations', ar: 'التفعيلات', en: 'Activations' },
  { key: 'new_students', ar: 'الطلاب الجدد', en: 'New students' },
  { key: 'lessons_watched', ar: 'الدروس المشاهدة', en: 'Lessons watched' },
  { key: 'exam_attempts', ar: 'الامتحانات', en: 'Exams' },
  { key: 'revenue', ar: 'الإيرادات', en: 'Revenue', money: true },
];

const PENDING: { key: keyof DashboardOverview['pending']; ar: string; en: string; href: string; icon: typeof Inbox }[] = [
  { key: 'device_requests', ar: 'طلبات نقل جهاز', en: 'Device transfer requests', href: '/device-requests', icon: Smartphone },
  { key: 'subscription_requests', ar: 'طلبات اشتراك جديدة', en: 'New subscription requests', href: '/subscription-requests', icon: Inbox },
  { key: 'pre_activations', ar: 'أرقام مستنية التفعيل', en: 'Numbers awaiting activation', href: '/pre-activations', icon: KeyRound },
  { key: 'support_issues', ar: 'بلاغات دعم مفتوحة', en: 'Open support issues', href: '/issues/inbox', icon: LifeBuoy },
  { key: 'subjects_draft', ar: 'مواد مسودة', en: 'Draft subjects', href: '/courses?status=draft', icon: BookOpen },
];

const DEVICE_NAMES: Record<string, [string, string]> = { none: ['بدون جهاز مربوط', 'No device yet'], Unknown: ['غير معروف', 'Unknown'] };

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const ar = useLocale() === 'ar';
  const { role } = useCurrentUser();
  const owner = role === 'Super Admin';
  const [period, setPeriod] = useState<{ preset: PeriodPreset; from: string; to: string }>(() => ({ preset: '30d', ...presetRange('30d') }));
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [metric, setMetric] = useState<DashboardSeriesKey>('activations');
  const [exporting, setExporting] = useState(false);
  const { data: recent, isLoading: recentLoading } = useRecentActivity(10, {});

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.dashboardOverview.get({ ...(period.from ? { from: period.from } : {}), ...(period.to ? { to: period.to } : {}) })
      .then((d) => { if (active) { setData(d); setFailed(false); } })
      .catch(() => { if (active) setFailed(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [period.from, period.to]);

  const nf = useMemo(() => new Intl.NumberFormat(ar ? 'ar-EG' : 'en-GB', { maximumFractionDigits: 1 }), [ar]);
  const money = (n: number) => `${nf.format(n)} ${ar ? 'ج.م' : 'EGP'}`;
  const fmt = (k: Kpi | undefined, n: number) => k?.money ? money(n) : k?.percent ? `${nf.format(n)}%` : nf.format(n);
  const kpis = KPIS.filter((k) => data?.kpis[k.key]);
  const metrics = TREND_METRICS.filter((m) => data?.series.current.some((p) => m.key in p));
  const activeMetric = metrics.find((m) => m.key === metric) ?? metrics[0];
  const label = (bucket: string) => data?.period.unit === 'day' ? shortDay(bucket) : bucket;
  const points = useMemo(() => (data && activeMetric ? data.series.current.map((p, i) => ({
    label: label(p.bucket),
    current: p[activeMetric.key] ?? 0,
    previous: data.series.previous[i]?.[activeMetric.key] ?? null,
    previousLabel: data.series.previous[i] ? label(data.series.previous[i].bucket) : undefined,
  })) : []), [data, activeMetric]); // eslint-disable-line react-hooks/exhaustive-deps
  const periodText = data ? `${data.period.from} → ${data.period.to}` : '';
  const previousText = data ? `${data.period.previous_from} → ${data.period.previous_to}` : '';

  const devices = useMemo(() => {
    const list = (data?.devices ?? []).map((d) => ({ label: DEVICE_NAMES[d.device] ? (ar ? DEVICE_NAMES[d.device][0] : DEVICE_NAMES[d.device][1]) : d.device, value: d.total }));
    const top = list.slice(0, 4);
    const rest = list.slice(4).reduce((s, d) => s + d.value, 0);
    return rest > 0 ? [...top, { label: ar ? 'أخرى' : 'Other', value: rest }] : top;
  }, [data, ar]);

  async function exportExcel() {
    if (!data) return;
    setExporting(true);
    try {
      await downloadWorkbook(`learnoo-dashboard-${data.period.from}-${data.period.to}.xlsx`, [
        { name: ar ? 'الملخص' : 'Summary', rows: [
          [ar ? 'لوحة التحكم — Learnoo' : 'Dashboard — Learnoo'], [ar ? 'الفترة' : 'Period', periodText], [ar ? 'مقارنة بـ' : 'Compared with', previousText], [],
          [ar ? 'المؤشر' : 'Indicator', ar ? 'الفترة الحالية' : 'This period', ar ? 'الفترة السابقة' : 'Previous period', ar ? 'التغيّر %' : 'Change %'],
          ...kpis.map((k) => [ar ? k.ar : k.en, data.kpis[k.key]!.value, data.kpis[k.key]!.previous ?? '', data.kpis[k.key]!.change ?? '']),
        ], widths: [30, 18, 18, 12] },
        { name: ar ? 'التطور الزمني' : 'Timeline', rows: [
          [ar ? 'اليوم/الشهر' : 'Day/Month', ...metrics.flatMap((m) => [ar ? m.ar : m.en, `${ar ? m.ar : m.en} (${ar ? 'السابقة' : 'previous'})`])],
          ...data.series.current.map((p, i) => [p.bucket, ...metrics.flatMap((m) => [p[m.key] ?? 0, data.series.previous[i]?.[m.key] ?? 0])]),
        ] },
        { name: ar ? 'أعلى المواد' : 'Top subjects', rows: [[ar ? 'المادة' : 'Subject', ar ? 'التفعيلات' : 'Activations', ...(data.can.money ? [ar ? 'الإيراد' : 'Revenue'] : [])], ...data.top.subjects.map((s) => [s.name, s.activations, ...(data.can.money ? [s.revenue ?? 0] : [])])] },
        { name: ar ? 'أعلى الدروس' : 'Top lessons', rows: [[ar ? 'الدرس' : 'Lesson', ar ? 'المشاهدين' : 'Viewers', ar ? 'دقائق المشاهدة' : 'Watch minutes'], ...data.top.lessons.map((l) => [l.name, l.viewers, l.watch_minutes])] },
        { name: ar ? 'الامتحانات' : 'Exams', rows: [[ar ? 'الامتحان' : 'Exam', ar ? 'المحاولات' : 'Attempts', ar ? 'متوسط الدرجة %' : 'Average %'], ...data.top.exams.map((e) => [e.name, e.attempts, e.average])] },
        { name: ar ? 'المدرسين' : 'Teachers', rows: [[ar ? 'المدرس' : 'Teacher', ar ? 'التفعيلات' : 'Activations', ...(data.can.money ? [ar ? 'الإيراد' : 'Revenue'] : [])], ...data.top.teachers.map((s) => [s.name, s.activations, ...(data.can.money ? [s.revenue ?? 0] : [])])] },
        { name: ar ? 'المحتوى والمعلّق' : 'Content & pending', rows: [
          [ar ? 'البند' : 'Item', ar ? 'العدد' : 'Count'],
          ...Object.entries(data.totals).map(([k, v]) => [TOTAL_NAMES[k] ? (ar ? TOTAL_NAMES[k][0] : TOTAL_NAMES[k][1]) : k, v ?? 0]),
          ...PENDING.filter((p) => data.pending[p.key] != null).map((p) => [ar ? p.ar : p.en, data.pending[p.key] ?? 0]),
        ] },
      ], ar);
    } catch {
      toast.error(ar ? 'تعذر تصدير ملف Excel' : 'Could not export the Excel file');
    } finally { setExporting(false); }
  }

  function exportPdf() {
    if (!data) return;
    const ok = openPrintableReport({
      ar, title: ar ? 'تقرير لوحة التحكم' : 'Dashboard report', periodLabel: periodText, comparisonLabel: previousText,
      kpis: kpis.map((k) => ({ label: ar ? k.ar : k.en, value: fmt(k, data.kpis[k.key]!.value), change: data.kpis[k.key]!.change, previous: data.kpis[k.key]!.previous != null ? fmt(k, data.kpis[k.key]!.previous ?? 0) : undefined })),
      sections: [
        ...metrics.map((m) => ({ title: `${ar ? m.ar : m.en} — ${ar ? 'الحالية (أزرق) مقابل السابقة (رمادي)' : 'this period (blue) vs previous (grey)'}`, html: svgBars(data.series.current.map((p, i) => ({ label: label(p.bucket), current: p[m.key] ?? 0, previous: data.series.previous[i]?.[m.key] ?? 0 })), (n) => m.money ? money(n) : nf.format(n)) })),
        { title: ar ? 'أعلى المواد' : 'Top subjects', html: htmlTable([ar ? 'المادة' : 'Subject', ar ? 'التفعيلات' : 'Activations', ...(data.can.money ? [ar ? 'الإيراد' : 'Revenue'] : [])], data.top.subjects.map((s) => [s.name, nf.format(s.activations), ...(data.can.money ? [money(s.revenue ?? 0)] : [])]), ar ? 'لا توجد بيانات' : 'No data') },
        { title: ar ? 'أعلى الدروس مشاهدة' : 'Most watched lessons', html: htmlTable([ar ? 'الدرس' : 'Lesson', ar ? 'المشاهدين' : 'Viewers', ar ? 'دقائق المشاهدة' : 'Watch minutes'], data.top.lessons.map((l) => [l.name, nf.format(l.viewers), nf.format(l.watch_minutes)]), ar ? 'لا توجد بيانات' : 'No data') },
        { title: ar ? 'الامتحانات' : 'Exams', html: htmlTable([ar ? 'الامتحان' : 'Exam', ar ? 'المحاولات' : 'Attempts', ar ? 'متوسط الدرجة' : 'Average'], data.top.exams.map((e) => [e.name, nf.format(e.attempts), `${nf.format(e.average)}%`]), ar ? 'لا توجد بيانات' : 'No data') },
        { title: ar ? 'توزيع الدرجات' : 'Score distribution', html: svgBars(data.exam_scores.map((b) => ({ label: `${b.band}%`, current: b.total })), (n) => nf.format(n)) },
      ],
    });
    if (!ok) toast.error(ar ? 'اسمح بالنوافذ المنبثقة لتصدير PDF' : 'Allow pop-ups to export the PDF');
  }

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0F172A]">{ar ? 'لوحة التحكم' : 'Dashboard'}</h1>
          <p className="text-sm text-[#64748B]">{ar ? 'أداء المنصة في الفترة المختارة مقارنة بنفس عدد الأيام قبلها.' : 'How the platform did in the chosen period, compared with the same number of days before it.'}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={exportExcel} disabled={!data || exporting} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />} Excel
          </button>
          <button type="button" onClick={exportPdf} disabled={!data} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50">
            <FileText className="h-4 w-4" /> PDF
          </button>
        </div>
      </div>

      <PeriodPicker ar={ar} presets={['7d', '30d', '90d', 'month', 'lastMonth', 'year']} value={period.preset} from={period.from} to={period.to}
        onChange={(next) => setPeriod(next)} note={data ? `${ar ? 'مقارنة بـ' : 'vs'} ${previousText}` : undefined} />

      {failed && !data ? (
        <p className="flex items-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 p-5 text-sm text-rose-700"><AlertCircle className="h-4 w-4" />{ar ? 'تعذر تحميل بيانات لوحة التحكم' : 'Could not load the dashboard'}</p>
      ) : !data ? (
        <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-[#2137D6]" /></div>
      ) : (
        <div className={`flex flex-col gap-6 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {kpis.map((k) => {
              const v = data.kpis[k.key]!;
              const card = (
                <div className="h-full rounded-2xl border border-[#E2E8F0] bg-white p-4 transition hover:shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#2137D6]/10 text-[#2137D6]"><k.icon className="h-4 w-4" /></span>
                    <ChangeBadge change={v.change} inverse={k.inverse} ar={ar} />
                  </div>
                  <p className="mt-3 text-xs text-[#64748B]">{ar ? k.ar : k.en}</p>
                  <div className="mt-0.5 flex items-end justify-between gap-2">
                    <p className="text-xl font-bold tabular-nums text-[#0F172A]">{fmt(k, v.value)}</p>
                    {k.series && <Sparkline values={data.series.current.map((p) => p[k.series!] ?? 0)} />}
                  </div>
                  <p className="mt-1 text-[11px] text-[#94A3B8]">{ar ? 'الفترة السابقة' : 'Previous'}: {v.previous != null ? fmt(k, v.previous) : '—'}</p>
                </div>
              );
              return k.href ? <Link key={k.key} href={k.href} className="rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2137D6]">{card}</Link> : <div key={k.key}>{card}</div>;
            })}
          </div>

          {/* Trend + pending */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5 xl:col-span-2">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-[#0F172A]">{ar ? 'التطور خلال الفترة' : 'Over the period'}</h2>
                <div className="flex flex-wrap gap-1" role="tablist">
                  {metrics.map((m) => (
                    <button key={m.key} type="button" role="tab" aria-selected={activeMetric?.key === m.key} onClick={() => setMetric(m.key)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium ${activeMetric?.key === m.key ? 'bg-[#0F172A] text-white' : 'text-[#475569] hover:bg-[#F1F5F9]'}`}>{ar ? m.ar : m.en}</button>
                  ))}
                </div>
              </div>
              {activeMetric && <TrendChart points={points} format={(n) => activeMetric.money ? money(n) : nf.format(n)}
                currentName={`${ar ? activeMetric.ar : activeMetric.en} — ${ar ? 'الفترة الحالية' : 'this period'}`}
                previousName={ar ? 'الفترة السابقة' : 'Previous period'} emptyText={ar ? 'لا توجد بيانات في الفترة دي' : 'No data in this period'} />}
            </section>
            <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-[#0F172A]"><CalendarClock className="h-4 w-4 text-[#2137D6]" />{ar ? 'محتاج متابعة' : 'Needs attention'}</h2>
              <ul className="divide-y divide-[#F1F5F9]">
                {PENDING.filter((p) => data.pending[p.key] != null).map((p) => {
                  const n = data.pending[p.key] ?? 0;
                  return (
                    <li key={p.key}>
                      <Link href={p.href} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-[#2137D6]">
                        <span className="inline-flex items-center gap-2 text-[#475569]"><p.icon className="h-4 w-4 text-[#94A3B8]" />{ar ? p.ar : p.en}</span>
                        <span className={`min-w-[2rem] rounded-full px-2 py-0.5 text-center text-xs font-bold ${n > 0 ? 'bg-amber-100 text-amber-800' : 'bg-[#F1F5F9] text-[#64748B]'}`}>{nf.format(n)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <h3 className="mb-2 mt-5 text-xs font-bold text-[#64748B]">{ar ? 'المحتوى على المنصة' : 'Content on the platform'}</h3>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(data.totals).map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-[#F8FAFC] px-3 py-2">
                    <dt className="text-[11px] text-[#64748B]">{TOTAL_NAMES[k] ? (ar ? TOTAL_NAMES[k][0] : TOTAL_NAMES[k][1]) : k}</dt>
                    <dd className="font-bold tabular-nums text-[#0F172A]">{nf.format(v ?? 0)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>

          {/* Breakdowns */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
              <h2 className="mb-4 text-sm font-bold text-[#0F172A]">{ar ? 'التفعيلات حسب النوع' : 'Activations by type'}</h2>
              <Donut parts={[
                { label: ar ? 'مواد كاملة' : 'Whole subjects', value: data.kpis.subject_activations?.value ?? 0, color: SERIES[0] },
                { label: ar ? 'دروس منفردة' : 'Single lessons', value: data.kpis.lesson_activations?.value ?? 0, color: SERIES[1] },
              ]} format={(n) => nf.format(n)} centerLabel={ar ? 'تفعيل' : 'activations'} emptyText={ar ? 'لا توجد تفعيلات في الفترة دي' : 'No activations in this period'} />
            </section>
            <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
              <h2 className="mb-1 text-sm font-bold text-[#0F172A]">{ar ? 'توزيع درجات الامتحانات' : 'Exam score distribution'}</h2>
              <p className="mb-3 text-xs text-[#64748B]">{ar ? 'عدد المحاولات في كل نطاق درجات' : 'Attempts in each score range'}</p>
              <ColumnChart items={data.exam_scores.map((b, i) => ({ label: `${b.band}%`, value: b.total, color: i === 0 ? SERIES[1] : SERIES[0] }))} format={(n) => nf.format(n)} emptyText={ar ? 'لا توجد امتحانات في الفترة دي' : 'No exams in this period'} />
            </section>
            {owner && devices.length > 0 ? (
              <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
                <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#0F172A]"><MonitorPlay className="h-4 w-4 text-[#2137D6]" />{ar ? 'أجهزة الطلاب' : 'Student devices'}</h2>
                <Donut parts={devices} format={(n) => nf.format(n)} centerLabel={ar ? 'طالب' : 'students'} emptyText={ar ? 'لا توجد بيانات' : 'No data'} />
              </section>
            ) : (
              <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
                <h2 className="mb-4 text-sm font-bold text-[#0F172A]">{ar ? 'المجتمع' : 'Community'}</h2>
                <Donut parts={[
                  { label: ar ? 'منشورات' : 'Posts', value: data.kpis.community_posts?.value ?? 0, color: SERIES[0] },
                  { label: ar ? 'ردود' : 'Replies', value: data.kpis.community_replies?.value ?? 0, color: SERIES[2] },
                ]} format={(n) => nf.format(n)} centerLabel={ar ? 'مشاركة' : 'posts'} emptyText={ar ? 'لا توجد مشاركات في الفترة دي' : 'No posts in this period'} />
              </section>
            )}
          </div>

          {/* Top lists */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
              <h2 className="mb-4 text-sm font-bold text-[#0F172A]">{ar ? 'أكثر المواد تفعيلًا' : 'Most activated subjects'}</h2>
              <BarList items={data.top.subjects.map((s) => ({ key: s.id, label: s.name, value: s.activations, sub: data.can.money && s.revenue ? money(s.revenue) : undefined }))} format={(n) => nf.format(n)} emptyText={ar ? 'لا توجد تفعيلات في الفترة دي' : 'No activations in this period'} />
            </section>
            <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
              <h2 className="mb-4 text-sm font-bold text-[#0F172A]">{ar ? 'أكثر الدروس مشاهدة' : 'Most watched lessons'}</h2>
              <BarList color={SERIES[2]} items={data.top.lessons.map((l) => ({ key: l.id, label: l.name, value: l.viewers, sub: `${nf.format(l.watch_minutes)} ${ar ? 'دقيقة' : 'min'}` }))} format={(n) => nf.format(n)} emptyText={ar ? 'لا توجد مشاهدات في الفترة دي' : 'No views in this period'} />
            </section>
            <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
              <h2 className="mb-4 text-sm font-bold text-[#0F172A]">{ar ? 'أكثر الامتحانات حلًّا' : 'Most taken exams'}</h2>
              <BarList color={SERIES[3]} items={data.top.exams.map((e) => ({ key: e.id, label: e.name, value: e.attempts, sub: `${ar ? 'متوسط' : 'avg'} ${nf.format(e.average)}%` }))} format={(n) => nf.format(n)} emptyText={ar ? 'لا توجد امتحانات في الفترة دي' : 'No exams in this period'} />
            </section>
            <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
              <h2 className="mb-4 text-sm font-bold text-[#0F172A]">{ar ? 'المدرسين الأكثر تفعيلًا' : 'Teachers with most activations'}</h2>
              <BarList color={SERIES[1]} items={data.top.teachers.map((s) => ({ key: s.id, label: s.name, value: s.activations, sub: data.can.money && s.revenue ? money(s.revenue) : undefined }))} format={(n) => nf.format(n)} emptyText={ar ? 'لا توجد تفعيلات في الفترة دي' : 'No activations in this period'} />
            </section>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <section className="flex flex-col gap-4">
        <h3 className="text-[15.3px] font-medium text-[#111827]">{t('quickActions.title')}</h3>
        <div className="flex flex-wrap gap-4">
          <QuickAction label={t('quickActions.addStudent')} bgColor="bg-white" iconBgColor="bg-[#F4F5FD]" iconColor="#2137D6" icon={<UserPlus className="h-6 w-6" />} href="/students/add" />
          <QuickAction label={t('quickActions.addCourse')} bgColor="bg-white" iconBgColor="bg-[#E8F9F0]" iconColor="#2FBF71" icon={<BookOpen className="h-6 w-6" />} href="/courses/add" />
          <QuickAction label={t('quickActions.liveSession')} bgColor="bg-white" iconBgColor="bg-[#FEF1F1]" iconColor="#EF7373" icon={<Video className="h-6 w-6" />} href="/live-sessions" />
          <QuickAction label={t('quickActions.notify')} bgColor="bg-white" iconBgColor="bg-[#F8FAFC]" iconColor="#777774" icon={<Inbox className="h-6 w-6" />} href="/notifications?tab=send" />
          <QuickAction label={t('quickActions.addToLibrary')} bgColor="bg-white" iconBgColor="bg-[#E8F9F0]" iconColor="#2FBF71" icon={<Activity className="h-6 w-6" />} href="/electronic-library" />
        </div>
      </section>

      {owner ? <StaffActivitySummary /> : !recentLoading && <RecentActivity activities={recent?.data || []} />}
    </div>
  );
}

const TOTAL_NAMES: Record<string, [string, string]> = {
  students: ['كل الطلاب', 'All students'],
  students_with_device: ['طلاب بجهاز مربوط', 'Students with a device'],
  guardians: ['أولياء الأمور', 'Guardians'],
  subjects_active: ['مواد منشورة', 'Published subjects'],
  subjects_draft: ['مواد مسودة', 'Draft subjects'],
  lessons: ['الدروس', 'Lessons'],
  exams: ['الامتحانات', 'Exams'],
  instructors: ['المدرسين', 'Teachers'],
  library_items: ['عناصر المكتبة', 'Library items'],
  watch_hours: ['ساعات المشاهدة (الكل)', 'Watch hours (all time)'],
};
