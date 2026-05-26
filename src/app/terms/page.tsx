import type { Metadata } from "next";
import { ContactBlock, LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service - SongTwin",
  description: "Subscription and usage terms for SongTwin.",
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Terms of Service"
      title="Terms for using SongTwin."
      intro="These terms explain the basic rules for SongTwin accounts, subscriptions, billing, and acceptable use."
      sections={[
        {
          title: "Subscription Access",
          body: (
            <p>
              SongTwin Pro is offered at $4.99/month after a 3-day free trial. Access is tied to the
              account email used at sign-up and remains active while the subscription is active or
              trialing.
            </p>
          ),
        },
        {
          title: "Billing and Cancellation",
          body: (
            <p>
              Checkout, payment collection, subscription management, and cancellation are handled by
              Stripe. You can manage billing from the account settings area inside SongTwin.
            </p>
          ),
        },
        {
          title: "Music Recommendations",
          body: (
            <p>
              SongTwin provides recommendation results for discovery and entertainment. Results are
              generated from music databases, catalog sources, and public music-web signals, and they
              may vary between runs.
            </p>
          ),
        },
        {
          title: "Spotify Connection",
          body: (
            <p>
              Spotify connection is optional and is used only for playlist import, liked songs import,
              profile display, and exact Spotify track matching when available. Spotify availability
              may depend on Spotify account permissions and platform limits.
            </p>
          ),
        },
        {
          title: "Contact",
          body: <ContactBlock />,
        },
      ]}
    />
  );
}
