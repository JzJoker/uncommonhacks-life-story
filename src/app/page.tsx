"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/Button";
import { SignOutButton } from "@/components/SignOutButton";

type Patient = { id: string; name: string; experience_mode: string; notes: string | null };

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [fetching, setFetching] = useState(true);
  const [isCaregiver, setIsCaregiver] = useState(false);

  useEffect(() => {
    if (!user) return;

    async function load() {
      // Patients this user owns as caregiver
      const { data: owned } = await supabase
        .from("patients")
        .select("id, name, experience_mode, notes")
        .eq("caregiver_id", user!.id)
        .order("created_at");

      // Patients this user is invited to as contributor
      const { data: contributed } = await supabase
        .from("patient_contributors")
        .select("patients(id, name, experience_mode, notes)")
        .eq("contributor_id", user!.id);

      const ownedList: Patient[] = owned ?? [];
      const invitedList: Patient[] = (contributed ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((r: any) => (Array.isArray(r.patients) ? r.patients[0] : r.patients))
        .filter(Boolean) as Patient[];

      const merged = [...ownedList];
      for (const p of invitedList) {
        if (!merged.find((m) => m.id === p.id)) merged.push(p);
      }

      setIsCaregiver(ownedList.length > 0);
      setPatients(merged);
      setFetching(false);
    }

    load();
  }, [user]);

  if (loading || fetching) return null;

  if (patients.length === 1) {
    router.replace(`/patient/${patients[0].id}`);
    return null;
  }

  return (
    <main className="min-h-svh bg-cream-50 flex flex-col items-center justify-center px-6 py-16 gap-10">
      <header className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-hand text-[36px] text-ink">Life Stories</h1>
        <p className="text-base font-light text-muted">Choose a life story to explore or contribute to.</p>
        <SignOutButton className="mt-1" />
      </header>

      {patients.length === 0 ? (
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-base font-light text-muted">No life stories yet.</p>
          <Link href="/onboarding">
            <Button variant="primary" className="uppercase tracking-[0.18em]">Create one</Button>
          </Link>
        </div>
      ) : (
        <div className="flex flex-wrap gap-4 justify-center max-w-2xl">
          {patients.map((p) => (
            <Link
              key={p.id}
              href={`/patient/${p.id}`}
              className="w-[280px] bg-paper border border-cream-100 rounded-[8px] p-6 flex flex-col gap-2 shadow-sm hover:shadow-md transition-shadow"
            >
              <span className="font-hand text-2xl text-ink">{p.name}</span>
              <span className="text-xs text-muted uppercase tracking-widest">
                {p.experience_mode === "self_paced" ? "Self-paced" : "Caregiver-guided"}
              </span>
              {p.notes && <span className="text-sm font-light text-muted line-clamp-2">{p.notes}</span>}
            </Link>
          ))}
        </div>
      )}

      {isCaregiver && patients.length > 0 && (
        <Link href="/onboarding">
          <Button variant="default" className="uppercase tracking-[0.18em]">Add Another Patient</Button>
        </Link>
      )}
    </main>
  );
}
