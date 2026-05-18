"use client";

import { AudioLines } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BlurText } from "@/components/BlurText";

type RecordButtonProps = {
  onRecorded?: (audio: Blob) => void;
  className?: string;
};

type RecordingState = "idle" | "requesting" | "recording" | "denied";

const ACCENT = "#ff5a5a";

export function RecordButton({ onRecorded, className = "" }: RecordButtonProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const start = async () => {
    setState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType });
        onRecorded?.(blob);
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };
      rec.start();
      recorderRef.current = rec;
      setState("recording");
    } catch {
      setState("denied");
      setTimeout(() => setState("idle"), 2500);
    }
  };

  const stop = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setState("idle");
  };

  const isRecording = state === "recording";
  const isBusy = state === "requesting";

  const label =
    state === "recording"
      ? "Stop Recording"
      : state === "requesting"
        ? "Requesting microphone…"
        : state === "denied"
          ? "Microphone access denied"
          : "Start Voice Recording";

  return (
    <button
      type="button"
      onClick={isRecording ? stop : start}
      disabled={isBusy}
      aria-pressed={isRecording}
      className={[
        "inline-flex w-full items-center justify-center gap-2.5",
        "rounded-[4px] border px-4 py-3 text-base font-normal leading-none",
        "transition-colors duration-300 ease-out",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/30",
        "disabled:opacity-70 disabled:cursor-progress",
        isRecording
          ? `bg-[${ACCENT}] border-[${ACCENT}] text-ink`
          : "bg-ink border-ink text-[var(--color-primary-fg)]",
        className,
      ].join(" ")}
      style={
        isRecording
          ? { backgroundColor: ACCENT, borderColor: ACCENT }
          : undefined
      }
    >
      <BlurText>{label}</BlurText>
      {isRecording ? (
        <StopSquare className="text-ink" />
      ) : (
        <AudioLines
          size={24}
          strokeWidth={1.75}
          className={state === "denied" ? "text-muted" : "text-[#ff5a5a]"}
        />
      )}
    </button>
  );
}

function StopSquare({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={20}
      height={20}
      aria-hidden
      className={className}
    >
      <rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor" />
    </svg>
  );
}

export default RecordButton;
