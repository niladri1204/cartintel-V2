import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import * as schema from "./schema";

// Load environment variables if not already set
function loadEnv() {
  const candidates = [
    path.resolve(process.cwd(), ".env.local"),
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "apps/web/.env.local"),
    path.resolve(process.cwd(), "apps/web/.env"),
    path.resolve(__dirname, "../../apps/web/.env.local"),
    path.resolve(__dirname, "../../../apps/web/.env.local"),
    path.resolve(__dirname, "../../.env.local"),
  ];

  for (const envPath of candidates) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
      if (process.env.DATABASE_URL) {
        break;
      }
    }
  }
}

if (!process.env.DATABASE_URL) {
  loadEnv();
}

const connectionString = process.env.DATABASE_URL || "";

// Create postgres client for queries
export const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// Create drizzle database instance
export const db = drizzle(client, { schema });

export * from "./schema";
export * from "./repositories";
export { sql, eq, and, or, desc, asc, inArray, isNull, isNotNull } from "drizzle-orm";
