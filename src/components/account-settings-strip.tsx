"use client";

import { ArrowRight, CreditCard, Loader2, LogOut, Settings, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { AccountResponse } from "@/lib/types";

type AccountSettingsStripProps = {
  account?: AccountResponse | null;
  className?: string;
  email?: string | null;
  loading?: boolean;
  onCheckout?: () => Promise<void>;
  onPortal?: () => Promise<void>;
  onSignOut: () => Promise<void>;
  showOpenApp?: boolean;
  submitting?: boolean;
};

function accessLabel(account?: AccountResponse | null) {
  if (!account) {
    return "Checking access";
  }

  if (account.admin) {
    return "Admin access";
  }

  if (account.subscription.status === "trialing") {
    return "Trial active";
  }

  if (account.subscription.active) {
    return "Pro active";
  }

  if (account.subscription.cancelAtPeriodEnd) {
    return "Cancels soon";
  }

  return "Subscription needed";
}

export function AccountSettingsStrip({
  account,
  className,
  email,
  loading = false,
  onCheckout,
  onPortal,
  onSignOut,
  showOpenApp = false,
  submitting = false,
}: AccountSettingsStripProps) {
  const canManageSubscription = Boolean(account?.subscription.stripeCustomerId && !account?.admin && onPortal);
  const canStartTrial = Boolean(
    account?.configured &&
      account.stripeConfigured &&
      !account.admin &&
      !account.subscription.active &&
      onCheckout,
  );
  const busy = loading || submitting;

  return (
    <div
      className={[
        "flex min-w-0 flex-wrap items-center gap-2 rounded-full border border-white/10 bg-black/45 p-1.5 shadow-lg shadow-black/25 backdrop-blur",
        className ?? "",
      ].join(" ")}
    >
      <div className="flex min-w-0 items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-white">
        {busy ? (
          <Loader2 className="shrink-0 animate-spin text-[#1ed760]" size={15} aria-hidden="true" />
        ) : (
          <Settings className="shrink-0 text-[#1ed760]" size={15} aria-hidden="true" />
        )}
        <span className="max-w-[190px] truncate">{email ?? "Signed in"}</span>
      </div>

      <div className="hidden items-center gap-1 rounded-full bg-[#12351f] px-3 py-2 text-xs font-black text-[#7dffad] sm:inline-flex">
        <ShieldCheck size={14} aria-hidden="true" />
        {accessLabel(account)}
      </div>

      {showOpenApp ? (
        <Link className="connect-button !min-h-9 !px-3 !text-xs" href="/app">
          <span className="sm:hidden">Open</span>
          <span className="hidden sm:inline">Open SongTwin</span>
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      ) : null}

      {canManageSubscription ? (
        <button
          className="connect-button secondary !min-h-9 !px-3 !text-xs"
          disabled={busy}
          onClick={onPortal}
          type="button"
        >
          {busy ? <Loader2 className="animate-spin" size={14} /> : <CreditCard size={14} aria-hidden="true" />}
          <span className="hidden sm:inline">Manage subscription</span>
          <span className="sm:hidden">Billing</span>
        </button>
      ) : null}

      {canStartTrial ? (
        <button
          className="connect-button !min-h-9 !px-3 !text-xs"
          disabled={busy}
          onClick={onCheckout}
          type="button"
        >
          {busy ? <Loader2 className="animate-spin" size={14} /> : <CreditCard size={14} aria-hidden="true" />}
          Start trial
        </button>
      ) : null}

      <button
        className="connect-button secondary !min-h-9 !px-3 !text-xs"
        disabled={busy}
        onClick={onSignOut}
        type="button"
      >
        <LogOut size={14} aria-hidden="true" />
        <span className="hidden sm:inline">Sign out</span>
      </button>
    </div>
  );
}
