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
    <header className="sticky top-0 z-40 border-b border-line bg-[#04060d]/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:gap-8 sm:px-6">
        <a href="#/" className="group flex shrink-0 items-center gap-2.5" aria-label="PillarFortune home">
          <Logo className="h-8 w-8 transition-transform duration-700 group-hover:rotate-[22.5deg]" />
          <span className="inscription hidden text-[1.05rem] tracking-[0.12em] text-gold-2 sm:inline">PILLARFORTUNE</span>
        </a>
        <nav aria-label="Main" className="flex min-w-0 items-center gap-4 sm:gap-7">
          {LINKS.map((link) => {
            const active = route.page === link.page;
            return (
              <a
                key={link.page}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`label relative py-1 transition-colors ${active ? "!text-gold-2" : "!text-star-3 hover:!text-gold-2"}`}
              >
                <span className="hidden md:inline">{link.label}</span>
                <span className="md:hidden">{link.short}</span>
                {active && <span className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rotate-45 bg-gold" aria-hidden="true" />}
              </a>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-5">
          <EngineBadge />
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="label hidden !text-star-3 transition-colors hover:!text-gold-2 lg:inline">
            GitHub ↗
          </a>
        </div>
      </div>
    </header>
  );
}
