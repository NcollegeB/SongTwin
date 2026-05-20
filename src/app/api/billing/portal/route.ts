import { NextRequest, NextResponse } from "next/server";
import { ensureAccount, verifyAccountToken } from "@/lib/account";
import { routeErrorResponse } from "@/lib/auth";
import { getStripe, stripeConfigured } from "@/lib/stripe-server";

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

    if (!account.stripeCustomerId) {
      return NextResponse.json({ error: "No Stripe customer exists for this account." }, { status: 404 });
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: account.stripeCustomerId,
      return_url: `${request.nextUrl.origin}/app`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
