import type { ProductIntelligence } from "./types";
import { compareSpecValue } from "./specComparison";
import type { SpecComparisonResult } from "./specComparison";

export interface SpecComparisonRow {
  specKey: string;
  specName: string;
  values: (string | null)[];
  relationships: SpecComparisonResult[][];
}

export interface ProductComparisonResult {
  productTitles: string[];
  rows: SpecComparisonRow[];
}

export function compareElectronicsProducts(products: ProductIntelligence[]): ProductComparisonResult {
  if (!products || products.length === 0) {
    return { productTitles: [], rows: [] };
  }

  const productTitles = products.map(p => p.originalTitle || p.normalizedTitle || "Unknown Product");

  const specMetadata = [
    { key: "processor", name: "Processor" },
    { key: "gpu", name: "GPU" },
    { key: "ram", name: "RAM" },
    { key: "storage", name: "Storage" },
    { key: "displaySize", name: "Display size" },
    { key: "resolution", name: "Resolution" },
    { key: "refreshRate", name: "Refresh rate" },
    { key: "displayTechnology", name: "Display technology" },
    { key: "batteryCapacity", name: "Battery" },
    { key: "chargingCapability", name: "Charging" },
    { key: "cameraSpecs", name: "Camera" },
    { key: "connectivity", name: "Connectivity" },
    { key: "networkGeneration", name: "Network generation" },
    { key: "operatingSystem", name: "Operating system" },
    { key: "ports", name: "Ports" },
    { key: "wirelessStandards", name: "Wireless standards" },
    { key: "generation", name: "Generation" },
    { key: "regionVersion", name: "Region/version" },
    { key: "warranty", name: "Warranty" },
    { key: "condition", name: "Condition" },
    { key: "bundle", name: "Bundle/accessory state" }
  ];

  const getSpecValue = (p: ProductIntelligence, key: string): string | null => {
    if (key === "condition") {
      const title = (p.originalTitle || p.normalizedTitle || "").toLowerCase();
      const isRefurb = /\b(?:refurbished|pre-owned|renewed|used|unboxed|open\s*box)\b/i.test(title);
      return isRefurb ? "Used" : "New";
    }
    if (key === "bundle") {
      const title = (p.originalTitle || p.normalizedTitle || "").toLowerCase();
      const isBundle = /\b(?:combo|bundle|kit|pack\s+with|with\s+case|with\s+charger|with\s+cover|with\s+screen\s+protector)\b|\+\s*(?:case|charger|cover|screen\s*protector)\b/i.test(title);
      const isAccessory = /\b(?:case|cover|screen\s*protector|tempered\s*glass|protective\s*glass|screen\s*guard|phone\s*cover|mobile\s*cover|back\s*cover|bumper\s*case|charger|charging\s*cable|charging\s*adapter|adapter|cable|replacement\s*battery|battery\s*replacement|replacement\s*screen|replacement\s*display|lens\s*protector|camera\s*protector|keyboard\s*cover|laptop\s*sleeve)\b/i.test(title);
      if (isAccessory) return "Accessory";
      if (isBundle) return "Bundle";
      return "Standalone";
    }
    return (p as any)[key] || null;
  };

  const rows: SpecComparisonRow[] = [];

  for (const spec of specMetadata) {
    const values = products.map(p => getSpecValue(p, spec.key));

    const relationships: SpecComparisonResult[][] = [];
    for (let i = 0; i < products.length; i++) {
      relationships[i] = [];
      for (let j = 0; j < products.length; j++) {
        if (i === j) {
          relationships[i][j] = "equal";
        } else {
          relationships[i][j] = compareSpecValue(spec.key, values[i], values[j]);
        }
      }
    }

    rows.push({
      specKey: spec.key,
      specName: spec.name,
      values,
      relationships
    });
  }

  return {
    productTitles,
    rows
  };
}
