/**
 * Cleans a child's written explanation before it is sent to the AI or stored:
 * removes things that could identify the child or lead elsewhere (phone numbers,
 * emails, links, long digit runs) and limits the length.
 */
export const MAX_WRITTEN = 100;

const PATTERNS: RegExp[] = [
  /https?:\/\/\S+|www\.\S+/gi,
  /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g,
  /\b0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}\b/g, // phone numbers
  /\d{6}\s?-\s?\d{7}/g, // registration-number shapes
  /\d{7,}/g, // any other long digit run
];

export function scrubPersonalInfo(text: string): { text: string; removed: boolean } {
  let removed = false;
  let out = text.normalize("NFC").replace(/[\u0000-\u001f\u007f]/g, " ");
  for (const re of PATTERNS) {
    out = out.replace(re, () => {
      removed = true;
      return "[지움]";
    });
  }
  out = out.replace(/\s+/g, " ").trim();
  if (out.length > MAX_WRITTEN) out = out.slice(0, MAX_WRITTEN).trim();
  return { text: out, removed };
}

/** Too short, or "I don't know": answered as "not yet" without calling the AI. */
export function isEmptyExplanation(text: string): boolean {
  const compact = text.replace(/[\s.,!?~ㅠㅜ…]/g, "");
  return compact.length < 4 || /^(몰라|모르겠|모름|글쎄|잘모르)/.test(compact);
}
