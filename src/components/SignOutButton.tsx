"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export function SignOutButton({ className = "" }: { className?: string }) {
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/signin");
  };

  return (
    <button
      onClick={handleSignOut}
      className={`text-sm font-light text-muted hover:text-ink transition-colors ${className}`}
    >
      Sign out
    </button>
  );
}
