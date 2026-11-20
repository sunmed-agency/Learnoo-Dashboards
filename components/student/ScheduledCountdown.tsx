"use client";

import { useLocale } from "next-intl";
import { useCountdown } from "@/src/hooks/useCountdown";
import { CountdownTiles } from "@/components/student/CountdownTiles";

export function ScheduledCountdown({ date }: { date?: string | null }) {
  const locale = useLocale();
  const countdown = useCountdown(date, { dayLabel: locale === "ar" ? "يوم" : "d" });
  if (!date || !countdown.isReady || countdown.isPast) return null;
  return <CountdownTiles countdown={countdown} size="sm" />;
}
