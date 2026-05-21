"use client";

import { AccountControls, AuthGate, TopAccountSettings } from "@/components/auth-gate";
import { AppShell } from "@/components/app-shell";

export default function SongTwinAppPage() {
  return (
    <AuthGate>
      {({ account, getIdToken, openBillingPortal, signOut }) => (
        <AppShell
          accountControls={
            <AccountControls
              account={account}
              email={account.email}
              onPortal={openBillingPortal}
              onSignOut={signOut}
            />
          }
          accountSettings={
            <TopAccountSettings
              account={account}
              email={account.email}
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
