"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BlurReveal } from "@/components/BlurReveal";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { supabase } from "@/lib/supabase";

export default function SignUpPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { first_name: firstName, last_name: lastName } },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.replace("/onboarding");
  };

  return (
    <div className="min-h-svh flex-1 bg-cream-50 px-16 py-16 flex items-center justify-center">
      <div className="w-[420px] max-w-full bg-paper border border-cream-50 rounded-[12px] p-6 flex flex-col gap-5">
        <header className="flex flex-col gap-2 text-ink">
          <BlurReveal
            as="h1"
            text="Sign Up"
            className="font-hand text-[28px] leading-none"
          />
          <BlurReveal
            text="Welcome to Lifestory"
            delay={80}
            className="text-base font-light"
          />
        </header>

        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <div className="flex gap-3">
            <Field label="First Name" htmlFor="firstName">
              <Input
                id="firstName"
                autoComplete="given-name"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </Field>
            <Field label="Last Name" htmlFor="lastName">
              <Input
                id="lastName"
                autoComplete="family-name"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </Field>
          </div>

          <Field label="Email" htmlFor="email">
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>

          <Field label="Password" htmlFor="password">
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>

          {error && <p className="text-sm text-red-500 font-light">{error}</p>}

          <Button
            variant="default"
            type="submit"
            className="w-full cursor-pointer"
            disabled={loading}
          >
            {loading ? "Creating account…" : "Create Account"}
          </Button>
        </form>

        <p className="text-sm font-light text-muted">
          Already have an account?{" "}
          <Link
            href="/signin"
            className="text-ink underline underline-offset-2"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 min-w-0 flex-col gap-2">
      <label
        htmlFor={htmlFor}
        className="text-base font-light text-muted leading-none"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
