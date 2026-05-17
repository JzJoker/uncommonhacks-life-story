type HistoryMessage = { role: string; content: string };

/** First name / label from attribution like "Janny, your daughter-in-law". */
export function attributionName(attribution: string): string {
  return attribution.split(",")[0]?.trim() ?? attribution;
}

/** Relation phrase after the comma, e.g. "your daughter-in-law". */
export function attributionRelation(attribution: string): string {
  if (!attribution.includes(",")) return "";
  return attribution.split(",").slice(1).join(",").trim();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** True if text names or clearly refers to the person in attribution. */
export function textMentionsAttributionPerson(text: string, attribution: string): boolean {
  const t = text.toLowerCase();
  if (!t.trim()) return false;

  const name = attributionName(attribution).toLowerCase();
  if (name.length >= 2 && new RegExp(`\\b${escapeRegExp(name)}\\b`, "i").test(text)) {
    return true;
  }

  if (!attribution.includes(",")) {
    return new RegExp(`\\b${escapeRegExp(attribution.trim())}\\b`, "i").test(text);
  }

  const relation = attributionRelation(attribution).replace(/^your\s+/i, "").trim().toLowerCase();
  if (!relation) return false;
  if (t.includes(relation)) return true;

  const normalized = relation.replace(/-/g, " ");
  if (normalized !== relation && t.includes(normalized)) return true;

  const words = relation.split(/[\s-]+/).filter((w) => w.length > 3);
  return words.some((w) => new RegExp(`\\b${escapeRegExp(w)}\\b`, "i").test(text));
}

/** True if a highlighted name matches the person who left the audio. */
export function highlightsIncludeAttributionPerson(
  highlightedNames: string[],
  attribution: string,
): boolean {
  const name = attributionName(attribution).toLowerCase();
  return highlightedNames.some((h) => {
    const hl = h.toLowerCase();
    return hl === name || hl.includes(name) || name.includes(hl);
  });
}

/** Recent turns were already about this person (for pronoun follow-ups). */
export function recentConversationAboutPerson(
  history: HistoryMessage[],
  attribution: string,
): boolean {
  return history
    .slice(-6)
    .some((m) => textMentionsAttributionPerson(m.content, attribution));
}

/**
 * True when the current exchange is about the person who left the audio —
 * not merely because they appear in a group photo answer.
 */
export function topicIsAboutAttributionPerson(
  question: string,
  answer: string,
  attribution: string,
  history: HistoryMessage[] = [],
  highlightedNames: string[] = [],
): boolean {
  if (textMentionsAttributionPerson(question, attribution)) return true;

  const substantive = extractSubstantiveAnswer(answer, attribution);
  const highlighted = highlightsIncludeAttributionPerson(highlightedNames, attribution);

  if (highlighted && textMentionsAttributionPerson(substantive, attribution)) {
    if (highlightedNames.length === 1) return true;
    return (
      textMentionsAttributionPerson(question, attribution) ||
      recentConversationAboutPerson(history, attribution)
    );
  }

  if (!textMentionsAttributionPerson(substantive, attribution)) {
    return (
      recentConversationAboutPerson(history, attribution) &&
      /\b(she|he|they|her|him|them|this|that|who|what|where|when|why|how|tell me)\b/i.test(
        question,
      )
    );
  }

  return (
    recentConversationAboutPerson(history, attribution) ||
    /\b(this is|that's|here is|here's)\s+/i.test(substantive)
  );
}

/** True if the assistant already offered the personal audio message in this thread. */
export function audioMessageAlreadyOffered(
  history: HistoryMessage[],
  attribution: string,
): boolean {
  const name = attributionName(attribution).toLowerCase();
  return history.some(
    (m) =>
      m.role === "assistant" &&
      /\b(hear|listen to|play)\b[\s\S]{0,80}\b(message|recording|voice)\b/i.test(m.content) &&
      (!name || m.content.toLowerCase().includes(name)),
  );
}

/** True if a paragraph/sentence is offering the personal audio message. */
export function paragraphOffersAudioMessage(text: string, attribution?: string): boolean {
  const t = text.toLowerCase();
  const name = attribution ? attributionName(attribution).toLowerCase() : "";
  if (
    /\b(personal )?audio message\b/i.test(t) &&
    /\b(hear|listen|would you like)\b/i.test(t) &&
    (!name || t.includes(name))
  ) {
    return true;
  }
  if (
    /\bleft (?:a |an )?(?:personal )?(?:audio )?message\b/i.test(t) &&
    (!name || t.includes(name))
  ) {
    return true;
  }
  return (
    /\b(hear|listen to|play)\b[\s\S]{0,80}\b(message|recording|voice)\b/i.test(t) &&
    (!name || t.includes(name))
  );
}

/** True if this assistant text is offering the personal audio message. */
export function answerOffersAudioMessage(text: string, attribution: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (paragraphOffersAudioMessage(t, attribution)) return true;
  return t
    .split(/\n\n+/)
    .some((p) => paragraphOffersAudioMessage(p.trim(), attribution));
}

/** Strip paragraphs that only offer the personal audio message. */
export function extractSubstantiveAnswer(text: string, attribution?: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const paragraphs = trimmed.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  const kept = paragraphs.filter((p) => !paragraphOffersAudioMessage(p, attribution));
  return kept.join("\n\n").trim();
}

/** True when the text is only (or almost only) an audio-message offer. */
export function isAudioMessageOfferOnly(text: string, attribution?: string): boolean {
  const substantive = extractSubstantiveAnswer(text, attribution);
  return substantive.length < 40;
}

/** User is asking to hear (or skip) the message — don't append another offer. */
export function userAskedAboutAudioMessage(question: string): boolean {
  return /\b(hear|listen|play|message|recording|voice|audio)\b/i.test(question);
}

/** User said yes (or similar) to hearing the offered personal message. */
export function userAffirmsAudioPlayback(
  question: string,
  history: HistoryMessage[],
  attribution?: string,
): boolean {
  const trimmed = question.trim();
  if (/^(yes|yeah|yep|yup|sure|ok|okay|please|go ahead|absolutely|definitely)[!.?]*$/i.test(trimmed)) {
    return true;
  }
  const q = trimmed.toLowerCase();
  if (!/\b(yes|yeah|sure|ok|okay|please|go ahead|play|hear|listen)\b/i.test(q)) {
    return false;
  }
  if (attribution && audioMessageAlreadyOffered(history, attribution)) return true;
  return /\b(play|hear it|listen to it|the message)\b/i.test(q);
}

/** Build a short offer appended after the main answer. */
export function buildAudioMessageOffer(attribution: string): string {
  const name = attributionName(attribution);
  const relation = attribution.includes(",")
    ? attribution.split(",").slice(1).join(",").trim()
    : "";
  if (relation) {
    return `Would you like to hear the message ${name}, ${relation}, left for you?`;
  }
  return `Would you like to hear the message ${name} left for you?`;
}

/**
 * After the user's question is fully answered, append an audio offer when appropriate.
 * Skips if still inviting a different follow-up (e.g. "I can check the database").
 */
export function shouldAppendAudioOffer(
  answer: string,
  history: HistoryMessage[],
  hasAudioMessage: boolean,
  attribution: string | undefined,
  question: string,
  invitesResponse: boolean,
  highlightedNames: string[] = [],
): boolean {
  if (!hasAudioMessage || !attribution?.trim()) return false;
  if (userAskedAboutAudioMessage(question)) return false;
  const substantive = extractSubstantiveAnswer(answer, attribution);
  if (!substantive.trim() || isAudioMessageOfferOnly(answer, attribution)) return false;
  if (
    !topicIsAboutAttributionPerson(question, substantive, attribution, history, highlightedNames)
  ) {
    return false;
  }
  if (answerOffersAudioMessage(answer, attribution)) return false;
  if (audioMessageAlreadyOffered([...history, { role: "assistant", content: answer }], attribution)) {
    return false;
  }
  // Another follow-up is still in progress — wait for that topic to finish.
  if (invitesResponse && !answerOffersAudioMessage(answer, attribution)) return false;
  return true;
}
