import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { OutcomeBadge } from "../../components/TraceDrawer";
import type { ReadingDTO } from "../../core/contracts";
import { getCard } from "../../core/tarot/deck";
import { SPREADS } from "../../core/tarot/spreads";
import { FOCUS_LABEL } from "./AskStep";
import { ChatPanel, type ChatEntry } from "./ChatPanel";
import { SpreadLayout } from "./SpreadLayout";
import { TarotCard } from "./TarotCard";

function engineLabel(reading: ReadingDTO): string {
  if (reading.engine.provider === "offline") return "Knowledge-base composer";
  if (reading.engine.provider === "fault-injection") return "Simulated LLM";
  return reading.engine.model.split("/").pop()?.replace("-instruct-fp8-fast", "").replace(/-/g, " ") ?? reading.engine.model;
}

const CARD_SIZE = { single: "w-[9rem] sm:w-[11rem]", three: "w-[5.6rem] sm:w-[9.5rem]", cross: "w-[4.6rem] sm:w-[6.6rem]" } as const;

export function ReadingView({
  reading,
  verified,
  hasTrace,
  chat,
  chatBusy,
  chatDisabledReason,
  shareable,
  onSend,
  onInspect,
  onInspectEntry,
  onNew,
}: {
  reading: ReadingDTO;
  verified: boolean | null;
  hasTrace: boolean;
  chat: ChatEntry[];
  chatBusy: boolean;
  chatDisabledReason?: string;
  shareable: boolean;
  onSend: (message: string) => void;
  onInspect: () => void;
  onInspectEntry: (entry: ChatEntry) => void;
  onNew: () => void;
}) {
  const { interpretation, draw, route } = reading;
  const spread = SPREADS[draw.spread];
  const [copied, setCopied] = useState(false);
  const date = new Date(reading.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

  return (
    <article className="mx-auto max-w-5xl overflow-x-clip px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <header className="animate-rise text-center">
        <p className="label">
          ✦ &nbsp;{spread.name} · {date}&nbsp; ✦
        </p>
        <h1 className="display mx-auto mt-5 max-w-[46rem] text-[2rem] italic leading-[1.2] sm:text-[2.75rem]">“{reading.question}”</h1>
      </header>

      <figure className="relative mx-auto mt-8 px-1 pb-4 pt-8 sm:pt-10">
        <div className="pointer-events-none absolute -inset-x-10 -inset-y-6 bg-[radial-gradient(ellipse_at_50%_48%,rgb(214_179_112_/_0.16),transparent_60%)]" aria-hidden="true" />
        <div className="relative">
          <SpreadLayout
            spread={draw.spread}
            gap={draw.spread === "cross" ? "gap-x-3 gap-y-4 sm:gap-x-6 sm:gap-y-5" : "gap-3 sm:gap-8"}
            render={(i) => {
              const card = draw.cards[i];
              return (
                <>
                  <TarotCard cardId={card.cardId} orientation={card.orientation} revealed className={CARD_SIZE[draw.spread]} />
                  <span className="label mt-3 !text-[0.62rem]">{card.positionLabel}</span>
                  <span className="mt-0.5 hidden max-w-[10rem] text-center text-[0.88rem] italic leading-tight text-star-2 sm:block">
                    {getCard(card.cardId).name}
                    {card.orientation === "reversed" ? ", reversed" : ""}
                  </span>
                </>
              );
            }}
          />
          <figcaption className="meta mt-7 text-center">
            seed {draw.seed.slice(0, 12)}… · picks [{draw.picks.join(", ")}]
          </figcaption>
        </div>
      </figure>

      <dl className="mt-6 flex flex-wrap items-end justify-center gap-x-10 gap-y-4 text-center">
        <div>
          <dt className="label">Focus</dt>
          <dd className="mt-1 text-[1rem]">
            {FOCUS_LABEL[route.focus]}
            {route.focusSource === "router" && typeof route.focusConfidence === "number" && (
              <span className="text-star-3"> · router, {Math.round(route.focusConfidence * 100)}%</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="label">Interpreter</dt>
          <dd className="mt-1 text-[1rem]">{engineLabel(reading)}</dd>
        </div>
        {reading.outcome !== "offline" && (
          <div>
            <dt className="label">Validation</dt>
            <dd className="mt-1.5">
              <OutcomeBadge outcome={reading.outcome} />
            </dd>
          </div>
        )}
        {verified && (
          <div title="Your browser recomputed the draw from the seed and your picks; it matches the cards that were interpreted.">
            <dt className="label">Draw</dt>
            <dd className="mt-1 flex items-center justify-center gap-2 text-[1rem]">
              <span className="seal" aria-hidden="true">
                验
              </span>
              Draw verified
            </dd>
          </div>
        )}
        {hasTrace && (
          <div>
            <button type="button" onClick={onInspect} className="btn btn-secondary">
              Inspect pipeline <ArrowRight className="nudge" />
            </button>
          </div>
        )}
      </dl>

      <div className="mx-auto mt-14 max-w-3xl">
        <p className="divider label">The reading</p>
        <p className="mt-7 text-center text-[1.35rem] leading-[1.55] text-star sm:text-[1.55rem]">{interpretation.summary}</p>
        {interpretation.themes.length > 0 && (
          <p className="mt-5 text-center text-[0.98rem] text-star-3">
            <span className="label mr-2">Themes</span>
            <span className="italic text-star-2">{interpretation.themes.join(" · ")}</span>
          </p>
        )}

        <ol className="mt-14 space-y-12" aria-label="The cards">
          {interpretation.cards.map((entry) => {
            const card = getCard(entry.cardId);
            const drawn = draw.cards.find((c) => c.cardId === entry.cardId)!;
            return (
              <li key={entry.cardId} className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-5 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-x-9">
                <TarotCard cardId={entry.cardId} orientation={entry.orientation} revealed className="w-full" />
                <div>
                  <p className="label">{drawn.positionLabel}</p>
                  <h3 className="inscription mt-2 text-[1.3rem] leading-tight sm:text-[1.5rem]">
                    {card.name}
                    {entry.orientation === "reversed" && <span className="ml-2 font-serif text-[1rem] italic tracking-normal text-star-3">reversed</span>}
                  </h3>
                  <p className="mt-1.5 text-[0.92rem] italic text-gold/90">{card.keywords[entry.orientation].join(" · ")}</p>
                  <p className="mt-3 text-[1.04rem] leading-relaxed text-star-2">{entry.interpretation}</p>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-16 grid gap-10 text-center sm:grid-cols-2 sm:gap-0">
          <section className="sm:px-8">
            <h3 className="label">☀ &nbsp;What to do</h3>
            <p className="mt-3 text-[1.04rem] leading-relaxed text-star-2">{interpretation.advice}</p>
          </section>
          <section className="sm:border-l sm:border-line-2 sm:px-8">
            <h3 className="label !text-warn">☾ &nbsp;What to watch</h3>
            <p className="mt-3 text-[1.04rem] leading-relaxed text-star-2">{interpretation.caution}</p>
          </section>
        </div>

        <div className="mt-20">
          <p className="divider label mb-10" aria-hidden="true">✦</p>
          <ChatPanel
            draw={draw}
            entries={chat}
            suggestions={interpretation.followUps}
            busy={chatBusy}
            disabledReason={chatDisabledReason}
            onSend={onSend}
            onInspect={onInspectEntry}
          />
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={onNew} className="btn btn-primary">
            New reading <ArrowRight className="nudge" />
          </button>
          {shareable && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                const url = `${window.location.origin}${window.location.pathname}#/r/${reading.id}`;
                navigator.clipboard?.writeText(url).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                });
              }}
            >
              {copied ? "Link copied" : "Copy link"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
