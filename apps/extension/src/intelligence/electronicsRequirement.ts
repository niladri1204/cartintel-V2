import type { ExplicitRequirement } from "./recommendationTypes";
import type { ProductIntelligence } from "./types";
import { compareSpecValue } from "./specComparison";

export type ElectronicsRequirementStatus = "satisfied" | "not_satisfied" | "unknown" | "incomparable";

export interface ElectronicsRequirementFit {
  requirement: ExplicitRequirement;
  status: ElectronicsRequirementStatus;
  explanation: string;
}

export interface ProductElectronicsRequirementFit {
  fits: ElectronicsRequirementFit[];
  satisfiedCount: number;
  unsatisfiedCount: number;
  unknownCount: number;
  incomparableCount: number;
}

const SPEC_NAMES: Record<string, string> = {
  processor: "Processor",
  gpu: "GPU",
  ram: "RAM",
  storage: "Storage",
  displaySize: "Display size",
  resolution: "Resolution",
  refreshRate: "Refresh rate",
  displayTechnology: "Display technology",
  batteryCapacity: "Battery",
  chargingCapability: "Charging",
  cameraSpecs: "Camera",
  connectivity: "Connectivity",
  networkGeneration: "Network generation",
  operatingSystem: "Operating system",
  ports: "Ports",
  wirelessStandards: "Wireless standards",
  generation: "Generation",
  regionVersion: "Region/version",
  warranty: "Warranty",
  condition: "Condition",
  bundle: "Bundle/accessory state"
};

export function resolveSpecKey(attr: string): string | null {
  const norm = attr.trim().toLowerCase();
  if (norm === "ram" || norm === "memory") return "ram";
  if (norm === "storage" || norm === "rom" || norm === "ssd" || norm === "hdd") return "storage";
  if (norm === "refreshrate" || norm === "refresh_rate" || norm === "refresh") return "refreshRate";
  if (norm === "displaytechnology" || norm === "display_technology" || norm === "panel") return "displayTechnology";
  if (norm === "displaysize" || norm === "display_size" || norm === "screen" || norm === "screensize" || norm === "screen_size") return "displaySize";
  if (norm === "resolution") return "resolution";
  if (norm === "gpu" || norm === "graphics") return "gpu";
  if (norm === "processor" || norm === "cpu" || norm === "chipset") return "processor";
  if (norm === "battery" || norm === "batterycapacity" || norm === "battery_capacity") return "batteryCapacity";
  if (norm === "charging" || norm === "chargingcapability" || norm === "charging_capability") return "chargingCapability";
  if (norm === "connectivity") return "connectivity";
  if (norm === "networkgeneration" || norm === "network_generation" || norm === "network" || norm === "generation_network") return "networkGeneration";
  if (norm === "operatingsystem" || norm === "operating_system" || norm === "os") return "operatingSystem";
  if (norm === "ports") return "ports";
  if (norm === "wirelessstandards" || norm === "wireless_standards" || norm === "wireless") return "wirelessStandards";
  if (norm === "generation") return "generation";
  if (norm === "regionversion" || norm === "region_version" || norm === "region") return "regionVersion";
  if (norm === "warranty") return "warranty";
  if (norm === "condition") return "condition";
  if (norm === "bundle") return "bundle";
  return null;
}

export function evaluateElectronicsRequirementSingle(
  er: ExplicitRequirement,
  product: ProductIntelligence
): ElectronicsRequirementFit {
  const specKey = resolveSpecKey(er.attribute);
  if (!specKey) {
    return {
      requirement: er,
      status: "incomparable",
      explanation: `Cannot compare non-electronics attribute: ${er.attribute}`
    };
  }

  const specName = SPEC_NAMES[specKey] || er.attribute;

  // Extract actual value
  let actualValue: string | null = null;
  if (specKey === "condition") {
    const title = (product.originalTitle || product.normalizedTitle || "").toLowerCase();
    const isRefurb = /\b(?:refurbished|pre-owned|renewed|used|unboxed|open\s*box)\b/i.test(title);
    actualValue = isRefurb ? "Used" : "New";
  } else if (specKey === "bundle") {
    const title = (product.originalTitle || product.normalizedTitle || "").toLowerCase();
    const isBundle = /\b(?:combo|bundle|kit|pack\s+with|with\s+case|with\s+charger|with\s+cover|with\s+screen\s+protector)\b|\+\s*(?:case|charger|cover|screen\s*protector)\b/i.test(title);
    const isAccessory = /\b(?:case|cover|screen\s*protector|tempered\s*glass|protective\s*glass|screen\s*guard|phone\s*cover|mobile\s*cover|back\s*cover|bumper\s*case|charger|charging\s*cable|charging\s*adapter|adapter|cable|replacement\s*battery|battery\s*replacement|replacement\s*screen|replacement\s*display|lens\s*protector|camera\s*protector|keyboard\s*cover|laptop\s*sleeve)\b/i.test(title);
    if (isAccessory) actualValue = "Accessory";
    else if (isBundle) actualValue = "Bundle";
    else actualValue = "Standalone";
  } else {
    actualValue = (product as any)[specKey] || null;
  }

  if (actualValue === null || actualValue === undefined || String(actualValue).trim() === "") {
    return {
      requirement: er,
      status: "unknown",
      explanation: `Cannot verify ${specName} requirement because ${specName.toLowerCase()} is unknown.`
    };
  }

  const op = er.operator || "greater_than_or_equal";
  const requiredValStr = String(er.value);

  // For contains / matches operator
  if (op === "contains" || op === "matches") {
    const matched = actualValue.toLowerCase().includes(requiredValStr.toLowerCase());
    return {
      requirement: er,
      status: matched ? "satisfied" : "not_satisfied",
      explanation: matched
        ? `${specName} requirement met: ${actualValue} contains ${requiredValStr}`
        : `${specName} requirement not met: ${actualValue} does not contain ${requiredValStr}`
    };
  }

  const cmp = compareSpecValue(specKey, actualValue, requiredValStr);

  if (cmp === "unknown") {
    return {
      requirement: er,
      status: "unknown",
      explanation: `Cannot verify ${specName} requirement because ${specName.toLowerCase()} is unknown.`
    };
  }

  if (cmp === "incomparable") {
    return {
      requirement: er,
      status: "incomparable",
      explanation: `Cannot compare ${actualValue} against required ${requiredValStr} for ${specName}`
    };
  }

  let isSatisfied = false;
  let operatorSymbol = ">=";

  if (op === "equals") {
    isSatisfied = cmp === "equal";
    operatorSymbol = "==";
  } else if (op === "greater_than") {
    isSatisfied = cmp === "higher";
    operatorSymbol = ">";
  } else if (op === "greater_than_or_equal") {
    isSatisfied = cmp === "higher" || cmp === "equal";
    operatorSymbol = ">=";
  } else if (op === "less_than") {
    isSatisfied = cmp === "lower";
    operatorSymbol = "<";
  } else if (op === "less_than_or_equal") {
    isSatisfied = cmp === "lower" || cmp === "equal";
    operatorSymbol = "<=";
  } else {
    // Default to greater_than_or_equal
    isSatisfied = cmp === "higher" || cmp === "equal";
    operatorSymbol = ">=";
  }

  if (isSatisfied) {
    return {
      requirement: er,
      status: "satisfied",
      explanation: `Meets ${specName} requirement: ${actualValue} ${operatorSymbol} required ${requiredValStr}`
    };
  } else {
    let oppositeSymbol = "==";
    if (cmp === "higher") oppositeSymbol = ">";
    else if (cmp === "lower") oppositeSymbol = "<";

    if (cmp === "different") {
      return {
        requirement: er,
        status: "not_satisfied",
        explanation: `Does not meet ${specName} requirement: ${actualValue} is different from required ${requiredValStr}`
      };
    }

    return {
      requirement: er,
      status: "not_satisfied",
      explanation: `Does not meet ${specName} requirement: ${actualValue} ${oppositeSymbol} required ${requiredValStr}`
    };
  }
}

export function evaluateElectronicsRequirements(
  product: ProductIntelligence,
  requirements: ExplicitRequirement[]
): ProductElectronicsRequirementFit {
  const fits: ElectronicsRequirementFit[] = [];
  let satisfiedCount = 0;
  let unsatisfiedCount = 0;
  let unknownCount = 0;
  let incomparableCount = 0;

  for (const er of requirements) {
    const fit = evaluateElectronicsRequirementSingle(er, product);
    fits.push(fit);
    if (fit.status === "satisfied") satisfiedCount++;
    else if (fit.status === "not_satisfied") unsatisfiedCount++;
    else if (fit.status === "unknown") unknownCount++;
    else if (fit.status === "incomparable") incomparableCount++;
  }

  return {
    fits,
    satisfiedCount,
    unsatisfiedCount,
    unknownCount,
    incomparableCount
  };
}
