import Link from "next/link";
import { Mail, Music2, Waves } from "lucide-react";
import type { ReactNode } from "react";

type LegalSection = {
  title: string;
  body: ReactNode;
};

export function LegalPage({
  eyebrow,
  title,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <main className="min-h-screen bg-black px-5 py-5 text-white sm:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col">
        <header className="grid gap-4 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
          <Link className="flex items-center gap-3" href="/">
            <span className="flex h-10 w-10 items-center justify-center rounded bg-[#1db954] text-black">
              <Waves size={22} aria-hidden="true" />
            </span>
            <span className="text-xl font-black tracking-normal">SongTwin</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-4 text-sm font-bold text-[#d8d8d8] md:justify-center">
            <Link className="hover:text-white" href="/#home">Home</Link>
            <Link className="hover:text-white" href="/#about">About</Link>
            <Link className="hover:text-white" href="/#pricing">Pricing</Link>
            <Link className="hover:text-white" href="/#faq">FAQ</Link>
            <Link className="hover:text-white" href="/contact">Contact</Link>
          </nav>
          <Link className="connect-button secondary min-h-10 px-4 text-sm md:justify-self-end" href="/app">
            Open app
          </Link>
        </header>

        <section className="py-14">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#1db954]">{eyebrow}</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-normal sm:text-6xl">{title}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[#b3b3b3]">{intro}</p>
        </section>

        <section className="grid gap-4 pb-16">
          {sections.map((section) => (
            <article className="rounded-lg border border-[#242424] bg-[#121212] p-5" key={section.title}>
              <div className="flex items-start gap-3">
                <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1db954] text-black">
                  <Music2 size={16} aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-xl font-black">{section.title}</h2>
                  <div className="mt-3 text-sm leading-7 text-[#b3b3b3]">{section.body}</div>
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

export function ContactBlock() {
  return (
    <div className="grid gap-3">
      <p>
        For account, billing, or product questions, email SongTwin support. Use the same email address
        attached to your SongTwin account when asking about billing.
      </p>
      <a className="connect-button min-h-11 w-fit px-5" href="mailto:skyryze02@gmail.com">
        <Mail size={17} aria-hidden="true" />
        Email support
      </a>
    </div>
  );
}
