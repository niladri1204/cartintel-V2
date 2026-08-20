import { describe, test, expect } from "vitest";
import {
  parseRam,
  parseStorage,
  parseDisplaySize,
  parseResolution,
  parseRefreshRate,
  parseBattery,
  parseCharging,
  compareSpecValue
} from "../../specComparison";
import { processProduct } from "../../engine";

describe("Electronics Specification Normalization & Comparison - Phase 2.3", () => {
  test("1. RAM/storage/unit normalization", () => {
    expect(parseRam("8 GB RAM")).toBe(8);
    expect(parseRam("16GB")).toBe(16);
    expect(parseRam("512 MB")).toBe(0.5);
    
    expect(parseStorage("256 GB")).toBe(256);
    expect(parseStorage("1 TB")).toBe(1024);
    expect(parseStorage("1024GB")).toBe(1024);
  });

  test("2. Display size/refresh-rate normalization", () => {
    expect(parseDisplaySize("15.6 inch")).toBe(15.6);
    expect(parseDisplaySize("6.7\"")).toBe(6.7);
    expect(parseDisplaySize("27in")).toBe(27);

    expect(parseRefreshRate("120 Hz")).toBe(120);
    expect(parseRefreshRate("144Hz")).toBe(144);
    expect(parseRefreshRate("60Hz")).toBe(60);
  });

  test("3. Resolution alias normalization (Resolution Safety)", () => {
    // Aliases to canonical dimensions
    expect(parseResolution("FHD")).toEqual({ width: 1920, height: 1080 });
    expect(parseResolution("1080p")).toEqual({ width: 1920, height: 1080 });
    expect(parseResolution("QHD")).toEqual({ width: 2560, height: 1440 });
    expect(parseResolution("4K UHD")).toEqual({ width: 3840, height: 2160 });

    // Explicit dimensions
    expect(parseResolution("1920x1080")).toEqual({ width: 1920, height: 1080 });
    expect(parseResolution("2560x1080")).toEqual({ width: 2560, height: 1080 });

    // Resolution Safety: Heights are equal, widths are different. Should be differentiated!
    expect(compareSpecValue("resolution", "1920x1080", "2560x1080")).toBe("lower");
    expect(compareSpecValue("resolution", "2560x1080", "1920x1080")).toBe("higher");
    expect(compareSpecValue("resolution", "2560x1080", "2560x1080")).toBe("equal");
    expect(compareSpecValue("resolution", "2560x1080", "1920x1200")).toBe("different"); // crossover
  });

  test("4. Processor/GPU normalization", () => {
    expect(compareSpecValue("processor", "Snapdragon 8 Gen 3 Processor", "snapdragon-8-gen-3")).toBe("equal");
    expect(compareSpecValue("gpu", "NVIDIA GeForce RTX 4060", "rtx 4060")).toBe("equal");
    expect(compareSpecValue("processor", "Intel Core i7", "AMD Ryzen 7")).toBe("different");
  });

  test("5. Equal/higher/lower numeric comparison", () => {
    expect(compareSpecValue("ram", "16GB", "8GB")).toBe("higher");
    expect(compareSpecValue("ram", "8GB", "16GB")).toBe("lower");
    expect(compareSpecValue("ram", "8GB", "8GB")).toBe("equal");

    expect(compareSpecValue("storage", "512GB", "1TB")).toBe("lower");
    expect(compareSpecValue("storage", "1TB", "512GB")).toBe("higher");
    expect(compareSpecValue("storage", "256GB", "256GB")).toBe("equal");
  });

  test("6. Categorical difference/conflict", () => {
    expect(compareSpecValue("displayTechnology", "OLED", "IPS")).toBe("different");
    expect(compareSpecValue("displayTechnology", "OLED", "OLED")).toBe("equal");
  });

  test("7. Missing/ambiguous/incomparable data", () => {
    // Incompatible battery units
    expect(compareSpecValue("batteryCapacity", "5000 mAh", "70 Wh")).toBe("incomparable");
    expect(compareSpecValue("batteryCapacity", "5000 mAh", "5000 mAh")).toBe("equal");

    // Missing values
    expect(compareSpecValue("ram", null, "8GB")).toBe("unknown");
    expect(compareSpecValue("storage", "256GB", undefined)).toBe("unknown");
    expect(compareSpecValue("processor", "", "i7")).toBe("unknown");
  });

  test("8. Multi-spec product comparison + immutability", () => {
    const product1 = processProduct({
      title: "Asus ROG Laptop 16GB RAM 1TB SSD RTX 4060 144Hz OLED",
      price: 120000,
      currency: "INR",
      image: null,
      url: "https://example.com/p1",
      hostname: "example.com"
    });

    const product2 = processProduct({
      title: "Asus ROG Laptop 8GB RAM 512GB SSD RTX 4060 144Hz IPS",
      price: 100000,
      currency: "INR",
      image: null,
      url: "https://example.com/p2",
      hostname: "example.com"
    });

    // Check individual specs
    expect(compareSpecValue("ram", product1.ram, product2.ram)).toBe("higher");
    expect(compareSpecValue("storage", product1.storage, product2.storage)).toBe("higher");
    expect(compareSpecValue("gpu", product1.gpu, product2.gpu)).toBe("equal");
    expect(compareSpecValue("refreshRate", product1.refreshRate, product2.refreshRate)).toBe("equal");
    expect(compareSpecValue("displayTechnology", product1.displayTechnology, product2.displayTechnology)).toBe("different");

    // Immutability check
    const copy1 = { ...product1 };
    const copy2 = { ...product2 };
    compareSpecValue("ram", product1.ram, product2.ram);
    expect(product1).toEqual(copy1);
    expect(product2).toEqual(copy2);
  });
});
