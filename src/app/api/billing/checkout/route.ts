import { NextRequest, NextResponse } from "next/server";
import { ensureAccount, saveStripeCustomer, verifyAccountToken } from "@/lib/account";
import { routeErrorResponse } from "@/lib/auth";
import { getStripe, getSubscriptionPriceId, stripeConfigured } from "@/lib/stripe-server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    if (!stripeConfigured()) {
      return NextResponse.json(
        { error: "Stripe is not configured. Add STRIPE_SECRET_KEY and STRIPE_PRICE_ID." },
        { status: 503 },
      );
    }

    const decoded = await verifyAccountToken(request);
    const account = await ensureAccount(decoded.uid, decoded.email);
    const stripe = getStripe();
    let customerId = account.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: decoded.email,
        metadata: { firebaseUid: decoded.uid },
      });
      customerId = customer.id;
      await saveStripeCustomer(decoded.uid, customerId);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: decoded.uid,
      line_items: [{ price: getSubscriptionPriceId(), quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${request.nextUrl.origin}/app?billing=success`,
      cancel_url: `${request.nextUrl.origin}/app?billing=cancelled`,
      metadata: { firebaseUid: decoded.uid },
      subscription_data: {
        metadata: { firebaseUid: decoded.uid },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
