import { describe, test, expect } from "vitest";
import { extractElectronicsAttributes } from "../electronics";
import { parseProductTitle } from "../../parser";
import { processProduct } from "../../engine";

describe("Electronics Deep Specification Intelligence - Phase 2.1", () => {
  test("1. Smartphone specifications extraction (Galaxy S24 Ultra)", () => {
    const title = "Samsung Galaxy S24 Ultra 5G (Titanium Black, 12GB RAM, 512GB Storage) | Snapdragon 8 Gen 3 | 200MP Camera | 5000mAh Battery | 45W Charging | 120Hz LTPO AMOLED | Android 14 | Dual SIM | US Version | 1 Year Warranty";
    const parsed = parseProductTitle(title);

    expect(parsed.brand).toBe("samsung");
    expect(parsed.model).toBe("galaxy s24 ultra");
    expect(parsed.ram).toBe("12GB");
    expect(parsed.storage).toBe("512GB");
    expect(parsed.processor).toBe("Snapdragon 8 Gen 3");
    expect(parsed.cameraSpecs).toBe("200MP");
    expect(parsed.batteryCapacity).toBe("5000mAh");
    expect(parsed.chargingCapability).toBe("45W");
    expect(parsed.refreshRate).toBe("120Hz");
    expect(parsed.displayTechnology).toBe("LTPO AMOLED");
    expect(parsed.networkGeneration).toBe("5G");
    expect(parsed.connectivity).toBe("Dual SIM");
    expect(parsed.operatingSystem).toBe("Android 14");
    expect(parsed.regionVersion).toBe("US Version");
    expect(parsed.warranty).toBe("1 Year Warranty");
  });

  test("2. Smartphone specifications extraction (iPhone 15 Pro Max)", () => {
    const title = "Apple iPhone 15 Pro Max (256GB, Natural Titanium) | Apple A17 Pro | 48MP + 12MP + 12MP | Wi-Fi + Cellular | eSIM | iOS 17 | USB-C | 1 Year Manufacturer Warranty";
    const parsed = parseProductTitle(title);

    expect(parsed.brand).toBe("apple");
    expect(parsed.model).toBe("iphone 15 pro max");
    expect(parsed.storage).toBe("256GB");
    expect(parsed.processor).toBe("Apple A17 Pro");
    expect(parsed.cameraSpecs).toBe("48MP + 12MP + 12MP");
    expect(parsed.connectivity).toBe("Wi-Fi + Cellular");
    expect(parsed.operatingSystem).toBe("iOS 17");
    expect(parsed.ports).toBe("USB-C");
    expect(parsed.warranty).toBe("1 Year Manufacturer Warranty");
  });

  test("3. Laptop specifications extraction (Gaming Laptop)", () => {
    const title = "ASUS ROG Strix G16 16-inch FHD+ 165Hz Gaming Laptop | Intel Core i7-13700H | NVIDIA GeForce RTX 4060 | 16GB RAM | 1TB SSD | Windows 11 Home | Wi-Fi 6E | Thunderbolt 4 | 2 Year Warranty";
    const parsed = parseProductTitle(title);

    expect(parsed.brand).toBe("asus");
    expect(parsed.displaySize).toBe("16 inch");
    expect(parsed.resolution).toBe("FHD+");
    expect(parsed.refreshRate).toBe("165Hz");
    expect(parsed.processor).toBe("Intel Core I7-13700H");
    expect(parsed.gpu).toBe("NVIDIA GeForce RTX 4060");
    expect(parsed.ram).toBe("16GB");
    expect(parsed.storage).toBe("1TB");
    expect(parsed.operatingSystem).toBe("Windows 11 Home");
    expect(parsed.wirelessStandards).toBe("Wi-Fi 6E");
    expect(parsed.ports).toBe("Thunderbolt 4");
    expect(parsed.warranty).toBe("2 Year Warranty");
  });

  test("4. Laptop specifications extraction (MacBook Pro M3 Max)", () => {
    const title = "Apple 2023 MacBook Pro 16.2 inch Liquid Retina XDR Display | Apple M3 Max 16-core CPU | 40-core GPU | 36GB RAM | 1TB SSD | Space Black | macOS | 14th Gen";
    const parsed = parseProductTitle(title);

    expect(parsed.brand).toBe("apple");
    expect(parsed.displaySize).toBe("16.2 inch");
    expect(parsed.displayTechnology).toBe("Liquid Retina");
    expect(parsed.processor).toBe("Apple M3 MAX");
    expect(parsed.gpu).toBe("40-Core GPU");
    expect(parsed.ram).toBe("36GB");
    expect(parsed.storage).toBe("1TB");
    expect(parsed.operatingSystem).toBe("macOS");
    expect(parsed.generation).toBe("14th Gen");
  });

  test("5. Monitor specifications extraction", () => {
    const title = "LG UltraGear 27-inch 4K UHD 144Hz 1ms IPS Gaming Monitor | HDMI 2.1 | DisplayPort 1.4 | 3 Year Warranty";
    const parsed = parseProductTitle(title);

    expect(parsed.brand).toBe("lg");
    expect(parsed.displaySize).toBe("27 inch");
    expect(parsed.resolution).toBe("4K");
    expect(parsed.refreshRate).toBe("144Hz");
    expect(parsed.displayTechnology).toBe("IPS");
    expect(parsed.ports).toBe("HDMI 2.1");
    expect(parsed.warranty).toBe("3 Year Warranty");
  });

  test("6. Processor extraction variants (Intel, AMD, Dimensity, Tensor)", () => {
    const tokens1 = ["lenovo", "thinkpad", "amd", "ryzen", "7", "7840hs"];
    const attr1 = extractElectronicsAttributes(tokens1);
    expect(attr1.processor).toBe("AMD Ryzen 7 7840HS");

    const tokens2 = ["xiaomi", "14", "mediatek", "dimensity", "9300"];
    const attr2 = extractElectronicsAttributes(tokens2);
    expect(attr2.processor).toBe("MediaTek Dimensity 9300");

    const tokens3 = ["pixel", "8", "pro", "google", "tensor", "g3"];
    const attr3 = extractElectronicsAttributes(tokens3);
    expect(attr3.processor).toBe("Google Tensor G3");
  });

  test("7. GPU extraction variants (Radeon, Intel Arc, Apple GPU)", () => {
    const tokens1 = ["acer", "swift", "amd", "radeon", "780m"];
    const attr1 = extractElectronicsAttributes(tokens1);
    expect(attr1.gpu).toBe("AMD Radeon 780M");

    const tokens2 = ["intel", "arc", "a370m", "graphics"];
    const attr2 = extractElectronicsAttributes(tokens2);
    expect(attr2.gpu).toBe("Intel Arc A370M");
  });

  test("8. Normalization consistency (RAM, Storage, Refresh Rate, Battery, Charging)", () => {
    const tokens = ["phone", "8", "gb", "ram", "256", "gb", "storage", "120", "hz", "5000", "mah", "67", "w", "fast", "charging"];
    const attr = extractElectronicsAttributes(tokens);

    expect(attr.ram).toBe("8GB");
    expect(attr.storage).toBe("256GB");
    expect(attr.refreshRate).toBe("120Hz");
    expect(attr.batteryCapacity).toBe("5000mAh");
    expect(attr.chargingCapability).toBe("67W");
  });

  test("9. Missing specification safety (returns null when missing)", () => {
    const tokens = ["generic", "bluetooth", "speaker"];
    const attr = extractElectronicsAttributes(tokens);

    expect(attr.processor).toBeNull();
    expect(attr.gpu).toBeNull();
    expect(attr.displaySize).toBeNull();
    expect(attr.resolution).toBeNull();
    expect(attr.refreshRate).toBeNull();
    expect(attr.displayTechnology).toBeNull();
    expect(attr.batteryCapacity).toBeNull();
    expect(attr.chargingCapability).toBeNull();
    expect(attr.cameraSpecs).toBeNull();
    expect(attr.connectivity).toBeNull();
    expect(attr.networkGeneration).toBeNull();
    expect(attr.operatingSystem).toBeNull();
    expect(attr.ports).toBeNull();
    expect(attr.wirelessStandards).toBeNull();
    expect(attr.generation).toBeNull();
    expect(attr.regionVersion).toBeNull();
    expect(attr.warranty).toBeNull();
  });

  test("10. Ambiguous specification safety (avoids false positives)", () => {
    const tokens = ["soundbar", "120", "w", "power", "2", "channel"];
    const attr = extractElectronicsAttributes(tokens);

    // Audio wattage shouldn't be misidentified as phone charging capability or RAM
    expect(attr.ram).toBeNull();
    expect(attr.storage).toBeNull();
    expect(attr.chargingCapability).toBeNull();
  });

  test("11. End-to-end processProduct retains all deep specifications", () => {
    const res = processProduct({
      title: "OnePlus 12 5G (Flowy Emerald, 16GB RAM, 512GB) | Snapdragon 8 Gen 3 | 50MP Camera | 5400mAh | 100W SuperVOOC | 120Hz 2K AMOLED | Android 14",
      price: 64999,
      currency: "INR",
      image: null,
      url: "https://amazon.in/dp/B0CS9W8L8T",
      hostname: "amazon.in"
    });

    expect(res.ram).toBe("16GB");
    expect(res.storage).toBe("512GB");
    expect(res.processor).toBe("Snapdragon 8 Gen 3");
    expect(res.cameraSpecs).toBe("50MP");
    expect(res.batteryCapacity).toBe("5400mAh");
    expect(res.chargingCapability).toBe("100W");
    expect(res.refreshRate).toBe("120Hz");
    expect(res.resolution).toBe("2K");
    expect(res.displayTechnology).toBe("AMOLED");
    expect(res.networkGeneration).toBe("5G");
    expect(res.operatingSystem).toBe("Android 14");
  });

  test("12. Source tokens array unmutated (Immutability)", () => {
    const tokens = ["samsung", "galaxy", "s24", "12gb", "ram", "512gb", "storage"];
    const copy = [...tokens];

    extractElectronicsAttributes(tokens);

    expect(tokens).toEqual(copy);
  });
});
