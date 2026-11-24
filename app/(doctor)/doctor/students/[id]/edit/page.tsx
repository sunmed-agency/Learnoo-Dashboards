"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Teachers only see their own students: adding and editing students is for the administration. */
export default function Page() {
  const router = useRouter();
  useEffect(() => { router.replace("/doctor/students"); }, [router]);
  return null;
}
