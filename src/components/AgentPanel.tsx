"use client";

import { useEffect } from "react";
import { Sparkle } from "lucide-react";
import { TypewriterText } from "@/components/TypewriterText";
import { speak, stopSpeaking, type SpeakOptions } from "@/lib/speak";

type AgentPanelProps = {
  message: string;
  actions?: React.ReactNode;
  className?: string;
  /** Set false to render the panel silently (no TTS). */
  speakMessage?: boolean;
  /** Override voice / model / settings for this surface (e.g. cloned voice). */
  voiceOptions?: SpeakOptions;
};

export function AgentPanel({
  message,
  actions,
  className = "",
  speakMessage = true,
  voiceOptions,
}: AgentPanelProps) {
  useEffect(() => {
    if (!speakMessage || !message?.trim()) return;
    speak(message, voiceOptions).catch((err) => {
      console.error("[AgentPanel] TTS failed", err);
    });
    return () => stopSpeaking();
  }, [message, speakMessage, voiceOptions]);

  return (
    <section
      aria-label="Narrator agent"
      className={["w-full flex flex-col gap-3", className].join(" ")}
    >
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-ink">
        <Sparkle size={12} fill="currentColor" />
        <span>Book Keeper</span>
      </div>
      <p className="font-sans font-light text-ink leading-snug text-base sm:text-lg">
        <TypewriterText>{message}</TypewriterText>
      </p>
      {actions && (
        <div className="flex flex-wrap gap-2 pt-1">{actions}</div>
      )}
    </section>
  );
}

export default AgentPanel;
