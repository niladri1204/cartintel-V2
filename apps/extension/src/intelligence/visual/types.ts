export type VisualRecognitionStatus =
  | "recognized"
  | "partially_recognized"
  | "uncertain"
  | "unknown"
  | "unavailable";

export interface VisualEvidence {
  source: "text" | "logo" | "shape" | "layout" | "ocr" | "model_features" | "other";
  description: string;
  confidence?: number; // 0 to 1
}

export interface VisualAttributes {
  color?: string | null;
  shape?: string | null;
  design?: string | null;
  material?: string | null;
  accessories?: string[] | null;
  formFactor?: string | null;
  visualCategory?: string | null;
  [key: string]: any; // Allow extensibility for future categories
}

export interface VisualProductRecognitionResult {
  status: VisualRecognitionStatus;
  category: string | null;
  brand: string | null;
  model: string | null;
  productType: string | null;
  visualAttributes: VisualAttributes;
  confidence: number | null; // 0 to 1
  evidence: VisualEvidence[];
  rawResponse?: any; // Underlying provider response details if needed
}

export interface ImageInput {
  url?: string | null;       // Standard web URL or base64 data URL
  base64?: string | null;    // Raw base64 data (without mime type prefix)
  mimeType?: string | null;  // e.g. "image/jpeg", "image/png"
  images?: ImageInput[] | null; // Optional list of images for batch recognition
  metadata?: {
    type?: "product_image" | "shopping_page_screenshot" | "product_screenshot";
    filename?: string;
    width?: number;
    height?: number;
    [key: string]: any;
  };
}
