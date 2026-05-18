import { NextRequest } from "next/server";
import { streamTTS, type VoiceSettings } from "@/lib/elevenlabs";

export const runtime = "nodejs";

type Body = {
  text?: unknown;
  voiceId?: unknown;
  modelId?: unknown;
  voiceSettings?: unknown;
};

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.text !== "string" || !body.text.trim()) {
    return Response.json({ error: "Missing 'text'" }, { status: 400 });
  }

  try {
    const stream = await streamTTS({
      text: body.text,
      voiceId: typeof body.voiceId === "string" ? body.voiceId : undefined,
      modelId: typeof body.modelId === "string" ? body.modelId : undefined,
      voiceSettings:
        body.voiceSettings && typeof body.voiceSettings === "object"
          ? (body.voiceSettings as VoiceSettings)
          : undefined,
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "TTS failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
