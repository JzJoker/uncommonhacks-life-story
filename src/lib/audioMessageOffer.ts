type HistoryMessage = { role: string; content: string };

/** First name / label from attribution like "Janny, your daughter-in-law". */
export function attributionName(attribution: string): string {
  return attribution.split(",")[0]?.trim() ?? attribution;
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

/** True if this assistant text is offering the personal audio message. */
export function answerOffersAudioMessage(text: string, attribution: string): boolean {
  const t = text.toLowerCase();
  const name = attributionName(attribution).toLowerCase();
  return (
    /\b(hear|listen to|play)\b[\s\S]{0,80}\b(message|recording|voice)\b/i.test(t) &&
    (!name || t.includes(name))
  );
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
): boolean {
  if (!hasAudioMessage || !attribution?.trim()) return false;
  if (userAskedAboutAudioMessage(question)) return false;
  if (answerOffersAudioMessage(answer, attribution)) return false;
  if (audioMessageAlreadyOffered([...history, { role: "assistant", content: answer }], attribution)) {
    return false;
  }
  // Another follow-up is still in progress — wait for that topic to finish.
  if (invitesResponse && !answerOffersAudioMessage(answer, attribution)) return false;
  return true;
}
