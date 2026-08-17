import type { ExplicitRequirement } from "../recommendationTypes";

interface ScannedRequirement extends ExplicitRequirement {
  index: number;
}

/**
 * Deterministically extracts concrete explicit product requirements from a normalized query.
 * Strictly excludes price constraints and soft preferences.
 *
 * @param normalizedQuery The normalized query string.
 * @returns Array of ExplicitRequirements preserved in deterministic query order.
 */
export function extractExplicitRequirements(
  normalizedQuery: string | null | undefined
): ExplicitRequirement[] {
  if (!normalizedQuery || normalizedQuery.trim().length === 0) {
    return [];
  }

  const query = normalizedQuery.trim().toLowerCase();
  const scanned: ScannedRequirement[] = [];

  // Helper: check if a match is qualified as a soft preference (e.g. "preferably 256GB", "256GB would be nice")
  const isSoftPreference = (matchIdx: number, matchLen: number): boolean => {
    const textBefore = query.slice(Math.max(0, matchIdx - 20), matchIdx);
    const textAfter = query.slice(matchIdx + matchLen, matchIdx + matchLen + 20);

    if (/\b(?:preferably|preferred|ideally|optional)\b/i.test(textBefore)) return true;
    if (/\b(?:would be nice|preferred|ideal)\b/i.test(textAfter)) return true;
    return false;
  };

  // 1. RAM extraction (contextual: "12GB RAM", "16GB memory")
  const ramRegex = /\b(at\s+least\s+)?(\d+)\s*gb\s*(?:ram|memory)\b/gi;
  for (const m of query.matchAll(ramRegex)) {
    const idx = m.index ?? 0;
    if (isSoftPreference(idx, m[0].length)) continue;
    const isAtLeast = Boolean(m[1]);
    scanned.push({
      attribute: "ram",
      value: `${m[2]}GB`,
      operator: isAtLeast ? "greater_than" : "equals",
      isMandatory: true,
      index: idx
    });
  }

  // 2. Storage extraction (contextual: "256GB storage", "256GB rom", "internal 256GB", "1TB", "at least 512GB storage", "with 256GB")
  const storageRegex = /\b(at\s+least\s+)?(\d+)\s*(gb|tb)(?:\s*(?:storage|rom|internal))?\b/gi;
  for (const m of query.matchAll(storageRegex)) {
    const idx = m.index ?? 0;
    if (isSoftPreference(idx, m[0].length)) continue;

    const num = m[2];
    const unit = m[3].toUpperCase();

    const textAfterNum = query.slice(idx + m[0].length, idx + m[0].length + 12);
    const textBeforeNum = query.slice(Math.max(0, idx - 12), idx);

    // Skip if RAM/memory keyword is attached directly to this match (e.g. "RAM: 256GB" or "256GB RAM", but not "12GB RAM 256GB")
    const isPrecededByRamLabel = /\b(?:ram|memory)\s*:?\s*$/i.test(textBeforeNum) && !/\d+\s*(?:gb|mb)?\s*(?:ram|memory)\s*:?\s*$/i.test(textBeforeNum);
    if (/^\s*(?:ram|memory)\b/i.test(textAfterNum) || isPrecededByRamLabel) {
      continue;
    }

    const isAtLeast = Boolean(m[1]);
    const hasExplicitStorageKeyword =
      /storage|rom|internal/i.test(m[0]) ||
      /^\s*(?:storage|rom|internal)\b/i.test(textAfterNum) ||
      /\b(?:storage|rom|internal)\s*:?\s*$/i.test(textBeforeNum);

    const hasWithPrefix = /\bwith\s+$/i.test(textBeforeNum);

    if (unit !== "TB" && !hasExplicitStorageKeyword && !hasWithPrefix && !isAtLeast) {
      continue;
    }

    scanned.push({
      attribute: "storage",
      value: `${num}${unit}`,
      operator: isAtLeast ? "greater_than" : "equals",
      isMandatory: true,
      index: idx
    });
  }

  // 3. Color extraction (using canonical color set from electronics.ts)
  const colorRegex = /\b(black|white|blue|red|green|yellow|silver|gold|pink|purple|gray|grey|orange|brown|beige|navy|obsidian|hazel|porcelain)\b/gi;
  for (const m of query.matchAll(colorRegex)) {
    const idx = m.index ?? 0;
    if (isSoftPreference(idx, m[0].length)) continue;
    scanned.push({
      attribute: "color",
      value: m[1].toLowerCase(),
      operator: "equals",
      isMandatory: true,
      index: idx
    });
  }

  // 4. Size / Screen Size (e.g. "6.7 inch display", "6.7 inch")
  const sizeRegex = /\b(\d+(?:\.\d+)?)\s*(?:inch|in|\")(?:\s*display|\s*screen)?\b/gi;
  for (const m of query.matchAll(sizeRegex)) {
    const idx = m.index ?? 0;
    if (isSoftPreference(idx, m[0].length)) continue;
    scanned.push({
      attribute: "size",
      value: `${m[1]} inch`,
      operator: "equals",
      isMandatory: true,
      index: idx
    });
  }

  // 5. Display specs (refresh rate, resolution, panel using canonical 'display' attribute from attributes.ts)
  const displayRegex = /\b(120hz|144hz|60hz|240hz|4k|1080p|2k|8k|fhd|qhd|uhd|oled|amoled|lcd)\b/gi;
  for (const m of query.matchAll(displayRegex)) {
    const idx = m.index ?? 0;
    if (isSoftPreference(idx, m[0].length)) continue;
    scanned.push({
      attribute: "display",
      value: m[1].toUpperCase(),
      operator: "equals",
      isMandatory: true,
      index: idx
    });
  }

  // 6. Battery (e.g. "5000mAh", "6000 mAh")
  const batteryRegex = /\b(\d+)\s*mah\b/gi;
  for (const m of query.matchAll(batteryRegex)) {
    const idx = m.index ?? 0;
    if (isSoftPreference(idx, m[0].length)) continue;
    scanned.push({
      attribute: "battery",
      value: `${m[1]}mAh`,
      operator: "equals",
      isMandatory: true,
      index: idx
    });
  }

  // 7. Quantity / Pack (e.g. "pack of 4", "2 units", "10 pieces")
  const packRegex = /\b(?:pack\s+of\s+(\d+)|(\d+)\s*pack|(\d+)\s*(?:units|pieces|pcs))\b/gi;
  for (const m of query.matchAll(packRegex)) {
    const idx = m.index ?? 0;
    if (isSoftPreference(idx, m[0].length)) continue;
    const qty = m[1] || m[2] || m[3];
    scanned.push({
      attribute: "quantity",
      value: qty,
      operator: "equals",
      isMandatory: true,
      index: idx
    });
  }

  // 8. Material (e.g. "stainless steel", "leather", "cotton", "titanium")
  const materialRegex = /\b(stainless\s+steel|leather|cotton|titanium|aluminum|glass|ceramic|wood)\b/gi;
  for (const m of query.matchAll(materialRegex)) {
    const idx = m.index ?? 0;
    if (isSoftPreference(idx, m[0].length)) continue;
    scanned.push({
      attribute: "material",
      value: m[1].toLowerCase(),
      operator: "equals",
      isMandatory: true,
      index: idx
    });
  }

  // Sort by appearance in query (deterministic query order)
  scanned.sort((a, b) => a.index - b.index);

  // Remove only exact duplicate tuples (preserving distinct requirements per attribute in query order)
  const result: ExplicitRequirement[] = [];
  const seenTuples = new Set<string>();

  for (const item of scanned) {
    const { index, ...cleanReq } = item;
    const key = `${cleanReq.attribute}:${cleanReq.value}:${cleanReq.operator}:${cleanReq.isMandatory}`;
    if (!seenTuples.has(key)) {
      seenTuples.add(key);
      result.push(cleanReq);
    }
  }

  return result;
}
