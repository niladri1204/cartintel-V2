import type { RawProductResult } from "./types";

export function createCandidateId(
  candidate: RawProductResult
): string {
  const provider =
    candidate.discovery?.provider ??
    "unknown-provider";

  const source =
    candidate.source ??
    "unknown-source";

  const url =
    candidate.url ?? "";

  const raw =
    `${provider}|${source}|${url}`;

  return hashString(raw);
}

function hashString(value: string): string {
  let hash = 0;

  for (let i = 0; i < value.length; i++) {
    hash =
      (hash << 5) -
      hash +
      value.charCodeAt(i);

    hash |= 0;
  }

  return `candidate_${Math.abs(hash).toString(36)}`;
}
