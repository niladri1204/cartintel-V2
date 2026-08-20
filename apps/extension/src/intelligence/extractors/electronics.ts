import { type ProductAttributes, createEmptyAttributes } from "../attributes";

const ELECTRONICS_COLORS = new Set([
  "black",
  "white",
  "blue",
  "red",
  "green",
  "yellow",
  "silver",
  "gold",
  "pink",
  "purple",
  "gray",
  "grey",
  "orange",
  "brown",
  "beige",
  "navy",
  "obsidian",
  "hazel",
  "porcelain",
  "titanium",
  "dark grey",
  "dark gray"
]);

const ELECTRONICS_VARIANTS = new Set([
  "pro",
  "plus",
  "ultra",
  "mini",
  "max",
  "air",
  "lite",
  "fe",
  "neo"
]);

function cleanTokenStr(str: string): string {
  return str.replace(/^[^\w]+|[^\w]+$/g, "").toLowerCase();
}

function normalizeRamStr(val: string | null): string | null {
  if (!val) return null;
  const cleaned = val.replace(/\s+/g, "").toUpperCase();
  if (/^\d+GB$/.test(cleaned)) return cleaned;
  return val.trim();
}

function normalizeStorageStr(val: string | null): string | null {
  if (!val) return null;
  const cleaned = val.replace(/\s+/g, "").toUpperCase();
  if (/^\d+(?:GB|TB)$/.test(cleaned)) return cleaned;
  return val.trim();
}

/**
 * Electronics Attribute Extractor.
 * Extracts and normalizes deep electronics specifications from tokens/title.
 */
export function extractElectronicsAttributes(tokens: string[]): ProductAttributes {
  if (!tokens || tokens.length === 0) {
    return createEmptyAttributes();
  }

  const rawTitle = tokens.join(" ").toLowerCase();

  let ram: string | null = null;
  let storage: string | null = null;
  let color: string | null = null;
  let variant: string | null = null;
  let processor: string | null = null;
  let gpu: string | null = null;
  let display: string | null = null;
  let battery: string | null = null;

  let displaySize: string | null = null;
  let resolution: string | null = null;
  let refreshRate: string | null = null;
  let displayTechnology: string | null = null;
  let batteryCapacity: string | null = null;
  let chargingCapability: string | null = null;
  let cameraSpecs: string | null = null;
  let connectivity: string | null = null;
  let networkGeneration: string | null = null;
  let operatingSystem: string | null = null;
  let ports: string | null = null;
  let wirelessStandards: string | null = null;
  let generation: string | null = null;
  let regionVersion: string | null = null;
  let warranty: string | null = null;

  // 1. Explicit RAM extraction with context words (e.g. "12gb ram", "12 gb ram", "ram: 12gb")
  const explicitRamMatch = rawTitle.match(/(\d+\s*gb)\s*(?:ram|memory)\b/i) ||
                           rawTitle.match(/\b(?:ram|memory)\s*:?\s*(\d+\s*gb)\b/i);
  if (explicitRamMatch) {
    ram = normalizeRamStr(explicitRamMatch[1]);
  }

  // 2. Explicit Storage extraction with context words (e.g. "256gb storage", "256 gb rom", "internal 256gb", "256 gb ssd")
  const explicitStorageMatch = rawTitle.match(/(\d+\s*(?:gb|tb))\s*(?:storage|rom|internal|ssd|hdd)\b/i) ||
                                rawTitle.match(/\b(?:storage|rom|internal|ssd|hdd)\s*:?\s*(\d+\s*(?:gb|tb))\b/i);
  if (explicitStorageMatch) {
    storage = normalizeStorageStr(explicitStorageMatch[1]);
  }

  // 3. Dual capacity combo (e.g. "12gb+256gb", "12gb/256gb", "12gb 256gb", "12gb, 256gb")
  const comboMatch = rawTitle.match(/\b(\d+)\s*gb\s*[\/+,\s]\s*(\d+)\s*(gb|tb)\b/i);
  if (comboMatch) {
    const num1 = parseInt(comboMatch[1], 10);
    const num2 = parseInt(comboMatch[2], 10);
    const unit2 = comboMatch[3].toUpperCase();

    if (!isNaN(num1) && !isNaN(num2) && num1 < num2 && num1 <= 32 && num2 >= 32) {
      if (!ram) ram = `${num1}GB`;
      if (!storage) storage = `${num2}${unit2}`;
    }
  }

  // 4. Fallback capacity extraction for remaining capacities
  if (!storage || !ram) {
    const allCapacityMatches = Array.from(rawTitle.matchAll(/\b(\d+)\s*(gb|tb)\b/gi));
    for (const match of allCapacityMatches) {
      const num = parseInt(match[1], 10);
      const unit = match[2].toUpperCase();
      const fullVal = `${num}${unit}`;

      // Skip if this capacity matches explicit RAM already identified
      if (ram && ram === fullVal && rawTitle.includes(`${match[1]}${match[2]}`.toLowerCase() + " ram")) {
        continue;
      }

      if (unit === "TB" || num >= 32) {
        if (!storage) storage = fullVal;
      } else if (num <= 24) {
        if (!ram && storage && storage !== fullVal) {
          ram = fullVal;
        } else if (!storage && !ram) {
          const hasLargerLater = allCapacityMatches.some((m) => {
            const n = parseInt(m[1], 10);
            const u = m[2].toUpperCase();
            return u === "TB" || n >= 32;
          });
          if (hasLargerLater) {
            ram = fullVal;
          } else {
            storage = fullVal;
          }
        }
      }
    }
  }

  // 5. Detect Color (clean token matching)
  for (const token of tokens) {
    const clean = cleanTokenStr(token);
    if (ELECTRONICS_COLORS.has(clean)) {
      color = clean;
      break;
    }
  }

  if (!color) {
    if (rawTitle.includes("dark grey")) color = "dark grey";
    else if (rawTitle.includes("dark gray")) color = "dark gray";
  }

  // 6. Detect Variant (clean token matching)
  for (const token of tokens) {
    const clean = cleanTokenStr(token);
    if (ELECTRONICS_VARIANTS.has(clean)) {
      variant = clean;
      break;
    }
  }

  // 7. Detect Processor (Smartphone, Laptop, Desktop)
  const procAppleMatch = rawTitle.match(/\b(?:apple\s+)?(m[1-4](?:\s+(?:pro|max|ultra))?)\b/i) ||
                         rawTitle.match(/\b(?:apple\s+)?(a\d{2}(?:\s+pro|\s+bionic)?)\b/i);
  const procSnapdragonMatch = rawTitle.match(/\b(snapdragon\s+(?:[0-9]+s?\s+gen\s+[0-9]+|[0-9]{3,4}[a-z]?|[0-9]\s+gen\s+[0-9]+|[a-z0-9]+))\b/i);
  const procDimensityMatch = rawTitle.match(/\b(?:mediatek\s+)?(dimensity\s+[0-9]{3,4}(?:\s*ultra|\s*\+)?)\b/i);
  const procExynosMatch = rawTitle.match(/\b(exynos\s+[0-9]{3,4})\b/i);
  const procTensorMatch = rawTitle.match(/\b(?:google\s+)?(tensor\s+g[1-4])\b/i);
  const procIntelMatch = rawTitle.match(/\b(?:intel\s+)?(core\s+ultra\s+[579](?:\s+[0-9]{3}[a-z]?)?|core\s+i[3579]-?[0-9]{4,5}[a-z]{0,2}|i[3579]-?[0-9]{4,5}[a-z]{0,2})\b/i);
  const procRyzenMatch = rawTitle.match(/\b(?:amd\s+)?(ryzen\s+(?:ai\s+9\s+hx\s+[0-9]{3}|[3579]\s+[0-9]{4}[a-z]{0,2}))\b/i);

  if (procAppleMatch) {
    const rawP = procAppleMatch[1].trim();
    processor = rawP.toLowerCase().startsWith("m") ? `Apple ${rawP.toUpperCase()}` : `Apple ${rawP.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}`;
  } else if (procSnapdragonMatch) {
    const rawP = procSnapdragonMatch[1].trim();
    processor = rawP.split(" ").map(w => w.length <= 2 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
  } else if (procDimensityMatch) {
    const rawP = procDimensityMatch[1].trim();
    processor = `MediaTek ${rawP.charAt(0).toUpperCase() + rawP.slice(1)}`;
  } else if (procExynosMatch) {
    const rawP = procExynosMatch[1].trim();
    processor = rawP.charAt(0).toUpperCase() + rawP.slice(1);
  } else if (procTensorMatch) {
    const rawP = procTensorMatch[1].trim();
    processor = `Google Tensor ${rawP.replace(/^tensor\s+/i, "").toUpperCase()}`;
  } else if (procIntelMatch) {
    const rawP = procIntelMatch[1].trim();
    if (/^i[3579]/i.test(rawP)) {
      processor = `Intel Core ${rawP.toUpperCase()}`;
    } else {
      processor = `Intel ${rawP.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}`;
    }
  } else if (procRyzenMatch) {
    const rawP = procRyzenMatch[1].trim();
    processor = `AMD ${rawP.split(" ").map(w => w.length <= 2 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}`;
  }

  if (processor) {
    processor = processor.replace(/\b([0-9]{4,5})([a-z]{1,3})\b/gi, (_, num, suf) => `${num}${suf.toUpperCase()}`);
  }

  // 8. Detect GPU
  const gpuNvidiaMatch = rawTitle.match(/\b(?:nvidia\s+geforce\s+|geforce\s+|nvidia\s+)?(rtx\s+[0-9]{4}(?:\s*ti)?|gtx\s+[0-9]{4}(?:\s*ti)?)\b/i);
  const gpuRadeonMatch = rawTitle.match(/\b(?:amd\s+)?(radeon\s+(?:rx\s+[0-9]{4}[a-z]?|[0-9]{3}m|graphics))\b/i);
  const gpuIntelMatch = rawTitle.match(/\b(intel\s+(?:iris\s+xe|arc\s+a[0-9]{3}m?|uhd\s+graphics))\b/i);
  const gpuAppleMatch = rawTitle.match(/\b([0-9]{1,2}-core\s+gpu)\b/i);

  if (gpuNvidiaMatch) {
    gpu = `NVIDIA GeForce ${gpuNvidiaMatch[1].toUpperCase()}`;
  } else if (gpuRadeonMatch) {
    gpu = `AMD ${gpuRadeonMatch[1].split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}`;
  } else if (gpuIntelMatch) {
    gpu = gpuIntelMatch[1].split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  } else if (gpuAppleMatch) {
    const cores = gpuAppleMatch[1].match(/\d+/);
    gpu = cores ? `${cores[0]}-Core GPU` : gpuAppleMatch[1];
  }

  if (gpu) {
    gpu = gpu.replace(/([0-9]{3,4})([a-z]{1,3})\b/gi, (_, num, suf) => `${num}${suf.toUpperCase()}`);
    gpu = gpu.replace(/\bti\b/gi, "Ti");
  }

  // 9. Detect Display Size (handles e.g. "16-inch", "15.6 inch", "27 inch")
  const sizeMatch = rawTitle.match(/\b([0-9]{1,2}(?:\.[0-9]{1,2})?)\s*-?\s*(?:inch|inches|in|″|")\b/i);
  if (sizeMatch) {
    displaySize = `${parseFloat(sizeMatch[1])} inch`;
  }

  // 10. Detect Resolution (supports FHD+, QHD+, 4K, 1920x1080)
  const pixelResMatch = rawTitle.match(/\b([0-9]{3,4}\s*x\s*[0-9]{3,4})\b/i);
  const namedResMatch = rawTitle.match(/\b(4k\s*uhd|4k\s*ultra\s*hd|4k|2\.5k|2k|1\.5k|qhd\+|wqhd|qhd|fhd\+|fhd|hd\+)/i);

  if (pixelResMatch) {
    resolution = pixelResMatch[1].replace(/\s+/g, "").toLowerCase();
  } else if (namedResMatch) {
    const r = namedResMatch[1].toLowerCase().replace(/\s+/g, "");
    if (r.includes("4k")) resolution = "4K";
    else if (r === "qhd+") resolution = "QHD+";
    else if (r === "qhd" || r === "wqhd") resolution = "QHD";
    else if (r === "2.5k") resolution = "2.5K";
    else if (r === "2k") resolution = "2K";
    else if (r === "1.5k") resolution = "1.5K";
    else if (r === "fhd+") resolution = "FHD+";
    else if (r === "fhd") resolution = "FHD";
    else if (r === "hd+") resolution = "HD+";
  }

  // 11. Detect Refresh Rate
  const refreshMatch = rawTitle.match(/\b([0-9]{2,3})\s*hz\b/i);
  if (refreshMatch) {
    refreshRate = `${refreshMatch[1]}Hz`;
  }

  // 12. Detect Display / Panel Technology
  const techMatch = rawTitle.match(/\b(super\s+amoled|ltpo\s+amoled|amoled|qd-oled|oled|mini-led|ips\s+lcd|ips\s+panel|ips|lcd|retina|liquid\s+retina)\b/i);
  if (techMatch) {
    const t = techMatch[1].toLowerCase();
    if (t.includes("super amoled")) displayTechnology = "Super AMOLED";
    else if (t.includes("ltpo amoled")) displayTechnology = "LTPO AMOLED";
    else if (t.includes("amoled")) displayTechnology = "AMOLED";
    else if (t.includes("qd-oled")) displayTechnology = "QD-OLED";
    else if (t.includes("oled")) displayTechnology = "OLED";
    else if (t.includes("mini-led")) displayTechnology = "Mini-LED";
    else if (t.includes("ips lcd") || t.includes("ips panel") || t.includes("ips")) displayTechnology = "IPS";
    else if (t.includes("liquid retina")) displayTechnology = "Liquid Retina";
    else if (t.includes("retina")) displayTechnology = "Retina";
    else if (t.includes("lcd")) displayTechnology = "LCD";
  }

  // Composite legacy display summary field
  const displayParts = [displaySize, resolution, refreshRate, displayTechnology].filter(Boolean);
  if (displayParts.length > 0) {
    display = displayParts.join(" ");
  }

  // 13. Detect Battery Capacity
  const mahMatch = rawTitle.match(/\b([0-9]{3,5})\s*mah\b/i);
  const whMatch = rawTitle.match(/\b([0-9]{2,3}(?:\.[0-9])?)\s*whr?\b/i);
  if (mahMatch) {
    batteryCapacity = `${mahMatch[1]}mAh`;
    battery = batteryCapacity;
  } else if (whMatch) {
    batteryCapacity = `${whMatch[1]}Wh`;
    battery = batteryCapacity;
  }

  // 14. Detect Charging Capability
  const chargingMatch = rawTitle.match(/\b([0-9]{2,3})\s*w\s*(?:fast\s*charg(?:ing|er)|charging|supervooc|supercharge|hypercharge|pd|watt)?\b/i);
  if (chargingMatch) {
    const hasChargingKeyword = /\b(charge|charging|charger|fast|supervooc|supercharge|hypercharge|pd|watt|watts)\b/i.test(rawTitle);
    const isAudioSpeaker = /\b(speaker|soundbar|rms|audio|subwoofer)\b/i.test(rawTitle);
    if (hasChargingKeyword && !isAudioSpeaker) {
      chargingCapability = `${chargingMatch[1]}W`;
    }
  }

  // 15. Detect Camera Specifications
  const multiCamMatch = rawTitle.match(/\b([0-9]{2,3}\s*mp\s*\+\s*[0-9]{2,3}\s*mp(?:\s*\+\s*[0-9]{2,3}\s*mp)*)\b/i);
  const singleCamMatch = rawTitle.match(/\b([0-9]{2,3}\s*mp)\b/i);
  if (multiCamMatch) {
    cameraSpecs = multiCamMatch[1].toUpperCase().replace(/\s+/g, " ").replace(/\s*\+\s*/g, " + ");
  } else if (singleCamMatch) {
    cameraSpecs = singleCamMatch[1].toUpperCase().replace(/\s+/g, "");
  }

  // 16. Detect Connectivity
  const connMatch = rawTitle.match(/\b(wi-?fi\s*\+\s*cellular|wi-?fi\s*only|dual\s*sim|esim|single\s*sim)\b/i);
  if (connMatch) {
    const c = connMatch[1].toLowerCase();
    if (c.includes("cellular")) connectivity = "Wi-Fi + Cellular";
    else if (c.includes("wifi only") || c.includes("wi-fi only")) connectivity = "Wi-Fi Only";
    else if (c.includes("dual sim")) connectivity = "Dual SIM";
    else if (c.includes("esim")) connectivity = "eSIM";
    else if (c.includes("single sim")) connectivity = "Single SIM";
  }

  // 17. Detect Network Generation
  const netMatch = rawTitle.match(/\b(5g|4g\s*lte|4g|3g)\b/i);
  if (netMatch) {
    const n = netMatch[1].toLowerCase().replace(/\s+/g, " ");
    if (n === "5g") networkGeneration = "5G";
    else if (n.includes("4g lte")) networkGeneration = "4G LTE";
    else if (n === "4g") networkGeneration = "4G";
    else if (n === "3g") networkGeneration = "3G";
  }

  // 18. Detect Operating System
  const osMatch = rawTitle.match(/\b(android\s*[0-9]{1,2}|android|ios\s*[0-9]{1,2}|ios|windows\s*11\s*(?:home|pro)?|windows\s*10|macos\s*[a-z]*|macos|chromeos|ipados)\b/i);
  if (osMatch) {
    const rawOs = osMatch[1].trim();
    if (/^android/i.test(rawOs)) {
      operatingSystem = rawOs.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    } else if (/^ios/i.test(rawOs)) {
      operatingSystem = rawOs.replace(/^ios/i, "iOS");
    } else if (/^windows/i.test(rawOs)) {
      operatingSystem = rawOs.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    } else if (/^macos/i.test(rawOs)) {
      operatingSystem = "macOS";
    } else if (/^chromeos/i.test(rawOs)) {
      operatingSystem = "ChromeOS";
    } else if (/^ipados/i.test(rawOs)) {
      operatingSystem = "iPadOS";
    }
  }

  // 19. Detect Ports
  const portMatch = rawTitle.match(/\b(usb-c|type-c|thunderbolt\s*[34]|hdmi\s*2\.1|hdmi\s*2\.0|hdmi|displayport\s*1\.4|displayport|3\.5mm)\b/i);
  if (portMatch) {
    const p = portMatch[1].toLowerCase();
    if (p === "usb-c" || p === "type-c") ports = "USB-C";
    else if (p.includes("thunderbolt 4")) ports = "Thunderbolt 4";
    else if (p.includes("thunderbolt 3")) ports = "Thunderbolt 3";
    else if (p.includes("hdmi 2.1")) ports = "HDMI 2.1";
    else if (p.includes("hdmi 2.0")) ports = "HDMI 2.0";
    else if (p.includes("hdmi")) ports = "HDMI";
    else if (p.includes("displayport 1.4")) ports = "DisplayPort 1.4";
    else if (p.includes("displayport")) ports = "DisplayPort";
    else if (p.includes("3.5mm")) ports = "3.5mm";
  }

  // 20. Detect Wireless Standards
  const wirelessMatch = rawTitle.match(/\b(wi-?fi\s*7|wi-?fi\s*6e|wi-?fi\s*6|bluetooth\s*5\.4|bluetooth\s*5\.3|bt\s*5\.3|bt\s*5\.4)\b/i);
  if (wirelessMatch) {
    const w = wirelessMatch[1].toLowerCase();
    if (w.includes("7")) wirelessStandards = "Wi-Fi 7";
    else if (w.includes("6e")) wirelessStandards = "Wi-Fi 6E";
    else if (w.includes("6")) wirelessStandards = "Wi-Fi 6";
    else if (w.includes("5.4")) wirelessStandards = "Bluetooth 5.4";
    else if (w.includes("5.3")) wirelessStandards = "Bluetooth 5.3";
  }

  // 21. Detect Product Generation
  const genMatch = rawTitle.match(/\b([0-9]{1,2}(?:st|nd|rd|th)?\s*gen(?:eration)?|gen\s*[0-9]{1,2})\b/i);
  if (genMatch) {
    const g = genMatch[1].toLowerCase().replace(/\s+/g, " ");
    if (g.startsWith("gen")) {
      generation = `Gen ${g.replace("gen", "").trim()}`;
    } else {
      const numMatch = g.match(/^([0-9]{1,2})/);
      if (numMatch) {
        generation = `${numMatch[1]}th Gen`;
      }
    }
  }

  // 22. Detect Region / Version Indicators
  const regionMatch = rawTitle.match(/\b(us\s+version|global\s+version|indian\s+variant|eu\s+version|uk\s+version|international\s+version|cn\s+version)\b/i);
  if (regionMatch) {
    const r = regionMatch[1].toLowerCase();
    if (r.includes("us version")) regionVersion = "US Version";
    else if (r.includes("global version")) regionVersion = "Global Version";
    else if (r.includes("indian variant")) regionVersion = "Indian Variant";
    else if (r.includes("eu version")) regionVersion = "EU Version";
    else if (r.includes("uk version")) regionVersion = "UK Version";
    else if (r.includes("international version")) regionVersion = "International Version";
    else if (r.includes("cn version")) regionVersion = "CN Version";
  }

  // 23. Detect Warranty Indicators
  const warrantyMatch = rawTitle.match(/\b([0-9]+\s*(?:year|yr|month|mo)s?\s*(?:manufacturer\s*)?warranty)\b/i);
  if (warrantyMatch) {
    const w = warrantyMatch[1].toLowerCase();
    if (w.includes("1 year") || w.includes("1 yr")) {
      warranty = w.includes("manufacturer") ? "1 Year Manufacturer Warranty" : "1 Year Warranty";
    } else if (w.includes("2 year") || w.includes("2 yr")) {
      warranty = w.includes("manufacturer") ? "2 Year Manufacturer Warranty" : "2 Year Warranty";
    } else if (w.includes("3 year") || w.includes("3 yr")) {
      warranty = "3 Year Warranty";
    } else if (w.includes("6 month") || w.includes("6 mo")) {
      warranty = "6 Months Warranty";
    } else {
      warranty = warrantyMatch[1].replace(/\b([a-z])/g, m => m.toUpperCase());
    }
  }

  return {
    ...createEmptyAttributes(),
    storage,
    ram,
    color,
    variant,
    processor,
    gpu,
    display,
    battery,

    displaySize,
    resolution,
    refreshRate,
    displayTechnology,
    batteryCapacity,
    chargingCapability,
    cameraSpecs,
    connectivity,
    networkGeneration,
    operatingSystem,
    ports,
    wirelessStandards,
    generation,
    regionVersion,
    warranty
  };
}
