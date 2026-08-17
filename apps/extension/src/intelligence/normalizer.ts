/**
 * Normalizes a raw string by fixing spacing, casing, Unicode, and basic punctuation.
 * Pure string cleaning utility with no product-specific logic.
 */
export function normalizeString(input: string | null | undefined): string | null {
  // 1. Handle null and undefined safely.
  if (input === null || input === undefined) {
    return null;
  }

  let result = input;

  // 2. Trim leading/trailing whitespace.
  result = result.trim();

  // 3. Convert all tabs/newlines to spaces.
  result = result.replace(/[\r\n\t]+/g, ' ');

  // 4. Collapse multiple spaces into one.
  result = result.replace(/\s+/g, ' ');

  // 5. Normalize Unicode using NFC.
  result = result.normalize('NFC');

  // 6. Convert smart quotes to normal quotes.
  result = result
    .replace(/[“”]/g, '"')
    .replace(/[‘’`´]/g, "'");

  // 7. Convert long dashes (– —) to a normal hyphen (-).
  result = result.replace(/[–—]/g, '-');

  // 8. Remove zero-width and invisible Unicode characters.
  result = result.replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '');

  // 9. Decode common HTML entities.
  result = result
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

  // 10. Remove duplicate punctuation such as !!!, ???, ....
  result = result.replace(/([!?,.;])\1+/g, '$1');

  // 11. Preserve important separators (- / + x).

  // 12. Convert the final result to lowercase.
  result = result.toLowerCase();

  return result;
}
