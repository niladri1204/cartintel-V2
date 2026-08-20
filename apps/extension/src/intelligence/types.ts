export interface ProductIntelligence {
  // Raw Information
  originalTitle: string | null;
  originalPrice: number | null;
  originalCurrency: string | null;
  originalImage?: string | null;
  originalUrl?: string | null;

  // Extracted Information
  brand: string | null;
  category: string | null;
  subcategory?: string | null;
  productType?: string | null;
  variant?: string | null;
  
  quantity?: number | null;
  unit?: string | null;
  packSize?: number | null;
  
  color?: string | null;
  model?: string | null;
  size?: string | null;
  material?: string | null;
  gender?: string | null;
  storage?: string | null;
  ram?: string | null;
  packCount?: number | null;
  language?: string | null;
  edition?: string | null;
  attributes?: string[];
  
  // Phase 2.1 Deep Electronics Specifications
  processor?: string | null;
  gpu?: string | null;
  displaySize?: string | null;
  resolution?: string | null;
  refreshRate?: string | null;
  displayTechnology?: string | null;
  batteryCapacity?: string | null;
  chargingCapability?: string | null;
  cameraSpecs?: string | null;
  connectivity?: string | null;
  networkGeneration?: string | null;
  operatingSystem?: string | null;
  ports?: string | null;
  wirelessStandards?: string | null;
  generation?: string | null;
  regionVersion?: string | null;
  warranty?: string | null;
  variantSignature?: string | null;

  normalizedTitle?: string | null;

  // Metadata
  metadata?: {
    marketplace: string;
    marketplaceLogo?: string | null;
    googleShoppingProductLink?: string | null;
    googleProductId?: string;
    googleImmersiveToken?: string;
    hostname: string;
    detectedAt: number;
  };

  confidence?: number;
  fingerprint: string;
}
