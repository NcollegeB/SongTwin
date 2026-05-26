import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);
}

export function stripeWebhookConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  stripeClient ??= new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-04-22.dahlia",
    typescript: true,
  });
  return stripeClient;
}

export function getSubscriptionPriceId() {
  if (!process.env.STRIPE_PRICE_ID) {
    throw new Error("STRIPE_PRICE_ID is not configured");
  }

  return process.env.STRIPE_PRICE_ID;
}

export function getStripeWebhookSecret() {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  }

  return process.env.STRIPE_WEBHOOK_SECRET;
}
