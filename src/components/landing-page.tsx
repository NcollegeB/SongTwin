import Link from "next/link";
import type { ReactNode } from "react";

/* eslint-disable @next/next/no-img-element */
import {
  ArrowRight,
  CheckCircle2,
  Headphones,
  Library,
  Music2,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  Waves,
} from "lucide-react";

const albumImages = [
  "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?auto=format&fit=crop&w=500&q=80",
];

export function LandingPage() {
  return (
    <main className="bg-black text-white">
      <section className="relative min-h-[92vh] overflow-hidden">
        <HeroBackdrop />
        <div className="absolute inset-0 bg-black/58" />
        <div className="relative z-10 mx-auto flex min-h-[92vh] w-full max-w-7xl flex-col px-5 py-5 sm:px-8">
          <nav className="flex items-center justify-between gap-4">
            <Link className="flex items-center gap-3" href="/">
              <span className="flex h-10 w-10 items-center justify-center rounded bg-[#1db954] text-black">
                <Waves size={22} aria-hidden="true" />
              </span>
              <span className="text-xl font-black tracking-normal">SongTwin</span>
            </Link>
            <div className="flex items-center gap-2">
              <Link className="connect-button secondary hidden sm:inline-flex" href="/app">
                Sign in
              </Link>
              <Link className="connect-button" href="/app">
                Start for $4.99
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </nav>

          <div className="flex flex-1 items-center pb-12 pt-16">
            <div className="max-w-3xl">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-bold text-[#d8f7e2] ring-1 ring-white/15">
                <Sparkles size={15} aria-hidden="true" />
                Listener-overlap recommendations for Spotify
              </p>
              <h1 className="mt-6 text-6xl font-black tracking-normal sm:text-7xl lg:text-8xl">
                SongTwin
              </h1>
              <p className="mt-6 max-w-2xl text-xl leading-9 text-[#e6eee9]">
                Find songs that match the audience around a playlist or track. SongTwin uses Spotify for your sources, then ranks matches from co-listening signals across Last.fm and ListenBrainz.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link className="connect-button min-h-12 px-6" href="/app">
                  Subscribe for $4.99/mo
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <a className="connect-button secondary min-h-12 px-6" href="#how-it-works">
                  How it works
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#242424] bg-[#0b0b0b] px-5 py-12 sm:px-8" id="how-it-works">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-3">
          <Feature icon={<Library size={20} />} title="Choose a source" text="Connect Spotify, then pick Liked Songs, a playlist, or a searched track." />
          <Feature icon={<Radio size={20} />} title="Build the graph" text="SongTwin checks co-listening sources for tracks that move with the same audience." />
          <Feature icon={<Headphones size={20} />} title="Open the matches" text="Every ranked match is mapped back to Spotify when a catalog result is available." />
        </div>
      </section>

      <section className="bg-black px-5 py-16 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#1db954]">What you get</p>
            <h2 className="mt-3 max-w-3xl text-4xl font-black tracking-normal sm:text-5xl">
              A cleaner way to find songs that fit your taste.
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                "Playlist and single-song recommendation modes",
                "Listener-overlap ranking instead of same-artist filler",
                "Spotify search and playlist browsing",
                "Private account login with paid access control",
              ].map((item) => (
                <div className="flex items-start gap-3 rounded-lg bg-[#121212] p-4" key={item}>
                  <CheckCircle2 className="mt-0.5 shrink-0 text-[#1db954]" size={18} />
                  <p className="text-sm font-semibold leading-6 text-[#e5e5e5]">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-[#2a2a2a] bg-[#121212] p-5">
            <p className="text-sm font-bold text-[#a7a7a7]">SongTwin Pro</p>
            <div className="mt-2 flex items-end gap-1">
              <span className="text-5xl font-black">$4.99</span>
              <span className="pb-2 text-sm font-semibold text-[#a7a7a7]">/ month</span>
            </div>
            <p className="mt-4 text-sm leading-6 text-[#b3b3b3]">
              Built for listeners who want better discovery from the music they already care about.
            </p>
            <Link className="connect-button mt-6 min-h-12 w-full" href="/app">
              Get access
              <ArrowRight size={18} />
            </Link>
            <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-[#a7a7a7]">
              <ShieldCheck size={15} className="text-[#1db954]" />
              Billing runs through Stripe.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Feature({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-lg bg-[#121212] p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1db954] text-black">
        {icon}
      </div>
      <h2 className="mt-4 text-lg font-bold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[#a7a7a7]">{text}</p>
    </div>
  );
}

function HeroBackdrop() {
  return (
    <div className="absolute inset-0 bg-[#06130b]">
      <div className="absolute inset-x-0 top-16 mx-auto w-[min(960px,92vw)] rounded-lg border border-white/10 bg-[#121212] p-3 opacity-80 shadow-2xl shadow-black/60 md:top-24">
        <div className="grid gap-2 md:grid-cols-[260px_minmax(0,1fr)]">
          <div className="rounded bg-black p-3">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold">
              <Music2 size={16} className="text-[#1db954]" />
              Taste source
            </div>
            <div className="grid gap-2">
              {albumImages.map((image, index) => (
                <div className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-3 rounded bg-[#181818] p-2" key={image}>
                  <img alt="" className="h-11 w-11 rounded object-cover" src={image} />
                  <div>
                    <div className="h-2.5 w-28 rounded bg-white/70" />
                    <div className="mt-2 h-2 w-20 rounded bg-white/20" />
                  </div>
                  <span className="sr-only">Source track {index + 1}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded bg-[#181818] p-4">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <div className="h-3 w-48 rounded bg-white/80" />
                <div className="mt-2 h-2 w-64 rounded bg-white/20" />
              </div>
              <div className="h-9 w-24 rounded-full bg-[#1db954]" />
            </div>
            <div className="grid gap-2">
              {[1, 2, 3, 4].map((item) => (
                <div className="grid grid-cols-[28px_minmax(0,1fr)_88px] items-center gap-3 rounded bg-black/35 p-3" key={item}>
                  <div className="text-sm font-bold text-[#a7a7a7]">{item}</div>
                  <div>
                    <div className="h-2.5 w-44 rounded bg-white/70" />
                    <div className="mt-2 h-2 w-28 rounded bg-white/20" />
                  </div>
                  <div className="h-2 rounded-full bg-[#1db954]" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <Search className="absolute bottom-16 right-[12vw] text-[#1db954]/40" size={88} aria-hidden="true" />
      <Waves className="absolute left-[8vw] top-[68vh] text-white/10" size={120} aria-hidden="true" />
    </div>
  );
}
