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

const CARD_SIZE = { single: "w-[7.5rem]", three: "w-[5.4rem] sm:w-[5.8rem]", cross: "w-[4.5rem] sm:w-[4.9rem]" } as const;

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
    <article className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <p className="label">
        Reading · {date} · {spread.name}
      </p>
      <h1 className="display mt-4 max-w-[48rem] text-[2.1rem] leading-[1.12] sm:text-[3rem]">“{reading.question}”</h1>

      <dl className="mt-8 flex flex-wrap items-end gap-x-10 gap-y-4 border-y border-rule py-4">
        <div>
          <dt className="label">Focus</dt>
          <dd className="mt-1 text-[1rem]">
            {FOCUS_LABEL[route.focus]}
            {route.focusSource === "router" && typeof route.focusConfidence === "number" && (
              <span className="text-ink-3"> · router, {Math.round(route.focusConfidence * 100)}%</span>
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
            <dd className="mt-1 flex items-center gap-2 text-[1rem]">
              <span className="seal" aria-hidden="true">
                验
              </span>
              Draw verified
            </dd>
          </div>
        )}
        {hasTrace && (
          <div className="ml-auto">
            <button type="button" onClick={onInspect} className="btn btn-secondary">
              Inspect pipeline <ArrowRight className="nudge" />
            </button>
          </div>
        )}
      </dl>

      <div className="mt-10 grid gap-12 lg:grid-cols-[19rem_minmax(0,1fr)] lg:gap-16">
        <figure className="lg:sticky lg:top-24 lg:self-start">
          <SpreadLayout
            spread={draw.spread}
            gap="gap-x-3 gap-y-4"
            render={(i) => {
              const card = draw.cards[i];
              return (
                <>
                  <TarotCard cardId={card.cardId} orientation={card.orientation} revealed className={CARD_SIZE[draw.spread]} />
                  <span className="label mt-2 !text-[0.6rem]">{card.positionLabel}</span>
                </>
              );
            }}
          />
          <figcaption className="mt-5 border-t border-rule pt-3 text-center font-mono text-[0.68rem] leading-relaxed text-ink-3">
            seed {draw.seed.slice(0, 10)}… · picks [{draw.picks.join(", ")}]
          </figcaption>
        </figure>

        <div className="min-w-0 max-w-[42rem]">
          <p className="label">The reading</p>
          <p className="mt-3 text-[1.35rem] leading-[1.5] text-ink sm:text-[1.5rem]">{interpretation.summary}</p>
          {interpretation.themes.length > 0 && (
            <p className="mt-4 text-[0.98rem] text-ink-3">
              <span className="label mr-2">Themes</span>
              <span className="italic">{interpretation.themes.join(" · ")}</span>
            </p>
          )}

          <ol className="mt-10 border-t border-ink" aria-label="The cards">
            {interpretation.cards.map((entry) => {
              const card = getCard(entry.cardId);
              const drawn = draw.cards.find((c) => c.cardId === entry.cardId)!;
              return (
                <li key={entry.cardId} className="grid grid-cols-[3.6rem_minmax(0,1fr)] gap-x-5 border-b border-rule py-6 sm:grid-cols-[4.4rem_minmax(0,1fr)]">
                  <TarotCard cardId={entry.cardId} orientation={entry.orientation} revealed className="w-full" />
                  <div>
                    <p className="label">{drawn.positionLabel}</p>
                    <h3 className="mt-1 text-[1.4rem] leading-tight text-ink">
                      {card.name}
                      {entry.orientation === "reversed" && <span className="ml-2 text-[1rem] italic text-ink-3">reversed</span>}
                    </h3>
                    <p className="mt-1 text-[0.9rem] italic text-ink-3">{card.keywords[entry.orientation].join(" · ")}</p>
                    <p className="mt-3 text-[1.02rem] leading-relaxed text-ink-2">{entry.interpretation}</p>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="mt-8 grid gap-8 sm:grid-cols-2">
            <section>
              <h3 className="label !text-ink">What to do</h3>
              <p className="mt-2 text-[1.02rem] leading-relaxed text-ink-2">{interpretation.advice}</p>
            </section>
            <section>
              <h3 className="label !text-warn">What to watch</h3>
              <p className="mt-2 text-[1.02rem] leading-relaxed text-ink-2">{interpretation.caution}</p>
            </section>
          </div>

          <div className="mt-14">
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

          <div className="mt-12 flex flex-wrap items-center gap-3 border-t border-rule pt-6">
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
      </div>
    </article>
  );
}
