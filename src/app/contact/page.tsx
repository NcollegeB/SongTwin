import type { Metadata } from "next";
import { ContactBlock, LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Contact - SongTwin",
  description: "Contact SongTwin for account, billing, and product support.",
};

export default function ContactPage() {
  return (
    <LegalPage
      eyebrow="Contact"
      title="Get help with SongTwin."
      intro="For account, billing, recommendation, or launch feedback, contact SongTwin support."
      sections={[
        {
          title: "Support",
          body: <ContactBlock />,
        },
        {
          title: "What To Include",
          body: (
            <p>
              Include your account email, what you were trying to do, and any error message you saw.
              For billing questions, do not send full card numbers or private payment details.
            </p>
          ),
        },
      ]}
    />
  );
}
