import { generateSearchQueries } from "../queryGenerator";
import { DiscoveryEngine } from "../discoveryEngine";
import { SerpApiDiscoveryProvider } from "../providers/SerpApiDiscoveryProvider";
import { ProductIdentityEngine } from "../productIdentityEngine";
import { enrichIdentityCandidate } from "../identityCandidateEnricher";
import type { IdentityCandidate } from "../identityTypes";

const provider = new SerpApiDiscoveryProvider();
const discoveryEngine = new DiscoveryEngine(provider);
const identityEngine = new ProductIdentityEngine();

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

const sourceCandidate: IdentityCandidate = {
  title: "Samsung Galaxy S25 256GB",
  brand: "Samsung",
  model: "Galaxy S25",
  variant: null,
  category: "smartphone",
  productType: null,
  color: "Navy",
  size: null,
  storage: "256GB",
  ram: "12GB",
  fingerprint: null,
  identifiers: {},
  attributes: {
    storage: "256GB",
    ram: "12GB",
    color: "Navy"
  }
};

async function main() {
  console.log("\n========== CARTINTEL 1.9.3 IDENTITY TEST ==========\n");

  const result = await discoveryEngine.discover(input);
  const candidates = result.candidates;

  console.log(`TOTAL CANDIDATES: ${candidates.length}`);

  const exact: any[] = [];
  const highConf: any[] = [];
  const possible: any[] = [];
  const rejected: any[] = [];

  let s25UltraRejected = 0;
  let s25FeRejected = 0;
  let s25PlusRejected = 0;
  let s25OtherRejected = 0;
  let genuineS25Accepted = 0;

  for (const raw of candidates) {
    const enriched = enrichIdentityCandidate(raw);
    const candidateIdentity = enriched.candidate;
    const comparison = identityEngine.compare(sourceCandidate, candidateIdentity);

    const record = {
      title: raw.title,
      brand: candidateIdentity.brand ?? "null",
      model: candidateIdentity.model ?? "null",
      storage: candidateIdentity.storage ?? "null",
      ram: candidateIdentity.ram ?? "null",
      color: candidateIdentity.color ?? "null",
      confidence: comparison.confidence,
      reasons: comparison.reasons,
    };

    if (comparison.confidence === "EXACT") exact.push(record);
    else if (comparison.confidence === "HIGH_CONFIDENCE") highConf.push(record);
    else if (comparison.confidence === "POSSIBLE") possible.push(record);
    else rejected.push(record);

    const titleLower = raw.title.toLowerCase();
    const isUltra = titleLower.includes("ultra");
    const isFe = titleLower.includes("fe");
    const isPlus = titleLower.includes("plus") || titleLower.includes("+");

    // Counting logic
    if (comparison.confidence === "REJECTED") {
      if (isUltra) s25UltraRejected++;
      else if (isFe) s25FeRejected++;
      else if (isPlus) s25PlusRejected++;
      else s25OtherRejected++;
    } else {
      // Accepted (EXACT, HIGH_CONFIDENCE, or POSSIBLE)
      if (!isUltra && !isFe && !isPlus) {
        genuineS25Accepted++;
      }
    }
  }

  console.log(`EXACT: ${exact.length}`);
  console.log(`HIGH_CONFIDENCE: ${highConf.length}`);
  console.log(`POSSIBLE: ${possible.length}`);
  console.log(`REJECTED: ${rejected.length}`);
  
  console.log(`\nS25 candidates accepted: ${genuineS25Accepted}`);
  console.log(`S25 Ultra rejected: ${s25UltraRejected}`);
  console.log(`S25 FE rejected: ${s25FeRejected}`);
  console.log(`S25+ rejected: ${s25PlusRejected}`);
  console.log(`Other model contradictions rejected: ${s25OtherRejected}`);

  const printRecord = (c: any) => 
    console.log(`TITLE: ${c.title} | BRAND: ${c.brand} | MODEL: ${c.model} | STORAGE: ${c.storage} | RAM: ${c.ram} | COLOR: ${c.color} | DECISION: ${c.confidence} | REASONS: ${c.reasons.join(", ")}`);

  console.log("\n========== EXACT ==========\n");
  exact.forEach(printRecord);

  console.log("\n========== HIGH_CONFIDENCE ==========\n");
  highConf.forEach(printRecord);

  console.log("\n========== POSSIBLE ==========\n");
  possible.forEach(printRecord);

  console.log("\n========== REJECTED ==========\n");
  rejected.forEach(printRecord);
  
  console.log("\n========== END TEST ==========\n");
}

main().catch(error => {
  console.error("\nIdentity test failed:\n", error);
  process.exitCode = 1;
});
