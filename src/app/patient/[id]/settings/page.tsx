"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";

type Contributor = { id: string; email: string; contributor_id: string | null };

export default function PatientSettingsPage() {
  const params = useParams<{ id: string }>();
  const patientId = params.id;
  const router = useRouter();
  const { user, loading } = useAuth();

  const [isOwner, setIsOwner] = useState(false);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const { data: patient } = await supabase
        .from("patients")
        .select("caregiver_id")
        .eq("id", patientId)
        .single();

      if (patient?.caregiver_id !== user!.id) {
        router.replace(`/patient/${patientId}`);
        return;
      }
      setIsOwner(true);

      const { data } = await supabase
        .from("patient_contributors")
        .select("id, email, contributor_id")
        .eq("patient_id", patientId)
        .order("invited_at");

      setContributors(data ?? []);
      setFetching(false);
    }
    load();
  }, [user, patientId, router]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(false);
    setInviting(true);

    const res = await fetch("/api/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId, email: inviteEmail }),
    });

    if (!res.ok) {
      const body = await res.json();
      setInviteError(body.error ?? "Failed to send invite.");
    } else {
      setInviteSuccess(true);
      setInviteEmail("");
      // Refresh list
      const { data } = await supabase
        .from("patient_contributors")
        .select("id, email, contributor_id")
        .eq("patient_id", patientId)
        .order("invited_at");
      setContributors(data ?? []);
    }
    setInviting(false);
  };

  if (loading || fetching || !isOwner) return null;

  return (
    <main className="min-h-svh bg-cream-50 flex flex-col items-center px-6 py-16 gap-10">
      <div className="w-full max-w-[520px] flex flex-col gap-8">
        <header className="flex flex-col gap-1">
          <button onClick={() => router.back()} className="text-sm text-muted font-light mb-2 text-left hover:text-ink transition-colors">
            ← Back
          </button>
          <h1 className="font-hand text-[28px] text-ink">Manage Contributors</h1>
          <p className="text-base font-light text-muted">
            Invite friends and family to add memories to this life story.
          </p>
        </header>

        <form onSubmit={handleInvite} className="flex gap-2">
          <Input
            type="email"
            placeholder="family@example.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
            className="flex-1"
          />
          <Button variant="primary" type="submit" size="sm" disabled={inviting}
            className="uppercase tracking-[0.18em] shrink-0">
            {inviting ? "Sending…" : "Invite"}
          </Button>
        </form>

        {inviteError && <p className="text-sm text-red-500 font-light">{inviteError}</p>}
        {inviteSuccess && <p className="text-sm text-green-600 font-light">Invite sent!</p>}

        {contributors.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="text-xs uppercase tracking-[0.18em] text-muted">Contributors</h2>
            {contributors.map((c) => (
              <div key={c.id} className="flex items-center justify-between bg-paper border border-cream-100 rounded-[6px] px-4 py-3">
                <span className="text-base font-light text-ink">{c.email}</span>
                <span className="text-xs text-muted">
                  {c.contributor_id ? "Joined" : "Invited"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
