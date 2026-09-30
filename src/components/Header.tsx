import { GithubIcon } from "./GithubIcon";
import type { Route } from "../lib/hashRoute";
import { REPO_URL } from "../lib/config";
import { EngineBadge } from "./EngineBadge";
import { Logo } from "./Logo";

const LINKS: Array<{ page: Route["page"]; href: string; label: string; short: string }> = [
  { page: "reading", href: "#/", label: "Tarot reading", short: "Tarot" },
  { page: "pillars", href: "#/pillars", label: "Four Pillars", short: "Pillars" },
  { page: "lab", href: "#/lab", label: "How it works", short: "Lab" },
];

export function Header({ route }: { route: Route }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-ink-950/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-3 sm:gap-3 sm:px-6">
        <a href="#/" className="flex items-center gap-2" aria-label="PillarFortune home">
          <Logo className="h-8 w-8" />
          <span className="display hidden text-xl sm:inline">PillarFortune</span>
        </a>
        <nav aria-label="Main" className="flex min-w-0 items-center gap-0.5 sm:ml-6 sm:gap-1">
          {LINKS.map((link) => {
            const active = route.page === link.page;
            return (
              <a
                key={link.page}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-2.5 py-1.5 text-sm transition sm:px-3 ${
                  active ? "bg-white/[0.07] text-gold-200" : "text-mist-400 hover:text-mist-100"
                }`}
              >
                <span className="hidden md:inline">{link.label}</span>
                <span className="md:hidden">{link.short}</span>
              </a>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <EngineBadge />
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="hidden rounded-full p-2 text-mist-400 transition hover:text-mist-100 sm:block" aria-label="Source code on GitHub">
            <GithubIcon className="h-5 w-5" />
          </a>
        </div>
      </div>
    </header>
  );
}
