import { describe, test } from 'vitest';
import { processProduct } from '../engine';
import { compareProducts } from '../matching';

describe('Diagnostic Runner for Nothing Phone (3) vs Real Market Candidates', () => {
  test('Detailed Diagnostic of Current Product and SerpApi Candidates', () => {
    const currentTitle = "Nothing Phone (3), Black (12GB, 256GB) | Snapdragon 8s Gen 4 | 50MP + 50MP + 50MP Rear Camera | 1.5K+ 120Hz AMOLED Flexible LTPS Display";

    const currentProduct = processProduct({
      title: currentTitle,
      price: 50000,
      currency: "INR",
      image: "http://example.com/img.jpg",
      url: "http://example.com",
      hostname: "amazon.in"
    });

    console.log("=== CURRENT PRODUCT DIAGNOSTIC ===");
    console.log("originalTitle:", currentProduct.originalTitle);
    console.log("brand:", currentProduct.brand);
    console.log("model:", currentProduct.model);
    console.log("ram:", currentProduct.ram);
    console.log("storage:", currentProduct.storage);
    console.log("color:", currentProduct.color);
    console.log("variant:", currentProduct.variant);
    console.log("fingerprint:", currentProduct.fingerprint);
    console.log("===================================\n");

    const candidateTitles = [
      { title: "Nothing Phone (2a) 5G (Black, 128 GB) (8 GB RAM)", marketplace: "Flipkart" },
      { title: "Nothing Phone (2a) 5G (White, 256 GB) (12 GB RAM)", marketplace: "Croma" },
      { title: "Nothing Phone 2a Special Edition 128 GB (8 GB RAM)", marketplace: "Vijay Sales" },
      { title: "Nothing Phone (2) 5G (Dark Grey, 256 GB) (12 GB RAM)", marketplace: "Flipkart" },
      { title: "Nothing Phone 2 5G (White, 512 GB) (12 GB RAM)", marketplace: "Amazon.in" },
      { title: "Nothing CMF Phone 1 5G (Black, 128 GB) (6 GB RAM)", marketplace: "Flipkart" },
      { title: "Nothing Ear (2) TWS Wireless Earbuds (White)", marketplace: "Myntra" },
      { title: "Nothing Ear (a) TWS Wireless Earphones (Yellow)", marketplace: "Flipkart" }
    ];

    console.log("=== SERPAPI CANDIDATES DIAGNOSTIC ===\n");

    candidateTitles.forEach((item, idx) => {
      const candidateIntel = processProduct({
        title: item.title,
        price: 30000,
        currency: "INR",
        image: "http://example.com/img.jpg",
        url: "http://example.com",
        hostname: item.marketplace
      });

      const match = compareProducts(currentProduct, candidateIntel);

      console.log(`--- CANDIDATE #${idx + 1} ---`);
      console.log("title:", candidateIntel.originalTitle);
      console.log("marketplace:", item.marketplace);
      console.log("brand:", candidateIntel.brand);
      console.log("model:", candidateIntel.model);
      console.log("ram:", candidateIntel.ram);
      console.log("storage:", candidateIntel.storage);
      console.log("color:", candidateIntel.color);
      console.log("variant:", candidateIntel.variant);
      console.log("fingerprint:", candidateIntel.fingerprint);
      console.log("match score:", match.score);
      console.log("isMatch:", match.isMatch);
      console.log("decision:", match.decision);
      console.log("similarityType:", match.similarityType);
      console.log("mismatchedFields:", match.mismatchedFields);
      console.log("-----------------------\n");
    });
  });
});
