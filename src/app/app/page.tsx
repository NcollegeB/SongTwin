"use client";

import { AuthGate, TopAccountSettings } from "@/components/auth-gate";
import { AppShell } from "@/components/app-shell";

export default function SongTwinAppPage() {
  return (
    <AuthGate>
      {({ account, getIdToken, openBillingPortal, signOut, user }) => (
        <AppShell
          accountSettings={
            <TopAccountSettings
              account={account}
              displayName={user.displayName}
              email={user.email ?? account.email}
              onPortal={openBillingPortal}
              onSignOut={signOut}
            />
          }
          getAccountToken={getIdToken}
        />
      )}
    </AuthGate>
  );
}
