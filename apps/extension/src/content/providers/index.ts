import type { MarketplaceProvider } from './types';
import { amazonProvider } from './amazon';
import { flipkartProvider } from './flipkart';
import { cromaProvider } from './croma';

export const providers: MarketplaceProvider[] = [
  amazonProvider,
  flipkartProvider,
  cromaProvider,
];

export * from './types';
