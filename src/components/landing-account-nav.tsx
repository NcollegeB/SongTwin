"use client";

import { onAuthStateChanged, signOut as firebaseSignOut, type User } from "firebase/auth";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AccountSettingsStrip } from "./account-settings-strip";
import { accountRequest } from "@/lib/account-client";
import { firebaseClientConfigured, getFirebaseClientAuth } from "@/lib/firebase-client";
import type { AccountResponse } from "@/lib/types";

export function LandingAccountNav() {
  const configured = firebaseClientConfigured();
  const auth = useMemo(() => (configured ? getFirebaseClientAuth() : null), [configured]);
  const [account, setAccount] = useState<AccountResponse | null>(null);
  const [accountLoading, setAccountLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!configured);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!auth) {
      return;
    }

    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setReady(true);

      if (!nextUser) {
        setAccount(null);
        setAccountLoading(false);
        return;
      }

      setAccountLoading(true);
      void accountRequest<AccountResponse>("/api/account", nextUser)
        .then(setAccount)
        .catch(() => setAccount(null))
        .finally(() => setAccountLoading(false));
    });
  }, [auth]);

  async function signOut() {
    if (auth) {
      await firebaseSignOut(auth);
    }
  }

  async function startCheckout() {
    if (!user) {
      return;
    }

    setSubmitting(true);

    try {
      const payload = await accountRequest<{ url?: string }>("/api/billing/checkout", user, {
        method: "POST",
      });

      if (payload.url) {
        window.location.assign(payload.url);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function openBillingPortal() {
    if (!user) {
      return;
    }

    setSubmitting(true);

    try {
      const payload = await accountRequest<{ url?: string }>("/api/billing/portal", user, {
        method: "POST",
      });

      if (payload.url) {
        window.location.assign(payload.url);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready) {
    return <div className="h-10 w-40 rounded-full bg-white/10" aria-hidden="true" />;
  }

  if (user) {
    return (
      <AccountSettingsStrip
        account={account}
        displayName={user.displayName}
        email={user.email}
        loading={accountLoading}
        onCheckout={startCheckout}
        onPortal={openBillingPortal}
        onSignOut={signOut}
        showOpenApp
        submitting={submitting}
      />
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link className="connect-button secondary !hidden sm:!inline-flex" href="/app">
        Sign in
      </Link>
      <Link className="connect-button" href="/app">
        <span className="sm:hidden">Trial</span>
        <span className="hidden sm:inline">Start free trial</span>
        <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </div>
  );
}
