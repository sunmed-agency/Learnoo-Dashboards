"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarDays, ChevronLeft, FileText } from "lucide-react";
import { useLocale } from "next-intl";
import api, { type TimetableEntry } from "@/src/lib/api";

/**
 * Student home: "My schedules" card beside the library (same data as /student/schedules:
 * the course timetable entries, newest files first). Read-only; opens the schedules page.
 */
export default function StudentSchedulesSection() {
  const locale = useLocale();
  const ar = locale === "ar";
  const [entries, setEntries] = useState<TimetableEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.timetable
      .list()
      .then((result) => {
        if (!cancelled) setEntries((result.entries ?? []).filter((e) => e.kind === "course"));
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const href = `/${locale}/student/schedules`;
  const visible = (entries ?? []).slice(0, 4);

  return (
    <section className="flex flex-col rounded-2xl border border-[var(--border-color)] bg-white px-4 py-5 shadow-sm sm:px-5">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-bold text-[var(--text-dark)] sm:text-xl">{ar ? "جداولي" : "My schedules"}</h2>
        <Link
          href={href}
          className="shrink-0 text-sm font-bold leading-6 text-primary transition duration-300 hover:text-primary-blue"
        >
          {ar ? "عرض الكل" : "View all"}
        </Link>
      </div>

      {entries === null ? (
        <div className="space-y-3" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[68px] animate-pulse rounded-2xl bg-[#F4F6FD]" />
          ))}
        </div>
      ) : !visible.length ? (
        <div className="flex min-h-[200px] flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--border-color)] bg-[#F7F8FA] px-4 text-center text-sm text-[var(--text-muted)] sm:min-h-[250px]">
          <span className="grid size-12 place-items-center rounded-2xl bg-[#EAEEFE] text-[#2D46E8]">
            <CalendarDays className="size-6" aria-hidden />
          </span>
          {ar ? "لا توجد جداول بعد." : "No schedules yet."}
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((entry) => {
            const files = entry.documents?.length ?? 0;
            const firstFile = entry.documents?.[0]?.attributes?.name;
            return (
              <li key={`${entry.kind}-${entry.id}`}>
                <Link
                  href={href}
                  className="group flex items-center gap-3 rounded-2xl border border-[#E6EAF6] bg-white p-3 transition hover:-translate-y-0.5 hover:border-[#2D46E8]/30 hover:bg-[#F4F6FD]"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#1F33C4] to-[#2D46E8] text-white">
                    <CalendarDays className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-[#0A1033]">{entry.title}</span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-xs text-[#64748B]">
                      <FileText className="size-3.5 shrink-0" aria-hidden />
                      <span className="truncate">
                        {firstFile
                          ? files > 1
                            ? `${firstFile} ${ar ? `+${files - 1} ملف` : `+${files - 1} more`}`
                            : firstFile
                          : ar
                            ? "لا توجد ملفات بعد"
                            : "No files yet"}
                      </span>
                    </span>
                  </span>
                  <ChevronLeft className="size-4 shrink-0 text-[#94A3B8] transition group-hover:text-[#2D46E8] ltr:rotate-180" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
