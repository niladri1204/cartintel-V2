import { describe, test, expect } from "vitest";
import { generateSearchQueries } from "../queryGenerator";
import type { SearchQueryInput } from "../queryGenerator";

describe("Discovery Engine Query Expansion", () => {
  // Test 1: Generates exact brand + model query
  test("1. Generates exact brand + model query", () => {
    const input: SearchQueryInput = {
      title: "Google Pixel 9 Pro 128GB",
      brand: "Google",
      model: "Pixel 9 Pro"
    };

    const queries = generateSearchQueries(input);
    const exactModelQuery = queries.find(q => q.type === "exact_model" && q.query === "Google Pixel 9 Pro");
    expect(exactModelQuery).toBeDefined();
    expect(exactModelQuery?.priority).toBe(95);
  });

  // Test 2: Generates model-only fallback
  test("2. Generates model-only fallback", () => {
    const input: SearchQueryInput = {
      title: "Pixel 9 Pro 128GB",
      model: "Pixel 9 Pro"
    };

    const queries = generateSearchQueries(input);
    const modelOnlyQuery = queries.find(q => q.type === "exact_model" && q.query === "Pixel 9 Pro");
    expect(modelOnlyQuery).toBeDefined();
    expect(modelOnlyQuery?.priority).toBe(90);
  });

  // Test 3: Generates category-enhanced query
  test("3. Generates category-enhanced query", () => {
    const input: SearchQueryInput = {
      title: "Google Pixel 9 Pro",
      brand: "Google",
      model: "Pixel 9 Pro",
      category: "Smartphones"
    };

    const queries = generateSearchQueries(input);
    const catEnhancedQuery = queries.find(q => q.type === "structured" && q.query === "Google Pixel 9 Pro Smartphones");
    expect(catEnhancedQuery).toBeDefined();
    expect(catEnhancedQuery?.priority).toBe(88);
  });

  // Test 4: Generates multiple variant queries when RAM/storage/color exist
  test("4. Generates multiple variant queries when RAM/storage/color exist", () => {
    const input: SearchQueryInput = {
      title: "Google Pixel 9 Pro Obsidian 128GB 12GB RAM",
      brand: "Google",
      model: "Pixel 9 Pro",
      attributes: {
        color: "Obsidian",
        storage: "128GB",
        ram: "12GB"
      }
    };

    const queries = generateSearchQueries(input);
    
    // Full variant query
    const fullVariantQuery = queries.find(q => q.query === "Google Pixel 9 Pro 12GB 128GB Obsidian");
    expect(fullVariantQuery).toBeDefined();
    expect(fullVariantQuery?.priority).toBe(85);

    // Individual variant queries
    const colorVariantQuery = queries.find(q => q.query === "Google Pixel 9 Pro Obsidian");
    const ramVariantQuery = queries.find(q => q.query === "Google Pixel 9 Pro 12GB");
    const storageVariantQuery = queries.find(q => q.query === "Google Pixel 9 Pro 128GB");

    expect(colorVariantQuery).toBeDefined();
    expect(ramVariantQuery).toBeDefined();
    expect(storageVariantQuery).toBeDefined();
    
    expect(colorVariantQuery?.priority).toBe(82);
    expect(ramVariantQuery?.priority).toBe(82);
    expect(storageVariantQuery?.priority).toBe(82);
  });

  // Test 5: Generates official/manufacturer discovery query
  test("5. Generates official/manufacturer discovery query", () => {
    const input: SearchQueryInput = {
      title: "Google Pixel 9 Pro",
      brand: "Google",
      model: "Pixel 9 Pro"
    };

    const queries = generateSearchQueries(input);
    const officialQuery = queries.find(q => q.query === "Google Pixel 9 Pro official");
    const buyQuery = queries.find(q => q.query === "Google Pixel 9 Pro buy");

    expect(officialQuery).toBeDefined();
    expect(buyQuery).toBeDefined();
    expect(officialQuery?.priority).toBe(78);
    expect(buyQuery?.priority).toBe(76);
  });

  // Test 6: Deduplicates queries and does not mutate the input
  test("6. Deduplicates queries and does not mutate the input", () => {
    const input: SearchQueryInput = {
      title: "Google Pixel 9 Pro",
      brand: "Google",
      model: "Pixel 9 Pro",
      category: "Smartphones",
      attributes: {
        color: "",
        storage: null
      }
    };

    const inputFrozen = JSON.parse(JSON.stringify(input));
    const queries = generateSearchQueries(input);

    // Check input is unmutated
    expect(input).toEqual(inputFrozen);

    // Check unique query titles
    const uniqueQueries = new Set(queries.map(q => q.query.toLowerCase()));
    expect(uniqueQueries.size).toBe(queries.length);
  });
});
