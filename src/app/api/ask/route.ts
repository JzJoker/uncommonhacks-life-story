import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type Message = { role: string; content: string };

export type Highlight = {
  name: string;
  bbox_x: number;
  bbox_y: number;
  bbox_w: number;
  bbox_h: number;
  imageWidth: number;
  imageHeight: number;
};

const TOOLS = [
  {
    type: "function",
    function: {
      name: "list_people",
      description: "List all people in the patient's life story with their names and relations",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_person_memories",
      description: "Get memories and facts about a specific person by their name",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "The person's name" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_people_in_photo",
      description:
        "Get all people visible in the current photo with their names and positions (left/center/right). Use this when the user asks about who is where in the photo. After calling this, if you need to highlight someone, call highlight_person.",
      parameters: {
        type: "object",
        properties: {
          memory_id: { type: "string", description: "The memory/photo ID" },
        },
        required: ["memory_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "highlight_person",
      description:
        "Highlight a specific person in the current photo by drawing a glow box around them. Call this after get_people_in_photo when the user asks about someone at a position.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "The exact name of the person to highlight" },
          memory_id: { type: "string", description: "The memory/photo ID" },
        },
        required: ["name", "memory_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "clear_highlight",
      description:
        "Remove any highlight overlay from the current photo. Call this when the user asks a question that is no longer about a specific person's position, or when they want to see the full photo without any highlight.",
      parameters: { type: "object", properties: {} },
    },
  },
];

async function executeTool(
  name: string,
  args: Record<string, string>,
  patientId: string,
): Promise<{ result: string; highlight?: Highlight; clearHighlight?: boolean }> {
  if (name === "list_people") {
    const { data } = await supabase
      .from("friends_family")
      .select("name, relation")
      .eq("patient_id", patientId);
    return { result: JSON.stringify(data ?? []) };
  }

  if (name === "get_person_memories") {
    const personName = args.name;
    const { data: person } = await supabase
      .from("friends_family")
      .select("id, relation")
      .eq("patient_id", patientId)
      .ilike("name", personName)
      .maybeSingle();

    if (!person) return { result: JSON.stringify({ error: "Person not found" }) };

    const { data: memoryPeople } = await supabase
      .from("memory_people")
      .select("memories(summary, answer_who_is_this, answer_whats_going_on, answer_recognize)")
      .eq("friend_family_id", person.id);

    return {
      result: JSON.stringify({
        relation: person.relation,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        memories: (memoryPeople ?? []).map((mp: any) => mp.memories).filter(Boolean),
      }),
    };
  }

  if (name === "get_people_in_photo") {
    const memoryId = args.memory_id;
    const { data: rows } = await supabase
      .from("memory_people")
      .select("name, bbox_x, bbox_y, bbox_w, bbox_h, friends_family(name), memories!inner(image_width, image_height)")
      .eq("memory_id", memoryId);

    if (!rows || rows.length === 0) return { result: JSON.stringify([]) };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const people = rows.map((row: any) => {
      const iW: number = row.memories?.image_width ?? 1;
      const centerX = row.bbox_x + row.bbox_w / 2;
      const position =
        centerX < iW / 3 ? "left" : centerX > (2 * iW) / 3 ? "right" : "center";
      // name may be null if the person was linked only via friend_family_id; fall back to friends_family.name
      const displayName: string = row.name || row.friends_family?.name || "Unknown person";
      return { name: displayName, position };
    });

    return { result: JSON.stringify(people) };
  }

  if (name === "highlight_person") {
    const { name: personName, memory_id: memoryId } = args;

    // Try direct name match first
    let { data: rows } = await supabase
      .from("memory_people")
      .select("bbox_x, bbox_y, bbox_w, bbox_h, memories!inner(image_width, image_height)")
      .eq("memory_id", memoryId)
      .ilike("name", personName);

    // Fall back to matching via friends_family.name (handles null name in memory_people)
    if (!rows || rows.length === 0) {
      const { data: ff } = await supabase
        .from("friends_family")
        .select("id")
        .ilike("name", personName)
        .maybeSingle();

      if (ff) {
        ({ data: rows } = await supabase
          .from("memory_people")
          .select("bbox_x, bbox_y, bbox_w, bbox_h, memories!inner(image_width, image_height)")
          .eq("memory_id", memoryId)
          .eq("friend_family_id", ff.id));
      }
    }

    if (!rows || rows.length === 0) {
      return { result: JSON.stringify({ error: "Person not found in this photo" }) };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = rows[0] as any;
    const iW: number = row.memories?.image_width ?? 0;
    const iH: number = row.memories?.image_height ?? 0;
    const highlight: Highlight = {
      name: personName,
      bbox_x: row.bbox_x,
      bbox_y: row.bbox_y,
      bbox_w: row.bbox_w,
      bbox_h: row.bbox_h,
      imageWidth: iW,
      imageHeight: iH,
    };

    return { result: JSON.stringify({ highlighted: personName }), highlight };
  }

  if (name === "clear_highlight") {
    return { result: JSON.stringify({ cleared: true }), clearHighlight: true };
  }

  return { result: JSON.stringify({ error: "Unknown tool" }) };
}

export async function POST(req: NextRequest) {
  const {
    question,
    personId,
    patientId,
    currentMemoryId,
    history = [],
  }: {
    question: string;
    personId: string;
    patientId: string;
    currentMemoryId?: string;
    history: Message[];
  } = await req.json();

  const systemSuffix = currentMemoryId
    ? ` The current photo being viewed has memory_id: ${currentMemoryId}.`
    : "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages: any[] = [
    {
      role: "system",
      content:
        "You are a warm, gentle assistant helping an Alzheimer's patient recall memories about their family. " +
        "Use your tools to look up facts before answering. Keep answers short (2–4 sentences), warm, and grounded " +
        "only in real information from the database. Never invent details." +
        systemSuffix,
    },
    ...history,
    { role: "user", content: question },
  ];

  let highlightData: Highlight | null = null;
  let iterations = 0;

  while (iterations < 5) {
    iterations++;

    const res = await fetch("https://api.moonshot.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.KIMI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "kimi-k2.6",
        thinking: { type: "disabled" },
        max_tokens: 300,
        tools: TOOLS,
        tool_choice: "auto",
        messages,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[ask] Kimi error", res.status, err);
      return NextResponse.json({ answer: "Sorry, I couldn't find that information right now.", highlight: null });
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    const msg = choice?.message;

    if (!msg) break;
    messages.push(msg);

    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      return NextResponse.json({ answer: msg.content ?? "", highlight: highlightData });
    }

    for (const toolCall of msg.tool_calls) {
      const toolName = toolCall.function.name;
      const toolArgs = JSON.parse(toolCall.function.arguments || "{}");
      const { result, highlight, clearHighlight } = await executeTool(toolName, toolArgs, patientId);
      if (highlight) highlightData = highlight;
      if (clearHighlight) highlightData = null;
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: result,
      });
    }
  }

  return NextResponse.json({ answer: "Sorry, I couldn't find that information right now.", highlight: null });
}
