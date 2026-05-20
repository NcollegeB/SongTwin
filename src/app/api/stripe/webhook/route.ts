import { NextRequest, NextResponse } from "next/server";
import {
  findUidByStripeCustomer,
  saveStripeCustomer,
  syncSubscriptionToAccount,
} from "@/lib/account";
import { getStripe, getStripeWebhookSecret, stripeWebhookConfigured } from "@/lib/stripe-server";
import type Stripe from "stripe";

export const runtime = "nodejs";

function customerIdFromSubscription(subscription: Stripe.Subscription) {
  return typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer.id;
}

async function uidForSubscription(subscription: Stripe.Subscription) {
  const customerId = customerIdFromSubscription(subscription);
  return subscription.metadata.firebaseUid || (await findUidByStripeCustomer(customerId));
}

export async function POST(request: NextRequest) {
  if (!stripeWebhookConfigured()) {
    return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 503 });
  }

  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");
  const body = await request.text();

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, getStripeWebhookSecret());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid Stripe webhook signature." },
      { status: 400 },
    );
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const uid = session.metadata?.firebaseUid || session.client_reference_id;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
      const subscriptionId =
        typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

      if (uid && customerId) {
        await saveStripeCustomer(uid, customerId);
      }

      if (uid && subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await syncSubscriptionToAccount(uid, subscription);
      }
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      const uid = await uidForSubscription(subscription);
      if (uid) {
        await syncSubscriptionToAccount(uid, subscription);
      }
    }

    if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId =
        typeof invoice.parent?.subscription_details?.subscription === "string"
          ? invoice.parent.subscription_details.subscription
          : invoice.parent?.subscription_details?.subscription?.id;

      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const uid = await uidForSubscription(subscription);
        if (uid) {
          await syncSubscriptionToAccount(uid, subscription);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed", error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
