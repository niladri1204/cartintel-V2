import type { ProductIntelligence } from "./types";

export function normalizeUnitCasing(str: string): string {
  let res = str;
  // 1. Units at the end of a string or followed by boundary/number
  res = res.replace(/gb$/i, "GB").replace(/gb(?=\d|$)/i, "GB");
  res = res.replace(/tb$/i, "TB").replace(/tb(?=\d|$)/i, "TB");
  res = res.replace(/hz$/i, "Hz").replace(/hz(?=\d|$)/i, "Hz");
  res = res.replace(/mah$/i, "mAh").replace(/mah(?=\d|$)/i, "mAh");
  res = res.replace(/whr?$/i, "Wh").replace(/whr?(?=\d|$)/i, "Wh");
  res = res.replace(/w$/i, "W").replace(/w(?=\d|$)/i, "W");
  res = res.replace(/mp$/i, "MP").replace(/mp(?=\d|$)/i, "MP");
  
  // 2. Specific keywords (global replacement case-insensitive)
  res = res.replace(/oled/gi, "OLED");
  res = res.replace(/ips/gi, "IPS");
  res = res.replace(/amoled/gi, "AMOLED");
  res = res.replace(/lcd/gi, "LCD");
  res = res.replace(/rtx/gi, "RTX");
  res = res.replace(/gtx/gi, "GTX");
  res = res.replace(/core/gi, "Core");
  res = res.replace(/ryzen/gi, "Ryzen");
  res = res.replace(/intel/gi, "Intel");
  res = res.replace(/amd/gi, "AMD");
  res = res.replace(/apple/gi, "Apple");
  res = res.replace(/google/gi, "Google");
  res = res.replace(/snapdragon/gi, "Snapdragon");
  res = res.replace(/dimensity/gi, "Dimensity");
  res = res.replace(/exynos/gi, "Exynos");
  res = res.replace(/tensor/gi, "Tensor");
  res = res.replace(/wifionly/gi, "Wi-FiOnly");
  res = res.replace(/wifi/gi, "Wi-Fi");
  res = res.replace(/wi\-fi/gi, "Wi-Fi");
  res = res.replace(/cellular/gi, "Cellular");
  res = res.replace(/gpu/gi, "GPU");
  res = res.replace(/hdmi/gi, "HDMI");
  res = res.replace(/usb/gi, "USB");
  res = res.replace(/bluetooth/gi, "Bluetooth");
  res = res.replace(/gen/gi, "Gen");
  res = res.replace(/usversion/gi, "USVersion");
  res = res.replace(/globalversion/gi, "GlobalVersion");
  res = res.replace(/indianvariant/gi, "IndianVariant");
  res = res.replace(/euversion/gi, "EUVersion");
  res = res.replace(/ukversion/gi, "UKVersion");
  res = res.replace(/internationalversion/gi, "InternationalVersion");
  res = res.replace(/cnversion/gi, "CNVersion");

  return res;
}

export function cleanSpecForComparison(key: string, val: string): string {
  let cleaned = val.trim().toLowerCase();
  if (key === "ram") {
    cleaned = cleaned.replace(/\s*(?:ram|memory)\b/gi, "");
  } else if (key === "storage") {
    cleaned = cleaned.replace(/\s*(?:storage|rom|ssd|hdd|internal)\b/gi, "");
  }
  cleaned = cleaned.replace(/[\s\-_]+/g, "");
  return normalizeUnitCasing(cleaned);
}

export function generateVariantSignature(product: ProductIntelligence): string {
  const dimensions = [
    { key: "ram", val: product.ram },
    { key: "storage", val: product.storage },
    { key: "processor", val: product.processor },
    { key: "gpu", val: product.gpu },
    { key: "displaySize", val: product.displaySize },
    { key: "resolution", val: product.resolution },
    { key: "refreshRate", val: product.refreshRate },
    { key: "displayTechnology", val: product.displayTechnology },
    { key: "batteryCapacity", val: product.batteryCapacity },
    { key: "cameraSpecs", val: product.cameraSpecs },
    { key: "connectivity", val: product.connectivity },
    { key: "networkGeneration", val: product.networkGeneration },
    { key: "operatingSystem", val: product.operatingSystem },
    { key: "ports", val: product.ports },
    { key: "wirelessStandards", val: product.wirelessStandards },
    { key: "generation", val: product.generation },
    { key: "regionVersion", val: product.regionVersion },
    { key: "warranty", val: product.warranty },

    // Phase 4.4.2 Beauty & Grocery Dimensions
    { key: "volume", val: product.volume },
    { key: "weight", val: product.weight },
    { key: "packCount", val: product.packCount },
    { key: "shade", val: product.shade },
    { key: "formulation", val: product.formulation },
    { key: "ingredient", val: product.ingredient },
    { key: "flavor", val: product.flavor },
    { key: "spf", val: product.spf },
    { key: "skinType", val: product.skinType },

    // Phase 4.4.3 Furniture & Books Dimensions
    { key: "dimensions", val: product.dimensions },
    { key: "author", val: product.author },
    { key: "publisher", val: product.publisher },
    { key: "isbn", val: product.isbn },
    { key: "language", val: product.language },
    { key: "format", val: product.format },
    { key: "edition", val: product.edition }
  ];

  const parts: string[] = [];

  for (const dim of dimensions) {
    if (dim.val !== null && dim.val !== undefined && dim.val !== "") {
      parts.push(cleanSpecForComparison(dim.key, String(dim.val)));
    }
  }

  const title = (product.originalTitle || product.normalizedTitle || "").toLowerCase();
  
  // Condition
  const isRefurb = /\b(?:refurbished|pre-owned|renewed|used|unboxed|open\s*box)\b/i.test(title);
  if (isRefurb) {
    parts.push("Used");
  }

  // Bundle
  const isBundle = /\b(?:combo|bundle|kit|pack\s+with|with\s+case|with\s+charger|with\s+cover|with\s+screen\s+protector)\b|\+\s*(?:case|charger|cover|screen\s*protector)\b/i.test(title);
  if (isBundle) {
    parts.push("Bundle");
  }

  // Accessory
  const isAccessory = /\b(?:case|cover|screen\s*protector|tempered\s*glass|protective\s*glass|screen\s*guard|phone\s*cover|mobile\s*cover|back\s*cover|bumper\s*case|charger|charging\s*cable|charging\s*adapter|adapter|cable|replacement\s*battery|battery\s*replacement|replacement\s*screen|replacement\s*display|lens\s*protector|camera\s*protector|keyboard\s*cover|laptop\s*sleeve)\b/i.test(title);
  if (isAccessory) {
    parts.push("Accessory");
  }

  return parts.join("|");
}

export function compareSpecs(key: string, val1: string | null | undefined, val2: string | null | undefined): "match" | "conflict" | "none" {
  if (!val1 || !val2) return "none";
  const c1 = cleanSpecForComparison(key, val1);
  const c2 = cleanSpecForComparison(key, val2);
  return c1 === c2 ? "match" : "conflict";
}
