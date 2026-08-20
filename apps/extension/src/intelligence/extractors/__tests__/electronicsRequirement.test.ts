import { describe, test, expect } from "vitest";
import {
  evaluateElectronicsRequirementSingle,
  evaluateElectronicsRequirements
} from "../../electronicsRequirement";
import { processProduct } from "../../engine";
import type { ExplicitRequirement } from "../../recommendationTypes";

describe("Requirement-Aware Electronics Recommendation - Phase 2.5", () => {
  const getProduct = (title: string) => {
    return processProduct({
      title,
      price: 49999,
      currency: "INR",
      image: null,
      url: "https://www.amazon.in/dp/123",
      hostname: "amazon.in"
    });
  };

  test("1. RAM minimum requirement", () => {
    const p1 = getProduct("Samsung Galaxy S24 (16GB RAM)");
    const p2 = getProduct("Samsung Galaxy S24 (8GB RAM)");

    const er: ExplicitRequirement = {
      attribute: "ram",
      value: "16GB",
      operator: "greater_than_or_equal",
      isMandatory: true
    };

    const fit1 = evaluateElectronicsRequirementSingle(er, p1);
    expect(fit1.status).toBe("satisfied");
    expect(fit1.explanation).toContain("Meets RAM requirement: 16GB >= required 16GB");

    const fit2 = evaluateElectronicsRequirementSingle(er, p2);
    expect(fit2.status).toBe("not_satisfied");
    expect(fit2.explanation).toContain("Does not meet RAM requirement: 8GB < required 16GB");
  });

  test("2. Storage minimum requirement", () => {
    const p1 = getProduct("Dell XPS 15 | 1TB SSD");
    const p2 = getProduct("Dell XPS 15 | 512GB SSD");

    const er: ExplicitRequirement = {
      attribute: "storage",
      value: "1TB",
      operator: "greater_than_or_equal"
    };

    const fit1 = evaluateElectronicsRequirementSingle(er, p1);
    expect(fit1.status).toBe("satisfied");

    const fit2 = evaluateElectronicsRequirementSingle(er, p2);
    expect(fit2.status).toBe("not_satisfied");
  });

  test("3. Refresh-rate requirement", () => {
    const p1 = getProduct("LG UltraGear 144Hz Gaming Monitor");
    const p2 = getProduct("LG UltraGear 60Hz Monitor");

    const er: ExplicitRequirement = {
      attribute: "refreshRate",
      value: "120Hz",
      operator: "greater_than_or_equal"
    };

    const fit1 = evaluateElectronicsRequirementSingle(er, p1);
    expect(fit1.status).toBe("satisfied");

    const fit2 = evaluateElectronicsRequirementSingle(er, p2);
    expect(fit2.status).toBe("not_satisfied");
  });

  test("4. Categorical requirement such as OLED", () => {
    const p1 = getProduct("LG 27 inch OLED Monitor");
    const p2 = getProduct("LG 27 inch IPS Monitor");

    const er: ExplicitRequirement = {
      attribute: "displayTechnology",
      value: "OLED",
      operator: "equals"
    };

    const fit1 = evaluateElectronicsRequirementSingle(er, p1);
    expect(fit1.status).toBe("satisfied");

    const fit2 = evaluateElectronicsRequirementSingle(er, p2);
    expect(fit2.status).toBe("not_satisfied");
    expect(fit2.explanation).toContain("IPS is different from required OLED");
  });

  test("5. GPU/processor requirement where safely comparable", () => {
    const p1 = getProduct("Asus Laptop | RTX 4060 GPU");
    const p2 = getProduct("Asus Laptop | GTX 1650 GPU");

    const er: ExplicitRequirement = {
      attribute: "gpu",
      value: "RTX 4060",
      operator: "equals"
    };

    const fit1 = evaluateElectronicsRequirementSingle(er, p1);
    expect(fit1.status).toBe("satisfied");

    const fit2 = evaluateElectronicsRequirementSingle(er, p2);
    expect(fit2.status).toBe("not_satisfied");
  });

  test("6. Unknown specification handling", () => {
    const p1 = getProduct("Basic Laptop"); // no RAM info

    const er: ExplicitRequirement = {
      attribute: "ram",
      value: "16GB",
      operator: "greater_than_or_equal"
    };

    const fit1 = evaluateElectronicsRequirementSingle(er, p1);
    expect(fit1.status).toBe("unknown");
    expect(fit1.explanation).toContain("Cannot verify RAM requirement because ram is unknown");
  });

  test("7. Hard requirement rejection check (isMandatory = true)", () => {
    const product = getProduct("Samsung S24 (8GB RAM)");
    const req: ExplicitRequirement = {
      attribute: "ram",
      value: "16GB",
      operator: "greater_than_or_equal",
      isMandatory: true
    };

    const fit = evaluateElectronicsRequirementSingle(req, product);
    expect(fit.status).toBe("not_satisfied");
    expect(req.isMandatory).toBe(true);
  });

  test("8. Multi-requirement product evaluation + immutability", () => {
    const product = getProduct("OnePlus 12 16GB RAM 512GB Storage 5G");

    const reqs: ExplicitRequirement[] = [
      { attribute: "ram", value: "16GB", operator: "greater_than_or_equal" },
      { attribute: "storage", value: "256GB", operator: "greater_than_or_equal" },
      { attribute: "networkGeneration", value: "5G", operator: "equals" }
    ];

    const copy = { ...product };

    const result = evaluateElectronicsRequirements(product, reqs);
    expect(result.satisfiedCount).toBe(3);
    expect(result.unsatisfiedCount).toBe(0);
    expect(result.unknownCount).toBe(0);

    // Immutability check
    expect(product).toEqual(copy);
  });
});
