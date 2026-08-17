import type { HardConstraint } from "../recommendationTypes";
import { extractBrand } from "../brand";

interface ScannedConstraint extends HardConstraint {
  index: number;
}

/**
 * Parses Indian currency and price threshold strings into plain numeric values.
 * e.g. "₹50,000" → 50000, "50k" → 50000, "1 lakh" → 100000, "1.5L" → 150000
 */
export function parsePriceThreshold(rawStr: string): number | null {
  const clean = rawStr.toLowerCase().replace(/₹|inr|\$|usd|€|eur|£|gbp|,/g, "").trim();

  const lakhMatch = clean.match(/^(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|l)\b/);
  if (lakhMatch) {
    return Math.round(parseFloat(lakhMatch[1]) * 100000);
  }

  const kMatch = clean.match(/^(\d+(?:\.\d+)?)\s*k\b/);
  if (kMatch) {
    return Math.round(parseFloat(kMatch[1]) * 1000);
  }

  const numMatch = clean.match(/^(\d+(?:\.\d+)?)/);
  if (numMatch) {
    return Math.round(parseFloat(numMatch[1]));
  }

  return null;
}

/**
 * Deterministically extracts hard eligibility constraints from a normalized query.
 * Preserves currency semantics, handles inclusive boundaries, and excludes soft preferences.
 *
 * @param normalizedQuery The normalized query string.
 * @returns Array of HardConstraints preserved in deterministic query order.
 */
export function extractHardConstraints(
  normalizedQuery: string | null | undefined
): HardConstraint[] {
  if (!normalizedQuery || normalizedQuery.trim().length === 0) {
    return [];
  }

  const query = normalizedQuery.trim().toLowerCase();
  const scanned: ScannedConstraint[] = [];

  const isSoftPreference = (matchIdx: number): boolean => {
    const textBefore = query.slice(Math.max(0, matchIdx - 20), matchIdx);
    return /\b(?:preferably|preferred|ideally|optional|like)\b/i.test(textBefore);
  };

  // 1. Price constraints (explicit currency symbol/code, k/lakh suffix, or 4+ digit number)
  const priceRegex = /\b(under|below|less\s+than|maximum|max|up\s+to|within|above|more\s+than|over|minimum|min|at\s+least)\s*(?:price\s*)?:?\s*(₹\s*[\d,]+(?:\.\d+)?\s*(?:k|lakh|lakhs|l)?|\$\s*[\d,]+|(?:rs|inr|usd)\s*[\d,]+|[\d,]+(?:\.\d+)?\s*(?:k|lakh|lakhs|l)\b|[\d,]{4,})/gi;
  for (const m of query.matchAll(priceRegex)) {
    const idx = m.index ?? 0;
    if (isSoftPreference(idx)) continue;

    const opText = m[1].toLowerCase();
    const rawVal = m[2];
    const numericVal = parsePriceThreshold(rawVal);

    if (numericVal !== null && numericVal > 0) {
      const isInclusiveLess = /maximum|max|up\s+to|within/.test(opText);
      const isStrictLess = /under|below|less/.test(opText);
      const isInclusiveGreater = /minimum|min|at\s+least/.test(opText);

      let operator: HardConstraint["operator"] = "less_than";
      if (isInclusiveLess) operator = "less_than_or_equal";
      else if (isStrictLess) operator = "less_than";
      else if (isInclusiveGreater) operator = "greater_than_or_equal";
      else operator = "greater_than";

      scanned.push({
        attribute: "price",
        operator,
        value: numericVal,
        index: idx
      });
    }
  }

  // 2. Comparative product attribute boundaries
  const ramBoundRegex = /\b(at\s+least|minimum|min|more\s+than)\s+(\d+)\s*gb\s*(?:ram|memory)\b/gi;
  for (const m of query.matchAll(ramBoundRegex)) {
    const idx = m.index ?? 0;
    if (isSoftPreference(idx)) continue;
    const opText = m[1].toLowerCase();
    const isInclusive = /at\s+least|minimum|min/.test(opText);
    scanned.push({
      attribute: "ram",
      operator: isInclusive ? "greater_than_or_equal" : "greater_than",
      value: `${m[2]}GB`,
      index: idx
    });
  }

  const weightBoundRegex = /\b(no\s+more\s+than|maximum|max|under|below)\s+(\d+(?:\.\d+)?)\s*(kg|g|lbs?)\b/gi;
  for (const m of query.matchAll(weightBoundRegex)) {
    const idx = m.index ?? 0;
    if (isSoftPreference(idx)) continue;
    const opText = m[1].toLowerCase();
    const isInclusive = /no\s+more\s+than|maximum|max/.test(opText);
    scanned.push({
      attribute: "weight",
      operator: isInclusive ? "less_than_or_equal" : "less_than",
      value: `${m[2]}${m[3]}`,
      index: idx
    });
  }

  const sizeBoundRegex = /\b(maximum|max|no\s+more\s+than|under|below)\s+(\d+(?:\.\d+)?)\s*(?:inch|in|\")\b/gi;
  for (const m of query.matchAll(sizeBoundRegex)) {
    const idx = m.index ?? 0;
    if (isSoftPreference(idx)) continue;
    const opText = m[1].toLowerCase();
    const isInclusive = /no\s+more\s+than|maximum|max/.test(opText);
    scanned.push({
      attribute: "size",
      operator: isInclusive ? "less_than_or_equal" : "less_than",
      value: `${m[2]} inch`,
      index: idx
    });
  }

  const exactColorRegex = /\b(exactly|must\s+be)\s+(black|white|blue|red|green|yellow|silver|gold|pink|purple|gray|grey)\b/gi;
  for (const m of query.matchAll(exactColorRegex)) {
    const idx = m.index ?? 0;
    if (isSoftPreference(idx)) continue;
    scanned.push({
      attribute: "color",
      operator: "equals",
      value: m[2].toLowerCase(),
      index: idx
    });
  }

  // 3. Brand Hard Constraints
  const brandOnlyRegex = /\b(?:(only|must\s+be|exclusively)\s+([a-z0-9]+)|([a-z0-9]+)\s+(only|exclusively))\b/gi;
  for (const m of query.matchAll(brandOnlyRegex)) {
    const idx = m.index ?? 0;
    if (isSoftPreference(idx)) continue;
    const token = m[2] || m[3];
    const detectedBrand = extractBrand([token]);
    if (detectedBrand) {
      scanned.push({
        attribute: "brand",
        operator: "equals",
        value: detectedBrand,
        index: idx
      });
    }
  }

  // 4. Condition Constraints
  const newConditionRegex = /\b(brand\s+new|new\s+only|new\s+condition)\b/gi;
  for (const m of query.matchAll(newConditionRegex)) {
    const idx = m.index ?? 0;
    if (isSoftPreference(idx)) continue;
    scanned.push({
      attribute: "condition",
      operator: "equals",
      value: "new",
      index: idx
    });
  }

  const notRefurbishedRegex = /\b(no|not|don't\s+show|exclude)\s+(refurbished|renewed|used)\b/gi;
  for (const m of query.matchAll(notRefurbishedRegex)) {
    const idx = m.index ?? 0;
    if (isSoftPreference(idx)) continue;
    scanned.push({
      attribute: "condition",
      operator: "not_in",
      value: [m[2].toLowerCase()],
      index: idx
    });
  }

  // Sort by appearance in query (deterministic query order)
  scanned.sort((a, b) => a.index - b.index);

  // Remove exact duplicate tuples
  const result: HardConstraint[] = [];
  const seenTuples = new Set<string>();

  for (const item of scanned) {
    const { index, ...cleanConstraint } = item;
    const valKey = Array.isArray(cleanConstraint.value) ? cleanConstraint.value.join(",") : String(cleanConstraint.value);
    const key = `${cleanConstraint.attribute}:${cleanConstraint.operator}:${valKey}`;
    if (!seenTuples.has(key)) {
      seenTuples.add(key);
      result.push(cleanConstraint);
    }
  }

  return result;
}
