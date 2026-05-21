"use client";

import { onAuthStateChanged, signOut as firebaseSignOut, type User } from "firebase/auth";
import { ArrowRight, LogOut, UserCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { firebaseClientConfigured, getFirebaseClientAuth } from "@/lib/firebase-client";

export function LandingAccountNav() {
  const configured = firebaseClientConfigured();
  const auth = useMemo(() => (configured ? getFirebaseClientAuth() : null), [configured]);
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!configured);

  useEffect(() => {
    if (!auth) {
      return;
    }

    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setReady(true);
    });
  }, [auth]);

  async function signOut() {
    if (auth) {
      await firebaseSignOut(auth);
    }
  }

  if (!ready) {
    return <div className="h-10 w-40 rounded-full bg-white/10" aria-hidden="true" />;
  }

  if (user) {
    return (
      <div className="flex min-w-0 items-center gap-2">
        <div className="hidden max-w-[220px] items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs font-bold text-white sm:flex">
          <UserCircle size={15} className="shrink-0 text-[#1ed760]" aria-hidden="true" />
          <span className="truncate">{user.email}</span>
        </div>
        <Link className="connect-button" href="/app">
          <span className="sm:hidden">Open</span>
          <span className="hidden sm:inline">Open SongTwin</span>
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
        <button className="connect-button secondary !hidden lg:!inline-flex" onClick={signOut} type="button">
          <LogOut size={15} aria-hidden="true" />
          Sign out
        </button>
      </div>
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
