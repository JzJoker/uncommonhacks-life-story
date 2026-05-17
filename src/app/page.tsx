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
      {patients.length > 0 && (
        <header className="flex flex-col items-center gap-2 text-center">
          <h1 className="font-hand text-[36px] text-ink">Life Stories</h1>
          <p className="text-base font-light text-muted">Choose a life story to explore or contribute to.</p>
          <SignOutButton className="mt-1" />
        </header>
      )}

      {patients.length === 0 ? (
        <div className="flex flex-col items-center gap-0">
        <h1 className="font-hand text-[32px]  text-ink">
          Welcome to LifeStory.
        </h1>
        <div className="relative flex-none -skew-x-1 w-[360px] scale-90 cursor-pointer transition-transform duration-300 ">
          <div className="relative z-10 z-40 flex h-[507px] w-full items-start overflow-hidden rounded-r-3xl bg-gray-200">
            <div className="relative z-30 h-full w-10 bg-black/10">
              <div className="pointer-events-none absolute inset-0 flex justify-between">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-full w-px bg-white/10" />
                ))}
              </div>
            </div>
            <div className="relative grid h-full w-full place-items-center p-12 group-hover:scale-95">
              <div className="absolute top-1/2 left-1/2 z-3 w-[70%] -translate-x-1/2 -translate-y-1/2 bg-white p-3 pb-12 shadow-sm transition-transform duration-300 group-hover:-translate-x-[calc(50%-24px)] group-hover:rotate-4">
                <div className="relative aspect-square w-full  grid place-items-center overflow-hidden bg-gray-100">
                  <div className="w-[120px] aspect-square bg-white z-20  rounded-full relative" />
                  <div className="w-[130px] aspect-square bg-white z-20 absolute bottom-0 left-1/2 -translate-x-1/2  translate-y-1/2 rounded-t-full " />
                </div>
              </div>
            </div>
          </div>
          <div>
            {Array.from({ length: 8 }, (_, i) => i + 1).map((d, i) => (
              <div
                key={d}
                className="absolute inset-0 rounded-r-3xl border border-l-0 border-black/20 bg-white"
                style={{
                  transform: `translate(${i * 2}px, ${i * 2}px)`,
                  zIndex: 24 - i,
                }}
              />
            ))}
          </div>
        </div>
        <div className="flex justify-center pt-6">
          <Link href="/onboarding">
            <Button variant="primary" className="cursor-pointer">
              <span>Start your&nbsp;</span>
              <span className="font-hand text-[22px] ">Life Story</span>
            </Button>
          </Link>
        </div>
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
