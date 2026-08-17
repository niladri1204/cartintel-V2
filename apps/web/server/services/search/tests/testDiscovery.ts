import {
  generateSearchQueries,
} from "../queryGenerator";

import {
  DiscoveryEngine,
} from "../discoveryEngine";

import {
  SerpApiDiscoveryProvider,
} from "../providers/SerpApiDiscoveryProvider";

const provider =
  new SerpApiDiscoveryProvider();

const discoveryEngine =
  new DiscoveryEngine(provider);

const input = {
  title: "Samsung Galaxy S25 256GB",
  brand: "Samsung",
  model: "Galaxy S25",
  category: "smartphone",

  identifiers: {},

  attributes: {
    storage: "256GB",
    ram: "12GB",
    color: "Navy",
  },
};

async function main() {
  console.log(
    "\n========== CARTINTEL 1.9.2 DISCOVERY TEST ==========\n"
  );

  const queries =
    generateSearchQueries(input);

  console.log("Generated queries:\n");

  for (const query of queries) {
    console.log(
      `[P${query.priority}] ${query.type}: ${query.query}`
    );
  }

  console.log(
    "\nStarting real SerpApi discovery...\n"
  );

  const result =
    await discoveryEngine.discover(
      input
    );

  console.log(
    "\n========== DISCOVERY SUMMARY ==========\n"
  );

  console.log(
    `Candidates: ${result.candidates.length}`
  );

  // Note: the original searchProvider.ts doesn't return result.errors,
  // it returns queries: SearchResponse[] which has optional error property.
  // Wait, let's look at discoveryEngine.ts...
  const errors = result.queries
    .filter(q => q.error)
    .map(q => ({ providerId: q.provider, error: q.error }));

  console.log(
    `Provider errors: ${errors.length}`
  );

  if (errors.length > 0) {
    console.log("\nErrors:");

    for (const error of errors) {
      console.log(
        `- ${error.providerId}: ${error.error}`
      );
    }
  }

  console.log(
    "\n========== CANDIDATES ==========\n"
  );

  result.candidates.forEach(
    (candidate, index) => {
      console.log(
        `\n#${index + 1}`
      );

      console.log(
        `Title: ${candidate.title}`
      );

      console.log(
        `Price: ${
          candidate.price ?? "UNKNOWN"
        } ${
          candidate.currency ?? ""
        }`
      );

      console.log(
        `Source: ${candidate.source}`
      );

      console.log(
        `Seller: ${
          candidate.seller ?? "UNKNOWN"
        }`
      );

      console.log(
        `URL: ${candidate.url}`
      );

      console.log(
        `Rank: ${
          candidate.searchRank ?? "UNKNOWN"
        }`
      );

      console.log(
        `Google Product ID: ${
          candidate.googleProductId ??
          "NONE"
        }`
      );

      console.log(
        `Immersive Token: ${
          candidate.googleImmersiveToken
            ? "YES"
            : "NO"
        }`
      );

      console.log(
        `Availability: ${
          candidate.availability ??
          "UNKNOWN"
        }`
      );
    }
  );

  console.log(
    "\n========== END TEST ==========\n"
  );
}

main().catch(error => {
  console.error(
    "\nDiscovery test failed:\n",
    error
  );

  process.exitCode = 1;
});
