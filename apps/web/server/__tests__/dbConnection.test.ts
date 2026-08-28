import { describe, test, expect, afterAll } from "vitest";
import { db, client, brands, eq } from "@repo/db";

describe("Phase 6.2 — PostgreSQL + Drizzle ORM Database Connection Verification", () => {
  afterAll(async () => {
    // Close the postgres connection pool cleanly after tests
    await client.end();
  });

  test("1. Successfully queries PostgreSQL server metadata and version", async () => {
    const result = await client`SELECT current_user, current_database(), version()`;
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].current_user).toBe("cartintel_user");
    expect(result[0].current_database).toBe("cartintel_db");
  });

  test("2. Successfully queries brands table using Drizzle ORM", async () => {
    const initialBrands = await db.select().from(brands).limit(5);
    expect(Array.isArray(initialBrands)).toBe(true);
  });

  test("3. Inserts and retrieves a test canonical brand record", async () => {
    const testSlug = `test-brand-${Date.now()}`;
    const [inserted] = await db
      .insert(brands)
      .values({
        name: "Test Mars Brand",
        slug: testSlug,
        domainCategory: "Beauty & Personal Care",
        confidence: 95,
        source: "system",
      } as any)
      .returning();

    expect(inserted).toBeDefined();
    expect(inserted.id).toBeDefined();
    expect(inserted.name).toBe("Test Mars Brand");
    expect(inserted.slug).toBe(testSlug);

    // Retrieve via Drizzle select query
    const [fetched] = await db
      .select()
      .from(brands)
      .where(eq(brands.slug, testSlug));

    expect(fetched).toBeDefined();
    expect(fetched.id).toBe(inserted.id);

    // Clean up test record
    await db.delete(brands).where(eq(brands.slug, testSlug));
  });
});
