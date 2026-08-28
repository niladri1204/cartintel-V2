import { client, db, brands } from "../index";

async function main() {
  console.log("Testing PostgreSQL connection...");
  try {
    const result = await client`SELECT current_user, current_database(), version()`;
    console.log("[DB Info]:", result);

    const brandsList = await db.select().from(brands).limit(5);
    console.log("[Brands Query Success]:", brandsList);
    console.log("Database connection & query test PASSED!");
  } catch (err: any) {
    console.error("[DB Error]:", err.message || err);
  } finally {
    await client.end();
  }
}

main();
