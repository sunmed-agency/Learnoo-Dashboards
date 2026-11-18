"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Lock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { StudentCourseActivationModal } from "@/components/student/StudentCourseActivationModal";
import type { StudentLiveRoom } from "@/src/interfaces/student-live-room.interface";
import { getCourseTitle, getLiveRoomCourseIds } from "@/src/lib/student-live-room";

/**
 * A live session the student may not join yet (`can_view: false`), opened from
 * a shared link: the same two locked states as the session list — a private
 * session asks for its activation code, a course session sends the student to
 * the course to activate it.
 */
export default function LiveSessionLockedPanel({ room }: { room: StudentLiveRoom }) {
  const t = useTranslations("liveSessions");
  const locale = useLocale();
  const router = useRouter();
  const [activating, setActivating] = useState(false);
  const isRtl = locale === "ar";
  const attrs = room.attributes;
  const title = attrs?.title?.trim() || t("liveSession");
  const courseTitle = getCourseTitle(attrs);
  const isPrivate = ["false", "private"].includes(String(attrs?.is_public ?? "").toLowerCase());
  const courseId = getLiveRoomCourseIds(room)[0];
  const courseHref = courseId
    ? `/${locale}/student/courses/course-details/${encodeURIComponent(courseId)}`
    : `/${locale}/student/courses`;

  return (
    <div className="flex min-w-0 flex-col gap-6" dir={isRtl ? "rtl" : "ltr"}>
      <Link
        href={`/${locale}/student/live-sessions`}
        className="inline-flex min-h-[44px] w-fit items-center gap-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--primary)]"
      >
        {isRtl ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
        {t("backToList")}
      </Link>

      <section className="mx-auto w-full max-w-[672px] rounded-xl border border-amber-200 bg-amber-50 px-5 py-6">
        <div className="flex items-center gap-2 text-amber-950">
          <Lock size={18} />
          <h1 className="text-base font-semibold">{title}</h1>
        </div>
        {courseTitle ? <p className="mt-1 text-sm text-amber-900/80">{courseTitle}</p> : null}
        <p className="mt-4 text-sm font-semibold text-amber-950">
          {t(isPrivate ? "locked.privateTitle" : "locked.courseTitle")}
        </p>
        <p className="mt-1 text-sm text-amber-900/90">
          {t(isPrivate ? "locked.privateBody" : "locked.courseBody")}
        </p>
        <div className="mt-5">
          {isPrivate ? (
            <button
              type="button"
              onClick={() => setActivating(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2137D6] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1a2bb3]"
            >
              <Lock size={16} />
              {t("locked.activateRoom")}
            </button>
          ) : (
            <Link
              href={courseHref}
              className="inline-flex items-center justify-center rounded-xl bg-[#2137D6] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1a2bb3]"
            >
              {t("locked.goToCourse")}
            </Link>
          )}
        </div>
      </section>

      <StudentCourseActivationModal
        open={activating}
        onClose={() => setActivating(false)}
        courseId={room.id}
        courseTitle={title}
        activationItemType="live_room"
        onActivated={() => {
          setActivating(false);
          router.refresh();
        }}
      />
    </div>
  );
}
