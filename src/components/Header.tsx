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
    <header className="sticky top-0 z-40 border-b border-rule bg-paper">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:gap-6 sm:px-6">
        <a href="#/" className="flex shrink-0 items-center gap-2.5" aria-label="PillarFortune home">
          <Logo className="h-6 w-6" />
          <span className="hidden text-[1.2rem] font-medium tracking-[-0.01em] sm:inline">PillarFortune</span>
        </a>
        <nav aria-label="Main" className="flex min-w-0 items-center gap-3.5 sm:gap-6">
          {LINKS.map((link) => {
            const active = route.page === link.page;
            return (
              <a
                key={link.page}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`label py-1 transition-colors ${
                  active ? "!text-ink underline decoration-accent decoration-[1.5px] underline-offset-[7px]" : "hover:!text-ink"
                }`}
              >
                <span className="hidden md:inline">{link.label}</span>
                <span className="md:hidden">{link.short}</span>
              </a>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-5">
          <EngineBadge />
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="label hidden transition-colors hover:!text-ink lg:inline">
            GitHub ↗
          </a>
        </div>
      </div>
    </header>
  );
}
