"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Button from "./Button";
import { Button as FormButton } from "@/components/Button";
import { Input } from "@/components/Input";
import { supabase } from "@/lib/supabase";

type Contributor = { id: string; email: string; contributor_id: string | null };

export default function InviteContributorsButton({ patientId }: { patientId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [canPortal, setCanPortal] = useState(false);

  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  useEffect(() => {
    setCanPortal(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setMounted(false);
      return;
    }
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, [isOpen]);

  const loadContributors = useCallback(async () => {
    const { data } = await supabase
      .from("patient_contributors")
      .select("id, email, contributor_id")
      .eq("patient_id", patientId)
      .order("invited_at");
    setContributors(data ?? []);
  }, [patientId]);

  useEffect(() => {
    if (isOpen) loadContributors();
  }, [isOpen, loadContributors]);

  const close = useCallback(() => {
    setIsOpen(false);
    setInviteError(null);
    setInviteSuccess(false);
  }, []);

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
      await loadContributors();
    }
    setInviting(false);
  };

  return (
    <>
      <Button text="Invite Contributors" onClick={() => setIsOpen(true)} />

      {isOpen && canPortal &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-modal-title"
          >
            <button
              type="button"
              aria-label="Close invite dialog"
              className={`absolute inset-0 bg-ink/30 backdrop-blur-sm transition-opacity duration-200 ease-out ${
                mounted ? "opacity-100" : "opacity-0"
              }`}
              onClick={close}
            />

            <div
              className={`relative z-10 mx-6 flex w-full max-w-[520px] flex-col gap-8 rounded-lg border border-stroke bg-paper p-8 shadow-xl transition-[opacity,transform] duration-200 ease-out ${
                mounted ? "opacity-100 scale-100" : "opacity-0 scale-95"
              }`}
            >
              <header className="flex flex-col gap-1">
                <h2
                  id="invite-modal-title"
                  className="font-hand text-[28px] text-ink"
                >
                  Invite Contributors
                </h2>
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
                <FormButton
                  variant="primary"
                  type="submit"
                  size="sm"
                  disabled={inviting}
                  className="uppercase tracking-[0.18em] shrink-0"
                >
                  {inviting ? "Sending…" : "Invite"}
                </FormButton>
              </form>

              {inviteError && (
                <p className="text-sm font-light text-red-500">{inviteError}</p>
              )}
              {inviteSuccess && (
                <p className="text-sm font-light text-green-600">Invite sent!</p>
              )}

              {contributors.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h3 className="text-xs uppercase tracking-[0.18em] text-muted">
                    Contributors
                  </h3>
                  {contributors.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-[6px] border border-cream-100 bg-cream-50 px-4 py-3"
                    >
                      <span className="text-base font-light text-ink">{c.email}</span>
                      <span className="text-xs text-muted">
                        {c.contributor_id ? "Joined" : "Invited"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
