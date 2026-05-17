import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { personId, patientId } = await req.json();

  // 1. Fetch person — return cached narration if it exists
  const { data: person } = await supabase
    .from("friends_family")
    .select("name, relation, narration")
    .eq("id", personId)
    .single();

  if (!person) return NextResponse.json({ narration: "" });
  if (person.narration) return NextResponse.json({ narration: person.narration });

  // 2. Fetch all memory context for this person
  const { data: memoryPeople } = await supabase
    .from("memory_people")
    .select("memories(summary, answer_who_is_this, answer_whats_going_on)")
    .eq("friend_family_id", personId);

  const memorySummaries = (memoryPeople ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((mp: any) => mp.memories?.summary || mp.memories?.answer_whats_going_on || mp.memories?.answer_who_is_this)
    .filter(Boolean)
    .join("\n- ");

  const userPrompt = [
    `Name: ${person.name}`,
    person.relation && `Relation to patient: ${person.relation}`,
    memorySummaries && `Memories:\n- ${memorySummaries}`,
  ]
    .filter(Boolean)
    .join("\n");

  // 3. Generate narration with Kimi
  const res = await fetch("https://api.moonshot.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.KIMI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "kimi-k2.6",
      thinking: { type: "disabled" },
      max_tokens: 150,
      messages: [
        {
          role: "system",
          content:
            "Generate a warm 2–3 sentence narrative introduction in second person for an Alzheimer's patient about someone in their life. " +
            "Use only the facts provided. Address the patient directly. " +
            "Example: 'This is your son John. He loves hiking with you and always makes you laugh. You would recognize his warm smile anywhere.'",
        },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[person-narration] Kimi error", res.status, err);
    return NextResponse.json({ narration: "" });
  }

  const data = await res.json();
  const narration: string = data.choices?.[0]?.message?.content ?? "";

  // 4. Cache in DB
  if (narration) {
    await supabase
      .from("friends_family")
      .update({ narration })
      .eq("id", personId)
      .eq("patient_id", patientId);
  }

  return NextResponse.json({ narration });
}
