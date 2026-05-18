"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [mode, setMode] = useState<"self_paced" | "caregiver_guided">("self_paced");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (loading) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setSaving(true);

    const { data, error } = await supabase
      .from("patients")
      .insert({ caregiver_id: user.id, name, notes: notes || null, experience_mode: mode })
      .select("id")
      .single();

    if (error) { setError(error.message); setSaving(false); return; }
    router.replace(`/patient/${data.id}`);
  };

  return (
    <main className="min-h-svh bg-cream-50 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-[480px] bg-paper border border-cream-50 rounded-[12px] p-8 flex flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="font-hand text-[28px] text-ink">Create a Life Story</h1>
          <p className="text-base font-light text-muted">Tell us about the person whose memories you&apos;re preserving.</p>
        </header>

        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <Field label="Patient's name" htmlFor="name">
            <Input id="name" placeholder="e.g. Andy Lin"
              value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>

          <Field label="Notes (optional)" htmlFor="notes">
            <textarea
              id="notes"
              placeholder="Anything helpful for contributors to know…"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-[4px] border border-cream-50 bg-paper px-4 py-3 text-base font-light text-ink placeholder:text-cream-150 focus:outline-none focus:border-ink/40 transition-colors resize-none"
            />
          </Field>

          <Field label="Experience mode" htmlFor="mode">
            <div className="flex flex-col gap-2">
              {(["self_paced", "caregiver_guided"] as const).map((m) => (
                <label key={m} className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" name="mode" value={m} checked={mode === m}
                    onChange={() => setMode(m)} className="accent-ink" />
                  <span className="text-base font-light text-ink">
                    {m === "self_paced" ? "Self-paced — patient explores independently" : "Caregiver-guided — caregiver navigates alongside"}
                  </span>
                </label>
              ))}
            </div>
          </Field>

          {error && <p className="text-sm text-red-500 font-light">{error}</p>}

          <Button variant="primary" type="submit" disabled={saving} className="w-full uppercase tracking-[0.18em]">
            {saving ? "Creating…" : "Create Life Story"}
          </Button>
        </form>
      </div>
    </main>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-base font-light text-muted leading-none">{label}</label>
      {children}
    </div>
  );
}
