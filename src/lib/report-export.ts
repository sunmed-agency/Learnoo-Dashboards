/**
 * Formatted exports shared by the dashboard and the financial reports:
 * - Excel: one sheet per table, column widths, right-to-left in Arabic.
 * - PDF: a branded printable page (KPIs with their change, SVG charts, tables); the browser's
 *   "Save as PDF" turns it into the file.
 */

export type Cell = string | number;
export interface Sheet { name: string; rows: Cell[][]; widths?: number[] }

export async function downloadWorkbook(fileName: string, sheets: Sheet[], rtl: boolean): Promise<void> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const used = new Set<string>();
  for (const sheet of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(sheet.rows);
    const widths = sheet.widths ?? (sheet.rows[0] ?? []).map((_, i) => Math.min(48, Math.max(12, ...sheet.rows.map((r) => String(r[i] ?? '').length + 2))));
    ws['!cols'] = widths.map((wch) => ({ wch }));
    let name = sheet.name.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Sheet';
    for (let n = 2; used.has(name); n++) name = `${name.slice(0, 28)} ${n}`;
    used.add(name);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  if (rtl) wb.Workbook = { Views: [{ RTL: true }] };
  XLSX.writeFile(wb, fileName);
}

export const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

export function htmlTable(head: string[], body: Cell[][], emptyText: string, formatCell: (value: Cell, column: number) => string = (v) => escapeHtml(v)): string {
  const rows = body.length
    ? body.map((r) => `<tr>${r.map((c, i) => `<td>${formatCell(c, i)}</td>`).join('')}</tr>`).join('')
    : `<tr><td colspan="${head.length}" class="empty">${escapeHtml(emptyText)}</td></tr>`;
  return `<table><thead><tr>${head.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`;
}

/** Bars for the printed page (current period, optionally the previous period as grey bars beside them). */
export function svgBars(points: { label: string; current: number; previous?: number | null }[], format: (n: number) => string): string {
  if (!points.length) return '';
  const width = 1000;
  const height = 220;
  const pad = { top: 18, bottom: 30, left: 8, right: 8 };
  const max = Math.max(1, ...points.map((p) => Math.max(p.current, p.previous ?? 0)));
  const slot = (width - pad.left - pad.right) / points.length;
  const hasPrev = points.some((p) => p.previous != null);
  const barW = Math.max(2, Math.min(28, slot * (hasPrev ? 0.36 : 0.6)));
  const innerH = height - pad.top - pad.bottom;
  const every = Math.max(1, Math.ceil(points.length / 16));
  const bars = points.map((p, i) => {
    const x = pad.left + i * slot + slot / 2;
    const h = (p.current / max) * innerH;
    const ph = ((p.previous ?? 0) / max) * innerH;
    return [
      hasPrev ? `<rect x="${(x - barW - 1).toFixed(1)}" y="${(pad.top + innerH - ph).toFixed(1)}" width="${barW}" height="${ph.toFixed(1)}" rx="2" fill="#CBD5E1"/>` : '',
      `<rect x="${(hasPrev ? x + 1 : x - barW / 2).toFixed(1)}" y="${(pad.top + innerH - h).toFixed(1)}" width="${barW}" height="${h.toFixed(1)}" rx="2" fill="#2a78d6"/>`,
      points.length <= 16 && p.current > 0 ? `<text x="${(hasPrev ? x + 1 + barW / 2 : x).toFixed(1)}" y="${(pad.top + innerH - h - 4).toFixed(1)}" font-size="9" text-anchor="middle" fill="#0F172A">${escapeHtml(format(p.current))}</text>` : '',
      i % every === 0 ? `<text x="${x.toFixed(1)}" y="${height - 10}" font-size="9" text-anchor="middle" fill="#64748B">${escapeHtml(p.label)}</text>` : '',
    ].join('');
  }).join('');
  return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" direction="ltr"><line x1="${pad.left}" x2="${width - pad.right}" y1="${pad.top + innerH}" y2="${pad.top + innerH}" stroke="#E2E8F0"/>${bars}</svg>`;
}

export interface PrintableReport {
  ar: boolean;
  title: string;
  periodLabel: string;
  comparisonLabel?: string;
  kpis: { label: string; value: string; change?: number | null; previous?: string }[];
  notes?: string[];
  sections: { title: string; html: string }[];
}

/** Opens the printable report; returns false when the browser blocked the window. */
export function openPrintableReport(report: PrintableReport): boolean {
  const win = window.open('', '_blank');
  if (!win) return false;
  const { ar } = report;
  const change = (c?: number | null) => c == null ? '' : `<em class="${c >= 0 ? 'up' : 'down'}">${c > 0 ? '▲' : c < 0 ? '▼' : ''} ${Math.abs(c).toLocaleString(ar ? 'ar-EG' : 'en-GB', { maximumFractionDigits: 1 })}%</em>`;
  win.document.write(`<!doctype html><html lang="${ar ? 'ar' : 'en'}" dir="${ar ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><title>${escapeHtml(report.title)} — Learnoo</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
<style>
@page{size:A4 landscape;margin:12mm}
*{box-sizing:border-box}body{font-family:Cairo,Arial,sans-serif;color:#0F172A;margin:0;font-size:11px}
header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #2137D6;padding-bottom:8px;margin-bottom:14px}
h1{margin:0;font-size:20px;color:#2137D6}h2{font-size:14px;margin:18px 0 6px;color:#1E293B;border-inline-start:4px solid #2137D6;padding-inline-start:8px}
.meta{color:#64748B;font-size:11px;text-align:end}
.kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}.kpi{border:1px solid #E2E8F0;border-radius:8px;padding:8px 10px;background:#F8FAFC}
.kpi b{display:block;font-size:14px;margin-top:2px}.kpi span{color:#64748B;font-size:10px}.kpi small{display:block;color:#94A3B8;font-size:9px;margin-top:2px}
em{font-style:normal;font-size:10px;font-weight:700;margin-inline-start:6px}em.up{color:#047857}em.down{color:#BE123C}
table{width:100%;border-collapse:collapse;page-break-inside:auto}tr{page-break-inside:avoid}
th{background:#2137D6;color:#fff;font-weight:600;padding:5px 6px;text-align:start;font-size:10px}
td{border-bottom:1px solid #E2E8F0;padding:4px 6px;font-size:10px}tbody tr:nth-child(even) td{background:#F8FAFC}
td.empty{text-align:center;color:#94A3B8;padding:10px}.note{color:#B45309;font-size:10px;margin-top:8px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}section{page-break-inside:auto}
.legend{font-size:10px;color:#64748B;margin:2px 0 4px}.legend i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-inline:4px 4px;vertical-align:middle}
</style></head><body>
<header><div><h1>${escapeHtml(report.title)}</h1><div>Learnoo</div></div><div class="meta">${escapeHtml(ar ? 'الفترة' : 'Period')}: ${escapeHtml(report.periodLabel)}${report.comparisonLabel ? `<br>${escapeHtml(ar ? 'مقارنة بـ' : 'Compared with')}: ${escapeHtml(report.comparisonLabel)}` : ''}<br>${escapeHtml(ar ? 'تاريخ الإصدار' : 'Issued')}: ${escapeHtml(new Date().toLocaleString(ar ? 'ar-EG' : 'en-GB'))}</div></header>
<div class="kpis">${report.kpis.map((k) => `<div class="kpi"><span>${escapeHtml(k.label)}</span><b>${escapeHtml(k.value)}${change(k.change)}</b>${k.previous ? `<small>${escapeHtml(ar ? 'الفترة السابقة' : 'Previous')}: ${escapeHtml(k.previous)}</small>` : ''}</div>`).join('')}</div>
${(report.notes ?? []).map((n) => `<p class="note">${escapeHtml(n)}</p>`).join('')}
${report.sections.map((s) => `<section><h2>${escapeHtml(s.title)}</h2>${s.html}</section>`).join('')}
<script>document.fonts.ready.then(function(){setTimeout(function(){window.print()},250)})</script>
</body></html>`);
  win.document.close();
  return true;
}

/** "2026-11-05" -> "5/11" (day labels on charts). */
export function shortDay(day: string): string {
  const [, m, d] = day.split('-');
  return d && m ? `${Number(d)}/${Number(m)}` : day;
}
