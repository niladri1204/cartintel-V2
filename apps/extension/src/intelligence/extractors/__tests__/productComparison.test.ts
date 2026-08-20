import { describe, test, expect } from "vitest";
import { compareElectronicsProducts } from "../../productComparison";
import { processProduct } from "../../engine";
import type { ProductIntelligence } from "../../types";

describe("Electronics Product Comparison Engine - Phase 2.4", () => {
  const getProduct = (title: string, overrides: Partial<ProductIntelligence> = {}): ProductIntelligence => {
    const base = processProduct({
      title,
      price: 49999,
      currency: "INR",
      image: null,
      url: "https://www.amazon.in/dp/123",
      hostname: "amazon.in"
    });
    return { ...base, ...overrides };
  };

  test("1. Two-product smartphone comparison", () => {
    const p1 = getProduct("Samsung Galaxy S24 (8GB RAM, 128GB Storage, New)");
    const p2 = getProduct("Samsung Galaxy S24 (12GB RAM, 256GB Storage, New)");

    const result = compareElectronicsProducts([p1, p2]);

    expect(result.productTitles.length).toBe(2);

    const ramRow = result.rows.find(r => r.specKey === "ram");
    expect(ramRow).toBeDefined();
    expect(ramRow?.values).toEqual(["8GB", "12GB"]);
    // p1 (8GB) vs p2 (12GB) -> lower. p2 vs p1 -> higher.
    expect(ramRow?.relationships[0][1]).toBe("lower");
    expect(ramRow?.relationships[1][0]).toBe("higher");

    const storageRow = result.rows.find(r => r.specKey === "storage");
    expect(storageRow).toBeDefined();
    expect(storageRow?.values).toEqual(["128GB", "256GB"]);
    expect(storageRow?.relationships[0][1]).toBe("lower");
    expect(storageRow?.relationships[1][0]).toBe("higher");
  });

  test("2. Laptop comparison with CPU/GPU/RAM/storage", () => {
    const p1 = getProduct("Asus ROG Strix | Intel Core i9-13900K | RTX 4080 | 32GB RAM | 1TB SSD");
    const p2 = getProduct("Asus ROG Strix | AMD Ryzen 9 7900 | RTX 4070 | 16GB RAM | 512GB SSD");

    const result = compareElectronicsProducts([p1, p2]);

    const cpuRow = result.rows.find(r => r.specKey === "processor");
    expect(cpuRow?.relationships[0][1]).toBe("different");

    const gpuRow = result.rows.find(r => r.specKey === "gpu");
    expect(gpuRow?.relationships[0][1]).toBe("different"); // Categorical compared as different

    const ramRow = result.rows.find(r => r.specKey === "ram");
    expect(ramRow?.relationships[0][1]).toBe("higher"); // 32GB > 16GB
  });

  test("3. Monitor comparison with resolution/refresh-rate/panel", () => {
    const p1 = getProduct("LG UltraGear 27\" QHD 240Hz OLED Gaming Monitor");
    const p2 = getProduct("LG UltraGear 27\" FHD 144Hz IPS Gaming Monitor");

    const result = compareElectronicsProducts([p1, p2]);

    const resRow = result.rows.find(r => r.specKey === "resolution");
    expect(resRow?.relationships[0][1]).toBe("higher"); // QHD > FHD

    const refreshRow = result.rows.find(r => r.specKey === "refreshRate");
    expect(refreshRow?.relationships[0][1]).toBe("higher"); // 240Hz > 144Hz

    const panelRow = result.rows.find(r => r.specKey === "displayTechnology");
    expect(panelRow?.relationships[0][1]).toBe("different"); // OLED vs IPS
  });

  test("4. Equal and different specifications", () => {
    const p1 = getProduct("OnePlus 12 16GB RAM 512GB Storage Flowy Emerald");
    const p2 = getProduct("OnePlus 12 16GB RAM 512GB Storage Silky Black");

    const result = compareElectronicsProducts([p1, p2]);

    const ramRow = result.rows.find(r => r.specKey === "ram");
    expect(ramRow?.relationships[0][1]).toBe("equal");

    const storageRow = result.rows.find(r => r.specKey === "storage");
    expect(storageRow?.relationships[0][1]).toBe("equal");
  });

  test("5. Higher/lower numeric specifications", () => {
    const p1 = getProduct("Laptop with 65W fast charging");
    const p2 = getProduct("Laptop with 100W fast charging");

    const result = compareElectronicsProducts([p1, p2]);

    const chargingRow = result.rows.find(r => r.specKey === "chargingCapability");
    expect(chargingRow?.relationships[0][1]).toBe("lower"); // 65W < 100W
    expect(chargingRow?.relationships[1][0]).toBe("higher");
  });

  test("6. Missing/unknown/incomparable values", () => {
    const p1 = getProduct("Smartphone with 5000 mAh battery");
    const p2 = getProduct("Laptop with 70 Wh battery");
    const p3 = getProduct("Basic smartphone"); // no battery info

    const result = compareElectronicsProducts([p1, p2, p3]);

    const batteryRow = result.rows.find(r => r.specKey === "batteryCapacity");
    // p1 (mAh) vs p2 (Wh) -> incomparable
    expect(batteryRow?.relationships[0][1]).toBe("incomparable");
    // p1 vs p3 (missing) -> unknown
    expect(batteryRow?.relationships[0][2]).toBe("unknown");
    // p3 vs p2 -> unknown
    expect(batteryRow?.relationships[2][1]).toBe("unknown");
  });

  test("7. Three-product comparison", () => {
    const p1 = getProduct("Samsung S24 Ultra 8GB RAM");
    const p2 = getProduct("Samsung S24 Ultra 12GB RAM");
    const p3 = getProduct("Samsung S24 Ultra 16GB RAM");

    const result = compareElectronicsProducts([p1, p2, p3]);

    expect(result.productTitles.length).toBe(3);

    const ramRow = result.rows.find(r => r.specKey === "ram");
    expect(ramRow?.values).toEqual(["8GB", "12GB", "16GB"]);

    // Check relationship matrix
    // Row 0 (p1): equal to p1, lower than p2, lower than p3
    expect(ramRow?.relationships[0]).toEqual(["equal", "lower", "lower"]);
    // Row 1 (p2): higher than p1, equal to p2, lower than p3
    expect(ramRow?.relationships[1]).toEqual(["higher", "equal", "lower"]);
    // Row 2 (p3): higher than p1, higher than p2, equal to p3
    expect(ramRow?.relationships[2]).toEqual(["higher", "higher", "equal"]);
  });

  test("8. Determinism and input immutability", () => {
    const p1 = getProduct("Samsung Galaxy S24 (8GB RAM)");
    const p2 = getProduct("Samsung Galaxy S24 (12GB RAM)");

    const copy1 = JSON.parse(JSON.stringify(p1));
    const copy2 = JSON.parse(JSON.stringify(p2));

    const result1 = compareElectronicsProducts([p1, p2]);
    const result2 = compareElectronicsProducts([p1, p2]);

    // Determinism
    expect(result1).toEqual(result2);

    // Reordered input reflects reordered matrix indices
    const result3 = compareElectronicsProducts([p2, p1]);
    const ram1 = result1.rows.find(r => r.specKey === "ram");
    const ram3 = result3.rows.find(r => r.specKey === "ram");
    expect(ram1?.relationships[0][1]).toBe("lower");  // p1 vs p2
    expect(ram3?.relationships[0][1]).toBe("higher"); // p2 vs p1

    // Immutability
    expect(p1).toEqual(copy1);
    expect(p2).toEqual(copy2);
  });
});
