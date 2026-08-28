export interface ProductDetectionResult {
  isProductPage: boolean;
  title: string | null;
  brand?: string | null;
  price: number | null;
  currency: string | null;
  image: string | null;
  url: string;
  hostname: string;
}
