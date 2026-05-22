"use client";

import { AccountManagementPage } from "@/components/account-management-page";
import { AuthGate } from "@/components/auth-gate";

export default function AccountPage() {
  return (
    <AuthGate requireSubscription={false}>
      {({
        account,
        accountLoading,
        openBillingPortal,
        refreshAccount,
        redeemAdminCode,
        signOut,
        startCheckout,
        submitting,
        user,
      }) => (
        <AccountManagementPage
          account={account}
          accountLoading={accountLoading}
          onCheckout={startCheckout}
          onPortal={openBillingPortal}
          onRefreshAccount={refreshAccount}
          onRedeemAdminCode={redeemAdminCode}
          onSignOut={signOut}
          submitting={submitting}
          user={user}
        />
      )}
    </AuthGate>
  );
}
