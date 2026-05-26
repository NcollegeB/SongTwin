import { absoluteUrl, siteConfig } from "@/lib/site";

export function StructuredData() {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": absoluteUrl("/#organization"),
        name: siteConfig.name,
        url: siteConfig.url,
      },
      {
        "@type": "WebSite",
        "@id": absoluteUrl("/#website"),
        name: siteConfig.name,
        url: siteConfig.url,
        publisher: {
          "@id": absoluteUrl("/#organization"),
        },
      },
      {
        "@type": "SoftwareApplication",
        "@id": absoluteUrl("/#software"),
        name: siteConfig.name,
        applicationCategory: "MusicApplication",
        operatingSystem: "Web",
        url: siteConfig.url,
        description: siteConfig.description,
        offers: {
          "@type": "Offer",
          price: siteConfig.price,
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
