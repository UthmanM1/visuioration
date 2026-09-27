"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/** Sends this tab to the login page when the session ends elsewhere (sign-out in another tab, expired refresh token). */
export function AuthListener() {
  const router = useRouter();
  useEffect(() => {
    const { data } = getSupabaseBrowserClient().auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        router.replace("/login");
        router.refresh();
      }
    });
    return () => data.subscription.unsubscribe();
  }, [router]);
  return null;
}
