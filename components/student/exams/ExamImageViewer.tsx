'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react';
import { createPortal } from 'react-dom';
import { useLocale } from 'next-intl';
import { Hand, Highlighter, Maximize, Minus, Plus, Trash2, Undo2, X } from 'lucide-react';
import ExamWatermark from './WaterMarkDyna';
import type { WatermarkResolution } from '@/src/lib/watermark-from-features';

type Point = { x: number; y: number };
type Stroke = { color: string; points: Point[] };

const MIN_SCALE = 1;
const MAX_SCALE = 6;
const HIGHLIGHT_COLORS = ['#FACC15', '#4ADE80', '#F472B6'] as const;

/**
 * Full-screen viewer for exam images (question, section, option and feedback images; not the
 * banner): zoom with the buttons, the mouse wheel or two fingers, drag to move around, and a
 * highlighter to mark parts of the image (marks stay on the image while zooming; they are only on
 * this screen and are not saved). The exam watermark moves over the image like on the exam itself.
 */
export function ExamImageViewer({
  src,
  alt,
  onClose,
  watermarkText,
  watermarkConfig,
}: {
  src: string;
  alt?: string;
  onClose: () => void;
  watermarkText?: string;
  watermarkConfig?: WatermarkResolution | null;
}) {
  const ar = useLocale() === 'ar';
  const [mounted, setMounted] = useState(false);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [tool, setTool] = useState<'pan' | 'highlight'>('pan');
  const [color, setColor] = useState<string>(HIGHLIGHT_COLORS[0]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<{ kind: 'pan' | 'pinch' | 'draw' | null; start: Point; offset: Point; dist: number; scale: number }>({
    kind: null, start: { x: 0, y: 0 }, offset: { x: 0, y: 0 }, dist: 0, scale: 1,
  });

  useEffect(() => setMounted(true), []);

  // Esc closes; the page behind does not scroll while the viewer is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') zoomBy(1.25);
      if (e.key === '-') zoomBy(0.8);
    };
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose]);

  const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
  const zoomBy = useCallback((factor: number) => {
    setScale((s) => {
      const next = clampScale(s * factor);
      if (next === 1) setOffset({ x: 0, y: 0 });
      return next;
    });
  }, []);
  const reset = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  /** Pointer position as a fraction of the image box (so marks follow the image while zooming). */
  const toImagePoint = (clientX: number, clientY: number): Point | null => {
    const r = imgRef.current?.getBoundingClientRect();
    if (!r || r.width === 0 || r.height === 0) return null;
    return { x: (clientX - r.left) / r.width, y: (clientY - r.top) / r.height };
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      g.kind = 'pinch';
      g.dist = Math.hypot(a.x - b.x, a.y - b.y);
      g.scale = scale;
      // A pinch never leaves a half stroke behind.
      if (tool === 'highlight') setStrokes((list) => (list.length && list[list.length - 1].points.length < 2 ? list.slice(0, -1) : list));
      return;
    }
    if (tool === 'highlight') {
      const p = toImagePoint(e.clientX, e.clientY);
      if (!p) return;
      g.kind = 'draw';
      setStrokes((list) => [...list, { color, points: [p] }]);
    } else {
      g.kind = 'pan';
      g.start = { x: e.clientX, y: e.clientY };
      g.offset = offset;
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (g.kind === 'pinch' && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (g.dist > 0) setScale(clampScale((g.scale * dist) / g.dist));
    } else if (g.kind === 'draw') {
      const p = toImagePoint(e.clientX, e.clientY);
      if (!p) return;
      setStrokes((list) => {
        if (!list.length) return list;
        const last = list[list.length - 1];
        return [...list.slice(0, -1), { ...last, points: [...last.points, p] }];
      });
    } else if (g.kind === 'pan') {
      setOffset({ x: g.offset.x + (e.clientX - g.start.x), y: g.offset.y + (e.clientY - g.start.y) });
    }
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) gesture.current.kind = null;
    else if (gesture.current.kind === 'pinch') gesture.current.kind = null;
  };

  const onWheel = (e: ReactWheelEvent<HTMLDivElement>) => {
    zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12);
  };

  if (!mounted) return null;

  const btn = 'grid size-10 place-items-center rounded-xl text-white/90 transition hover:bg-white/15 disabled:opacity-40';

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt || (ar ? 'عرض الصورة' : 'Image viewer')}
      className="fixed inset-0 z-[10000] select-none bg-[#050915]/95 backdrop-blur-sm"
      dir="ltr"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Stage: drag to move, or draw when the highlighter is on */}
      <div
        className={`absolute inset-0 flex touch-none items-center justify-center overflow-hidden ${tool === 'highlight' ? 'cursor-crosshair' : scale > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        onDoubleClick={() => (scale > 1 ? reset() : zoomBy(2))}
      >
        <div
          className="relative"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transition: gesture.current.kind ? 'none' : 'transform 150ms ease-out',
            transformOrigin: 'center center',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- API-hosted exam image */}
          <img
            ref={imgRef}
            src={src}
            alt={alt || ''}
            draggable={false}
            className="block max-h-[78vh] max-w-[94vw] rounded-lg bg-white object-contain shadow-2xl"
          />
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden>
            {strokes.map((stroke, i) => (
              <polyline
                key={i}
                points={stroke.points.map((p) => `${p.x * 1000},${p.y * 1000}`).join(' ')}
                fill="none"
                stroke={stroke.color}
                strokeOpacity={0.42}
                strokeWidth={26}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                style={{ mixBlendMode: 'multiply' }}
              />
            ))}
          </svg>
        </div>
      </div>

      {/* The exam watermark keeps moving over the opened image */}
      {watermarkConfig?.config.enabled && watermarkText ? (
        <div className="pointer-events-none absolute inset-0 z-20">
          <ExamWatermark text={watermarkText} watermarkConfig={watermarkConfig} />
        </div>
      ) : null}

      {/* Close */}
      <button
        type="button"
        onClick={onClose}
        className="absolute end-4 top-4 z-30 grid size-11 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/20 transition hover:bg-white/20"
        aria-label={ar ? 'إغلاق' : 'Close'}
      >
        <X className="size-5" />
      </button>

      {/* Toolbar */}
      <div className="absolute inset-x-0 bottom-4 z-30 flex justify-center px-3">
        <div className="flex max-w-full flex-wrap items-center justify-center gap-1 rounded-2xl bg-[#0A1033]/90 p-1.5 ring-1 ring-white/15 shadow-2xl">
          <button type="button" className={btn} onClick={() => zoomBy(0.8)} disabled={scale <= MIN_SCALE} aria-label={ar ? 'تصغير' : 'Zoom out'}>
            <Minus className="size-5" />
          </button>
          <span className="min-w-[52px] text-center text-xs font-bold tabular-nums text-white/80">{Math.round(scale * 100)}%</span>
          <button type="button" className={btn} onClick={() => zoomBy(1.25)} disabled={scale >= MAX_SCALE} aria-label={ar ? 'تكبير' : 'Zoom in'}>
            <Plus className="size-5" />
          </button>
          <button type="button" className={btn} onClick={reset} aria-label={ar ? 'الحجم الأصلي' : 'Fit to screen'}>
            <Maximize className="size-[18px]" />
          </button>

          <span className="mx-1 h-6 w-px bg-white/15" aria-hidden />

          <button
            type="button"
            className={`${btn} ${tool === 'pan' ? 'bg-white/15' : ''}`}
            onClick={() => setTool('pan')}
            aria-pressed={tool === 'pan'}
            aria-label={ar ? 'تحريك الصورة' : 'Move'}
          >
            <Hand className="size-[18px]" />
          </button>
          <button
            type="button"
            className={`${btn} ${tool === 'highlight' ? 'bg-[#FACC15]/25 text-[#FDE68A]' : ''}`}
            onClick={() => setTool('highlight')}
            aria-pressed={tool === 'highlight'}
            aria-label={ar ? 'قلم التظليل' : 'Highlighter'}
          >
            <Highlighter className="size-[18px]" />
          </button>
          {tool === 'highlight'
            ? HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`grid size-8 place-items-center rounded-full ${color === c ? 'ring-2 ring-white' : ''}`}
                  aria-label={ar ? 'لون التظليل' : 'Highlight colour'}
                >
                  <span className="size-5 rounded-full" style={{ background: c }} />
                </button>
              ))
            : null}
          <button
            type="button"
            className={btn}
            onClick={() => setStrokes((list) => list.slice(0, -1))}
            disabled={!strokes.length}
            aria-label={ar ? 'تراجع' : 'Undo'}
          >
            <Undo2 className="size-[18px]" />
          </button>
          <button
            type="button"
            className={btn}
            onClick={() => setStrokes([])}
            disabled={!strokes.length}
            aria-label={ar ? 'مسح التظليل' : 'Clear highlights'}
          >
            <Trash2 className="size-[18px]" />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
