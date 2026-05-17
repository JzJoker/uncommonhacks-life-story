"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BlurReveal } from "@/components/BlurReveal";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { supabase } from "@/lib/supabase";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    router.replace("/");
  };

  return (
    <main className="flex-1 flex items-center justify-center bg-cream-50 px-16 py-16">
      <div className="w-[420px] bg-paper border border-cream-50 rounded-[12px] p-6 flex flex-col items-center gap-5">
        <div className="flex flex-col items-center gap-2 text-ink">
          <BlurReveal
            as="h1"
            text="Sign In"
            className="font-hand text-[28px] leading-none justify-center"
          />
          <BlurReveal
            text="Welcome to Lifestory"
            delay={80}
            className="text-base font-light leading-none justify-center"
          />
        </div>

        <form className="flex flex-col gap-4 w-full" onSubmit={handleSubmit}>
          <Field id="email" label="Email">
            <Input id="email" type="email" autoComplete="email" placeholder="you@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>

          <Field id="password" label="Password">
            <Input id="password" type="password" autoComplete="current-password" placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>

          {error && <p className="text-sm text-red-500 font-light">{error}</p>}

          <Button variant="default" className="w-full" type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </Button>
        </form>

        <p className="text-sm font-light text-muted">
          No account?{" "}
          <Link href="/signup" className="text-ink underline underline-offset-2">Sign up</Link>
        </p>
      </div>
    </main>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <label htmlFor={id} className="text-base font-light text-muted leading-none">{label}</label>
      {children}
    </div>
  );
}
