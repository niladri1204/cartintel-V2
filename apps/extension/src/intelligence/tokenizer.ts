/**
 * Generic text tokenizer function.
 * Converts text into an ordered list of tokens without any domain knowledge.
 */
export function tokenize(text: string | null | undefined): string[] {
  if (!text) {
    return [];
  }

  return text
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}
