export type SpecComparisonResult = "equal" | "higher" | "lower" | "different" | "unknown" | "incomparable";

export interface ResolutionDimensions {
  width: number;
  height: number;
}

export function parseRam(val: string | null | undefined): number | null {
  if (!val) return null;
  const match = val.replace(/\s+/g, "").match(/^(\d+(?:\.\d+)?)\s*(gb|mb|tb)?/i);
  if (!match) return null;
  const num = parseFloat(match[1]);
  const unit = (match[2] || "gb").toLowerCase();
  if (unit === "mb") return num / 1024;
  if (unit === "tb") return num * 1024;
  return num;
}

export function parseStorage(val: string | null | undefined): number | null {
  if (!val) return null;
  const match = val.replace(/\s+/g, "").match(/^(\d+(?:\.\d+)?)\s*(gb|tb|mb)?/i);
  if (!match) return null;
  const num = parseFloat(match[1]);
  const unit = (match[2] || "gb").toLowerCase();
  if (unit === "mb") return num / 1024;
  if (unit === "tb") return num * 1024;
  return num;
}

export function parseDisplaySize(val: string | null | undefined): number | null {
  if (!val) return null;
  const match = val.trim().match(/^(\d+(?:\.\d+)?)/);
  if (!match) return null;
  return parseFloat(match[1]);
}

export function parseResolution(val: string | null | undefined): ResolutionDimensions | null {
  if (!val) return null;
  const cleaned = val.trim().toLowerCase().replace(/\s+/g, "");
  
  // 1. Direct width x height dimensions (e.g. "1920x1080")
  const pixelMatch = cleaned.match(/^(\d+)\s*x\s*(\d+)$/);
  if (pixelMatch) {
    return {
      width: parseInt(pixelMatch[1], 10),
      height: parseInt(pixelMatch[2], 10)
    };
  }
  
  // 2. Mapping marketing aliases deterministically
  if (cleaned.includes("4k") || cleaned.includes("2160p") || cleaned.includes("uhd")) {
    return { width: 3840, height: 2160 };
  }
  if (cleaned.includes("wqhd") || cleaned.includes("qhd") || cleaned.includes("1440p") || cleaned.includes("2k")) {
    return { width: 2560, height: 1440 };
  }
  if (cleaned.includes("fhd") || cleaned.includes("1080p")) {
    return { width: 1920, height: 1080 };
  }
  if (cleaned.includes("hd+") || cleaned.includes("900p")) {
    return { width: 1600, height: 900 };
  }
  if (cleaned.includes("hd") || cleaned.includes("720p")) {
    return { width: 1280, height: 720 };
  }
  return null;
}

export function parseRefreshRate(val: string | null | undefined): number | null {
  if (!val) return null;
  const match = val.trim().match(/^(\d+)/);
  if (!match) return null;
  return parseInt(match[1], 10);
}

export function parseBattery(val: string | null | undefined): { value: number; unit: "mAh" | "Wh" } | null {
  if (!val) return null;
  const cleaned = val.replace(/\s+/g, "").toLowerCase();
  const match = cleaned.match(/^(\d+(?:\.\d+)?)\s*(mah|whr?)/i);
  if (!match) return null;
  const num = parseFloat(match[1]);
  const unit = match[2].startsWith("wh") ? "Wh" : "mAh";
  return { value: num, unit };
}

export function parseCharging(val: string | null | undefined): number | null {
  if (!val) return null;
  const match = val.trim().match(/^(\d+)/);
  if (!match) return null;
  return parseInt(match[1], 10);
}

export function cleanCategoricalSpec(key: string, val: string | null | undefined): string | null {
  if (!val) return null;
  let cleaned = val.trim().toLowerCase();
  
  // Strip common processor / GPU / tech prefixes or branding
  cleaned = cleaned.replace(/\b(?:processor|chipset|graphics|gpu)\b/gi, "");
  cleaned = cleaned.replace(/\b(?:nvidia|geforce|amd|radeon|intel|core|google|tensor|snapdragon|exynos|apple|super|ltpo|liquid)\b/gi, "");
  
  cleaned = cleaned.replace(/[\s\-_]+/g, "");
  return cleaned;
}

export function compareSpecValue(key: string, leftVal: any, rightVal: any): SpecComparisonResult {
  if (leftVal === null || leftVal === undefined || rightVal === null || rightVal === undefined) {
    return "unknown";
  }
  if (typeof leftVal === "string" && !leftVal.trim()) return "unknown";
  if (typeof rightVal === "string" && !rightVal.trim()) return "unknown";

  const cleanNumCmp = (lNum: number | null, rNum: number | null): SpecComparisonResult => {
    if (lNum === null || rNum === null) return "incomparable";
    if (lNum > rNum) return "higher";
    if (lNum < rNum) return "lower";
    return "equal";
  };

  switch (key) {
    case "ram":
      return cleanNumCmp(parseRam(leftVal), parseRam(rightVal));
    case "storage":
      return cleanNumCmp(parseStorage(leftVal), parseStorage(rightVal));
    case "displaySize":
      return cleanNumCmp(parseDisplaySize(leftVal), parseDisplaySize(rightVal));
    case "refreshRate":
      return cleanNumCmp(parseRefreshRate(leftVal), parseRefreshRate(rightVal));
    case "chargingCapability":
      return cleanNumCmp(parseCharging(leftVal), parseCharging(rightVal));
    case "batteryCapacity": {
      const batL = parseBattery(leftVal);
      const batR = parseBattery(rightVal);
      if (!batL || !batR) return "incomparable";
      if (batL.unit !== batR.unit) return "incomparable";
      return cleanNumCmp(batL.value, batR.value);
    }
    case "resolution": {
      const resL = parseResolution(leftVal);
      const resR = parseResolution(rightVal);
      if (!resL || !resR) return "incomparable";
      if (resL.width === resR.width && resL.height === resR.height) return "equal";
      if (resL.width >= resR.width && resL.height >= resR.height && (resL.width > resR.width || resL.height > resR.height)) {
        return "higher";
      }
      if (resL.width <= resR.width && resL.height <= resR.height && (resL.width < resR.width || resL.height < resR.height)) {
        return "lower";
      }
      return "different";
    }
    case "processor":
    case "gpu":
    case "displayTechnology":
    case "connectivity":
    case "networkGeneration":
    case "operatingSystem":
    case "ports":
    case "wirelessStandards":
    case "generation":
    case "regionVersion":
    case "warranty":
    case "cameraSpecs": {
      const cL = cleanCategoricalSpec(key, leftVal);
      const cR = cleanCategoricalSpec(key, rightVal);
      if (!cL || !cR) return "incomparable";
      return cL === cR ? "equal" : "different";
    }
    case "condition":
    case "bundle": {
      return leftVal === rightVal ? "equal" : "different";
    }
    default:
      return "incomparable";
  }
}
