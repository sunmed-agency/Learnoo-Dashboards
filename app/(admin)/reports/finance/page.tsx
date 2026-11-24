"use client";

import { useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { toast } from 'sonner';
import { AlertTriangle, Building2, FileSpreadsheet, FileText, GraduationCap, Landmark, Layers, Loader2, Search, School, UserRound, Users, Wallet, BookOpen } from 'lucide-react';
import api, { type FinanceFigures, type FinanceGroup, type FinanceReport, type FinanceRow } from '@/src/lib/api';
import { useCurrentUser } from '@/src/hooks/useAuth';
import { can } from '@/src/lib/permissions';

type Preset = 'all' | 'month' | 'lastMonth' | 'year';

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function presetRange(preset: Preset): { from: string; to: string } {
  const now = new Date();
  if (preset === 'month') return { from: ymd(new Date(now.getFullYear(), now.getMonth(), 1)), to: ymd(now) };
  if (preset === 'lastMonth') return { from: ymd(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: ymd(new Date(now.getFullYear(), now.getMonth(), 0)) };
  if (preset === 'year') return { from: ymd(new Date(now.getFullYear(), 0, 1)), to: ymd(now) };
  return { from: '', to: '' };
}

const TABS: { key: FinanceGroup; ar: string; en: string; icon: typeof Landmark }[] = [
  { key: 'universities', ar: 'الجامعات', en: 'Universities', icon: Landmark },
  { key: 'centers', ar: 'السناتر', en: 'Centers', icon: Building2 },
  { key: 'faculties', ar: 'الكليات', en: 'Faculties', icon: School },
  { key: 'departments', ar: 'الأقسام', en: 'Departments', icon: Layers },
  { key: 'courses', ar: 'المواد', en: 'Subjects', icon: BookOpen },
  { key: 'instructors', ar: 'المدرسين', en: 'Teachers', icon: GraduationCap },
];

const esc = (value: unknown) => String(value ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

/** Financial reports: owner only, or a supervisor the owner gave "finance.view". */
export default function FinanceReportsPage() {
  const ar = useLocale() === 'ar';
  const { role, user } = useCurrentUser();
  const allowed = role === 'Super Admin' || (role === 'Admin' && can(user, 'finance.view'));
  const [preset, setPreset] = useState<Preset>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [report, setReport] = useState<FinanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<FinanceGroup>('universities');
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

  const choosePreset = (next: Preset) => { setPreset(next); const r = presetRange(next); setFrom(r.from); setTo(r.to); };
  const periodLabel = from || to
    ? `${from || (ar ? 'البداية' : 'start')} → ${to || (ar ? 'اليوم' : 'today')}`
    : (ar ? 'كل الفترات' : 'All time');

  const total = report?.totals.revenue ?? 0;
  const rows = useMemo(() => {
    const list = report?.groups[tab] ?? [];
    const q = search.trim().toLowerCase();
    return q ? list.filter(r => `${r.name} ${r.path ?? ''} ${r.teacher ?? ''}`.toLowerCase().includes(q)) : list;
  }, [report, tab, search]);

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

  const summaryRows = (r: FinanceReport): [string, string | number][] => [
    [ar ? 'الفترة' : 'Period', periodLabel],
    [ar ? 'إجمالي الإيرادات' : 'Total revenue', r.totals.revenue],
    [ar ? 'نصيب المدرسين' : 'Teachers share', r.totals.teacher_share],
    [ar ? 'نصيب المنصة' : 'Platform share', r.totals.platform_share],
    [ar ? 'كل التفعيلات' : 'All activations', r.totals.activations],
    [ar ? 'تفعيلات مواد' : 'Subject activations', r.totals.subject_activations],
    [ar ? 'تفعيلات دروس' : 'Lesson activations', r.totals.lesson_activations],
    [ar ? 'تفعيلات مدفوعة' : 'Paid activations', r.totals.paid_activations],
    [ar ? 'الطلاب' : 'Students', r.totals.students],
    [ar ? 'مواد بدون سعر' : 'Subjects without a price', r.unpriced_courses],
  ];
  const monthlyHead = [ar ? 'الشهر' : 'Month', ar ? 'التفعيلات' : 'Activations', ar ? 'الإيراد' : 'Revenue', ar ? 'نصيب المدرسين' : 'Teachers share', ar ? 'نصيب المنصة' : 'Platform share'];

  async function exportExcel() {
    if (!report) return;
    setExporting(true);
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();
      const addSheet = (name: string, aoa: (string | number)[][], widths: number[]) => {
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        ws['!cols'] = widths.map(wch => ({ wch }));
        XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
      };
      addSheet(ar ? 'ملخص المنصة' : 'Platform summary', [[ar ? 'تقرير مالي — Learnoo' : 'Financial report — Learnoo', ''], ...summaryRows(report)], [28, 22]);
      addSheet(ar ? 'شهري' : 'Monthly', [monthlyHead, ...report.monthly.map(m => [m.month, m.activations, m.revenue, m.teacher_share, m.platform_share])], [12, 12, 16, 16, 16]);
      for (const t of TABS) {
        const cols = columns(t.key);
        addSheet(ar ? t.ar : t.en, [cols.map(c => c.label), ...report.groups[t.key].map(r => cols.map(c => c.value(r)))], cols.map((c, i) => i === 0 ? 34 : c.label.length > 14 ? 30 : 15));
      }
      if (ar) wb.Workbook = { Views: [{ RTL: true }] };
      XLSX.writeFile(wb, `learnoo-finance-${from || 'all'}-${to || ymd(new Date())}.xlsx`);
    } catch {
      toast.error(ar ? 'تعذر تصدير ملف Excel' : 'Could not export the Excel file');
    } finally { setExporting(false); }
  }

  // PDF: a clean printable copy of the whole report; the browser's "Save as PDF" does the rest.
  function exportPdf() {
    if (!report) return;
    const win = window.open('', '_blank');
    if (!win) { toast.error(ar ? 'اسمح بالنوافذ المنبثقة لتصدير PDF' : 'Allow pop-ups to export the PDF'); return; }
    const cell = (v: string | number, isMoney?: boolean) => typeof v === 'number' ? (isMoney ? esc(fmt(v)) : esc(count.format(v))) : esc(v);
    const table = (head: string[], body: string[][]) => `<table><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${body.length ? body.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${head.length}" class="empty">${ar ? 'لا توجد بيانات' : 'No data'}</td></tr>`}</tbody></table>`;
    const kpis = [
      [ar ? 'إجمالي الإيرادات' : 'Total revenue', fmt(report.totals.revenue)],
      [ar ? 'نصيب المدرسين' : 'Teachers share', fmt(report.totals.teacher_share)],
      [ar ? 'نصيب المنصة' : 'Platform share', fmt(report.totals.platform_share)],
      [ar ? 'التفعيلات (مدفوعة / الكل)' : 'Activations (paid / all)', `${count.format(report.totals.paid_activations)} / ${count.format(report.totals.activations)}`],
      [ar ? 'الطلاب' : 'Students', count.format(report.totals.students)],
    ];
    const sections = TABS.map(t => {
      const cols = columns(t.key);
      return `<section><h2>${esc(ar ? t.ar : t.en)}</h2>${table(cols.map(c => c.label), report.groups[t.key].map(r => cols.map(c => cell(c.value(r), c.money))))}</section>`;
    }).join('');
    win.document.write(`<!doctype html><html lang="${ar ? 'ar' : 'en'}" dir="${ar ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><title>${esc(ar ? 'التقرير المالي' : 'Financial report')} — Learnoo</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
<style>
@page{size:A4 landscape;margin:12mm}
*{box-sizing:border-box}body{font-family:Cairo,Arial,sans-serif;color:#0F172A;margin:0;font-size:11px}
header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #2137D6;padding-bottom:8px;margin-bottom:14px}
h1{margin:0;font-size:20px;color:#2137D6}h2{font-size:14px;margin:18px 0 6px;color:#1E293B;border-inline-start:4px solid #2137D6;padding-inline-start:8px}
.meta{color:#64748B;font-size:11px;text-align:end}
.kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}.kpi{border:1px solid #E2E8F0;border-radius:8px;padding:8px 10px;background:#F8FAFC}
.kpi b{display:block;font-size:14px;margin-top:2px}.kpi span{color:#64748B;font-size:10px}
table{width:100%;border-collapse:collapse;page-break-inside:auto}tr{page-break-inside:avoid}
th{background:#2137D6;color:#fff;font-weight:600;padding:5px 6px;text-align:start;font-size:10px}
td{border-bottom:1px solid #E2E8F0;padding:4px 6px;font-size:10px}tbody tr:nth-child(even) td{background:#F8FAFC}
td.empty{text-align:center;color:#94A3B8;padding:10px}.note{color:#B45309;font-size:10px;margin-top:8px}
section{page-break-inside:auto}
</style></head><body>
<header><div><h1>${esc(ar ? 'التقرير المالي' : 'Financial report')}</h1><div>Learnoo</div></div><div class="meta">${esc(ar ? 'الفترة' : 'Period')}: ${esc(periodLabel)}<br>${esc(ar ? 'تاريخ الإصدار' : 'Issued')}: ${esc(new Date().toLocaleString(ar ? 'ar-EG' : 'en-GB'))}</div></header>
<div class="kpis">${kpis.map(([l, v]) => `<div class="kpi"><span>${esc(l)}</span><b>${esc(v)}</b></div>`).join('')}</div>
${report.unpriced_courses > 0 ? `<p class="note">${esc(ar ? `${count.format(report.unpriced_courses)} مادة بدون سعر؛ تفعيلاتها تُحسب بصفر.` : `${report.unpriced_courses} subjects have no price; their activations count as 0.`)}</p>` : ''}
<section><h2>${esc(ar ? 'الإيرادات الشهرية' : 'Monthly revenue')}</h2>${table(monthlyHead, report.monthly.map(m => [esc(m.month), cell(m.activations), cell(m.revenue, true), cell(m.teacher_share, true), cell(m.platform_share, true)]))}</section>
${sections}
<script>document.fonts.ready.then(function(){setTimeout(function(){window.print()},200)})</script>
</body></html>`);
    win.document.close();
  }

  if (role && !allowed) return <p className="p-8 text-center text-sm text-[#64748B]">{ar ? 'التقارير المالية متاحة للمالك أو لمن أعطاه صلاحية التقارير المالية.' : 'Financial reports are for the owner, or whoever the owner gave the financial reports permission.'}</p>;

  const maxMonth = Math.max(1, ...(report?.monthly.map(m => m.revenue) ?? [0]));
  const cols = columns(tab);
  const kpis = report ? [
    { label: ar ? 'إجمالي الإيرادات' : 'Total revenue', value: fmt(report.totals.revenue), icon: Wallet, tone: 'bg-[#2137D6]/10 text-[#2137D6]' },
    { label: ar ? 'نصيب المدرسين' : 'Teachers share', value: fmt(report.totals.teacher_share), icon: GraduationCap, tone: 'bg-amber-50 text-amber-600' },
    { label: ar ? 'نصيب المنصة' : 'Platform share', value: fmt(report.totals.platform_share), icon: Landmark, tone: 'bg-emerald-50 text-emerald-600' },
    { label: ar ? 'التفعيلات (مدفوعة / الكل)' : 'Activations (paid / all)', value: `${count.format(report.totals.paid_activations)} / ${count.format(report.totals.activations)}`, icon: Layers, tone: 'bg-violet-50 text-violet-600' },
    { label: ar ? 'الطلاب' : 'Students', value: count.format(report.totals.students), icon: Users, tone: 'bg-sky-50 text-sky-600' },
  ] : [];

  return <div className="space-y-5 pb-12">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#2137D6]/10 text-[#2137D6]"><Wallet className="h-5 w-5" /></span>
        <div>
          <h1 className="text-xl font-bold text-[#0F172A]">{ar ? 'التقارير المالية' : 'Financial reports'}</h1>
          <p className="text-sm text-[#64748B]">{ar ? 'إيرادات المنصة وكل جامعة وسنتر وكلية وقسم ومادة ومدرس، محسوبة من التفعيلات بسعر المادة أو الدرس.' : 'Revenue of the platform and every university, center, faculty, department, subject and teacher, from activations at the subject or lesson price.'}</p>
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

    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4">
      <div className="flex flex-wrap gap-1.5">
        {([['all', 'كل الفترات', 'All time'], ['month', 'الشهر الحالي', 'This month'], ['lastMonth', 'الشهر السابق', 'Last month'], ['year', 'السنة الحالية', 'This year']] as [Preset, string, string][]).map(([key, a, e]) =>
          <button key={key} type="button" onClick={() => choosePreset(key)} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${preset === key ? 'bg-[#2137D6] text-white' : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'}`}>{ar ? a : e}</button>)}
      </div>
      <label className="text-xs text-[#64748B]">{ar ? 'من' : 'From'}
        <input type="date" value={from} max={to || undefined} onChange={e => { setPreset('all'); setFrom(e.target.value); }} className="mt-1 block rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-sm text-[#0F172A]" />
      </label>
      <label className="text-xs text-[#64748B]">{ar ? 'إلى' : 'To'}
        <input type="date" value={to} min={from || undefined} onChange={e => { setPreset('all'); setTo(e.target.value); }} className="mt-1 block rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-sm text-[#0F172A]" />
      </label>
    </div>

    {loading && !report ? <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-[#2137D6]" /></div>
      : error || !report ? <p className="rounded-2xl border border-rose-100 bg-rose-50 p-6 text-center text-sm text-rose-700">{ar ? 'تعذر تحميل التقارير المالية' : 'Could not load the financial reports'}</p>
      : <div className={`space-y-5 ${loading ? 'opacity-60' : ''}`}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {kpis.map(k => <div key={k.label} className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
            <span className={`grid h-9 w-9 place-items-center rounded-lg ${k.tone}`}><k.icon className="h-4 w-4" /></span>
            <p className="mt-3 text-xs text-[#64748B]">{k.label}</p>
            <p className="mt-0.5 text-lg font-bold text-[#0F172A]">{k.value}</p>
          </div>)}
        </div>

        {report.unpriced_courses > 0 && <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{ar ? `${count.format(report.unpriced_courses)} مادة لسه من غير سعر، وتفعيلاتها بتتحسب بصفر. حدد سعر المادة من تعديل المادة، وسعر الدرس من تعديل الدرس، ونسبة المدرس من تعديل المدرس.` : `${report.unpriced_courses} subjects have no price yet, so their activations count as 0. Set the subject price when editing the subject, the lesson price when editing the lesson and the teacher share when editing the teacher.`}</span>
        </div>}

        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
          <h2 className="mb-3 text-sm font-bold text-[#0F172A]">{ar ? 'الإيرادات الشهرية' : 'Monthly revenue'}</h2>
          {report.monthly.length === 0 ? <p className="py-6 text-center text-sm text-[#94A3B8]">{ar ? 'لا توجد تفعيلات في الفترة دي' : 'No activations in this period'}</p>
            : <div className="flex h-44 items-end gap-2 overflow-x-auto pb-1">
              {report.monthly.map(m => <div key={m.month} className="flex min-w-[46px] flex-1 flex-col items-center gap-1" title={`${m.month}: ${fmt(m.revenue)} · ${count.format(m.activations)}`}>
                <span className="text-[10px] font-semibold text-[#475569]">{money.format(m.revenue)}</span>
                <div className="flex w-full max-w-[40px] flex-1 items-end">
                  <div className="w-full rounded-t-md bg-[#2137D6]" style={{ height: `${Math.max(2, (m.revenue / maxMonth) * 100)}%` }} />
                </div>
                <span className="text-[10px] text-[#94A3B8]" dir="ltr">{m.month}</span>
              </div>)}
            </div>}
        </div>

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
                  const sum = rows.reduce((total, r) => total + r[key], 0);
                  return <td key={c.label} className="px-3 py-2.5">{c.money ? fmt(Math.round(sum * 100) / 100) : count.format(sum)}</td>;
                })}</tr>
              </tfoot>}
            </table>
          </div>
        </div>
      </div>}
  </div>;
}

