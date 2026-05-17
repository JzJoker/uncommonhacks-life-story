"use client";

import { Check, Copy } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Button from "./Button";

const INVITE_PATH = "/new-memory";
const FALLBACK_ORIGIN = "https://lifestory.app";

export default function InviteContributorsButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [canPortal, setCanPortal] = useState(false);
  const [inviteLink, setInviteLink] = useState(`${FALLBACK_ORIGIN}${INVITE_PATH}`);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCanPortal(true);
    setInviteLink(`${window.location.origin}${INVITE_PATH}`);
  }, []);

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
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <button
              type="button"
              aria-label="Close invite dialog"
              className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
              onClick={close}
            />
            <div className="relative z-10 mx-6 flex w-full max-w-[520px] items-center gap-3 rounded-lg border border-stroke bg-paper p-4 shadow-xl">
              <button
                type="button"
                onClick={onCopy}
                aria-label={copied ? "Link copied" : "Copy invite link"}
                className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded border border-stroke bg-cream-50 text-ink transition-colors hover:bg-cream-25 active:scale-[0.97]"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
              <span className="truncate text-sm font-light text-ink">
                {inviteLink}
              </span>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
