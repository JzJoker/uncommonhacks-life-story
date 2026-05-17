import "server-only";

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";

export type VoiceSettings = {
  stability?: number;
  similarity_boost?: number;
  style?: number;
  use_speaker_boost?: boolean;
};

export type TTSRequest = {
  text: string;
  voiceId?: string;
  modelId?: string;
  voiceSettings?: VoiceSettings;
};

const DEFAULT_VOICE_SETTINGS: Required<VoiceSettings> = {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0,
  use_speaker_boost: true,
};

function requireApiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY is not set");
  return key;
}

function resolveVoiceId(override?: string): string {
  return override ?? process.env.ELEVENLABS_VOICE_ID ?? "EXAVITQu4vr4xnSDxMaL";
}

function resolveModelId(override?: string): string {
  return override ?? process.env.ELEVENLABS_MODEL_ID ?? "eleven_turbo_v2_5";
}

export async function streamTTS(req: TTSRequest): Promise<ReadableStream<Uint8Array>> {
  const apiKey = requireApiKey();
  const voiceId = resolveVoiceId(req.voiceId);
  const modelId = resolveModelId(req.modelId);

  const res = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${voiceId}/stream`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: req.text,
      model_id: modelId,
      voice_settings: { ...DEFAULT_VOICE_SETTINGS, ...(req.voiceSettings ?? {}) },
    }),
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    throw new Error(`ElevenLabs ${res.status}: ${detail || res.statusText}`);
  }

  return res.body;
}
