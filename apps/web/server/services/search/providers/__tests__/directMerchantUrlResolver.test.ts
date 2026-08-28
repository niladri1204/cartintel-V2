import { describe, test, expect, vi, beforeEach } from "vitest";
import {
  DirectMerchantUrlResolver,
  matchOrganicResultToOffer,
  isNonProductUrl,
} from "../../directMerchantUrlResolver";
import type { RawProductResult, SearchRequest } from "../../types";

const sampleRequest: SearchRequest = {
  normalizedTitle: "samsung galaxy a17 5g 128gb 6gb ram",
  brand: "samsung",
  model: "galaxy a17",
  category: "Smartphones",
  productType: "Smartphone",
  variant: "128gb",
  color: "black",
  storage: "128gb",
  ram: "6gb",
  fingerprint: "samsung|galaxy a17|128gb|6gb",
};

describe("Phase 4.11.1 — Direct Merchant URL Resolver Tests", () => {
  let resolver: DirectMerchantUrlResolver;

  beforeEach(() => {
    resolver = new DirectMerchantUrlResolver();
    vi.restoreAllMocks();
  });

  // Test 1: Existing direct merchant URL is preserved
  test("1. Existing direct merchant URL is preserved and not overwritten", async () => {
    const existingUrl = "https://www.croma.com/samsung-galaxy-a17-5g/p/319881";
    const items: RawProductResult[] = [
      {
        title: "Samsung Galaxy A17 5G",
        price: 24999,
        currency: "INR",
        url: existingUrl,
        source: "Croma",
        marketplace: "Croma",
      },
    ];

    const mockFetch = vi.fn();
    const result = await resolver.resolveMissingMerchantUrls(items, sampleRequest, "test_api_key", mockFetch);

    expect(result[0].url).toBe(existingUrl);
    expect(mockFetch).not.toHaveBeenCalled(); // No organic search needed since all URLs exist
  });

  // Test 2: Google Shopping URL is rejected
  test("2. Google Shopping and search URLs are rejected as product URLs", () => {
    expect(isNonProductUrl("https://www.google.com/search?ibp=oshop&q=samsung+a17")).toBe(true);
    expect(isNonProductUrl("https://shopping.google.com/product/12345")).toBe(true);
    expect(isNonProductUrl("https://www.amazon.in/s?k=samsung+galaxy+a17")).toBe(true);
    expect(isNonProductUrl("https://www.flipkart.com/search?q=samsung+a17")).toBe(true);
    expect(isNonProductUrl("https://www.croma.com/all-categories")).toBe(true);
  });

  // Test 3 & 4: Organic Amazon & Flipkart results resolve matching offers
  test("3 & 4. Organic Amazon and Flipkart results resolve unresolved offers", async () => {
    const items: RawProductResult[] = [
      {
        title: "Samsung Galaxy A17 5G (Black, 6GB RAM, 128GB Storage)",
        price: 22999,
        currency: "INR",
        url: "",
        source: "amazon.in",
        marketplace: "amazon.in",
      },
      {
        title: "Samsung Galaxy A17 5G (Black, 128 GB) (6 GB RAM)",
        price: 23999,
        currency: "INR",
        url: "",
        source: "Flipkart",
        marketplace: "Flipkart",
      },
    ];

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        organic: [
          {
            title: "Samsung Galaxy A17 5G (Black, 6GB RAM, 128GB Storage)",
            link: "https://www.amazon.in/Samsung-Galaxy-Storage-Corning-Gorilla/dp/B0GRBRJR71",
            snippet: "Buy Samsung Galaxy A17 5G with 6GB RAM and 128GB Storage",
          },
          {
            title: "Samsung Galaxy A17 5G (Black, 128 GB) (6 GB RAM)",
            link: "https://www.flipkart.com/samsung-galaxy-a17-5g-black-128-gb/p/itm123456",
            snippet: "Buy Samsung Galaxy A17 5G online at Flipkart",
          },
        ],
      }),
    });

    const result = await resolver.resolveMissingMerchantUrls(items, sampleRequest, "test_api_key", mockFetch);

    expect(result[0].url).toBe("https://www.amazon.in/Samsung-Galaxy-Storage-Corning-Gorilla/dp/B0GRBRJR71");
    expect(result[1].url).toBe("https://www.flipkart.com/samsung-galaxy-a17-5g-black-128-gb/p/itm123456");
  });

  // Test 5: Wrong merchant result is rejected
  test("5. Organic result from wrong merchant domain is rejected", () => {
    const amazonOffer: RawProductResult = {
      title: "Samsung Galaxy A17 5G 128GB",
      price: 22999,
      currency: "INR",
      url: "",
      source: "amazon.in",
      marketplace: "amazon.in",
    };

    const flipkartOrganic = {
      title: "Samsung Galaxy A17 5G 128GB",
      link: "https://www.flipkart.com/samsung-galaxy-a17-5g/p/itm123",
    };

    expect(matchOrganicResultToOffer(amazonOffer, flipkartOrganic)).toBe(false);

    // Reseller vs OEM (iCrescent must NOT receive apple.com)
    const iCrescentOffer: RawProductResult = {
      title: "Apple iPhone 16 128GB",
      price: 79900,
      currency: "INR",
      url: "",
      source: "iCrescent Apple Authorised Store",
      marketplace: "iCrescent",
    };

    const appleOrganic = {
      title: "Apple iPhone 16 128GB",
      link: "https://www.apple.com/in/shop/buy-iphone/iphone-16",
    };

    expect(matchOrganicResultToOffer(iCrescentOffer, appleOrganic)).toBe(false);

    // Official Apple Store CAN receive apple.com
    const appleOffer: RawProductResult = {
      title: "Apple iPhone 16 128GB",
      price: 79900,
      currency: "INR",
      url: "",
      source: "Apple Store",
      marketplace: "Apple",
    };
    expect(matchOrganicResultToOffer(appleOffer, appleOrganic)).toBe(true);

    // Aptronix receives aptronixindia.com
    const aptronixOffer: RawProductResult = {
      title: "Apple iPhone 16 128GB",
      price: 79900,
      currency: "INR",
      url: "",
      source: "Aptronix",
      marketplace: "Aptronix",
    };
    const aptronixOrganic = {
      title: "Apple iPhone 16 128GB",
      link: "https://www.aptronixindia.com/iphone-16",
    };
    expect(matchOrganicResultToOffer(aptronixOffer, aptronixOrganic)).toBe(true);
  });

  // Test 6: Wrong model, storage, RAM, or accessory result is rejected
  test("6. Wrong model, storage, RAM, or accessory organic result is rejected", () => {
    const offer: RawProductResult = {
      title: "Samsung Galaxy A17 5G (Black, 6GB RAM, 128GB Storage)",
      price: 22999,
      currency: "INR",
      url: "",
      source: "amazon.in",
      marketplace: "amazon.in",
    };

    // Storage mismatch (128GB vs 256GB)
    expect(
      matchOrganicResultToOffer(offer, {
        title: "Samsung Galaxy A17 5G (8GB RAM, 256GB Storage)",
        link: "https://www.amazon.in/dp/B0FW4FYCD3",
      })
    ).toBe(false);

    // Model mismatch (A17 vs M17)
    expect(
      matchOrganicResultToOffer(offer, {
        title: "Samsung Galaxy M17 5G (6GB RAM, 128GB Storage)",
        link: "https://www.amazon.in/dp/B0M17XYZ",
      })
    ).toBe(false);

    // Accessory (case/cover)
    expect(
      matchOrganicResultToOffer(offer, {
        title: "Samsung Galaxy A17 5G Back Cover Case",
        link: "https://www.amazon.in/dp/B0CASE123",
      })
    ).toBe(false);
  });

  // Test 7: Failed URL resolution does not remove the offer
  test("7. Failed URL resolution keeps the offer count unchanged and leaves url empty", async () => {
    const items: RawProductResult[] = [
      {
        title: "Samsung Galaxy A17 5G",
        price: 155,
        currency: "INR",
        url: "",
        source: "Meesho",
        marketplace: "Meesho",
      },
      {
        title: "Samsung Galaxy A17 5G",
        price: 33510,
        currency: "INR",
        url: "",
        source: "Desertcart",
        marketplace: "Desertcart",
      },
    ];

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ organic: [] as Array<{ title: string; link: string }> }),
    });

    const result = await resolver.resolveMissingMerchantUrls(items, sampleRequest, "test_api_key", mockFetch);

    // Both offers remain intact
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("Samsung Galaxy A17 5G");
    expect(result[0].price).toBe(155);
    expect(result[0].url).toBe("");
    expect(result[1].title).toBe("Samsung Galaxy A17 5G");
    expect(result[1].price).toBe(33510);
    expect(result[1].url).toBe("");
  });

  // Test 8: Resolver makes at most ONE organic request per comparison
  test("8. Resolver executes at most ONE organic request for multiple unresolved offers", async () => {
    const items: RawProductResult[] = [
      {
        title: "Samsung Galaxy A17 5G (Black, 6GB RAM, 128GB Storage)",
        price: 22999,
        currency: "INR",
        url: "",
        source: "amazon.in",
        marketplace: "amazon.in",
      },
      {
        title: "Samsung Galaxy A17 5G (Black, 128 GB)",
        price: 23999,
        currency: "INR",
        url: "",
        source: "Flipkart",
        marketplace: "Flipkart",
      },
      {
        title: "Samsung Galaxy A17 5G",
        price: 23499,
        currency: "INR",
        url: "",
        source: "JioMart Electronics",
        marketplace: "JioMart Electronics",
      },
      {
        title: "Samsung Galaxy A17 5G",
        price: 24999,
        currency: "INR",
        url: "",
        source: "Croma",
        marketplace: "Croma",
      },
    ];

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        organic: [
          {
            title: "Samsung Galaxy A17 5G (Black, 6GB RAM, 128GB Storage)",
            link: "https://www.amazon.in/dp/B0GRBRJR71",
          },
          {
            title: "Samsung Galaxy A17 5G (Black, 128 GB)",
            link: "https://www.flipkart.com/p/itm123",
          },
        ],
      }),
    });

    const result = await resolver.resolveMissingMerchantUrls(items, sampleRequest, "test_api_key", mockFetch);

    // EXACTLY 1 fetch call was made
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(4);
    expect(result[0].url).toBe("https://www.amazon.in/dp/B0GRBRJR71");
    expect(result[1].url).toBe("https://www.flipkart.com/p/itm123");
  });

  // Phase 5.X Hardening Tests:
  describe("Phase 5.X — URL Resolution Hardening Tests", () => {
    // A. "SPF 50" vs "SPF 50+" -> valid match
    test("A. 'SPF 50' vs 'SPF 50+' resolves as a valid match", () => {
      const offer: RawProductResult = {
        title: "Dot & Key Vitamin C + E Super Bright Sunscreen SPF 50+ PA++++ (50g)",
        price: 395,
        currency: "INR",
        url: "",
        source: "Nykaa",
        marketplace: "Nykaa",
      };
      const organic = {
        title: "Dot & Key Vitamin C + E Sunscreen SPF 50 PA+++ 50g - Buy Online at Nykaa",
        link: "https://www.nykaa.com/dot-key-vitamin-c-e-sunscreen-spf-50/p/12345",
      };
      expect(matchOrganicResultToOffer(offer, organic)).toBe(true);
    });

    // B. "500 ml" vs "500ml" -> valid match
    test("B. '500 ml' vs '500ml' resolves as a valid match", () => {
      const offer: RawProductResult = {
        title: "Cetaphil Gentle Skin Cleanser 500 ml",
        price: 999,
        currency: "INR",
        url: "",
        source: "Amazon.in",
        marketplace: "Amazon.in",
      };
      const organic = {
        title: "Cetaphil Gentle Skin Cleanser, 500ml with Niacinamide - Amazon.in",
        link: "https://www.amazon.in/Cetaphil-Gentle-Skin-Cleanser-500ml/dp/B000052YM7",
      };
      expect(matchOrganicResultToOffer(offer, organic)).toBe(true);
    });

    // C. punctuation/hyphen differences -> valid match
    test("C. punctuation and hyphen differences resolve as a valid match", () => {
      const offer: RawProductResult = {
        title: "MARS Long-Lasting Charming Eyes Liquid Eyeliner - 1ml - Black",
        price: 199,
        currency: "INR",
        url: "",
        source: "Purplle",
        marketplace: "Purplle",
      };
      const organic = {
        title: "MARS Long Lasting Charming Eyes Liquid Eyeliner (Black, 1 ml) - Purplle.com",
        link: "https://www.purplle.com/product/mars-long-lasting-eyeliner",
      };
      expect(matchOrganicResultToOffer(offer, organic)).toBe(true);
    });

    // D. merchant-added title words -> valid match
    test("D. merchant-added title words resolve as a valid match", () => {
      const offer: RawProductResult = {
        title: "Beardo Men Assorted Perfume Gift Set (4 x 20ml)",
        price: 499,
        currency: "INR",
        url: "",
        source: "Flipkart",
        marketplace: "Flipkart",
      };
      const organic = {
        title: "Buy Beardo Men Assorted Perfume Gift Set (4 x 20ml) Online at Best Price in India - Flipkart",
        link: "https://www.flipkart.com/beardo-men-assorted-perfume-gift-set/p/itm123",
      };
      expect(matchOrganicResultToOffer(offer, organic)).toBe(true);
    });

    // E. clearly different product with overlapping words -> rejected
    test("E. clearly different product with overlapping words is rejected", () => {
      const offer: RawProductResult = {
        title: "Cetaphil Gentle Skin Cleanser 500ml",
        price: 999,
        currency: "INR",
        url: "",
        source: "Amazon.in",
        marketplace: "Amazon.in",
      };
      const organic = {
        title: "Cetaphil Daily Facial Moisturizer 500ml - Amazon.in",
        link: "https://www.amazon.in/Cetaphil-Daily-Facial-Moisturizer/dp/B000012345",
      };
      expect(matchOrganicResultToOffer(offer, organic)).toBe(false);
    });

    // F. brand mismatch -> rejected
    test("F. brand mismatch is rejected", () => {
      const offer: RawProductResult = {
        title: "Minimalist 2% Salicylic Acid Cleanser 100ml",
        price: 299,
        currency: "INR",
        url: "",
        source: "Nykaa",
        marketplace: "Nykaa",
      };
      const organic = {
        title: "The Derma Co 2% Salicylic Acid Face Cleanser 100ml - Nykaa",
        link: "https://www.nykaa.com/the-derma-co-2percent-salicylic-cleanser/p/9999",
      };
      expect(matchOrganicResultToOffer(offer, organic)).toBe(false);
    });

    // G. wrong merchant domain -> rejected
    test("G. organic result from wrong merchant domain is rejected", () => {
      const offer: RawProductResult = {
        title: "Minimalist 2% Salicylic Acid Cleanser 100ml",
        price: 299,
        currency: "INR",
        url: "",
        source: "Nykaa",
        marketplace: "Nykaa",
      };
      const organic = {
        title: "Minimalist 2% Salicylic Acid Cleanser 100ml",
        link: "https://www.amazon.in/Minimalist-Salicylic-Cleanser/dp/B0123456",
      };
      expect(matchOrganicResultToOffer(offer, organic)).toBe(false);
    });
  });
});
