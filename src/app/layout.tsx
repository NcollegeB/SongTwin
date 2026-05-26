import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://song-twin.vercel.app"),
  title: "SongTwin - Find your next perfect song",
  description:
    "A multi-source song discovery app that helps you find tracks that fit the music you already love.",
  openGraph: {
    title: "SongTwin - Find your next perfect song",
    description:
      "Search from a song you already love and get ranked music matches from SongTwin's multi-source discovery algorithm.",
    siteName: "SongTwin",
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary",
    title: "SongTwin - Find your next perfect song",
    description:
      "Search from a song you already love and get ranked music matches from SongTwin's multi-source discovery algorithm.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
