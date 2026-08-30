import { describe, test, expect, afterAll } from "vitest";
import {
  db,
  client,
  brands,
  merchants,
  canonicalProducts,
  productVariants,
  offers,
  offerPriceHistory,
  recommendationSessions,
  recommendationOffers,
  eq,
  and,
} from "@repo/db";
import { intelligencePersistenceService } from "../services/persistence/intelligencePersistenceService";
import { isVerifiedMerchantUrl } from "../services/persistence/validation";

describe("Phase 6.3 — PostgreSQL Real Intelligence Persistence Suite", () => {
  const testRunId = Date.now();
  const testBrandSlug = `mars-test-${testRunId}`;
  const testMerchantHost = `zepto-test-${testRunId}.in`;

  afterAll(async () => {
    // Clean up test records created during testing
    try {
      await db.delete(brands).where(eq(brands.slug, testBrandSlug));
      await db.delete(merchants).where(eq(merchants.hostname, testMerchantHost));
    } catch (e) {
      // Ignore cleanup error if already removed by cascades
    }
    await client.end();
  });

  test("1. URL Safety: Rejects Google Shopping redirects, ad tracking links, and proxy URLs", () => {
    expect(isVerifiedMerchantUrl("https://www.amazon.in/dp/B0CSZD1S7S")).toBe(true);
    expect(isVerifiedMerchantUrl("https://zepto.in/p/item-123")).toBe(true);
    expect(isVerifiedMerchantUrl("https://www.myntra.com/lip-balm/mars/123")).toBe(true);

    // Unresolved / proxy / ad URLs must be rejected
    expect(isVerifiedMerchantUrl("https://www.google.com/shopping/product/12345?prds=...&utm_source=...")).toBe(false);
    expect(isVerifiedMerchantUrl("https://googleadservices.com/pagead/aclk?sa=L&ai=...")).toBe(false);
    expect(isVerifiedMerchantUrl("https://serper.dev/search/proxy?url=...")).toBe(false);
    expect(isVerifiedMerchantUrl("http://insecure-http.com/p/123")).toBe(false);
    expect(isVerifiedMerchantUrl("")).toBe(false);
    expect(isVerifiedMerchantUrl(null)).toBe(false);
  });

  test("2. Persists a complete recommendation session with anchor product and candidate offers", async () => {
    const payload = {
      sessionToken: `sess_${testRunId}`,
      queryText: "MARS Candylicious Coloured Lip Balm",
      status: "completed",
      confidence: 95,
      decisionReasons: [
        {
          code: "CHEAPEST_OFFER_SELECTED",
          category: "offer",
          headline: "Lowest Available Price",
          detail: "Amazon offers the lowest price of ₹329.",
        },
      ],
      tradeOffs: [] as any[],
      anchorProduct: {
        brandName: `MARS Test ${testRunId}`,
        brandCategory: "Beauty & Personal Care",
        brandConfidence: 95,
        productTitle: "MARS Candylicious Coloured Lip Balm - 3.5g",
        normalizedModel: "candylicious coloured lip balm",
        category: "Beauty & Personal Care",
        productType: "Lip Product",
        canonicalFingerprint: `mars|candylicious coloured lip balm|balm|${testRunId}`,
        shade: "Pink Flavour",
        packCount: 1,
      },
      offers: [
        {
          merchantName: `Zepto Test ${testRunId}`,
          merchantHostname: testMerchantHost,
          merchantDomain: testMerchantHost,
          brandName: `MARS Test ${testRunId}`,
          productTitle: "MARS Candylicious Coloured Lip Balm 3.5g",
          normalizedModel: "candylicious coloured lip balm",
          category: "Beauty & Personal Care",
          productType: "Lip Product",
          canonicalFingerprint: `mars|candylicious coloured lip balm|balm|${testRunId}`,
          originalTitle: "MARS Candylicious Coloured Lip Balm 3.5g - Zepto",
          originalUrl: `https://${testMerchantHost}/p/mars-lip-balm`,
          currentPrice: 349,
          currency: "INR",
          isAvailable: true,
          qualityScore: 90,
          marketplaceReliabilityScore: 85,
          offerRole: "eligible",
        },
        {
          merchantName: `Amazon Test ${testRunId}`,
          merchantHostname: `amazon-test-${testRunId}.in`,
          merchantDomain: `amazon-test-${testRunId}.in`,
          brandName: `MARS Test ${testRunId}`,
          productTitle: "MARS Candylicious Coloured Lip Balm 3.5g",
          normalizedModel: "candylicious coloured lip balm",
          category: "Beauty & Personal Care",
          productType: "Lip Product",
          canonicalFingerprint: `mars|candylicious coloured lip balm|balm|${testRunId}`,
          originalTitle: "MARS Candylicious Coloured Lip Balm 3.5g - Amazon",
          originalUrl: `https://amazon-test-${testRunId}.in/dp/B0TESTMARS`,
          currentPrice: 329,
          currency: "INR",
          isAvailable: true,
          qualityScore: 95,
          marketplaceReliabilityScore: 95,
          offerRole: "cheapest",
        },
      ],
      cheapestOfferMatchKey: `amazon-test-${testRunId}.in|https://amazon-test-${testRunId}.in/dp/B0TESTMARS`,
    };

    const result = await intelligencePersistenceService.persistRecommendationTransaction(payload);
    expect(result.success).toBe(true);
    expect(result.sessionId).toBeDefined();
    expect(result.persistedOffersCount).toBe(2);

    // Verify session record in database
    const session = await db
      .select()
      .from(recommendationSessions)
      .where(eq(recommendationSessions.id, result.sessionId!));
    expect(session.length).toBe(1);
    expect(session[0].confidence).toBe(95);
    expect(session[0].cheapestOfferId).toBeDefined();

    // Verify initial price history was created
    const offerRows = await db
      .select()
      .from(offers)
      .where(eq(offers.originalUrl, `https://amazon-test-${testRunId}.in/dp/B0TESTMARS`));
    expect(offerRows.length).toBe(1);

    const priceHistories = await db
      .select()
      .from(offerPriceHistory)
      .where(eq(offerPriceHistory.offerId, offerRows[0].id));
    expect(priceHistories.length).toBe(1);
    expect(Number(priceHistories[0].price)).toBe(329);
  });

  test("3. Idempotency: Repeated persistence of identical payload creates 0 duplicate rows", async () => {
    const payload = {
      sessionToken: `sess_idempotent_${testRunId}`,
      queryText: "MARS Candylicious Coloured Lip Balm",
      status: "completed",
      confidence: 95,
      anchorProduct: {
        brandName: `MARS Test ${testRunId}`,
        productTitle: "MARS Candylicious Coloured Lip Balm - 3.5g",
        normalizedModel: "candylicious coloured lip balm",
        category: "Beauty & Personal Care",
        canonicalFingerprint: `mars|candylicious coloured lip balm|balm|${testRunId}`,
      },
      offers: [
        {
          merchantName: `Zepto Test ${testRunId}`,
          merchantHostname: testMerchantHost,
          merchantDomain: testMerchantHost,
          brandName: `MARS Test ${testRunId}`,
          productTitle: "MARS Candylicious Coloured Lip Balm 3.5g",
          normalizedModel: "candylicious coloured lip balm",
          category: "Beauty & Personal Care",
          canonicalFingerprint: `mars|candylicious coloured lip balm|balm|${testRunId}`,
          originalTitle: "MARS Candylicious Coloured Lip Balm 3.5g - Zepto",
          originalUrl: `https://${testMerchantHost}/p/mars-lip-balm`,
          currentPrice: 349,
          currency: "INR",
          isAvailable: true,
        },
      ],
    };

    // Run 1
    const res1 = await intelligencePersistenceService.persistRecommendationTransaction(payload);
    expect(res1.success).toBe(true);

    // Run 2 (exact same payload)
    const res2 = await intelligencePersistenceService.persistRecommendationTransaction(payload);
    expect(res2.success).toBe(true);

    // Check count of variants and offers - MUST remain 1
    const variants = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.canonicalFingerprint, `mars|candylicious coloured lip balm|balm|${testRunId}`));
    expect(variants.length).toBe(1);

    const offerRecords = await db
      .select()
      .from(offers)
      .where(eq(offers.originalUrl, `https://${testMerchantHost}/p/mars-lip-balm`));
    expect(offerRecords.length).toBe(1);

    // Price unchanged -> Price history rows MUST remain 1
    const historyRows = await db
      .select()
      .from(offerPriceHistory)
      .where(eq(offerPriceHistory.offerId, offerRecords[0].id));
    expect(historyRows.length).toBe(1);
  });

  test("4. Price History: Price drop triggers exactly one new price history record", async () => {
    const payload = {
      sessionToken: `sess_price_drop_${testRunId}`,
      status: "completed",
      confidence: 95,
      anchorProduct: {
        brandName: `MARS Test ${testRunId}`,
        productTitle: "MARS Candylicious Coloured Lip Balm - 3.5g",
        normalizedModel: "candylicious coloured lip balm",
        category: "Beauty & Personal Care",
        canonicalFingerprint: `mars|candylicious coloured lip balm|balm|${testRunId}`,
      },
      offers: [
        {
          merchantName: `Zepto Test ${testRunId}`,
          merchantHostname: testMerchantHost,
          merchantDomain: testMerchantHost,
          brandName: `MARS Test ${testRunId}`,
          productTitle: "MARS Candylicious Coloured Lip Balm 3.5g",
          normalizedModel: "candylicious coloured lip balm",
          category: "Beauty & Personal Care",
          canonicalFingerprint: `mars|candylicious coloured lip balm|balm|${testRunId}`,
          originalTitle: "MARS Candylicious Coloured Lip Balm 3.5g - Zepto",
          originalUrl: `https://${testMerchantHost}/p/mars-lip-balm`,
          currentPrice: 299, // Price dropped from 349 to 299
          currency: "INR",
          isAvailable: true,
        },
      ],
    };

    const res = await intelligencePersistenceService.persistRecommendationTransaction(payload);
    expect(res.success).toBe(true);

    const offerRecords = await db
      .select()
      .from(offers)
      .where(eq(offers.originalUrl, `https://${testMerchantHost}/p/mars-lip-balm`));
    expect(offerRecords.length).toBe(1);
    expect(Number(offerRecords[0].currentPrice)).toBe(299);

    // Price changed -> Price history rows MUST now be exactly 2 (initial 349, new 299)
    const historyRows = await db
      .select()
      .from(offerPriceHistory)
      .where(eq(offerPriceHistory.offerId, offerRecords[0].id));
    expect(historyRows.length).toBe(2);
    expect(historyRows.map((h) => Number(h.price))).toContain(299);
  });

  test("5. Brandless Products: Persists canonical product with brand_id = NULL without inserting fake brand", async () => {
    const brandlessFingerprint = `generic|unbranded white cotton t-shirt|xl|${testRunId}`;
    const payload = {
      sessionToken: `sess_brandless_${testRunId}`,
      status: "completed",
      confidence: 85,
      anchorProduct: {
        brandName: null as string | null, // Legitimate brandless product
        productTitle: "Unbranded White Cotton T-Shirt XL",
        normalizedModel: "white cotton t-shirt",
        category: "Clothing",
        productType: "T-Shirt",
        canonicalFingerprint: brandlessFingerprint,
        size: "XL",
        color: "White",
      },
      offers: [
        {
          merchantName: `Myntra Test ${testRunId}`,
          merchantHostname: `myntra-test-${testRunId}.com`,
          merchantDomain: `myntra-test-${testRunId}.com`,
          brandName: null as string | null, // Brandless
          productTitle: "Unbranded White Cotton T-Shirt XL",
          normalizedModel: "white cotton t-shirt",
          category: "Clothing",
          productType: "T-Shirt",
          canonicalFingerprint: brandlessFingerprint,
          originalTitle: "Unbranded White Cotton T-Shirt XL - Myntra",
          originalUrl: `https://myntra-test-${testRunId}.com/p/tshirt-xl`,
          currentPrice: 499,
          currency: "INR",
          isAvailable: true,
        },
      ],
    };

    const res = await intelligencePersistenceService.persistRecommendationTransaction(payload);
    expect(res.success).toBe(true);

    // Verify canonical product has brand_id = null
    const variants = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.canonicalFingerprint, brandlessFingerprint));
    expect(variants.length).toBe(1);

    const canonicals = await db
      .select()
      .from(canonicalProducts)
      .where(eq(canonicalProducts.id, variants[0].productId));
    expect(canonicals.length).toBe(1);
    expect(canonicals[0].brandId).toBeNull();
  });

  test("6. Variant Separation: 128GB and 256GB listings remain separate variant records", async () => {
    const fp128 = `samsung|galaxy s24|128gb|${testRunId}`;
    const fp256 = `samsung|galaxy s24|256gb|${testRunId}`;

    const payload = {
      sessionToken: `sess_variants_${testRunId}`,
      status: "completed",
      confidence: 95,
      anchorProduct: {
        brandName: `Samsung Test ${testRunId}`,
        productTitle: "Samsung Galaxy S24 128GB",
        normalizedModel: "galaxy s24",
        category: "Electronics",
        productType: "Smartphone",
        canonicalFingerprint: fp128,
        storage: "128GB",
      },
      offers: [
        {
          merchantName: `Amazon Test ${testRunId}`,
          merchantHostname: `amazon-test-${testRunId}.in`,
          merchantDomain: `amazon-test-${testRunId}.in`,
          brandName: `Samsung Test ${testRunId}`,
          productTitle: "Samsung Galaxy S24 128GB",
          normalizedModel: "galaxy s24",
          category: "Electronics",
          productType: "Smartphone",
          canonicalFingerprint: fp128,
          storage: "128GB",
          originalTitle: "Samsung Galaxy S24 (128 GB)",
          originalUrl: `https://amazon-test-${testRunId}.in/dp/B0S24128`,
          currentPrice: 69999,
          currency: "INR",
          isAvailable: true,
        },
        {
          merchantName: `Amazon Test ${testRunId}`,
          merchantHostname: `amazon-test-${testRunId}.in`,
          merchantDomain: `amazon-test-${testRunId}.in`,
          brandName: `Samsung Test ${testRunId}`,
          productTitle: "Samsung Galaxy S24 256GB",
          normalizedModel: "galaxy s24",
          category: "Electronics",
          productType: "Smartphone",
          canonicalFingerprint: fp256,
          storage: "256GB",
          originalTitle: "Samsung Galaxy S24 (256 GB)",
          originalUrl: `https://amazon-test-${testRunId}.in/dp/B0S24256`,
          currentPrice: 74999,
          currency: "INR",
          isAvailable: true,
        },
      ],
    };

    const res = await intelligencePersistenceService.persistRecommendationTransaction(payload);
    expect(res.success).toBe(true);

    const var128 = await db.select().from(productVariants).where(eq(productVariants.canonicalFingerprint, fp128));
    const var256 = await db.select().from(productVariants).where(eq(productVariants.canonicalFingerprint, fp256));

    expect(var128.length).toBe(1);
    expect(var256.length).toBe(1);
    expect(var128[0].id).not.toBe(var256[0].id);
    expect(var128[0].storage).toBe("128GB");
    expect(var256[0].storage).toBe("256GB");
  });

  test("7. Failure Isolation: Invalid payload fails gracefully with error message without crashing", async () => {
    const invalidPayload = {
      status: "completed",
      anchorProduct: null as any, // Invalid
    };

    const res = await intelligencePersistenceService.persistRecommendationTransaction(invalidPayload);
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
  });
});
