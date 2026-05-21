import Link from "next/link";
import type { ReactNode } from "react";

/* eslint-disable @next/next/no-img-element */
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  Headphones,
  Heart,
  Library,
  Mail,
  Music2,
  PlayCircle,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Waves,
} from "lucide-react";
import { LandingAccountNav } from "./landing-account-nav";

const albumImages = [
  "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?auto=format&fit=crop&w=500&q=80",
];

const currentsCover =
  "https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e029e1cfc756886ac782e363d79";

const previewRecommendations = [
  { title: "Electric Feel", artist: "MGMT", fit: 96, signal: "Psych-pop overlap" },
  { title: "Chamber of Reflection", artist: "Mac DeMarco", fit: 93, signal: "Dreamy groove match" },
  { title: "Instant Crush", artist: "Daft Punk", fit: 90, signal: "Synth-pop listener link" },
  { title: "Sweet Disposition", artist: "The Temper Trap", fit: 87, signal: "Indie anthem pull" },
];

export function LandingPage() {
  return (
    <main className="bg-black text-white">
      <section className="relative min-h-[92vh] overflow-hidden" id="home">
        <HeroBackdrop />
        <div className="absolute inset-0 bg-black/58" />
        <div className="relative z-10 mx-auto flex min-h-[92vh] w-full max-w-7xl flex-col px-5 py-5 sm:px-8">
          <nav className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
            <Link className="flex items-center gap-3" href="/">
              <span className="flex h-10 w-10 items-center justify-center rounded bg-[#1db954] text-black">
                <Waves size={22} aria-hidden="true" />
              </span>
              <span className="text-xl font-black tracking-normal">SongTwin</span>
            </Link>
            <div className="order-3 flex w-full items-center justify-center gap-4 text-xs font-bold text-[#d8d8d8] sm:order-none sm:w-auto sm:gap-6 sm:text-sm">
              <a className="hover:text-white" href="#home">Home</a>
              <a className="hover:text-white" href="#about">About</a>
              <a className="hover:text-white" href="#pricing">Pricing</a>
              <a className="hover:text-white" href="#contact">Contact</a>
            </div>
            <LandingAccountNav />
          </nav>

          <div className="flex flex-1 items-center pb-12 pt-16">
            <div className="max-w-3xl">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-bold text-[#d8f7e2] ring-1 ring-white/15">
                <Sparkles size={15} aria-hidden="true" />
                $4.99/mo after a 3-day free trial
              </p>
              <h1 className="mt-6 max-w-4xl text-5xl font-black leading-[1.02] tracking-normal sm:text-7xl lg:text-8xl">
                Find your perfect song now.
              </h1>
              <p className="mt-6 max-w-2xl text-xl leading-9 text-[#e6eee9]">
                SongTwin starts with a song or playlist you already love, then finds tracks that fit the same listener taste. Start free for 3 days, then keep discovering for $4.99/month.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link className="connect-button min-h-12 px-6" href="/app">
                  Start 3-day free trial
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <a className="connect-button secondary min-h-12 px-6" href="#pricing">
                  See pricing
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-black px-5 py-16 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[420px_minmax(0,1fr)] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#1db954]">Sample discovery</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-black leading-tight tracking-normal sm:text-5xl">
              Start with one song. See where the taste leads.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#b3b3b3]">
              Here is a static sample using Tame Impala as the source. SongTwin is designed to turn that starting point into nearby tracks from artists your taste already points toward.
            </p>
            <Link className="connect-button mt-7 min-h-12 px-6" href="/app">
              Try your own song
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>

          <div className="rounded-lg border border-[#242424] bg-[#121212] p-4 sm:p-5">
            <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
              <div className="rounded-lg bg-[#181818] p-4">
                <img
                  alt="Currents album cover by Tame Impala"
                  className="aspect-square w-full rounded object-cover shadow-xl shadow-black/50"
                  src={currentsCover}
                />
                <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-[#1db954]">Source song</p>
                <h3 className="mt-2 text-xl font-black">The Less I Know The Better</h3>
                <p className="mt-1 text-sm font-semibold text-[#a7a7a7]">Tame Impala</p>
              </div>

              <div className="grid gap-2">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-[#a7a7a7]">Songs to try next</p>
                    <p className="text-xs font-semibold text-[#6f6f6f]">Static preview of the SongTwin result style</p>
                  </div>
                  <PlayCircle className="text-[#1db954]" size={30} aria-hidden="true" />
                </div>
                {previewRecommendations.map((song, index) => (
                  <div className="grid grid-cols-[28px_minmax(0,1fr)_48px] items-center gap-3 rounded bg-black/35 p-3" key={song.title}>
                    <div className="text-sm font-black text-[#a7a7a7]">{index + 1}</div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-white">{song.title}</p>
                      <p className="truncate text-xs font-semibold text-[#a7a7a7]">
                        {song.artist} · {song.signal}
                      </p>
                    </div>
                    <div className="flex items-center justify-end gap-1 text-sm font-black text-[#1db954]">
                      <TrendingUp size={14} aria-hidden="true" />
                      {song.fit}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#242424] bg-[#0b0b0b] px-5 py-16 sm:px-8" id="about">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#1db954]">About SongTwin</p>
            <h2 className="mt-3 max-w-3xl text-4xl font-black tracking-normal sm:text-5xl">
              Built for the moment when your playlist needs one more great song.
            </h2>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-[#b3b3b3]">
              Search a track, pick a playlist, or start from your liked songs. SongTwin looks for music connected by shared listener behavior and brings the best matches back into a clean Spotify-ready view.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <Feature icon={<Heart size={20} />} title="Start with taste" text="Use a song or playlist that already matches your mood." />
              <Feature icon={<Compass size={20} />} title="Go past obvious" text="Surface tracks connected by listener patterns, not just artist catalog filler." />
              <Feature icon={<Headphones size={20} />} title="Play it fast" text="Open matched songs in Spotify and keep building from what works." />
            </div>
          </div>

          <div className="rounded-lg border border-[#2a2a2a] bg-[#121212] p-5">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#1db954]">Why it feels different</p>
            <div className="mt-5 grid gap-4">
              {[
                "Good for digging past overplayed recommendations.",
                "Good for building playlists around a specific song feeling.",
                "Good for finding cross-artist matches that still make sense.",
              ].map((item) => (
                <div className="flex items-start gap-3" key={item}>
                  <CheckCircle2 className="mt-0.5 shrink-0 text-[#1db954]" size={18} />
                  <p className="text-sm font-semibold leading-6 text-[#e5e5e5]">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-black px-5 py-16 sm:px-8" id="pricing">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#1db954]">What you get</p>
            <h2 className="mt-3 max-w-3xl text-4xl font-black tracking-normal sm:text-5xl">
              Better song discovery for $4.99 a month.
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                "Search any Spotify track and find similar-feeling songs",
                "Pick playlists or liked songs as recommendation sources",
                "Ranked matches from listener-overlap signals",
                "Spotify links so you can listen and save quickly",
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
            <p className="mt-3 text-sm font-bold text-[#1ed760]">3-day free trial, then $4.99/month</p>
            <p className="mt-4 text-sm leading-6 text-[#b3b3b3]">
              Unlimited access to SongTwin discovery while your subscription is active. Checkout and billing are handled on Stripe.
            </p>
            <Link className="connect-button mt-6 min-h-12 w-full" href="/app">
              Start free trial
              <ArrowRight size={18} />
            </Link>
            <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-[#a7a7a7]">
              <ShieldCheck size={15} className="text-[#1db954]" />
              Billing runs through Stripe.
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#242424] bg-[#0b0b0b] px-5 py-16 sm:px-8" id="contact">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#1db954]">Contact</p>
            <h2 className="mt-3 max-w-2xl text-4xl font-black tracking-normal sm:text-5xl">
              Questions, feedback, or a song discovery idea?
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-[#b3b3b3]">
              Reach out if you want help with your account, billing, or the recommendation experience.
            </p>
          </div>
          <a className="connect-button min-h-12 px-6" href="mailto:skyryze02@gmail.com">
            <Mail size={18} aria-hidden="true" />
            Contact SongTwin
          </a>
        </div>
      </section>

      <section className="bg-black px-5 py-20 sm:px-8" id="how-it-works">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#1db954]">How it works</p>
          <h2 className="mt-3 max-w-3xl text-4xl font-black tracking-normal sm:text-5xl">
            SongTwin turns one music choice into a listener-shaped recommendation set.
          </h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <Feature icon={<Library size={20} />} title="Choose a source" text="Connect Spotify, then pick liked songs, a playlist, or a searched track." />
            <Feature icon={<Radio size={20} />} title="Read the signal" text="SongTwin compares co-listening sources to find tracks that move with the same audience." />
            <Feature icon={<Headphones size={20} />} title="Try the matches" text="Ranked results are mapped back to Spotify when a catalog match is available." />
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
