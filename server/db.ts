import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

if (!process.env.NEON_DATABASE_URL) {
  console.warn("[db] NEON_DATABASE_URL not set — using local DATABASE_URL as fallback");
} else {
  console.log("[db] Connected to Neon database");
}

export const pool = new pg.Pool({ connectionString });
export const db = drizzle(pool, { schema });
