"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { ChevronDown, ExternalLink, Smartphone } from "lucide-react";
import { STORE_LINKS } from "@/src/lib/store-links";
import { PlatformLogo } from "@/components/landing/PlatformLogos";

/** "Download the app" in the student header: one button that opens the three stores with their logos. */
export default function StudentAppMenu() {
  const ar = useLocale() === "ar";
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const stores = [
    { name: "Google Play", note: ar ? "أندرويد" : "Android", href: STORE_LINKS.googlePlay, logo: 0 },
    { name: "App Store", note: ar ? "آيفون وآيباد" : "iPhone & iPad", href: STORE_LINKS.appStore, logo: 1 },
    { name: "AppGallery", note: ar ? "موبايلات هواوي" : "Huawei phones", href: STORE_LINKS.appGallery, logo: 2 },
  ];
  const label = ar ? "حمّل التطبيق" : "Get the app";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={label}
        className="flex h-9 items-center gap-1.5 rounded-full bg-gradient-to-l from-[var(--primary)] to-[#5B73FF] px-2.5 text-xs font-bold text-white shadow-[0_8px_18px_-10px_rgba(45,70,232,0.8)] transition hover:opacity-95 ltr:bg-gradient-to-r sm:h-10 sm:gap-2 sm:px-3.5 sm:text-sm"
      >
        <Smartphone className="size-4 sm:size-[17px]" aria-hidden />
        <span className="hidden md:inline">{label}</span>
        <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>

      {open && (
        <div role="menu" className="absolute end-0 top-12 z-50 w-64 rounded-2xl border border-[var(--border-color)] bg-white p-2 shadow-xl">
          <p className="px-3 pb-2 pt-1 text-[11px] font-bold uppercase tracking-wide text-[#94A3B8]">{label}</p>
          {stores.map((store) => (
            <a
              key={store.name}
              role="menuitem"
              href={store.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-[#F4F6FD]"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#F4F6FD] ring-1 ring-[#E6EAF6] group-hover:bg-white">
                <PlatformLogo index={store.logo} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-[#0A1033]" dir="ltr">{store.name}</span>
                <span className="block text-xs text-[#64748B]">{store.note}</span>
              </span>
              <ExternalLink className="size-4 shrink-0 text-[#94A3B8] group-hover:text-[var(--primary)]" aria-hidden />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
