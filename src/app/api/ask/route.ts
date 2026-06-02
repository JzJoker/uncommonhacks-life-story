import { NextRequest, NextResponse } from "next/server";
import { answerInvitesResponse } from "@/lib/answerInvitesResponse";
import {
  audioMessageAlreadyOffered,
  buildAudioMessageOffer,
  extractSubstantiveAnswer,
  isAudioMessageOfferOnly,
  shouldAppendAudioOffer,
  userAffirmsAudioPlayback,
} from "@/lib/audioMessageOffer";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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

type PhotoPerson = { name: string; position: "left" | "center" | "right" };

async function getPeopleInPhoto(memoryId: string): Promise<PhotoPerson[]> {
  const { data: rows } = await supabase
    .from("memory_people")
    .select("name, bbox_x, bbox_w, friends_family(name), memories!inner(image_width)")
    .eq("memory_id", memoryId);

  if (!rows || rows.length === 0) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return rows.map((row: any) => {
    const iW: number = row.memories?.image_width ?? 1;
    const centerX = row.bbox_x + row.bbox_w / 2;
    const position: PhotoPerson["position"] =
      centerX < iW / 3 ? "left" : centerX > (2 * iW) / 3 ? "right" : "center";
    const name: string = row.name || row.friends_family?.name || "Unknown person";
    return { name, position };
  });
}

function normalizePhotoPosition(word: string): PhotoPerson["position"] | null {
  if (/left/i.test(word)) return "left";
  if (/right/i.test(word)) return "right";
  if (/center|centre|middle/i.test(word)) return "center";
  return null;
}

function isPhotoPersonQuestion(question: string): boolean {
  const q = question.toLowerCase();
  if (/\b(clear|remove|whole photo|everyone|all of them)\b/.test(q)) return false;
  if (/\b(who|which|where)\b/.test(q) && /\b(left|right|center|centre|middle|photo|picture)\b/.test(q)) {
    return true;
  }
  if (/\b(who is|who's|tell me about|point to|show me)\b/.test(q)) return true;
  return false;
}

function addHighlight(list: Highlight[], h: Highlight) {
  if (list.some((x) => x.name.toLowerCase() === h.name.toLowerCase())) return;
  list.push(h);
}

function inferPeopleToHighlight(
  question: string,
  answer: string,
  people: PhotoPerson[],
): string[] {
  const q = question.toLowerCase();
  const a = answer.toLowerCase();
  const byNameLength = [...people].sort((x, y) => y.name.length - x.name.length);
  const names = new Set<string>();

  if (/\b(everyone|everybody|all of them|who is in|who are in|who's in|people in)\b/.test(q)) {
    return people.map((p) => p.name);
  }

  for (const p of byNameLength) {
    if (q.includes(p.name.toLowerCase())) names.add(p.name);
  }

  const posMatch = q.match(/\b(left|right|center|centre|middle)\b/);
  if (posMatch && /\b(who|which|where)\b/.test(q)) {
    const pos = normalizePhotoPosition(posMatch[1]);
    const found = pos ? people.find((p) => p.position === pos) : undefined;
    if (found) names.add(found.name);
  }

  for (const p of byNameLength) {
    if (a.includes(p.name.toLowerCase())) names.add(p.name);
  }

  if (names.size === 0) {
    const leadName = answer.match(/^([A-Z][a-z]+)\b/);
    if (leadName) {
      const found = people.find(
        (p) => p.name.toLowerCase() === leadName[1].toLowerCase(),
      );
      if (found) names.add(found.name);
    }
  }

  return [...names];
}

/** Meta text the model sometimes emits after calling the listen tool. */
function isListeningMetaMessage(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return true;
  return (
    t.includes("listening") &&
    (t.includes("response") || t.includes("reply") || t.includes("answer"))
  );
}

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
        "Get all people visible in the current photo with their names and positions (left/center/right). Use when the user asks who is where. Then call highlight_person or highlight_people for everyone you will discuss.",
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
        "REQUIRED for each person you name or describe in the current photo (internal — never mention this to the user). Call once per person before describing them. If you talk about several people, call this for each one (or use highlight_people). The tool returns facts; reply naturally.",
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
      name: "highlight_people",
      description:
        "Highlight multiple people at once when your reply discusses several people in the current photo. Prefer this over multiple highlight_person calls when naming more than one person.",
      parameters: {
        type: "object",
        properties: {
          names: {
            type: "array",
            items: { type: "string" },
            description: "Exact names of everyone you are talking about",
          },
          memory_id: { type: "string", description: "The memory/photo ID" },
        },
        required: ["names", "memory_id"],
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
  {
    type: "function",
    function: {
      name: "listen",
      description:
        "Internal: signal that the app should listen for the user's reply. Call in the same turn when you ask a question or offer something. Never tell the user you are listening or waiting — just ask naturally.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "play_audio_message",
      description:
        "Play the personal audio message left by a family member or friend for this memory. Call when the user says yes to hearing the message. Use the current photo memory_id from the system prompt.",
      parameters: {
        type: "object",
        properties: {
          memory_id: {
            type: "string",
            description: "The current photo memory_id (from the system prompt)",
          },
        },
      },
    },
  },
];

type ToolContext = { patientId: string; currentMemoryId?: string };

async function executeTool(
  name: string,
  args: Record<string, string>,
  ctx: ToolContext,
): Promise<{
  result: string;
  highlight?: Highlight;
  highlights?: Highlight[];
  clearHighlight?: boolean;
  audioUrl?: string;
  shouldListen?: boolean;
}> {
  const { patientId, currentMemoryId } = ctx;
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
    const people = await getPeopleInPhoto(args.memory_id);
    return { result: JSON.stringify(people) };
  }

  if (name === "highlight_person") {
    const { name: personName, memory_id: memoryId } = args;

    const personSelect = `
      bbox_x, bbox_y, bbox_w, bbox_h, name, friend_family_id,
      friends_family ( name, relation ),
      memories!inner (
        image_width, image_height,
        summary, answer_who_is_this, answer_whats_going_on, answer_recognize
      )
    `;

    // Try direct name match first
    let { data: rows } = await supabase
      .from("memory_people")
      .select(personSelect)
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
          .select(personSelect)
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
    const displayName: string =
      row.name || row.friends_family?.name || personName;
    const highlight: Highlight = {
      name: displayName,
      bbox_x: row.bbox_x,
      bbox_y: row.bbox_y,
      bbox_w: row.bbox_w,
      bbox_h: row.bbox_h,
      imageWidth: iW,
      imageHeight: iH,
    };

    let otherMemories: unknown[] = [];
    if (row.friend_family_id) {
      const { data } = await supabase
        .from("memory_people")
        .select("memories(summary, answer_who_is_this, answer_whats_going_on)")
        .eq("friend_family_id", row.friend_family_id)
        .neq("memory_id", memoryId)
        .limit(3);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      otherMemories = (data ?? []).map((mp: any) => mp.memories).filter(Boolean);
    }

    return {
      result: JSON.stringify({
        highlighted: displayName,
        relation: row.friends_family?.relation ?? null,
        in_this_photo: {
          summary: row.memories?.summary ?? null,
          who_is_this: row.memories?.answer_who_is_this ?? null,
          whats_going_on: row.memories?.answer_whats_going_on ?? null,
          recognize: row.memories?.answer_recognize ?? null,
        },
        other_memories: otherMemories,
        instruction:
          "Reply with warm sentences about the people you are discussing — who they are, what is happening here. " +
          "Do NOT mention highlighting, tools, boxes, the screen, or 'there you go'. Speak naturally. " +
          "Use only the facts above; if sparse, say what you know warmly without inventing details.",
      }),
      highlight,
    };
  }

  if (name === "highlight_people") {
    const memoryId = args.memory_id || currentMemoryId;
    let names: string[] = [];
    if (Array.isArray(args.names)) {
      names = args.names;
    } else if (typeof args.names === "string") {
      try {
        names = JSON.parse(args.names);
      } catch {
        names = args.names.split(",").map((n) => n.trim()).filter(Boolean);
      }
    }

    if (!memoryId || names.length === 0) {
      return { result: JSON.stringify({ error: "memory_id and names required" }) };
    }

    const resolved: Highlight[] = [];
    const facts: { name: string; relation: string | null }[] = [];

    for (const personName of names) {
      const { highlight, result } = await executeTool(
        "highlight_person",
        { name: personName, memory_id: memoryId },
        ctx,
      );
      if (highlight) {
        resolved.push(highlight);
        try {
          const parsed = JSON.parse(result) as { relation?: string | null };
          facts.push({ name: highlight.name, relation: parsed.relation ?? null });
        } catch {
          facts.push({ name: highlight.name, relation: null });
        }
      }
    }

    if (resolved.length === 0) {
      return { result: JSON.stringify({ error: "No people found in this photo" }) };
    }

    return {
      result: JSON.stringify({
        highlighted: resolved.map((h) => h.name),
        people: facts,
        instruction:
          "Reply with warm sentences about all of these people together. Do NOT mention highlighting or tools.",
      }),
      highlights: resolved,
    };
  }

  if (name === "clear_highlight") {
    return { result: JSON.stringify({ cleared: true }), clearHighlight: true };
  }

  if (name === "listen") {
    return { result: JSON.stringify({ listening: true }), shouldListen: true };
  }

  if (name === "play_audio_message") {
    const memoryId = args.memory_id || currentMemoryId;
    if (!memoryId) {
      return { result: JSON.stringify({ error: "No memory ID for audio playback" }) };
    }

    const { data, error } = await supabaseAdmin
      .from("memories")
      .select("message_audio_url")
      .eq("id", memoryId)
      .maybeSingle();

    if (error) {
      console.error("[ask] play_audio_message", error);
    }

    if (!data?.message_audio_url) {
      return { result: JSON.stringify({ error: "No audio message for this memory" }) };
    }

    return { result: JSON.stringify({ playing: true, url: data.message_audio_url }), audioUrl: data.message_audio_url };
  }

  return { result: JSON.stringify({ error: "Unknown tool" }) };
}

export async function POST(req: NextRequest) {
  const {
    question,
    personId,
    patientId,
    currentMemoryId,
    hasAudioMessage,
    attribution,
    history = [],
  }: {
    question: string;
    personId: string;
    patientId: string;
    currentMemoryId?: string;
    hasAudioMessage?: boolean;
    attribution?: string;
    history: Message[];
  } = await req.json();

  let systemSuffix = currentMemoryId
    ? ` The current photo being viewed has memory_id: ${currentMemoryId}.`
    : "";

  const audioAlreadyOffered =
    hasAudioMessage && attribution
      ? audioMessageAlreadyOffered(history, attribution)
      : false;

  if (hasAudioMessage && attribution) {
    systemSuffix +=
      ` This photo has a personal audio message recorded by ${attribution}.` +
      " The app will offer that message only when the patient is asking about that person — do not mention, describe, or ask about the audio message in your words." +
      " Always answer their current question fully in every reply (facts, people in the photo, etc.)." +
      " Never send a reply that is only about the audio message." +
      (audioAlreadyOffered
        ? " They were already offered the message earlier in this conversation."
        : " After you answer, the app will ask if they want to hear it; call the listen tool only when you need their yes/no on something else you asked.") +
      " If they say yes to hearing the message, call play_audio_message. If they decline, acknowledge warmly.";
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages: any[] = [
    {
      role: "system",
      content:
        "You are a warm, gentle storyteller helping an Alzheimer's patient recall memories about their family. " +
        "Use your tools silently to look up facts before answering. Keep answers short (2–4 sentences), warm, and grounded " +
        "only in real information from the database. Never invent details. " +
        "NEVER break the fourth wall: do not mention tools, highlighting, boxes, the interface, listening mode, or what you are doing behind the scenes. " +
        "Never say 'There you go', 'I have highlighted', 'on the left/right side of the photo', or similar. " +
        "Whenever you talk about people in the current photo, call highlight_person for each one, or highlight_people with all their names, in that same turn (before your reply). " +
        "When pointing someone out, describe them naturally as part of the memory, e.g. 'This is Janny, your daughter-in-law — she is smiling with everyone here.' " +
        "When you ask a question or offer to do something for the user, call the listen tool in that same turn so they can reply by voice. " +
        "The person you are helping has Alzheimer's. If they ask the same question again, answer warmly and fully as if for the first time. " +
        "Never acknowledge that they are repeating themselves, never say you already told them, and never refer to having answered before." +
        systemSuffix,
    },
    ...history,
    { role: "user", content: question },
  ];

  let highlightData: Highlight[] = [];
  let audioUrlData: string | null = null;
  let shouldListenData = false;
  let assistantPrompt = "";
  let substantiveReply = "";
  let askedQuestion = false;
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
      return NextResponse.json({ answer: "Sorry, I couldn't find that information right now.", highlights: [] });
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    const msg = choice?.message;

    if (!msg) break;
    messages.push(msg);

    if (msg.content?.trim()) {
      const content = msg.content.trim();
      assistantPrompt = content;
      const body = extractSubstantiveAnswer(content, attribution);
      if (
        body &&
        !isListeningMetaMessage(body) &&
        !isAudioMessageOfferOnly(body, attribution) &&
        body.length >= substantiveReply.length
      ) {
        substantiveReply = body;
      }
      if (!isListeningMetaMessage(content) && answerInvitesResponse(content)) {
        askedQuestion = true;
      }
    }

    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      let answer = msg.content ?? "";
      if (shouldListenData && assistantPrompt && isListeningMetaMessage(answer)) {
        answer = assistantPrompt;
      } else if (
        askedQuestion &&
        assistantPrompt &&
        !isListeningMetaMessage(assistantPrompt) &&
        (!answer.trim() || isListeningMetaMessage(answer) || !answerInvitesResponse(answer))
      ) {
        // Keep the substantive reply when the final turn is only meta or a short follow-up.
        answer = assistantPrompt;
      }
      if (
        attribution &&
        isAudioMessageOfferOnly(answer, attribution) &&
        substantiveReply
      ) {
        answer = substantiveReply;
      } else if (!answer.trim() && substantiveReply) {
        answer = substantiveReply;
      } else {
        const body = extractSubstantiveAnswer(answer, attribution);
        if (body && isAudioMessageOfferOnly(answer, attribution)) {
          answer = body;
        }
      }
      const invitesResponse = answerInvitesResponse(answer);
      if (
        shouldAppendAudioOffer(
          answer,
          history,
          !!hasAudioMessage,
          attribution,
          question,
          invitesResponse,
          highlightData.map((h) => h.name),
        )
      ) {
        const offer = buildAudioMessageOffer(attribution!);
        answer = `${answer.trim()}\n\n${offer}`;
        askedQuestion = true;
      }

      if (
        !audioUrlData &&
        hasAudioMessage &&
        currentMemoryId &&
        userAffirmsAudioPlayback(question, history, attribution)
      ) {
        const { audioUrl } = await executeTool(
          "play_audio_message",
          { memory_id: currentMemoryId },
          { patientId, currentMemoryId },
        );
        if (audioUrl) audioUrlData = audioUrl;
      }

      const shouldListen =
        !audioUrlData &&
        (shouldListenData || askedQuestion || answerInvitesResponse(answer));

      if (highlightData.length === 0 && currentMemoryId && isPhotoPersonQuestion(question)) {
        const people = await getPeopleInPhoto(currentMemoryId);
        const names = inferPeopleToHighlight(question, answer, people);
        for (const name of names) {
          const { highlight } = await executeTool(
            "highlight_person",
            { name, memory_id: currentMemoryId },
            { patientId, currentMemoryId },
          );
          if (highlight) addHighlight(highlightData, highlight);
        }
      }

      return NextResponse.json({
        answer,
        highlights: highlightData,
        audioUrl: audioUrlData,
        shouldListen,
      });
    }

    for (const toolCall of msg.tool_calls) {
      const toolName = toolCall.function.name;
      const toolArgs = JSON.parse(toolCall.function.arguments || "{}");
      const { result, highlight, highlights, clearHighlight, audioUrl, shouldListen } =
        await executeTool(toolName, toolArgs, { patientId, currentMemoryId });
      if (highlight) addHighlight(highlightData, highlight);
      if (highlights) highlights.forEach((h) => addHighlight(highlightData, h));
      if (clearHighlight) highlightData = [];
      if (audioUrl) audioUrlData = audioUrl;
      if (shouldListen) shouldListenData = true;
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: result,
      });
    }
  }

  return NextResponse.json({
    answer: "Sorry, I couldn't find that information right now.",
    highlights: highlightData,
    audioUrl: audioUrlData,
    shouldListen: false,
  });
}
