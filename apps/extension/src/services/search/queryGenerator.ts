export interface SearchQueryInput {
  title: string;

  brand?: string | null;
  model?: string | null;
  category?: string | null;

  identifiers?: {
    gtin?: string | null;
    ean?: string | null;
    upc?: string | null;
    mpn?: string | null;
    modelNumber?: string | null;
  };

  attributes?: Record<string, string | number | boolean | null>;
}

export interface GeneratedSearchQuery {
  query: string;
  type:
    | "exact_identifier"
    | "exact_model"
    | "structured"
    | "normalized"
    | "broad";
  priority: number;
}

function clean(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/\s+/g, " ")
    .trim();
}

function addQuery(
  queries: GeneratedSearchQuery[],
  query: string,
  type: GeneratedSearchQuery["type"],
  priority: number
) {
  const cleaned = clean(query);

  if (!cleaned) return;

  if (
    queries.some(
      existing =>
        existing.query.toLowerCase() === cleaned.toLowerCase()
    )
  ) {
    return;
  }

  queries.push({
    query: cleaned,
    type,
    priority,
  });
}

export function generateSearchQueries(
  input: SearchQueryInput
): GeneratedSearchQuery[] {
  const queries: GeneratedSearchQuery[] = [];

  const title = clean(input.title);
  const brand = clean(input.brand);
  const model = clean(input.model);

  const identifiers = input.identifiers ?? {};

  // --------------------------------------------------
  // LEVEL 1 — Exact identifiers
  // --------------------------------------------------

  const identifierValues = [
    identifiers.gtin,
    identifiers.ean,
    identifiers.upc,
    identifiers.mpn,
    identifiers.modelNumber,
  ]
    .map(clean)
    .filter(Boolean);

  for (const identifier of identifierValues) {
    addQuery(
      queries,
      identifier,
      "exact_identifier",
      100
    );
  }

  // --------------------------------------------------
  // LEVEL 2 — Brand + model
  // --------------------------------------------------

  if (brand && model) {
    addQuery(
      queries,
      `${brand} ${model}`,
      "exact_model",
      90
    );
  }

  // --------------------------------------------------
  // LEVEL 3 — Brand + model + important attributes
  // --------------------------------------------------

  const importantAttributes = [
    "ram",
    "storage",
    "capacity",
    "size",
    "color",
    "generation",
    "variant",
    "processor",
  ];

  const attributeParts = importantAttributes
    .map(key => {
      const value = input.attributes?.[key];

      if (
        value === null ||
        value === undefined ||
        value === ""
      ) {
        return "";
      }

      return clean(value);
    })
    .filter(Boolean);

  if (brand && model && attributeParts.length > 0) {
    addQuery(
      queries,
      `${brand} ${model} ${attributeParts.join(" ")}`,
      "structured",
      80
    );
  }

  // --------------------------------------------------
  // LEVEL 4 — Original product title
  // --------------------------------------------------

  if (title) {
    addQuery(
      queries,
      title,
      "normalized",
      70
    );
  }

  // --------------------------------------------------
  // LEVEL 5 — Broad fallback
  // --------------------------------------------------

  if (brand && title) {
    const titleLower = title.toLowerCase();
    const brandLower = brand.toLowerCase();
    const broadQuery = titleLower.startsWith(brandLower)
      ? title
      : `${brand} ${title}`;

    addQuery(
      queries,
      broadQuery,
      "broad",
      50
    );
  }

  return queries.sort(
    (a, b) => b.priority - a.priority
  );
}
