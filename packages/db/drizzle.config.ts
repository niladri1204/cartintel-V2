import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from apps/web/.env.local if available
dotenv.config({ path: path.resolve(__dirname, "../../apps/web/.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../../apps/web/.env") });
dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn("DATABASE_URL is not set in environment or apps/web/.env.local");
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./src/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl || "",
  },
  verbose: true,
  strict: true,
});
