import type { MarketplaceProvider } from './types';
import { amazonProvider } from './amazon';
import { flipkartProvider } from './flipkart';
import { cromaProvider } from './croma';
import { myntraProvider } from './myntra';
import { nykaaProvider } from './nykaa';
import { purplleProvider } from './purplle';
import { newmeProvider } from './newme';
import { savanaProvider } from './savana';
import { universalProvider } from './universal';

export const providers: MarketplaceProvider[] = [
  amazonProvider,
  flipkartProvider,
  cromaProvider,
  myntraProvider,
  nykaaProvider,
  purplleProvider,
  newmeProvider,
  savanaProvider,
  universalProvider // Generic smart fallback for all other sites
];

export * from './types';
