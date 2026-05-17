"use client";

// Type-only import — stripped at compile time, so the server-only module
// isn't pulled into the client bundle.
import type { VoiceSettings } from "@/lib/elevenlabs";

export type SpeakOptions = {
  voiceId?: string;
  modelId?: string;
  voiceSettings?: VoiceSettings;
  signal?: AbortSignal;
};

type Session = {
  controller: AbortController;
  audio?: HTMLAudioElement;
  url?: string;
};

let current: Session | null = null;

function teardown(session: Session) {
  if (!session.controller.signal.aborted) session.controller.abort();
  if (session.audio) {
    session.audio.pause();
    session.audio.removeAttribute("src");
    session.audio.load();
  }
  if (session.url) URL.revokeObjectURL(session.url);
}

export function stopSpeaking() {
  if (!current) return;
  const s = current;
  current = null;
  teardown(s);
}

export async function speak(text: string, opts: SpeakOptions = {}): Promise<void> {
  const trimmed = text?.trim();
  if (!trimmed) return;

  // Register THIS session as the active one before any await, so a concurrent
  // speak() call can supersede it during fetch-in-flight.
  stopSpeaking();
  const session: Session = { controller: new AbortController() };
  current = session;

  if (opts.signal) {
    if (opts.signal.aborted) {
      if (current === session) current = null;
      return;
    }
    opts.signal.addEventListener(
      "abort",
      () => session.controller.abort(),
      { once: true },
    );
  }

  let res: Response;
  try {
    res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: trimmed,
        voiceId: opts.voiceId,
        modelId: opts.modelId,
        voiceSettings: opts.voiceSettings,
      }),
      signal: session.controller.signal,
    });
  } catch (err) {
    if (current === session) current = null;
    if ((err as Error).name === "AbortError") return;
    throw err;
  }

  // Superseded while fetching — drop the response silently.
  if (current !== session) return;

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    if (current === session) current = null;
    if (
      res.status === 502 &&
      (detail.includes("ELEVENLABS_API_KEY") || detail.includes("not set"))
    ) {
      console.warn("[speak] TTS unavailable — add ELEVENLABS_API_KEY to .env.local");
      return;
    }
    throw new Error(`TTS request failed (${res.status}): ${detail}`);
  }

  const blob = await res.blob();
  if (current !== session) return;

  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  session.audio = audio;
  session.url = url;

  await new Promise<void>((resolve, reject) => {
    const finish = (settle: () => void) => {
      if (current === session) {
        current = null;
        teardown(session);
      }
      settle();
    };
    audio.onended = () => finish(resolve);
    audio.onerror = () => finish(() => reject(new Error("Audio playback failed")));
    session.controller.signal.addEventListener(
      "abort",
      () => finish(resolve),
      { once: true },
    );
    audio.play().catch((err) => finish(() => reject(err)));
  });
}
