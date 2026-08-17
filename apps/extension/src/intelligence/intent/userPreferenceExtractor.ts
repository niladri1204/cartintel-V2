import type { UserPreference } from "../recommendationTypes";
import { extractBrand } from "../brand";

interface ScannedPreference extends UserPreference {
  index: number;
}

/**
 * Deterministically extracts soft user preferences from a normalized query.
 * Strictly excludes hard eligibility constraints and explicit mandatory requirements.
 * Weight is omitted in this extraction phase.
 *
 * @param normalizedQuery The normalized query string.
 * @returns Array of UserPreferences preserved in deterministic query order.
 */
export function extractUserPreferences(
  normalizedQuery: string | null | undefined
): UserPreference[] {
  if (!normalizedQuery || normalizedQuery.trim().length === 0) {
    return [];
  }

  const query = normalizedQuery.trim().toLowerCase();
  const scanned: ScannedPreference[] = [];

  const isHardConstraintForToken = (matchIdx: number, token: string): boolean => {
    const textBefore = query.slice(Math.max(0, matchIdx - 20), matchIdx);
    const pattern = new RegExp(`\\b(?:only|must\\s+be|exclusively)\\s+${token}\\b`, "i");
    return pattern.test(textBefore);
  };

  // 1. Soft Brand Preferences (prefer Samsung, preferably Samsung, Samsung preferred)
  const brandPrefRegex = /\b(?:(preferably|prefer|preferred|ideally|would\s+like|would\s+prefer|i'd\s+like|i\s+want)\s+([a-z0-9]+)|([a-z0-9]+)\s+(preferred|ideally))\b/gi;
  for (const m of query.matchAll(brandPrefRegex)) {
    const idx = m.index ?? 0;
    const token = m[2] || m[3];
    if (isHardConstraintForToken(idx, token)) continue;

    const detectedBrand = extractBrand([token]);
    if (detectedBrand) {
      scanned.push({
        key: "brand_loyalty",
        value: detectedBrand,
        index: idx
      });
    }
  }

  // 2. Feature Preferences (camera, battery, performance, display)
  const cameraRegex = /\b(good|better|best|great|excellent|high\s+quality)\s+camera\b/gi;
  for (const m of query.matchAll(cameraRegex)) {
    const idx = m.index ?? 0;
    scanned.push({
      key: "camera",
      value: "preferred",
      index: idx
    });
  }

  const batteryRegex = /\b(good|better|best|great|excellent|long|long\s+lasting)\s+battery(?:\s+life)?\b/gi;
  for (const m of query.matchAll(batteryRegex)) {
    const idx = m.index ?? 0;
    scanned.push({
      key: "battery",
      value: "preferred",
      index: idx
    });
  }

  const perfRegex = /\b(good|better|best|great|fast|high)\s+performance\b/gi;
  for (const m of query.matchAll(perfRegex)) {
    const idx = m.index ?? 0;
    scanned.push({
      key: "performance",
      value: "preferred",
      index: idx
    });
  }

  const displayRegex = /\b(?:(good|better|best|great)\s+(?:display|screen)|preferably\s+(amoled|oled))\b/gi;
  for (const m of query.matchAll(displayRegex)) {
    const idx = m.index ?? 0;
    const matchedTag = m[2] ? m[2].toUpperCase() : (m[0].includes("amoled") ? "AMOLED" : "preferred");
    scanned.push({
      key: "display",
      value: matchedTag,
      index: idx
    });
  }

  // 3. Price Sensitivity Preferences (cheap, affordable, budget friendly)
  const priceSensRegex = /\b(cheap|affordable|budget\s+friendly)\b/gi;
  for (const m of query.matchAll(priceSensRegex)) {
    const idx = m.index ?? 0;
    scanned.push({
      key: "price_sensitivity",
      value: "high",
      index: idx
    });
  }

  // 4. Value Preferences (value for money, good value, best value)
  const valueRegex = /\b(value\s+for\s+money|good\s+value|best\s+value)\b/gi;
  for (const m of query.matchAll(valueRegex)) {
    const idx = m.index ?? 0;
    scanned.push({
      key: "value",
      value: "high",
      index: idx
    });
  }

  // 5. Quality & Reliability Preferences
  const reliableRegex = /\breliable\b/gi;
  for (const m of query.matchAll(reliableRegex)) {
    const idx = m.index ?? 0;
    scanned.push({
      key: "reliability",
      value: "preferred",
      index: idx
    });
  }

  const durableRegex = /\bdurable\b/gi;
  for (const m of query.matchAll(durableRegex)) {
    const idx = m.index ?? 0;
    scanned.push({
      key: "durability",
      value: "preferred",
      index: idx
    });
  }

  const qualityRegex = /\b(premium|high)\s+quality\b/gi;
  for (const m of query.matchAll(qualityRegex)) {
    const idx = m.index ?? 0;
    scanned.push({
      key: "quality",
      value: "preferred",
      index: idx
    });
  }

  // 6. Quantitative Soft Preferences (preferably 256GB, ideally 512GB, would like 16GB RAM)
  const softStorageRegex = /\b(?:preferably|ideally|would\s+like|would\s+prefer|optional)\s+(\d+)\s*(gb|tb)(?:\s*(?:storage|rom|internal))?\b/gi;
  for (const m of query.matchAll(softStorageRegex)) {
    const idx = m.index ?? 0;
    if (/\bram|memory\b/i.test(query.slice(idx, idx + m[0].length + 10))) continue;
    scanned.push({
      key: "storage",
      value: `${m[1]}${m[2].toUpperCase()}`,
      index: idx
    });
  }

  const softRamRegex = /\b(?:preferably|ideally|would\s+like|would\s+prefer|optional)\s+(\d+)\s*gb\s*(?:ram|memory)\b/gi;
  for (const m of query.matchAll(softRamRegex)) {
    const idx = m.index ?? 0;
    scanned.push({
      key: "ram",
      value: `${m[1]}GB`,
      index: idx
    });
  }

  // Sort by appearance in query (deterministic query order)
  scanned.sort((a, b) => a.index - b.index);

  // Remove exact duplicate tuples
  const result: UserPreference[] = [];
  const seenTuples = new Set<string>();

  for (const item of scanned) {
    const { index, ...cleanPref } = item;
    const valKey = Array.isArray(cleanPref.value) ? cleanPref.value.join(",") : String(cleanPref.value);
    const key = `${cleanPref.key}:${valKey}`;
    if (!seenTuples.has(key)) {
      seenTuples.add(key);
      result.push(cleanPref);
    }
  }

  return result;
}
