import assert from 'node:assert/strict';
import test from 'node:test';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { addWatermarkToPdf } from './server-pdf-watermark.ts';
import { DEFAULT_WATERMARK_CONFIG } from '../types/watermark-config.ts';
import type { User } from '../types/index.ts';

/** Joins PDF parts and writes a cross-reference table that points at each listed object. */
function withXref(head: string, objects: Array<[string, string]>, trailer: string, prev?: number): string {
  let body = head;
  const offsets: Array<[string, number]> = [];
  for (const [id, source] of objects) {
    offsets.push([id, Buffer.byteLength(body, 'latin1')]);
    body += `${id} obj\n${source}\nendobj\n`;
  }
  const xrefAt = Buffer.byteLength(body, 'latin1');
  const rows = offsets.map(([id, offset]) => {
    const [num, gen] = id.split(' ');
    return `${num} 1\n${String(offset).padStart(10, '0')} ${gen.padStart(5, '0')} n \n`;
  });
  const prevEntry = prev === undefined ? '' : ` /Prev ${prev}`;
  return `${body}xref\n0 1\n0000000000 65535 f \n${rows.join('')}trailer\n<< ${trailer}${prevEntry} >>\nstartxref\n${xrefAt}\n%%EOF\n`;
}

/**
 * A PDF saved with an incremental update that redefines its catalog as
 * generation 1 (`1 1 obj`), the way the doctor's handout was saved.
 */
function pdfWithGenerationOneRoot(): ArrayBuffer {
  const content = 'BT /F1 18 Tf 40 150 Td (Lesson summary) Tj ET';
  const original = withXref('%PDF-1.4\n', [
    ['1 0', '<< /Type /Catalog /Pages 2 0 R >>'],
    ['2 0', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>'],
    ['3 0', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 816] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>'],
    ['4 0', `<< /Length ${content.length} >>\nstream\n${content}\nendstream`],
    ['5 0', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'],
  ], '/Size 6 /Root 1 0 R');
  const firstXref = Number(original.match(/startxref\n(\d+)/)![1]);
  const updated = withXref(original, [['1 1', '<< /Type /Catalog /Pages 2 0 R >>']], '/Size 6 /Root 1 1 R', firstXref);
  const bytes = Buffer.from(updated, 'latin1');
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

const student = { attributes: { phone: '01000000001' } } as unknown as User;
const enabled = { ...DEFAULT_WATERMARK_CONFIG, enabled: true, useStudentCode: true, usePhoneNumber: true, opacity: 50 };

async function pageText(bytes: ArrayBuffer) {
  const pdf = await getDocument({ data: new Uint8Array(bytes.slice(0)), verbosity: 0 }).promise;
  const page = await pdf.getPage(1);
  const text = (await page.getTextContent()).items.map(item => ('str' in item ? item.str : '')).join('\n');
  return { pages: pdf.numPages, view: page.view, text };
}

test('the burned-in watermark can be read back from a PDF whose root is generation 1', async () => {
  const source = pdfWithGenerationOneRoot();
  assert.match((await pageText(source)).text, /Lesson summary/);

  const watermarked = await addWatermarkToPdf(source, enabled, student, 'STU-T1');
  const result = await pageText(watermarked);

  assert.equal(result.pages, 1);
  assert.deepEqual(result.view, [0, 0, 612, 816]);
  assert.match(result.text, /Lesson summary/);
  // Twelve copies in a 3 × 4 grid; the outer ones run off the page edge.
  assert.equal(result.text.match(/-T/g)?.length, 12);
  assert.ok((result.text.match(/STU-T1 · 01000000001/g)?.length ?? 0) >= 4);
});

test('the PDF comes back untouched when the watermark is off', async () => {
  const source = pdfWithGenerationOneRoot();
  const result = await addWatermarkToPdf(source, { ...enabled, enabled: false }, student, 'STU-T1');

  assert.equal(result, source);
});
