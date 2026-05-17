"use client";

import { Check, Copy } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Button from "./Button";

const INVITE_PATH = "/new-memory";
const FALLBACK_ORIGIN = "https://lifestory.app";

export default function InviteContributorsButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [canPortal, setCanPortal] = useState(false);
  const [inviteLink, setInviteLink] = useState(`${FALLBACK_ORIGIN}${INVITE_PATH}`);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCanPortal(true);
    setInviteLink(`${window.location.origin}${INVITE_PATH}`);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setMounted(false);
      return;
    }
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, [isOpen]);

  const close = useCallback(() => {
    setIsOpen(false);
    setCopied(false);
  }, []);

  const onCopy = useCallback(async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }, [inviteLink]);

  return (
    <>
      <Button
        text="Invite Contributors"
        onClick={() => setIsOpen(true)}
      />

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
              className={`relative z-10 mx-6 flex w-full max-w-[520px] flex-col gap-6 rounded-lg border border-stroke bg-paper p-8 shadow-xl transition-[opacity,transform] duration-200 ease-out ${
                mounted ? "opacity-100 scale-100" : "opacity-0 scale-95"
              }`}
            >
              <div className="flex flex-col gap-2">
                <h2
                  id="invite-modal-title"
                  className="font-hand text-3xl leading-tight text-ink"
                >
                  Invite Contributors
                </h2>
                <p className="text-sm font-light leading-relaxed text-muted">
                  Share this link with friends and family. When they open it,
                  they&apos;ll be able to add a photo and record a narration for
                  the journal.
                </p>
              </div>

              <div className="flex items-center gap-3 rounded border border-stroke bg-cream-50 px-3 py-3">
                <button
                  type="button"
                  onClick={onCopy}
                  aria-label={copied ? "Link copied" : "Copy invite link"}
                  className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded border border-stroke bg-paper text-ink transition-colors hover:bg-cream-25 active:scale-[0.97]"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
                <span className="truncate text-sm font-light text-ink">
                  {inviteLink}
                </span>
              </div>

              <p
                className={`text-xs font-light text-muted transition-opacity duration-200 ${
                  copied ? "opacity-100" : "opacity-0"
                }`}
                aria-live="polite"
              >
                Copied to clipboard.
              </p>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
