"use client";

import { useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { toast } from 'sonner';
import { AlertTriangle, BookOpen, Building2, FileSpreadsheet, FileText, GraduationCap, Landmark, Layers, Loader2, Percent, Receipt, School, Search, UserRound, Users, Wallet } from 'lucide-react';
import api, { type FinanceFigures, type FinanceGroup, type FinanceReport, type FinanceRow, type FinanceTotals } from '@/src/lib/api';
import { useCurrentUser } from '@/src/hooks/useAuth';
import { can } from '@/src/lib/permissions';
import PeriodPicker, { presetRange, type PeriodPreset } from '@/components/charts/PeriodPicker';
import { BarList, ChangeBadge, Donut, SERIES, TrendChart } from '@/components/charts/Charts';
import { downloadWorkbook, escapeHtml, htmlTable, openPrintableReport, shortDay, svgBars, type Cell } from '@/src/lib/report-export';

const TABS: { key: FinanceGroup; ar: string; en: string; icon: typeof Landmark }[] = [
  { key: 'universities', ar: 'الجامعات', en: 'Universities', icon: Landmark },
  { key: 'centers', ar: 'السناتر', en: 'Centers', icon: Building2 },
  { key: 'faculties', ar: 'الكليات', en: 'Faculties', icon: School },
  { key: 'departments', ar: 'الأقسام', en: 'Departments', icon: Layers },
  { key: 'courses', ar: 'المواد', en: 'Subjects', icon: BookOpen },
  { key: 'instructors', ar: 'المدرسين', en: 'Teachers', icon: GraduationCap },
];

/** Derived figures shown as KPIs, computed the same way for both periods. */
function figures(t: FinanceTotals) {
  return {
    revenue: t.revenue,
    teacher_share: t.teacher_share,
    platform_share: t.platform_share,
    paid_activations: t.paid_activations,
    activations: t.activations,
    students: t.students,
    per_student: t.students > 0 ? Math.round((t.revenue / t.students) * 100) / 100 : 0,
    per_activation: t.paid_activations > 0 ? Math.round((t.revenue / t.paid_activations) * 100) / 100 : 0,
    paid_share: t.activations > 0 ? Math.round((t.paid_activations / t.activations) * 1000) / 10 : 0,
  };
}
type FigureKey = keyof ReturnType<typeof figures>;
const change = (now: number, before: number | undefined) => before == null ? null : before === 0 ? (now === 0 ? 0 : null) : Math.round(((now - before) / Math.abs(before)) * 1000) / 10;

/** Financial reports: owner only, or a supervisor the owner gave "finance.view". */
export default function FinanceReportsPage() {
  const ar = useLocale() === 'ar';
  const { role, user } = useCurrentUser();
  const allowed = role === 'Super Admin' || (role === 'Admin' && can(user, 'finance.view'));
  const [period, setPeriod] = useState<{ preset: PeriodPreset; from: string; to: string }>(() => ({ preset: 'month', ...presetRange('month') }));
  const { from, to } = period;
  const [report, setReport] = useState<FinanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<FinanceGroup>('universities');
  const [topGroup, setTopGroup] = useState<FinanceGroup>('courses');
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    setLoading(true);
    api.finance.report({ ...(from ? { from } : {}), ...(to ? { to } : {}) })
      .then(data => { if (active) { setReport(data); setError(false); } })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [allowed, from, to]);

  const money = useMemo(() => new Intl.NumberFormat(ar ? 'ar-EG' : 'en-GB', { maximumFractionDigits: 2 }), [ar]);
  const count = useMemo(() => new Intl.NumberFormat(ar ? 'ar-EG' : 'en-GB'), [ar]);
  const currency = ar ? 'ج.م' : (report?.currency ?? 'EGP');
  const fmt = (n: number) => `${money.format(n)} ${currency}`;

  const periodLabel = from || to ? `${from || (ar ? 'البداية' : 'start')} → ${to || (ar ? 'اليوم' : 'today')}` : (ar ? 'كل الفترات' : 'All time');
  const previousLabel = report?.previous ? `${report.previous.period.from} → ${report.previous.period.to}` : undefined;

  const total = report?.totals.revenue ?? 0;
  const rows = useMemo(() => {
    const list = report?.groups[tab] ?? [];
    const q = search.trim().toLowerCase();
    return q ? list.filter(r => `${r.name} ${r.path ?? ''} ${r.teacher ?? ''}`.toLowerCase().includes(q)) : list;
  }, [report, tab, search]);

  const now = report ? figures(report.totals) : null;
  const before = report?.previous ? figures(report.previous.totals) : null;
  const KPI: { key: FigureKey; ar: string; en: string; icon: typeof Wallet; kind: 'money' | 'count' | 'percent' }[] = [
    { key: 'revenue', ar: 'إجمالي الإيرادات', en: 'Total revenue', icon: Wallet, kind: 'money' },
    { key: 'platform_share', ar: 'نصيب المنصة', en: 'Platform share', icon: Landmark, kind: 'money' },
    { key: 'teacher_share', ar: 'نصيب المدرسين', en: 'Teachers share', icon: GraduationCap, kind: 'money' },
    { key: 'paid_activations', ar: 'تفعيلات مدفوعة', en: 'Paid activations', icon: Receipt, kind: 'count' },
    { key: 'students', ar: 'طلاب فعّلوا', en: 'Students who activated', icon: Users, kind: 'count' },
    { key: 'per_student', ar: 'متوسط الإيراد لكل طالب', en: 'Revenue per student', icon: UserRound, kind: 'money' },
    { key: 'per_activation', ar: 'متوسط سعر التفعيل المدفوع', en: 'Average paid activation', icon: Layers, kind: 'money' },
    { key: 'paid_share', ar: 'نسبة التفعيلات المدفوعة', en: 'Paid share of activations', icon: Percent, kind: 'percent' },
  ];
  const kpiValue = (kind: string, n: number) => kind === 'money' ? fmt(n) : kind === 'percent' ? `${money.format(n)}%` : count.format(n);

  // Timeline: by day for short periods (every day present), by month otherwise; the previous period sits beside it by position.
  const trend = useMemo(() => {
    if (!report) return { points: [], byDay: false };
    const days = from && to ? Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1 : 999;
    const byDay = days <= 92 && Boolean(report.daily);
    if (byDay) {
      const fill = (start: string, n: number, list: { day: string; revenue: number }[] = []) => {
        const map = new Map(list.map(d => [d.day, d.revenue]));
        return Array.from({ length: n }, (_, i) => { const d = new Date(`${start}T12:00:00`); d.setDate(d.getDate() + i); const key = d.toISOString().slice(0, 10); return { key, revenue: map.get(key) ?? 0 }; });
      };
      const cur = fill(from, days, report.daily);
      const prev = report.previous?.period.from ? fill(report.previous.period.from, days, report.previous.daily) : [];
      return { byDay, points: cur.map((c, i) => ({ label: shortDay(c.key), current: c.revenue, previous: prev[i]?.revenue ?? null, previousLabel: prev[i] ? shortDay(prev[i].key) : undefined })) };
    }
    const prev = report.previous?.monthly ?? [];
    return { byDay, points: report.monthly.map((m, i) => ({ label: m.month, current: m.revenue, previous: prev[i]?.revenue ?? (report.previous ? 0 : null), previousLabel: prev[i]?.month })) };
  }, [report, from, to]);

  // Columns of a group, the same on screen, in Excel and in the PDF.
  const columns = (group: FinanceGroup): { label: string; value: (r: FinanceRow) => string | number; money?: boolean; sum?: keyof FinanceFigures }[] => [
    { label: group === 'instructors' ? (ar ? 'المدرس' : 'Teacher') : (ar ? 'الاسم' : 'Name'), value: r => r.name },
    ...(group === 'courses' ? [
      { label: ar ? 'المسار' : 'Path', value: (r: FinanceRow) => r.path ?? '' },
      { label: ar ? 'المدرس' : 'Teacher', value: (r: FinanceRow) => r.teacher ?? '—' },
      { label: ar ? 'سعر المادة' : 'Subject price', value: (r: FinanceRow) => r.price ?? 0, money: true },
    ] : []),
    ...(group === 'instructors' ? [{ label: ar ? 'نسبة المدرس %' : 'Teacher share %', value: (r: FinanceRow) => r.share_percent ?? 0 }] : []),
    { label: ar ? 'تفعيلات مواد' : 'Subject activations', value: r => r.subject_activations, sum: 'subject_activations' },
    { label: ar ? 'تفعيلات دروس' : 'Lesson activations', value: r => r.lesson_activations, sum: 'lesson_activations' },
    { label: ar ? 'مدفوعة' : 'Paid', value: r => r.paid_activations, sum: 'paid_activations' },
    { label: ar ? 'الطلاب' : 'Students', value: r => r.students },
    { label: ar ? 'الإيراد' : 'Revenue', value: r => r.revenue, money: true, sum: 'revenue' },
    { label: ar ? 'نصيب المدرس' : 'Teacher share', value: r => r.teacher_share, money: true, sum: 'teacher_share' },
    { label: ar ? 'نصيب المنصة' : 'Platform share', value: r => r.platform_share, money: true, sum: 'platform_share' },
    { label: ar ? '% من الإجمالي' : '% of total', value: r => total > 0 ? Math.round((r.revenue / total) * 1000) / 10 : 0 },
  ];

  async function exportExcel() {
    if (!report || !now) return;
    setExporting(true);
    try {
      await downloadWorkbook(`learnoo-finance-${from || 'all'}-${to || new Date().toISOString().slice(0, 10)}.xlsx`, [
        { name: ar ? 'ملخص المنصة' : 'Platform summary', rows: [
          [ar ? 'تقرير مالي — Learnoo' : 'Financial report — Learnoo'], [ar ? 'الفترة' : 'Period', periodLabel], ...(previousLabel ? [[ar ? 'مقارنة بـ' : 'Compared with', previousLabel]] : []), [],
          [ar ? 'المؤشر' : 'Indicator', ar ? 'الفترة الحالية' : 'This period', ...(before ? [ar ? 'الفترة السابقة' : 'Previous period', ar ? 'التغيّر %' : 'Change %'] : [])],
          ...KPI.map(k => [ar ? k.ar : k.en, now[k.key], ...(before ? [before[k.key], change(now[k.key], before[k.key]) ?? ''] : [])] as Cell[]),
          [ar ? 'إيراد المواد الكاملة' : 'Whole-subject revenue', report.totals.subject_revenue ?? 0],
          [ar ? 'إيراد الدروس المنفردة' : 'Single-lesson revenue', report.totals.lesson_revenue ?? 0],
          [ar ? 'مواد بدون سعر' : 'Subjects without a price', report.unpriced_courses],
        ], widths: [32, 18, 18, 12] },
        { name: ar ? 'التطور الزمني' : 'Timeline', rows: [
          [trend.byDay ? (ar ? 'اليوم' : 'Day') : (ar ? 'الشهر' : 'Month'), ar ? 'الإيراد' : 'Revenue', ...(report.previous ? [ar ? 'إيراد الفترة السابقة' : 'Previous revenue'] : [])],
          ...trend.points.map(p => [p.label, p.current, ...(report.previous ? [p.previous ?? 0] : [])] as Cell[]),
        ], widths: [14, 16, 20] },
        { name: ar ? 'شهري' : 'Monthly', rows: [[ar ? 'الشهر' : 'Month', ar ? 'التفعيلات' : 'Activations', ar ? 'الإيراد' : 'Revenue', ar ? 'نصيب المدرسين' : 'Teachers share', ar ? 'نصيب المنصة' : 'Platform share'], ...report.monthly.map(m => [m.month, m.activations, m.revenue, m.teacher_share, m.platform_share])], widths: [12, 12, 16, 16, 16] },
        ...TABS.map(t => {
          const cols = columns(t.key);
          return { name: ar ? t.ar : t.en, rows: [cols.map(c => c.label), ...report.groups[t.key].map(r => cols.map(c => c.value(r)))], widths: cols.map((c, i) => i === 0 ? 34 : c.label.length > 14 ? 30 : 15) };
        }),
      ], ar);
    } catch {
      toast.error(ar ? 'تعذر تصدير ملف Excel' : 'Could not export the Excel file');
    } finally { setExporting(false); }
  }

  function exportPdf() {
    if (!report || !now) return;
    const cell = (v: Cell, isMoney?: boolean) => typeof v === 'number' ? escapeHtml(isMoney ? fmt(v) : count.format(v)) : escapeHtml(v);
    const ok = openPrintableReport({
      ar, title: ar ? 'التقرير المالي' : 'Financial report', periodLabel, comparisonLabel: previousLabel,
      kpis: KPI.map(k => ({ label: ar ? k.ar : k.en, value: kpiValue(k.kind, now[k.key]), change: before ? change(now[k.key], before[k.key]) : undefined, previous: before ? kpiValue(k.kind, before[k.key]) : undefined })),
      notes: report.unpriced_courses > 0 ? [ar ? `${count.format(report.unpriced_courses)} مادة بدون سعر؛ تفعيلاتها تُحسب بصفر.` : `${report.unpriced_courses} subjects have no price; their activations count as 0.`] : [],
      sections: [
        { title: `${ar ? 'الإيرادات' : 'Revenue'}${report.previous ? (ar ? ' — الحالية (أزرق) مقابل السابقة (رمادي)' : ' — this period (blue) vs previous (grey)') : ''}`, html: svgBars(trend.points, n => money.format(n)) },
        { title: ar ? 'توزيع الإيراد' : 'Revenue split', html: htmlTable([ar ? 'البند' : 'Item', ar ? 'المبلغ' : 'Amount', '%'], [
          [ar ? 'نصيب المنصة' : 'Platform share', fmt(report.totals.platform_share), total ? `${Math.round((report.totals.platform_share / total) * 100)}%` : '—'],
          [ar ? 'نصيب المدرسين' : 'Teachers share', fmt(report.totals.teacher_share), total ? `${Math.round((report.totals.teacher_share / total) * 100)}%` : '—'],
          [ar ? 'مواد كاملة' : 'Whole subjects', fmt(report.totals.subject_revenue ?? 0), total ? `${Math.round(((report.totals.subject_revenue ?? 0) / total) * 100)}%` : '—'],
          [ar ? 'دروس منفردة' : 'Single lessons', fmt(report.totals.lesson_revenue ?? 0), total ? `${Math.round(((report.totals.lesson_revenue ?? 0) / total) * 100)}%` : '—'],
        ], '') },
        { title: ar ? 'الإيرادات الشهرية' : 'Monthly revenue', html: htmlTable([ar ? 'الشهر' : 'Month', ar ? 'التفعيلات' : 'Activations', ar ? 'الإيراد' : 'Revenue', ar ? 'نصيب المدرسين' : 'Teachers share', ar ? 'نصيب المنصة' : 'Platform share'], report.monthly.map(m => [m.month, cell(m.activations), cell(m.revenue, true), cell(m.teacher_share, true), cell(m.platform_share, true)]), ar ? 'لا توجد بيانات' : 'No data', v => String(v)) },
        ...TABS.map(t => {
          const cols = columns(t.key);
          return { title: ar ? t.ar : t.en, html: htmlTable(cols.map(c => c.label), report.groups[t.key].map(r => cols.map(c => cell(c.value(r), c.money))), ar ? 'لا توجد بيانات' : 'No data', v => String(v)) };
        }),
      ],
    });
    if (!ok) toast.error(ar ? 'اسمح بالنوافذ المنبثقة لتصدير PDF' : 'Allow pop-ups to export the PDF');
  }

  if (role && !allowed) return <p className="p-8 text-center text-sm text-[#64748B]">{ar ? 'التقارير المالية متاحة للمالك أو لمن أعطاه صلاحية التقارير المالية.' : 'Financial reports are for the owner, or whoever the owner gave the financial reports permission.'}</p>;

  const cols = columns(tab);
  const topRows = report?.groups[topGroup] ?? [];

  return <div className="space-y-5 pb-12">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#2137D6]/10 text-[#2137D6]"><Wallet className="h-5 w-5" /></span>
        <div>
          <h1 className="text-xl font-bold text-[#0F172A]">{ar ? 'التقارير المالية' : 'Financial reports'}</h1>
          <p className="text-sm text-[#64748B]">{ar ? 'إيرادات المنصة وكل جامعة وسنتر وكلية وقسم ومادة ومدرس، محسوبة من التفعيلات بسعر المادة أو الدرس، ومقارنة بالفترة السابقة.' : 'Revenue of the platform and every university, center, faculty, department, subject and teacher, from activations at the subject or lesson price, compared with the previous period.'}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={exportExcel} disabled={!report || exporting} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />} Excel
        </button>
        <button type="button" onClick={exportPdf} disabled={!report} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50">
          <FileText className="h-4 w-4" /> PDF
        </button>
      </div>
    </div>

    <PeriodPicker ar={ar} presets={['30d', 'month', 'lastMonth', 'quarter', 'year', 'all']} value={period.preset} from={from} to={to} onChange={setPeriod}
      note={previousLabel ? `${ar ? 'مقارنة بـ' : 'vs'} ${previousLabel}` : (ar ? 'اختر فترة لها بداية عشان تظهر المقارنة' : 'Pick a period with a start date to compare')} />

    {loading && !report ? <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-[#2137D6]" /></div>
      : error || !report || !now ? <p className="rounded-2xl border border-rose-100 bg-rose-50 p-6 text-center text-sm text-rose-700">{ar ? 'تعذر تحميل التقارير المالية' : 'Could not load the financial reports'}</p>
      : <div className={`space-y-5 ${loading ? 'opacity-60' : ''}`}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {KPI.map(k => <div key={k.key} className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#2137D6]/10 text-[#2137D6]"><k.icon className="h-4 w-4" /></span>
              {before && <ChangeBadge change={change(now[k.key], before[k.key])} ar={ar} />}
            </div>
            <p className="mt-3 text-xs text-[#64748B]">{ar ? k.ar : k.en}</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums text-[#0F172A]">{kpiValue(k.kind, now[k.key])}</p>
            {before && <p className="mt-1 text-[11px] text-[#94A3B8]">{ar ? 'الفترة السابقة' : 'Previous'}: {kpiValue(k.kind, before[k.key])}</p>}
          </div>)}
        </div>

        {report.unpriced_courses > 0 && <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{ar ? `${count.format(report.unpriced_courses)} مادة لسه من غير سعر، وتفعيلاتها بتتحسب بصفر. حدد سعر المادة من تعديل المادة، وسعر الدرس من تعديل الدرس، ونسبة المدرس من تعديل المدرس.` : `${report.unpriced_courses} subjects have no price yet, so their activations count as 0. Set the subject price when editing the subject, the lesson price when editing the lesson and the teacher share when editing the teacher.`}</span>
        </div>}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5 xl:col-span-2">
            <h2 className="mb-3 text-sm font-bold text-[#0F172A]">{trend.byDay ? (ar ? 'الإيراد اليومي' : 'Daily revenue') : (ar ? 'الإيراد الشهري' : 'Monthly revenue')}</h2>
            <TrendChart points={trend.points} format={n => money.format(n)} currentName={ar ? 'الفترة الحالية' : 'This period'} previousName={report.previous ? (ar ? 'الفترة السابقة' : 'Previous period') : undefined} emptyText={ar ? 'لا توجد تفعيلات في الفترة دي' : 'No activations in this period'} />
          </section>
          <section className="space-y-6 rounded-2xl border border-[#E2E8F0] bg-white p-5">
            <div>
              <h2 className="mb-3 text-sm font-bold text-[#0F172A]">{ar ? 'توزيع الإيراد' : 'Revenue split'}</h2>
              <Donut size={140} parts={[{ label: ar ? 'نصيب المنصة' : 'Platform share', value: report.totals.platform_share, color: SERIES[0] }, { label: ar ? 'نصيب المدرسين' : 'Teachers share', value: report.totals.teacher_share, color: SERIES[1] }]} format={fmt} centerLabel={ar ? 'الإجمالي' : 'total'} emptyText={ar ? 'لا يوجد إيراد في الفترة دي' : 'No revenue in this period'} />
            </div>
            <div>
              <h2 className="mb-3 text-sm font-bold text-[#0F172A]">{ar ? 'التفعيلات' : 'Activations'}</h2>
              <Donut size={140} parts={[{ label: ar ? 'مدفوعة' : 'Paid', value: report.totals.paid_activations, color: SERIES[2] }, { label: ar ? 'مجانية / بدون سعر' : 'Free / unpriced', value: report.totals.activations - report.totals.paid_activations, color: '#CBD5E1' }]} format={n => count.format(n)} centerLabel={ar ? 'تفعيل' : 'activations'} emptyText={ar ? 'لا توجد تفعيلات' : 'No activations'} />
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-[#0F172A]">{ar ? 'الأعلى إيرادًا' : 'Top by revenue'}</h2>
            <div className="flex flex-wrap gap-1">
              {TABS.map(t => <button key={t.key} type="button" aria-pressed={topGroup === t.key} onClick={() => setTopGroup(t.key)} className={`rounded-lg px-2.5 py-1 text-xs font-medium ${topGroup === t.key ? 'bg-[#0F172A] text-white' : 'text-[#475569] hover:bg-[#F1F5F9]'}`}>{ar ? t.ar : t.en}</button>)}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <p className="mb-2 text-xs text-[#64748B]">{ar ? 'حسب الإيراد' : 'By revenue'}</p>
              <BarList items={[...topRows].sort((a, b) => b.revenue - a.revenue).map(r => ({ key: r.id, label: r.name, value: r.revenue, sub: total > 0 ? `${Math.round((r.revenue / total) * 100)}%` : undefined }))} format={fmt} emptyText={ar ? 'لا توجد بيانات في الفترة دي' : 'No data in this period'} />
            </div>
            <div>
              <p className="mb-2 text-xs text-[#64748B]">{ar ? 'حسب عدد التفعيلات' : 'By activations'}</p>
              <BarList color={SERIES[2]} items={[...topRows].sort((a, b) => b.activations - a.activations).map(r => ({ key: r.id, label: r.name, value: r.activations, sub: `${count.format(r.students)} ${ar ? 'طالب' : 'students'}` }))} format={n => count.format(n)} emptyText={ar ? 'لا توجد بيانات في الفترة دي' : 'No data in this period'} />
            </div>
          </div>
        </section>

        <div className="rounded-2xl border border-[#E2E8F0] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] p-3">
            <div className="flex flex-wrap gap-1">
              {TABS.map(t => <button key={t.key} type="button" onClick={() => { setTab(t.key); setSearch(''); }} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ${tab === t.key ? 'bg-[#2137D6] text-white' : 'text-[#475569] hover:bg-[#F1F5F9]'}`}>
                <t.icon className="h-4 w-4" />{ar ? t.ar : t.en}
                <span className={`rounded-full px-1.5 text-[10px] ${tab === t.key ? 'bg-white/20' : 'bg-[#F1F5F9]'}`}>{count.format(report.groups[t.key].length)}</span>
              </button>)}
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute start-2.5 top-2.5 h-4 w-4 text-[#94A3B8]" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={ar ? 'بحث بالاسم' : 'Search by name'} className="w-56 rounded-lg border border-[#E2E8F0] py-1.5 pe-3 ps-8 text-sm" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-[#F8FAFC] text-xs text-[#64748B]">
                <tr>{cols.map(c => <th key={c.label} className="whitespace-nowrap px-3 py-2.5 text-start font-semibold">{c.label}</th>)}</tr>
              </thead>
              <tbody>
                {rows.length === 0 ? <tr><td colSpan={cols.length} className="py-10 text-center text-[#94A3B8]">
                  <UserRound className="mx-auto mb-2 h-6 w-6" />{ar ? 'لا توجد بيانات في الفترة دي' : 'No data in this period'}
                </td></tr>
                  : rows.map(r => <tr key={String(r.id)} className="border-t border-[#F1F5F9] hover:bg-[#F8FAFC]">
                    {cols.map((c, i) => {
                      const v = c.value(r);
                      return <td key={c.label} className={`px-3 py-2.5 ${i === 0 ? 'font-semibold text-[#0F172A]' : 'text-[#475569]'}`}>
                        {typeof v === 'number' ? (c.money ? fmt(v) : count.format(v)) : (v || '—')}
                      </td>;
                    })}
                  </tr>)}
              </tbody>
              {rows.length > 0 && <tfoot className="border-t-2 border-[#E2E8F0] bg-[#F8FAFC] text-sm font-bold text-[#0F172A]">
                <tr>{cols.map((c, i) => {
                  if (i === 0) return <td key={c.label} className="px-3 py-2.5">{ar ? 'الإجمالي' : 'Total'}</td>;
                  const key = c.sum;
                  if (!key) return <td key={c.label} />;
                  const sum = rows.reduce((acc, r) => acc + r[key], 0);
                  return <td key={c.label} className="px-3 py-2.5">{c.money ? fmt(Math.round(sum * 100) / 100) : count.format(sum)}</td>;
                })}</tr>
              </tfoot>}
            </table>
          </div>
        </div>
      </div>}
  </div>;
}
