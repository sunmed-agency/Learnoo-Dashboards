'use client';

import { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { FileText } from 'lucide-react';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

/**
 * The first page of a schedule PDF drawn as a picture (same size as an image schedule), so students
 * see what is inside before opening it. It loads through the same proxy path as the PDF viewer.
 */
export default function PdfFirstPageThumb({ pdfUrl, className = '' }: { pdfUrl: string; className?: string }) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(320);
  const [data, setData] = useState<Blob | null>(null);
  const [failed, setFailed] = useState(false);

  // Same-origin proxy path, like the viewer (the full URL points at the proxy host).
  const source = (() => {
    try {
      const u = new URL(pdfUrl);
      return `${u.pathname}${u.search}`;
    } catch {
      return pdfUrl;
    }
  })();

  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setWidth(Math.max(160, Math.round(el.clientWidth))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setFailed(false);
    fetch(source, { cache: 'no-store', signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.blob();
      })
      .then(setData)
      .catch((e: unknown) => {
        if ((e as Error).name !== 'AbortError') setFailed(true);
      });
    return () => controller.abort();
  }, [source]);

  return (
    <div ref={boxRef} className={`relative flex items-start justify-center overflow-hidden bg-white ${className}`}>
      {failed ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-[#94A3B8]">
          <FileText className="h-8 w-8" />
          <span className="text-xs font-semibold">PDF</span>
        </div>
      ) : !data ? (
        <div className="h-full w-full animate-pulse bg-[#F1F5F9]" aria-hidden />
      ) : (
        <Document file={data} loading={<div className="h-full w-full animate-pulse bg-[#F1F5F9]" />} onLoadError={() => setFailed(true)}>
          <Page pageNumber={1} width={width} renderTextLayer={false} renderAnnotationLayer={false} />
        </Document>
      )}
    </div>
  );
}
