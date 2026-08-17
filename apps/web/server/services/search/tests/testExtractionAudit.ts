import { enrichIdentityCandidate } from "../identityCandidateEnricher";
import type { RawProductResult } from "../types";

const testTitles = [
  "Samsung Galaxy S25 256GB",
  "Samsung Galaxy S25 5G 12GB RAM 256GB Storage",
  "Samsung Galaxy S25+ 5G 12GB RAM 256GB Storage",
  "Samsung Galaxy S25 Plus 5G 12GB RAM 256GB Storage",
  "Samsung Galaxy S25 Ultra 12GB RAM 256GB Storage",
  "Samsung Galaxy S25 FE 8GB RAM 128GB Storage",
];

console.log("\n========== EXTRACTION AUDIT TEST ==========\n");

for (const title of testTitles) {
  const raw: RawProductResult = {
    title,
    price: 99999,
    currency: "INR",
    url: "https://example.com",
    source: "TestStore",
  };

  const enriched = enrichIdentityCandidate(raw);
  const c = enriched.candidate;

  console.log(`TITLE: ${title}`);
  console.log(`BRAND: ${c.brand ?? "null"}`);
  console.log(`MODEL: ${c.model ?? "null"}`);
  console.log(`RAM: ${c.ram ?? "null"}`);
  console.log(`STORAGE: ${c.storage ?? "null"}`);
  console.log(`COLOR: ${c.color ?? "null"}`);
  console.log("------------------------------------------");
}

console.log("\n========== END EXTRACTION AUDIT ==========\n");
