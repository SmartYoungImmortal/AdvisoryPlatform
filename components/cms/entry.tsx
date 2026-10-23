"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useSession } from "@/lib/session";

export function CmsEntry() {
  const router = useRouter();
  const session = useSession();

  useEffect(() => {
    if (session.status === "loading") return;
    const admin = session.status === "authenticated" && session.account.role === "admin";
    router.replace(admin ? "/admin/dashboard" : "/admin/login");
  }, [router, session]);

  return null;
}
