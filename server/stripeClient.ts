import Stripe from "stripe";
import { StripeSync } from "stripe-replit-sync";

function getStripeKey(): string {
  if (process.env.STRIPE_SECRET_KEY) {
    return process.env.STRIPE_SECRET_KEY;
  }
  throw new Error("STRIPE_SECRET_KEY not configured");
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  const apiKey = getStripeKey();
  return new Stripe(apiKey, { apiVersion: "2024-06-20" });
}

export async function getStripeSync(): Promise<StripeSync> {
  const apiKey = getStripeKey();
  const databaseUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL required");
  return new StripeSync({ stripeSecretKey: apiKey, databaseUrl, autoExpandLists: false });
}
