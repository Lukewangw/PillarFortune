import { Activity, Check, Link2, RefreshCw, ShieldCheck, Sparkles, TriangleAlert } from "lucide-react";
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

  return (
    <section className="mx-auto max-w-5xl px-4 pb-20 pt-8 sm:px-6">
      <p className="eyebrow">Your reading · {new Date(reading.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}</p>
      <h1 className="display mt-3 text-3xl leading-snug text-balance sm:text-4xl">“{reading.question}”</h1>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="chip">{spread.name}</span>
        <span className="chip">
          {FOCUS_LABEL[route.focus]}
          {route.focusSource === "router" && typeof route.focusConfidence === "number" && (
            <span className="text-mist-500">auto · {Math.round(route.focusConfidence * 100)}%</span>
          )}
        </span>
        <span className="chip">{engineLabel(reading)}</span>
        {reading.outcome !== "offline" && <OutcomeBadge outcome={reading.outcome} />}
        {verified && (
          <span className="chip border-ok-400/30 text-ok-400" title="Your browser recomputed the draw from the seed and your picks; it matches the cards the server interpreted.">
            <ShieldCheck className="h-3.5 w-3.5" /> Draw verified
          </span>
        )}
        {hasTrace && (
          <button type="button" onClick={onInspect} className="chip transition hover:border-gold-400/40 hover:text-gold-100">
            <Activity className="h-3.5 w-3.5" /> Inspect pipeline
          </button>
        )}
      </div>

      <div className="mt-10">
        <SpreadLayout
          spread={draw.spread}
          render={(i) => {
            const card = draw.cards[i];
            return (
              <>
                <TarotCard
                  cardId={card.cardId}
                  orientation={card.orientation}
                  revealed
                  className={draw.spread === "cross" ? "w-[4.5rem] sm:w-24" : draw.spread === "single" ? "w-28 sm:w-32" : "w-[5.5rem] sm:w-28"}
                />
                <span className="mt-2 text-[11px] uppercase tracking-wider text-gold-300">{card.positionLabel}</span>
              </>
            );
          }}
        />
      </div>

      <div className="panel mt-10 p-6 sm:p-8">
        <p className="eyebrow flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5" /> The reading
        </p>
        <p className="display mt-3 text-2xl leading-relaxed text-mist-100 sm:text-[1.65rem]">{interpretation.summary}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {interpretation.themes.map((theme) => (
            <span key={theme} className="chip border-gold-400/25 text-gold-200">
              {theme}
            </span>
          ))}
        </div>
      </div>

      <ol className="mt-6 space-y-4">
        {interpretation.cards.map((entry) => {
          const card = getCard(entry.cardId);
          const drawn = draw.cards.find((c) => c.cardId === entry.cardId)!;
          return (
            <li key={entry.cardId} className="panel grid gap-5 p-5 sm:grid-cols-[7rem_1fr] sm:p-6">
              <TarotCard cardId={entry.cardId} orientation={entry.orientation} revealed className="mx-auto w-24 sm:w-28" />
              <div>
                <p className="eyebrow">{drawn.positionLabel}</p>
                <h3 className="display mt-1 text-2xl">
                  {card.name}
                  {entry.orientation === "reversed" && <span className="ml-2 text-base text-mist-400">reversed</span>}
                </h3>
                <p className="mt-1 text-xs text-mist-500">{card.keywords[entry.orientation].join(" · ")}</p>
                <p className="mt-3 leading-relaxed text-mist-200">{entry.interpretation}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="panel border-gold-400/20 p-6">
          <p className="eyebrow flex items-center gap-2">
            <Check className="h-3.5 w-3.5" /> Advice
          </p>
          <p className="mt-3 leading-relaxed text-mist-200">{interpretation.advice}</p>
        </div>
        <div className="panel p-6">
          <p className="eyebrow flex items-center gap-2 !text-warn-400">
            <TriangleAlert className="h-3.5 w-3.5" /> Caution
          </p>
          <p className="mt-3 leading-relaxed text-mist-200">{interpretation.caution}</p>
        </div>
      </div>

      <div className="mt-8">
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

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={onNew} className="btn-primary">
          <RefreshCw className="h-4 w-4" /> New reading
        </button>
        {shareable && (
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              const url = `${window.location.origin}${window.location.pathname}#/r/${reading.id}`;
              navigator.clipboard?.writeText(url).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              });
            }}
          >
            {copied ? <Check className="h-4 w-4 text-ok-400" /> : <Link2 className="h-4 w-4" />} {copied ? "Link copied" : "Copy link"}
          </button>
        )}
      </div>
    </section>
  );
}
