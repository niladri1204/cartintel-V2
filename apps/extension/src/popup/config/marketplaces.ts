
export interface MarketplaceConfig {
  name: string;
  themeColor: string;
}

export const marketplaces: Record<string, MarketplaceConfig> = {
  Amazon: { name: "Amazon", themeColor: "bg-orange-500" },
  Flipkart: { name: "Flipkart", themeColor: "bg-blue-600" },
  Croma: { name: "Croma", themeColor: "bg-teal-600" },
  "Reliance Digital": { name: "Reliance Digital", themeColor: "bg-red-600" },
  Myntra: { name: "Myntra", themeColor: "bg-pink-500" },
  Ajio: { name: "Ajio", themeColor: "bg-gray-800" },
  "Amazon Fashion": { name: "Amazon Fashion", themeColor: "bg-orange-500" },
  Nykaa: { name: "Nykaa", themeColor: "bg-rose-500" },
  Purplle: { name: "Purplle", themeColor: "bg-purple-600" },
  Blinkit: { name: "Blinkit", themeColor: "bg-yellow-500" },
  Zepto: { name: "Zepto", themeColor: "bg-indigo-600" },
  BigBasket: { name: "BigBasket", themeColor: "bg-green-600" },
  Default: { name: "Store", themeColor: "bg-gray-500" },
};

export function getMarketplaceConfig(name: string): MarketplaceConfig {
  return marketplaces[name] || marketplaces.Default;
}
