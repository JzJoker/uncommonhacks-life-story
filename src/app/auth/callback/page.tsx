"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    const patientId = searchParams.get("patientId");
    if (!code) { router.replace("/signin"); return; }

    supabase.auth.exchangeCodeForSession(code).then(async ({ data }) => {
      const user = data.session?.user;
      if (user?.email) {
        // Link this user to any pending contributor invitations by email
        await supabase
          .from("patient_contributors")
          .update({ contributor_id: user.id })
          .eq("email", user.email)
          .is("contributor_id", null);
      }
      router.replace(patientId ? `/patient/${patientId}/new-memory` : "/");
    });
  }, [router, searchParams]);

  return (
    <main className="min-h-svh flex items-center justify-center bg-cream-50">
      <p className="text-base font-light text-muted">Signing you in…</p>
    </main>
  );
}
