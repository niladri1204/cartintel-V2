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
  const rawCategory = clean(input.category);
  const category = /^(uncategorized|unknown|null|undefined)$/i.test(rawCategory) ? "" : rawCategory;

  const identifiers = input.identifiers ?? {};
  const attrs = input.attributes ?? {};

  const getAttr = (key: string): string =>
    clean(attrs[key]);

  const add = (
    query: string,
    type: GeneratedSearchQuery["type"],
    priority: number
  ) => {
    addQuery(queries, query, type, priority);
  };

  // -------------------------------
  // LEVEL 1 — Exact identifiers
  // -------------------------------

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
    add(identifier, "exact_identifier", 100);
  }

  // -------------------------------
  // LEVEL 2 — Exact identity
  // -------------------------------

  if (brand && model) {
    add(`${brand} ${model}`, "exact_model", 95);
  }

  if (model) {
    add(model, "exact_model", 90);
  }

  // -------------------------------
  // LEVEL 3 — Identity + category
  // -------------------------------

  if (brand && model && category) {
    add(`${brand} ${model} ${category}`, "structured", 88);
  }

  // -------------------------------
  // LEVEL 4 — Important variants
  // -------------------------------

  const variantAttributes = [
    ["ram", getAttr("ram")],
    ["storage", getAttr("storage")],
    ["capacity", getAttr("capacity")],
    ["color", getAttr("color")],
    ["size", getAttr("size")],
    ["generation", getAttr("generation")],
    ["variant", getAttr("variant")],
    ["processor", getAttr("processor")],
    ["gpu", getAttr("gpu")],
    ["refreshRate", getAttr("refreshRate")],
    ["resolution", getAttr("resolution")],
  ] as const;

  const presentAttributes = variantAttributes
    .filter(([, value]) => Boolean(value))
    .map(([, value]) => value);

  if (brand && model && presentAttributes.length > 0) {
    // Full variant query
    add(
      `${brand} ${model} ${presentAttributes.join(" ")}`,
      "structured",
      85
    );

    // Important individual variant queries
    for (const value of presentAttributes.slice(0, 4)) {
      add(
        `${brand} ${model} ${value}`,
        "structured",
        82
      );
    }
  }

  // -------------------------------
  // LEVEL 5 — Manufacturer discovery
  // -------------------------------

  if (brand && model) {
    add(
      `${brand} ${model} official`,
      "structured",
      78
    );

    add(
      `${brand} ${model} buy`,
      "structured",
      76
    );
  }

  // -------------------------------
  // LEVEL 6 — Category fallback
  // -------------------------------

  if (brand && category) {
    add(
      `${brand} ${category}`,
      "broad",
      65
    );
  }

  if (model && category) {
    add(
      `${model} ${category}`,
      "broad",
      63
    );
  }

  // -------------------------------
  // LEVEL 7 — Original title
  // -------------------------------

  if (title) {
    add(title, "normalized", 60);
  }

  // -------------------------------
  // LEVEL 8 — Broad identity fallback
  // -------------------------------

  if (brand && title) {
    const titleLower = title.toLowerCase();
    const brandLower = brand.toLowerCase();

    const broadQuery = titleLower.startsWith(brandLower)
      ? title
      : `${brand} ${title}`;

    add(broadQuery, "broad", 55);
  }

  return queries.sort((a, b) => b.priority - a.priority);
}
