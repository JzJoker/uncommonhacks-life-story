import { NextRequest, NextResponse } from "next/server";

type SummarizeBody = {
  people: { name: string; relation: string | null }[];
  answers: {
    whoIsThis: string;
    whatsGoingOn: string;
    recognize: string;
    upset: string;
  };
};

export async function POST(req: NextRequest) {
  const { people, answers }: SummarizeBody = await req.json();

  const peopleDesc = people
    .filter((p) => p.name)
    .map((p) => (p.relation ? `${p.name} (${p.relation})` : p.name))
    .join(", ");

  const prompt = [
    `People in the photo: ${peopleDesc || "unknown"}`,
    answers.whoIsThis   && `Who they are: ${answers.whoIsThis}`,
    answers.whatsGoingOn && `What's happening: ${answers.whatsGoingOn}`,
    answers.recognize   && `What the patient would recognize: ${answers.recognize}`,
    answers.upset       && `Potential sensitivities (not shown to patient): ${answers.upset}`,
  ]
    .filter(Boolean)
    .join("\n");

  const res = await fetch("https://api.moonshot.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.KIMI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "kimi-k2.6",
      thinking: { type: "disabled" },
      max_tokens: 200,
      messages: [
        {
          role: "system",
          content:
            "You summarize memory photo descriptions for an Alzheimer's care app. " +
            "Write a concise factual summary (2–4 sentences) in third person, " +
            "based only on the information provided. Do not invent details. " +
            "The summary will be used as context for future narration generation.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[summarize] Moonshot error", res.status, err);
    return NextResponse.json({ error: err }, { status: 500 });
  }

  const data = await res.json();
  const summary: string = data.choices?.[0]?.message?.content ?? "";
  return NextResponse.json({ summary });
}
