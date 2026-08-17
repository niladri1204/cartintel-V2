export type IdentityConfidence =
  | "EXACT"
  | "HIGH_CONFIDENCE"
  | "POSSIBLE"
  | "REJECTED";

export interface IdentitySignal {
  field: string;
  sourceValue: string | null;
  candidateValue: string | null;
  matched: boolean;
  weight: number;
  reason?: string;
}

export interface IdentityComparison {
  confidence: IdentityConfidence;

  score: number;

  signals: IdentitySignal[];

  hardContradiction: boolean;

  reasons: string[];
}

export interface IdentityCandidate {
  title: string;

  brand?: string | null;
  model?: string | null;
  variant?: string | null;

  category?: string | null;
  productType?: string | null;

  color?: string | null;
  size?: string | null;
  material?: string | null;

  storage?: string | null;
  ram?: string | null;

  fingerprint?: string | null;

  identifiers?: {
    gtin?: string | null;
    ean?: string | null;
    upc?: string | null;
    mpn?: string | null;
    sku?: string | null;
    modelNumber?: string | null;
  };

  attributes?: Record<
    string,
    string | number | boolean | null
  >;
}
