/** Strip trailing whitespace and closing punctuation/quotes after the main text. */
function stripTrailingClosers(text: string): string {
  return text.trim().replace(/[\s"'')\]»”’"\u201C\u201D\u2018\u2019]+$/g, "");
}

/** True when a fragment ends with an explicit question mark (ASCII or fullwidth). */
export function endsWithQuestionMark(text: string): boolean {
  const stripped = stripTrailingClosers(text);
  return stripped.endsWith("?") || stripped.endsWith("？");
}

/** Phrases that invite a yes/no or spoken reply even without a question mark. */
const INVITING_PHRASES = [
  /\bif you(?:'d| would) like\b/i,
  /\bwould you like\b/i,
  /\bdo you want\b/i,
  /\bwould you like me to\b/i,
  /\bwant me to\b/i,
  /\bcan i\b/i,
  /\bcould i\b/i,
  /\bshall i\b/i,
  /\bshould i\b/i,
  /\blet me know\b/i,
  /\bi can check\b/i,
  /\bi can look\b/i,
  /\bi can find\b/i,
  /\bi can tell you\b/i,
  /\bi can play\b/i,
  /\bi can show\b/i,
  /\bwant to hear\b/i,
  /\bwant to see\b/i,
  /\bwant to know\b/i,
];

function sentenceInvitesResponse(sentence: string): boolean {
  const s = stripTrailingClosers(sentence);
  if (!s) return false;
  if (endsWithQuestionMark(s)) return true;
  return INVITING_PHRASES.some((re) => re.test(s));
}

/** True when the assistant is asking the user something and should hear a reply. */
export function answerInvitesResponse(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  if (endsWithQuestionMark(trimmed)) return true;

  const sentences = trimmed
    .split(/(?<=[.!?？])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const lastSentence = sentences.at(-1) ?? trimmed;
  if (sentenceInvitesResponse(lastSentence)) return true;

  // Short closing sentence after an offer (e.g. "Just let me know.")
  const secondLast = sentences.at(-2);
  if (secondLast && lastSentence.length < 48 && sentenceInvitesResponse(secondLast)) {
    return true;
  }

  return false;
}
