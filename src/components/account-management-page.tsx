"use client";

import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  updateEmail,
  updatePassword,
  updateProfile,
  type User,
} from "firebase/auth";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  KeyRound,
  Loader2,
  Mail,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import { AccountSettingsStrip } from "./account-settings-strip";
import { firebaseClientConfigured, getFirebaseClientAuth } from "@/lib/firebase-client";
import type { AccountResponse } from "@/lib/types";

type AccountManagementPageProps = {
  account: AccountResponse;
  accountLoading: boolean;
  onCheckout: () => Promise<void>;
  onPortal: () => Promise<void>;
  onRefreshAccount: () => Promise<AccountResponse | null>;
  onSignOut: () => Promise<void>;
  submitting: boolean;
  user: User;
};

type ActionKey = "profile" | "email" | "password" | "reset";

export function AccountManagementPage({
  account,
  accountLoading,
  onCheckout,
  onPortal,
  onRefreshAccount,
  onSignOut,
  submitting,
  user,
}: AccountManagementPageProps) {
  const [displayName, setDisplayName] = useState(user.displayName ?? "");
  const [newEmail, setNewEmail] = useState(user.email ?? "");
  const [emailPassword, setEmailPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [activeAction, setActiveAction] = useState<ActionKey | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const auth = useMemo(
    () => (firebaseClientConfigured() ? getFirebaseClientAuth() : null),
    [],
  );
  const busy = Boolean(activeAction) || submitting;
  const isPasswordAccount =
    user.providerData.length === 0 || user.providerData.some((provider) => provider.providerId === "password");
  const identityLabel = user.displayName?.trim() || user.email || "SongTwin account";

  async function reauthenticate(password: string) {
    if (!user.email) {
      throw new Error("This account does not have an email sign-in method.");
    }

    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActiveAction("profile");
    setError(null);
    setMessage(null);

    try {
      const nextName = displayName.trim();
      await updateProfile(user, { displayName: nextName || null });
      await user.reload();
      setDisplayName(user.displayName ?? nextName);
      setMessage("Account name updated.");
    } catch (caught) {
      setError(accountErrorMessage(caught));
    } finally {
      setActiveAction(null);
    }
  }

  async function saveEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextEmail = newEmail.trim();

    if (!nextEmail || nextEmail === user.email) {
      setError("Enter a new email address.");
      return;
    }

    setActiveAction("email");
    setError(null);
    setMessage(null);

    try {
      await reauthenticate(emailPassword);
      await updateEmail(user, nextEmail);
      await user.getIdToken(true);
      await user.reload();
      await onRefreshAccount();
      setEmailPassword("");
      setNewEmail(user.email ?? nextEmail);
      setMessage("Email updated.");
    } catch (caught) {
      setError(accountErrorMessage(caught));
    } finally {
      setActiveAction(null);
    }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (newPassword.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("The new passwords do not match.");
      return;
    }

    setActiveAction("password");
    setError(null);
    setMessage(null);

    try {
      await reauthenticate(currentPassword);
      await updatePassword(user, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Password updated.");
    } catch (caught) {
      setError(accountErrorMessage(caught));
    } finally {
      setActiveAction(null);
    }
  }

  async function sendResetEmail() {
    if (!auth || !user.email) {
      setError("No email address is available for this account.");
      return;
    }

    setActiveAction("reset");
    setError(null);
    setMessage(null);

    try {
      await sendPasswordResetEmail(auth, user.email);
      setMessage("Password reset email sent.");
    } catch (caught) {
      setError(accountErrorMessage(caught));
    } finally {
      setActiveAction(null);
    }
  }

  return (
    <main className="min-h-screen bg-black px-4 py-5 text-white sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-6xl flex-col">
        <header className="grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
          <Link className="flex items-center gap-3" href="/">
            <span className="flex h-10 w-10 items-center justify-center rounded bg-[#1db954] text-black">
              <ShieldCheck size={22} aria-hidden="true" />
            </span>
            <span className="text-xl font-black tracking-normal">SongTwin</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-4 text-sm font-bold text-[#d8d8d8] lg:justify-center">
            <Link className="hover:text-white" href="/#home">Home</Link>
            <Link className="hover:text-white" href="/#about">About</Link>
            <Link className="hover:text-white" href="/#pricing">Pricing</Link>
            <Link className="hover:text-white" href="/#contact">Contact</Link>
          </nav>
          <AccountSettingsStrip
            account={account}
            displayName={user.displayName}
            email={user.email ?? account.email}
            loading={accountLoading}
            onCheckout={onCheckout}
            onPortal={onPortal}
            onSignOut={onSignOut}
            showAccountLink={false}
            showOpenApp
            submitting={submitting}
          />
        </header>

        <div className="py-7">
          <Link className="inline-flex items-center gap-2 text-sm font-bold text-[#a7a7a7] hover:text-white" href="/app">
            <ArrowLeft size={16} aria-hidden="true" />
            Back to SongTwin
          </Link>
          <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#1db954]">Account settings</p>
              <h1 className="mt-2 break-words text-4xl font-black tracking-normal sm:text-5xl">{identityLabel}</h1>
              <p className="mt-3 text-sm text-[#a7a7a7]">{user.email}</p>
            </div>
            <AccessCard account={account} />
          </div>
        </div>

        <div className="grid gap-4 pb-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="grid gap-4">
            <SettingsPanel
              icon={<UserRound size={19} aria-hidden="true" />}
              title="Account Name"
            >
              <form className="grid gap-3" onSubmit={saveProfile}>
                <label className="grid gap-2 text-sm font-semibold text-[#d8d8d8]">
                  Display name
                  <input
                    className="h-12 rounded-lg border border-[#333] bg-[#181818] px-3 text-white outline-none focus:border-[#1db954]"
                    autoComplete="name"
                    disabled={busy}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="Your name"
                    value={displayName}
                  />
                </label>
                <div>
                  <button className="connect-button min-h-11" disabled={busy} type="submit">
                    {activeAction === "profile" ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
                    Save name
                  </button>
                </div>
              </form>
            </SettingsPanel>

            <SettingsPanel
              icon={<Mail size={19} aria-hidden="true" />}
              title="Email"
            >
              <form className="grid gap-3" onSubmit={saveEmail}>
                <label className="grid gap-2 text-sm font-semibold text-[#d8d8d8]">
                  New email
                  <input
                    className="h-12 rounded-lg border border-[#333] bg-[#181818] px-3 text-white outline-none focus:border-[#1db954]"
                    autoComplete="email"
                    disabled={busy || !isPasswordAccount}
                    onChange={(event) => setNewEmail(event.target.value)}
                    required
                    type="email"
                    value={newEmail}
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-[#d8d8d8]">
                  Current password
                  <input
                    className="h-12 rounded-lg border border-[#333] bg-[#181818] px-3 text-white outline-none focus:border-[#1db954]"
                    autoComplete="current-password"
                    disabled={busy || !isPasswordAccount}
                    onChange={(event) => setEmailPassword(event.target.value)}
                    required
                    type="password"
                    value={emailPassword}
                  />
                </label>
                <div>
                  <button className="connect-button min-h-11" disabled={busy || !isPasswordAccount} type="submit">
                    {activeAction === "email" ? <Loader2 className="animate-spin" size={17} /> : <Mail size={17} />}
                    Change email
                  </button>
                </div>
              </form>
            </SettingsPanel>

            <SettingsPanel
              icon={<KeyRound size={19} aria-hidden="true" />}
              title="Password"
            >
              <form className="grid gap-3" onSubmit={savePassword}>
                <label className="grid gap-2 text-sm font-semibold text-[#d8d8d8]">
                  Current password
                  <input
                    className="h-12 rounded-lg border border-[#333] bg-[#181818] px-3 text-white outline-none focus:border-[#1db954]"
                    autoComplete="current-password"
                    disabled={busy || !isPasswordAccount}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    required
                    type="password"
                    value={currentPassword}
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-semibold text-[#d8d8d8]">
                    New password
                    <input
                      className="h-12 rounded-lg border border-[#333] bg-[#181818] px-3 text-white outline-none focus:border-[#1db954]"
                      autoComplete="new-password"
                      disabled={busy || !isPasswordAccount}
                      minLength={8}
                      onChange={(event) => setNewPassword(event.target.value)}
                      required
                      type="password"
                      value={newPassword}
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-[#d8d8d8]">
                    Confirm password
                    <input
                      className="h-12 rounded-lg border border-[#333] bg-[#181818] px-3 text-white outline-none focus:border-[#1db954]"
                      autoComplete="new-password"
                      disabled={busy || !isPasswordAccount}
                      minLength={8}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      required
                      type="password"
                      value={confirmPassword}
                    />
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="connect-button min-h-11" disabled={busy || !isPasswordAccount} type="submit">
                    {activeAction === "password" ? <Loader2 className="animate-spin" size={17} /> : <KeyRound size={17} />}
                    Change password
                  </button>
                  <button
                    className="connect-button secondary min-h-11"
                    disabled={busy || !isPasswordAccount}
                    onClick={sendResetEmail}
                    type="button"
                  >
                    {activeAction === "reset" ? <Loader2 className="animate-spin" size={17} /> : <Mail size={17} />}
                    Send reset email
                  </button>
                </div>
              </form>
            </SettingsPanel>
          </section>

          <aside className="grid content-start gap-4">
            <SettingsPanel
              icon={<CreditCard size={19} aria-hidden="true" />}
              title="Billing"
            >
              <div className="grid gap-3 text-sm text-[#d8d8d8]">
                <BillingRow label="Plan" value={planLabel(account)} />
                <BillingRow label="Status" value={account.subscription.status.replaceAll("_", " ")} />
                {account.subscription.currentPeriodEnd ? (
                  <BillingRow
                    label="Renews"
                    value={new Date(account.subscription.currentPeriodEnd).toLocaleDateString()}
                  />
                ) : null}
                {account.admin ? (
                  <p className="rounded-lg bg-[#102719] p-3 text-sm font-semibold text-[#b7f7cb]">
                    Admin access is active.
                  </p>
                ) : account.subscription.stripeCustomerId ? (
                  <button className="connect-button min-h-11 w-full" disabled={submitting} onClick={onPortal} type="button">
                    {submitting ? <Loader2 className="animate-spin" size={17} /> : <CreditCard size={17} />}
                    Edit billing information
                  </button>
                ) : (
                  <button className="connect-button min-h-11 w-full" disabled={submitting} onClick={onCheckout} type="button">
                    {submitting ? <Loader2 className="animate-spin" size={17} /> : <CreditCard size={17} />}
                    Start free trial
                  </button>
                )}
              </div>
            </SettingsPanel>

            <AccountNotice error={error} message={message} />
          </aside>
        </div>
      </div>
    </main>
  );
}

function SettingsPanel({
  children,
  icon,
  title,
}: {
  children: ReactNode;
  icon: ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-[#242424] bg-[#121212] p-4">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#242424] text-[#1db954]">
          {icon}
        </span>
        <h2 className="text-lg font-black tracking-normal">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function AccessCard({ account }: { account: AccountResponse }) {
  return (
    <div className="rounded-lg border border-[#242424] bg-[#121212] p-4">
      <div className="flex items-center gap-2 text-sm font-black text-[#1db954]">
        <CheckCircle2 size={17} aria-hidden="true" />
        {planLabel(account)}
      </div>
      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#737373]">
        {account.subscription.status.replaceAll("_", " ")}
      </p>
    </div>
  );
}

function BillingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-[#181818] px-3 py-2">
      <span className="text-[#a7a7a7]">{label}</span>
      <span className="font-bold capitalize text-white">{value}</span>
    </div>
  );
}

function AccountNotice({ error, message }: { error: string | null; message: string | null }) {
  if (!error && !message) {
    return null;
  }

  return (
    <p
      className={[
        "rounded-lg border p-3 text-sm leading-6",
        error
          ? "border-[#5b2a2a] bg-[#2a1212] text-[#ffd8d8]"
          : "border-[#235c38] bg-[#102719] text-[#c9f7d8]",
      ].join(" ")}
    >
      {error ?? message}
    </p>
  );
}

function planLabel(account: AccountResponse) {
  if (account.admin) {
    return "SongTwin Admin";
  }

  if (account.subscription.status === "trialing") {
    return "SongTwin Trial";
  }

  if (account.subscription.active) {
    return "SongTwin Pro";
  }

  return "No active plan";
}

function accountErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Account update failed.";

  if (message.includes("auth/requires-recent-login")) {
    return "Sign out and sign back in, then try again.";
  }

  if (message.includes("auth/wrong-password") || message.includes("auth/invalid-credential")) {
    return "Current password is incorrect.";
  }

  if (message.includes("auth/email-already-in-use")) {
    return "That email is already in use.";
  }

  if (message.includes("auth/invalid-email")) {
    return "Enter a valid email address.";
  }

  if (message.includes("auth/weak-password")) {
    return "Use a password with at least 8 characters.";
  }

  if (message.includes("auth/too-many-requests")) {
    return "Too many attempts. Try again later.";
  }

  return message;
}
