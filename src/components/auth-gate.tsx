"use client";

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Loader2,
  LogOut,
  Music2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AccountSettingsStrip } from "./account-settings-strip";
import { firebaseClientConfigured, getFirebaseClientAuth } from "@/lib/firebase-client";
import type { AccountResponse } from "@/lib/types";

type AuthGateContext = {
  account: AccountResponse;
  getIdToken: () => Promise<string | null>;
  openBillingPortal: () => Promise<void>;
  signOut: () => Promise<void>;
};

type AuthGateProps = {
  children: (context: AuthGateContext) => ReactNode;
};

const inactiveAccount: AccountResponse = {
  configured: false,
  stripeConfigured: false,
  subscription: { active: false, status: "inactive" },
};

export function AuthGate({ children }: AuthGateProps) {
  const configured = firebaseClientConfigured();
  const auth = useMemo(() => (configured ? getFirebaseClientAuth() : null), [configured]);
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [user, setUser] = useState<User | null>(null);
  const [account, setAccount] = useState<AccountResponse>(inactiveAccount);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(configured);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const accountRequest = useCallback(async function accountRequest<T>(
    path: string,
    currentUser: User,
    init?: RequestInit,
  ) {
    const token = await currentUser.getIdToken();
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${token}`);

    const response = await fetch(path, { ...init, headers });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.error || `Request failed: ${response.status}`);
    }

    return payload as T;
  }, []);

  const loadAccount = useCallback(async function loadAccount(currentUser: User, forceRefresh = false) {
    if (forceRefresh) {
      await currentUser.getIdToken(true);
    }

    const payload = await accountRequest<AccountResponse>("/api/account", currentUser);
    setAccount(payload);
    return payload;
  }, [accountRequest]);

  useEffect(() => {
    if (!auth) {
      return;
    }

    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setError(null);
      setMessage(null);

      if (!nextUser) {
        setAccount(inactiveAccount);
        setLoading(false);
        return;
      }

      setLoading(true);
      void loadAccount(nextUser)
        .catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load account."))
        .finally(() => setLoading(false));
    });
  }, [auth, loadAccount]);

  useEffect(() => {
    if (!user || typeof window === "undefined") {
      return;
    }

    const billingResult = new URLSearchParams(window.location.search).get("billing");
    if (billingResult === "success") {
      window.setTimeout(() => setMessage("Payment received. Activating your account..."), 0);
      let attempts = 0;
      const interval = window.setInterval(() => {
        attempts += 1;
        void loadAccount(user, true)
          .then((payload) => {
            if (payload.subscription.active || attempts >= 8) {
              window.clearInterval(interval);
              setMessage(payload.subscription.active ? null : "Still waiting on Stripe. Refresh in a moment.");
              window.history.replaceState(null, "", window.location.pathname);
            }
          })
          .catch(() => {
            if (attempts >= 8) {
              window.clearInterval(interval);
            }
          });
      }, 2000);

      return () => window.clearInterval(interval);
    }

    if (billingResult === "cancelled") {
      window.setTimeout(
        () => setMessage("Checkout was cancelled. You can subscribe whenever you are ready."),
        0,
      );
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [loadAccount, user]);

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === "signup") {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }

      window.location.assign("/#pricing");
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  async function startCheckout() {
    if (!user) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = await accountRequest<{ url?: string }>("/api/billing/checkout", user, {
        method: "POST",
      });

      if (!payload.url) {
        throw new Error("Stripe did not return a checkout URL.");
      }

      window.location.assign(payload.url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to start checkout.");
    } finally {
      setSubmitting(false);
    }
  }

  async function openBillingPortal() {
    if (!user) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = await accountRequest<{ url?: string }>("/api/billing/portal", user, {
        method: "POST",
      });

      if (!payload.url) {
        throw new Error("Stripe did not return a billing portal URL.");
      }

      window.location.assign(payload.url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to open billing portal.");
    } finally {
      setSubmitting(false);
    }
  }

  async function signOut() {
    if (auth) {
      await firebaseSignOut(auth);
    }
  }

  if (!firebaseClientConfigured() || !auth) {
    return <SetupRequired reason="Firebase client environment variables are missing." />;
  }

  if (loading) {
    return <AuthFrame icon={<Loader2 className="animate-spin" size={22} />} title="Loading SongTwin" />;
  }

  if (!user) {
    return (
      <AuthFrame
        icon={<Sparkles size={22} />}
        title={mode === "signup" ? "Create your SongTwin account" : "Sign in to SongTwin"}
        subtitle="Subscribe once, then connect Spotify to build recommendations from listener-overlap data."
      >
        <form className="mt-6 grid gap-3" onSubmit={handleAuth}>
          <label className="grid gap-2 text-sm font-semibold text-[#d8d8d8]">
            Email
            <input
              className="h-12 rounded-lg border border-[#333] bg-[#181818] px-3 text-white outline-none focus:border-[#1db954]"
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-[#d8d8d8]">
            Password
            <input
              className="h-12 rounded-lg border border-[#333] bg-[#181818] px-3 text-white outline-none focus:border-[#1db954]"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>

          <button className="connect-button mt-2 min-h-12 w-full" disabled={submitting} type="submit">
            {submitting ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
            {mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        <button
          className="mt-4 text-sm font-bold text-[#1db954] hover:text-[#1ed760]"
          onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
          type="button"
        >
          {mode === "signup" ? "Already have an account? Sign in" : "Need an account? Create one"}
        </button>

        <AuthMessage error={error} message={message} />
      </AuthFrame>
    );
  }

  if (!account.configured) {
    return <SetupRequired reason="Firebase Admin credentials are missing on the server." />;
  }

  if (!account.subscription.active) {
    return (
      <SubscribeScreen
        account={account}
        email={user.email ?? undefined}
        error={error}
        message={message}
        loading={submitting}
        onCheckout={startCheckout}
        onPortal={openBillingPortal}
        onSignOut={signOut}
      />
    );
  }

  return children({
    account,
    getIdToken: () => user.getIdToken(),
    openBillingPortal,
    signOut,
  });
}

export function AccountControls({
  account,
  email,
  onPortal,
  onSignOut,
}: {
  account: AccountResponse;
  email?: string | null;
  onPortal: () => Promise<void>;
  onSignOut: () => Promise<void>;
}) {
  return (
    <div className="rounded-lg border border-[#242424] bg-[#181818] p-3">
      <div className="flex items-center gap-2 text-xs font-bold text-[#1db954]">
        <CheckCircle2 size={15} aria-hidden="true" />
        {account.admin ? "SongTwin Admin" : "SongTwin Pro"}
      </div>
      <p className="mt-1 truncate text-xs text-[#a7a7a7]">{email ?? (account.admin ? "Admin account" : "Paid account")}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          className="connect-button secondary !min-h-9 !px-3 !text-xs"
          disabled={account.admin}
          onClick={onPortal}
          type="button"
        >
          <CreditCard size={14} aria-hidden="true" />
          Billing
        </button>
        <button className="connect-button secondary !min-h-9 !px-3 !text-xs" onClick={onSignOut} type="button">
          <LogOut size={14} aria-hidden="true" />
          Sign out
        </button>
      </div>
      {account.subscription.cancelAtPeriodEnd ? (
        <p className="mt-3 text-xs leading-5 text-[#f5b84b]">Access remains active until the billing period ends.</p>
      ) : null}
      {account.admin ? (
        <p className="mt-3 text-xs leading-5 text-[#a7a7a7]">Permanent debug access from the admin allowlist.</p>
      ) : null}
    </div>
  );
}

export function TopAccountSettings({
  account,
  email,
  onPortal,
  onSignOut,
}: {
  account: AccountResponse;
  email?: string | null;
  onPortal: () => Promise<void>;
  onSignOut: () => Promise<void>;
}) {
  return (
    <div className="rounded-lg bg-[#121212] p-2">
      <AccountSettingsStrip
        account={account}
        className="rounded-lg bg-[#181818]/80"
        email={email}
        onPortal={onPortal}
        onSignOut={onSignOut}
      />
    </div>
  );
}

function SubscribeScreen({
  account,
  email,
  error,
  message,
  loading,
  onCheckout,
  onPortal,
  onSignOut,
}: {
  account: AccountResponse;
  email?: string;
  error: string | null;
  message: string | null;
  loading: boolean;
  onCheckout: () => Promise<void>;
  onPortal: () => Promise<void>;
  onSignOut: () => Promise<void>;
}) {
  return (
    <main className="min-h-screen bg-black px-5 py-6 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-5xl flex-col justify-center">
        <header className="mb-8 grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-[#1db954] text-black">
              <Music2 size={22} aria-hidden="true" />
            </div>
            <div>
              <p className="text-lg font-black">SongTwin</p>
              <p className="text-xs text-[#a7a7a7]">Signed in</p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-4 text-sm font-bold text-[#d8d8d8] lg:justify-center">
            <Link className="hover:text-white" href="/#home">Home</Link>
            <Link className="hover:text-white" href="/#about">About</Link>
            <Link className="hover:text-white" href="/#pricing">Pricing</Link>
            <Link className="hover:text-white" href="/#contact">Contact</Link>
          </nav>
          <AccountSettingsStrip
            account={account}
            className="lg:justify-end"
            email={email}
            onCheckout={onCheckout}
            onPortal={onPortal}
            onSignOut={onSignOut}
            submitting={loading}
          />
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#1db954]">SongTwin Pro</p>
            <h1 className="mt-3 max-w-3xl text-5xl font-black tracking-normal sm:text-6xl">
              Start with 3 days free.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#b3b3b3]">
              Connect Spotify, choose playlists or songs, and find recommendations ranked by shared listener behavior. Checkout opens on Stripe, and your first charge starts after the trial.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {["3-day free trial", "Spotify playlist and song seeds", "Direct Spotify links for every match"].map(
                (item) => (
                  <div className="rounded-lg border border-[#242424] bg-[#121212] p-4" key={item}>
                    <CheckCircle2 className="text-[#1db954]" size={18} />
                    <p className="mt-3 text-sm font-semibold text-[#e5e5e5]">{item}</p>
                  </div>
                ),
              )}
            </div>
          </div>

          <div className="rounded-lg border border-[#2a2a2a] bg-[#121212] p-5">
            <p className="text-sm font-bold text-[#a7a7a7]">Monthly access</p>
            <div className="mt-2 flex items-end gap-1">
              <span className="text-5xl font-black">$4.99</span>
              <span className="pb-2 text-sm font-semibold text-[#a7a7a7]">/ month</span>
            </div>
            <p className="mt-3 text-sm font-bold text-[#1db954]">3-day free trial included</p>
            <ul className="mt-5 grid gap-3 text-sm text-[#d8d8d8]">
              <li>Private account login</li>
              <li>Subscription-backed access control</li>
              <li>Secure checkout and billing through Stripe</li>
            </ul>
            <button className="connect-button mt-6 min-h-12 w-full" disabled={loading} onClick={onCheckout} type="button">
              {loading ? <Loader2 className="animate-spin" size={18} /> : <CreditCard size={18} />}
              Start free trial
            </button>
            {account.subscription.stripeCustomerId ? (
              <button className="connect-button secondary mt-3 min-h-12 w-full" onClick={onPortal} type="button">
                Manage billing
              </button>
            ) : null}
            <AuthMessage error={error} message={message} />
          </div>
        </section>
      </div>
    </main>
  );
}

function SetupRequired({ reason }: { reason: string }) {
  return (
    <AuthFrame icon={<AlertCircle size={22} />} title="Billing setup required" subtitle={reason}>
      <div className="mt-5 rounded-lg bg-[#181818] p-4 text-sm leading-6 text-[#b3b3b3]">
        Configure Firebase Auth, Firebase Admin credentials, and Stripe environment variables before launching paid access.
      </div>
    </AuthFrame>
  );
}

function AuthFrame({
  children,
  icon,
  title,
  subtitle,
}: {
  children?: ReactNode;
  icon: ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <main className="min-h-screen bg-black px-5 py-5 text-white sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-7xl flex-col">
        <header className="grid gap-4 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
          <Link className="flex items-center gap-3" href="/">
            <span className="flex h-10 w-10 items-center justify-center rounded bg-[#1db954] text-black">
              <Music2 size={22} aria-hidden="true" />
            </span>
            <span className="text-xl font-black tracking-normal">SongTwin</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-4 text-sm font-bold text-[#d8d8d8] md:justify-center">
            <Link className="hover:text-white" href="/#home">Home</Link>
            <Link className="hover:text-white" href="/#about">About</Link>
            <Link className="hover:text-white" href="/#pricing">Pricing</Link>
            <Link className="hover:text-white" href="/#contact">Contact</Link>
          </nav>
          <Link className="connect-button secondary min-h-10 px-4 text-sm md:justify-self-end" href="/">
            Back home
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center py-10">
          <section className="w-full max-w-md rounded-lg border border-[#242424] bg-[#121212] p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#242424] text-[#1db954]">
              {icon}
            </div>
            <h1 className="mt-5 text-3xl font-black tracking-normal">{title}</h1>
            {subtitle ? <p className="mt-3 text-sm leading-6 text-[#a7a7a7]">{subtitle}</p> : null}
            {children}
          </section>
        </div>
      </div>
    </main>
  );
}

function AuthMessage({ error, message }: { error: string | null; message: string | null }) {
  if (!error && !message) {
    return null;
  }

  return (
    <p
      className={[
        "mt-4 rounded-lg border p-3 text-sm leading-6",
        error
          ? "border-[#5b2a2a] bg-[#2a1212] text-[#ffd8d8]"
          : "border-[#235c38] bg-[#102719] text-[#c9f7d8]",
      ].join(" ")}
    >
      {error ?? message}
    </p>
  );
}

function authErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Authentication failed.";

  if (message.includes("auth/email-already-in-use")) {
    return "That email already has an account. Sign in instead.";
  }

  if (message.includes("auth/invalid-credential") || message.includes("auth/wrong-password")) {
    return "Email or password is incorrect.";
  }

  if (message.includes("auth/weak-password")) {
    return "Use a password with at least 8 characters.";
  }

  return message;
}
