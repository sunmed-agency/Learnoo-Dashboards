"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Feature control moved into Settings. */
export default function Page() {
  const router = useRouter();
  useEffect(() => { router.replace("/settings/features"); }, [router]);
  return null;
}
