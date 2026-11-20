"use client";

import { useLocale } from "next-intl";
import type { CountdownResult } from "@/src/hooks/useCountdown";

/**
 * Learnoo countdown: one small Royal tile per unit (days, hours, minutes, seconds) with its label
 * under the number and Coral separators. Days only show when there is at least one day left.
 * `size="sm"` is the compact version for lists and badges.
 */
export function CountdownTiles({
  countdown,
  size = "md",
  className = "",
}: {
  countdown: CountdownResult;
  size?: "sm" | "md";
  className?: string;
}) {
  const ar = useLocale() === "ar";
  const pad = (n: number) => String(Math.max(0, n)).padStart(2, "0");
  const units = [
    ...(countdown.days > 0 ? [{ v: String(countdown.days), l: ar ? "يوم" : "days" }] : []),
    { v: pad(countdown.hours), l: ar ? "ساعة" : "hrs" },
    { v: pad(countdown.minutes), l: ar ? "دقيقة" : "min" },
    { v: pad(countdown.seconds), l: ar ? "ثانية" : "sec" },
  ];
  const sm = size === "sm";

  return (
    <span
      dir="ltr"
      role="timer"
      aria-label={ar ? "الوقت المتبقي" : "Time remaining"}
      className={`inline-flex items-center ${sm ? "gap-1" : "gap-1.5"} ${className}`}
    >
      {units.map((u, i) => (
        <span key={u.l} className={`inline-flex items-center ${sm ? "gap-1" : "gap-1.5"}`}>
          {i > 0 ? (
            <span className={`font-black text-[#E8766A] ${sm ? "text-xs" : "text-sm"}`} aria-hidden>
              :
            </span>
          ) : null}
          <span
            className={`flex flex-col items-center rounded-lg bg-gradient-to-b from-[#EEF1FF] to-[#E2E8FF] ring-1 ring-[#2D46E8]/15 ${
              sm ? "min-w-[30px] px-1 py-0.5" : "min-w-[42px] px-1.5 py-1"
            }`}
          >
            <span className={`font-extrabold tabular-nums leading-none text-[#1F33C4] ${sm ? "text-[12px]" : "text-[15px]"}`}>{u.v}</span>
            <span className={`mt-0.5 font-semibold leading-none text-[#64748B] ${sm ? "text-[8.5px]" : "text-[9.5px]"}`}>{u.l}</span>
          </span>
        </span>
      ))}
    </span>
  );
}
