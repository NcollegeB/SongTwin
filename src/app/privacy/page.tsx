import type { Metadata } from "next";
import { ContactBlock, LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy - SongTwin",
  description: "How SongTwin handles account, billing, and music discovery data.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy Policy"
      title="How SongTwin handles your data."
      intro="SongTwin uses only the account, billing, and music-source data needed to provide paid song discovery."
      sections={[
        {
          title: "Data We Collect",
          body: (
            <p>
              SongTwin may collect your email address, Firebase account ID, Stripe customer and
              subscription status, Spotify profile and playlist data if you connect Spotify, and the
              songs you search or choose as recommendation sources.
            </p>
          ),
        },
        {
          title: "How We Use Data",
          body: (
            <p>
              We use this data to authenticate your account, confirm subscription access, import
              optional Spotify playlist sources, run song recommendations, provide listening links,
              and troubleshoot account or billing issues.
            </p>
          ),
        },
        {
          title: "Third-Party Services",
          body: (
            <p>
              SongTwin uses Firebase for authentication and account records, Stripe for checkout and
              subscription billing, Vercel for hosting, Spotify when you connect your account, and
              music-web/catalog sources to generate recommendation signals.
            </p>
          ),
        },
        {
          title: "Spotify Is Optional",
          body: (
            <p>
              Song search and recommendations can work without Spotify. If you connect Spotify,
              SongTwin stores a secure server-side session cookie so it can import your playlists and
              liked songs during your session.
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
