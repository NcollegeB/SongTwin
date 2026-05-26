import { createHash, timingSafeEqual } from "node:crypto";
import { FieldValue, type DocumentData } from "firebase-admin/firestore";
import type Stripe from "stripe";
import { adminAuth, adminDb, firebaseAdminConfigured } from "./firebase-admin";
import { stripeConfigured } from "./stripe-server";
import type { AccountResponse, SubscriptionStatus } from "./types";
import type { NextRequest } from "next/server";

const ACTIVE_STATUSES = new Set<SubscriptionStatus>(["active", "trialing"]);

function configuredAdminCodeHash() {
  return process.env.SONGTWIN_ADMIN_CODE_HASH?.trim().toLowerCase();
}

function sha256Hex(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function safeEqual(value: string, expected: string) {
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);

  return valueBuffer.length === expectedBuffer.length && timingSafeEqual(valueBuffer, expectedBuffer);
}

function adminCodeMatches(code: string) {
  const codeHash = configuredAdminCodeHash();
  if (codeHash) {
    return safeEqual(sha256Hex(code), codeHash);
  }

  throw new AccountAccessError("Admin code is not configured", 503);
}

class AccountAccessError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = "AccountAccessError";
    this.status = status;
  }
}

type VerifiedAccount = {
  uid: string;
  email?: string;
  stripeCustomerId?: string;
  subscriptionStatus: SubscriptionStatus;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  admin?: boolean;
};

function bearerToken(request: NextRequest) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  return header.slice("Bearer ".length).trim();
}

function subscriptionIsActive(status?: string) {
  return ACTIVE_STATUSES.has((status ?? "inactive") as SubscriptionStatus);
}

function normalizeStatus(status?: string): SubscriptionStatus {
  const value = status ?? "inactive";
  if (
    value === "active" ||
    value === "trialing" ||
    value === "past_due" ||
    value === "canceled" ||
    value === "incomplete" ||
    value === "incomplete_expired" ||
    value === "unpaid" ||
    value === "paused"
  ) {
    return value;
  }

  return "inactive";
}

function fromDoc(uid: string, data?: DocumentData): VerifiedAccount {
  return {
    uid,
    email: data?.email,
    stripeCustomerId: data?.stripeCustomerId,
    stripeSubscriptionId: data?.stripeSubscriptionId,
    subscriptionStatus: normalizeStatus(data?.subscriptionStatus),
    currentPeriodEnd: data?.currentPeriodEnd,
    cancelAtPeriodEnd: Boolean(data?.cancelAtPeriodEnd),
    admin: Boolean(data?.admin),
  };
}

function accountIsAdmin(account: VerifiedAccount) {
  return Boolean(account.admin);
}

function accountResponseFromVerifiedAccount(account: VerifiedAccount): AccountResponse {
  const admin = accountIsAdmin(account);
  const subscriptionStatus = admin ? "active" : account.subscriptionStatus;

  return {
    configured: true,
    stripeConfigured: stripeConfigured(),
    admin,
    uid: account.uid,
    email: account.email,
    subscription: {
      active: subscriptionIsActive(subscriptionStatus),
      status: subscriptionStatus,
      currentPeriodEnd: account.currentPeriodEnd,
      cancelAtPeriodEnd: account.cancelAtPeriodEnd,
      stripeCustomerId: account.stripeCustomerId,
      stripeSubscriptionId: account.stripeSubscriptionId,
    },
  };
}

export async function verifyAccountToken(request: NextRequest) {
  if (!firebaseAdminConfigured()) {
    throw new AccountAccessError("Firebase Admin is not configured", 503);
  }

  const token = bearerToken(request);
  if (!token) {
    throw new AccountAccessError("Sign in to continue");
  }

  return adminAuth().verifyIdToken(token);
}

export async function ensureAccount(uid: string, email?: string | null) {
  const ref = adminDb().collection("users").doc(uid);
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    await ref.set({
      uid,
      email: email ?? null,
      subscriptionStatus: "inactive",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return fromDoc(uid, { email, subscriptionStatus: "inactive" });
  }

  if (email && snapshot.data()?.email !== email) {
    await ref.set({ email, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  }

  return fromDoc(uid, { ...snapshot.data(), email: email ?? snapshot.data()?.email });
}

export async function getAccountResponse(request: NextRequest): Promise<AccountResponse> {
  if (!firebaseAdminConfigured()) {
    return {
      configured: false,
      stripeConfigured: stripeConfigured(),
      subscription: { active: false, status: "inactive" },
    };
  }

  const decoded = await verifyAccountToken(request);
  const account = await ensureAccount(decoded.uid, decoded.email);
  return accountResponseFromVerifiedAccount(account);
}

export async function requireActiveAccount(request: NextRequest) {
  const decoded = await verifyAccountToken(request);
  const account = await ensureAccount(decoded.uid, decoded.email);

  if (!accountIsAdmin(account) && !subscriptionIsActive(account.subscriptionStatus)) {
    throw new AccountAccessError("An active SongTwin subscription is required", 402);
  }

  return { decoded, account };
}

export async function redeemAdminCode(request: NextRequest, code: string): Promise<AccountResponse> {
  if (!firebaseAdminConfigured()) {
    throw new AccountAccessError("Firebase Admin is not configured", 503);
  }

  if (!adminCodeMatches(code.trim())) {
    throw new AccountAccessError("Admin code is incorrect", 403);
  }

  const decoded = await verifyAccountToken(request);
  const ref = adminDb().collection("users").doc(decoded.uid);
  await ensureAccount(decoded.uid, decoded.email);
  await ref.set(
    {
      admin: true,
      adminCodeRedeemedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const user = await adminAuth().getUser(decoded.uid);
  await adminAuth().setCustomUserClaims(decoded.uid, {
    ...(user.customClaims ?? {}),
    songTwinAdmin: true,
    songTwinSubscriber: true,
  });

  const snapshot = await ref.get();
  return accountResponseFromVerifiedAccount(
    fromDoc(decoded.uid, { ...snapshot.data(), email: decoded.email ?? snapshot.data()?.email }),
  );
}

export async function saveStripeCustomer(uid: string, stripeCustomerId: string) {
  await adminDb().collection("users").doc(uid).set(
    {
      stripeCustomerId,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function findUidByStripeCustomer(stripeCustomerId: string) {
  const snapshot = await adminDb()
    .collection("users")
    .where("stripeCustomerId", "==", stripeCustomerId)
    .limit(1)
    .get();

  return snapshot.empty ? null : snapshot.docs[0].id;
}

function subscriptionPeriodEnd(subscription: Stripe.Subscription) {
  const periodEnd = subscription.items.data[0]?.current_period_end;
  return periodEnd ? new Date(periodEnd * 1000).toISOString() : undefined;
}

export async function syncSubscriptionToAccount(uid: string, subscription: Stripe.Subscription) {
  const status = normalizeStatus(subscription.status);
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

  await adminDb().collection("users").doc(uid).set(
    {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: status,
      priceId: subscription.items.data[0]?.price.id ?? null,
      currentPeriodEnd: subscriptionPeriodEnd(subscription) ?? null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const user = await adminAuth().getUser(uid);
  await adminAuth().setCustomUserClaims(uid, {
    ...(user.customClaims ?? {}),
    songTwinSubscriber: subscriptionIsActive(status),
  });
}
