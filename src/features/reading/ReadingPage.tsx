import { ArrowRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { preloadCards } from "../../components/CardArt";
import { TraceDrawer } from "../../components/TraceDrawer";
import type { ReadingDTO } from "../../core/contracts";
import type { Trace } from "../../core/llm/trace";
import type { Focus } from "../../core/llm/types";
import type { SupportMessage } from "../../core/orchestrate";
import { getCard } from "../../core/tarot/deck";
import { drawCards, sameCards } from "../../core/tarot/engine";
import { randomSeed } from "../../core/tarot/rng";
import { SPREADS, type SpreadId } from "../../core/tarot/spreads";
import { getEngine, type EngineMode } from "../../lib/engine";
import { useEngine } from "../../lib/engineContext";
import { AskStep } from "./AskStep";
import type { ChatEntry } from "./ChatPanel";
import { DeckStep } from "./DeckStep";
import { HistoryDrawer } from "./HistoryDrawer";
import { PipelineProgress } from "./PipelineProgress";
import { ReadingView } from "./ReadingView";
import { SpreadLayout } from "./SpreadLayout";
import { SupportCard } from "./SupportCard";
import { TarotCard } from "./TarotCard";

type Phase = "ask" | "deck" | "reveal" | "interpreting" | "reading" | "support" | "loading";

const MODEL_LABEL: Record<EngineMode, string> = {
  live: "Llama 3.3 70B on Workers AI, schema-constrained",
  demo: "simulated model with injected faults",
  offline: "knowledge-base composer (no language model)",
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function randomPick(taken: number[]): number {
  const free = Array.from({ length: 78 }, (_, i) => i).filter((i) => !taken.includes(i));
  const r = new Uint32Array(1);
  crypto.getRandomValues(r);
  return free[r[0] % free.length];
}

export function ReadingPage({ readingId }: { readingId?: string }) {
  const { engine, mode } = useEngine();
  const [phase, setPhase] = useState<Phase>(readingId ? "loading" : "ask");
  const [question, setQuestion] = useState("");
  const [focus, setFocus] = useState<Focus | "auto">("auto");
  const [spread, setSpread] = useState<SpreadId>("three");
  const [seed, setSeed] = useState("");
  const [picks, setPicks] = useState<number[]>([]);
  const [revealed, setRevealed] = useState<boolean[]>([]);
  const [reading, setReading] = useState<ReadingDTO | null>(null);
  const [readingMode, setReadingMode] = useState<EngineMode>(mode);
  const [trace, setTrace] = useState<Trace | null>(null);
  const [support, setSupport] = useState<SupportMessage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatEntry[]>([]);
  const [chatBusy, setChatBusy] = useState(false);
  const [sessionMissing, setSessionMissing] = useState(false);
  const [inspect, setInspect] = useState<{ trace: Trace; entry?: ChatEntry } | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const n = SPREADS[spread].positions.length;
  const localDraw = useMemo(() => (seed && picks.length === n ? drawCards({ seed, spread, picks }) : null), [seed, spread, picks, n]);
  // The faces are images: fetch them while the user is still turning the cards over.
  useEffect(() => {
    if (localDraw) preloadCards(localDraw.cards.map((c) => c.cardId));
  }, [localDraw]);
  const verified = reading ? sameCards(reading.draw, drawCards({ seed: reading.draw.seed, spread: reading.draw.spread, picks: reading.draw.picks })) : null;

  const openReading = useCallback(
    async (id: string) => {
      setPhase("loading");
      setHistoryOpen(false);
      setError(null);
      try {
        const { reading: loaded, session } = await engine.openReading(id);
        setReading(loaded);
        setReadingMode(mode);
        setTrace(null);
        setSessionMissing(!session);
        setChat((session?.history ?? []).map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.content })));
        setPhase("reading");
        window.scrollTo({ top: 0 });
      } catch (e) {
        setError((e as Error).message);
        setPhase("ask");
      }
    },
    [engine, mode],
  );

  useEffect(() => {
    if (readingId) void openReading(readingId);
    // Only on first mount for a deep link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = () => {
    setPhase("ask");
    setPicks([]);
    setRevealed([]);
    setReading(null);
    setTrace(null);
    setSupport(null);
    setError(null);
    setChat([]);
    setSessionMissing(false);
    if (window.location.hash.startsWith("#/r/")) window.location.hash = "#/";
    window.scrollTo({ top: 0 });
  };

  const startDeck = () => {
    setSeed(randomSeed());
    setPicks([]);
    setRevealed(new Array(n).fill(false));
    setError(null);
    setPhase("deck");
    window.scrollTo({ top: 0 });
  };

  const pick = (slot: number) => setPicks((p) => (p.length < n && !p.includes(slot) ? [...p, slot] : p));
  const pickForMe = () => setPicks((p) => (p.length < n ? [...p, randomPick(p)] : p));
  const toReveal = useCallback(() => setPhase((p) => (p === "deck" ? "reveal" : p)), []);

  const interpret = async (acknowledgeSupport = false) => {
    setPhase("interpreting");
    setTrace(null);
    setError(null);
    setReadingMode(mode);
    try {
      const result = await engine.createReading({ question, spread, seed, picks, focus, acknowledgeSupport });
      setTrace(result.trace);
      if (result.status === "support") {
        setSupport(result.support);
        await delay(350);
        setPhase("support");
        return;
      }
      setReading(result.reading);
      setChat([]);
      setSessionMissing(false);
      await delay(1100);
      setPhase("reading");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError((e as Error).message || "Something went wrong.");
      setPhase("reveal");
    }
  };

  const send = async (message: string) => {
    if (!reading) return;
    setChat((c) => [...c, { role: "user", content: message }]);
    setChatBusy(true);
    try {
      const res = await getEngine(readingMode).sendMessage(reading.sessionId, message);
      if (res.status === "support") {
        setChat((c) => [...c, { role: "assistant", content: "Let's pause the reading for a moment.", support: res.support, trace: res.trace }]);
      } else {
        setChat((c) => [
          ...c,
          { role: "assistant", content: res.answer.answer, outcome: res.outcome, trace: res.trace, engine: res.engine, refs: res.answer.referencedCards, support: res.support },
        ]);
      }
    } catch (e) {
      setChat((c) => [...c, { role: "assistant", content: (e as Error).message || "The follow-up failed. Please try again.", error: true }]);
    } finally {
      setChatBusy(false);
    }
  };

  const allRevealed = revealed.length === n && revealed.every(Boolean);

  return (
    <>
      {phase === "ask" && (
        <>
          {error && (
            <p className="mx-auto mt-6 max-w-6xl px-4 text-[0.95rem] text-bad sm:px-6" role="alert">
              {error}
            </p>
          )}
          <AskStep
            question={question}
            setQuestion={setQuestion}
            focus={focus}
            setFocus={setFocus}
            spread={spread}
            setSpread={setSpread}
            onContinue={startDeck}
            onOpenHistory={() => setHistoryOpen(true)}
          />
        </>
      )}

      {phase === "loading" && <p className="label py-32 text-center">Opening your reading…</p>}

      {phase === "deck" && (
        <DeckStep
          spread={spread}
          seed={seed}
          question={question}
          picks={picks}
          onPick={pick}
          onPickForMe={pickForMe}
          onBack={() => setPhase("ask")}
          onDone={toReveal}
        />
      )}

      {(phase === "reveal" || phase === "interpreting") && localDraw && (
        <section className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
          <div className="flex items-baseline justify-between gap-3">
            <button type="button" onClick={() => setPhase("ask")} disabled={phase === "interpreting"} className="label transition-colors hover:!text-star disabled:opacity-40">
              ← Start over
            </button>
            <p className="label">{SPREADS[spread].name}</p>
          </div>
          <div className="mx-auto mt-8 max-w-2xl text-center">
            <p className="label">{allRevealed ? "Every card is face up" : "Tap a card to turn it over"}</p>
            <h2 className="display mt-3 text-[2.1rem] sm:text-[2.7rem]">{allRevealed ? "Your cards" : "Turn over your cards"}</h2>
            <p className="mt-3 text-[1.05rem] italic leading-snug text-star-2">“{question.trim()}”</p>
          </div>
          <div className="mt-10">
            <SpreadLayout
              spread={spread}
              render={(i) => {
                const card = localDraw.cards[i];
                const isRevealed = revealed[i];
                return (
                  <button
                    type="button"
                    disabled={isRevealed || phase === "interpreting"}
                    onClick={() => setRevealed((r) => r.map((v, j) => (j === i ? true : v)))}
                    className="group flex flex-col items-center disabled:cursor-default"
                    aria-label={isRevealed ? `${card.positionLabel}: ${getCard(card.cardId).name}` : `Reveal the ${card.positionLabel} card`}
                  >
                    <TarotCard
                      cardId={card.cardId}
                      orientation={card.orientation}
                      revealed={isRevealed}
                      glow={!isRevealed}
                      className={`${spread === "cross" ? "w-[4.8rem] sm:w-[6.2rem]" : spread === "single" ? "w-36 sm:w-44" : "w-[6.2rem] sm:w-40"} transition-transform duration-200 group-enabled:group-hover:-translate-y-1.5`}
                    />
                    <span className="label mt-3 !text-star">{card.positionLabel}</span>
                    <span className={`mt-1 h-10 max-w-32 text-center text-[0.9rem] leading-tight ${isRevealed ? "text-star-2" : "italic text-star-3"}`}>
                      {isRevealed ? `${getCard(card.cardId).name}${card.orientation === "reversed" ? ", reversed" : ""}` : "face down"}
                    </span>
                  </button>
                );
              }}
            />
          </div>

          {phase === "reveal" && (
            <div className="mt-8 flex flex-col items-center gap-3">
              {error && (
                <p className="text-[0.95rem] text-bad" role="alert">
                  {error}
                </p>
              )}
              {allRevealed ? (
                <button type="button" onClick={() => void interpret()} className="btn btn-primary">
                  Interpret my reading <ArrowRight className="nudge" />
                </button>
              ) : (
                <button type="button" onClick={() => setRevealed(new Array(n).fill(true))} className="btn btn-secondary">
                  Reveal all
                </button>
              )}
            </div>
          )}
          {phase === "interpreting" && <PipelineProgress modelLabel={MODEL_LABEL[readingMode]} trace={trace} />}
        </section>
      )}

      {phase === "support" && support && (
        <section className="px-4 py-14 sm:px-6 sm:py-20">
          <SupportCard support={support} onEdit={reset} onContinue={() => void interpret(true)} />
        </section>
      )}

      {phase === "reading" && reading && (
        <ReadingView
          reading={reading}
          verified={verified}
          hasTrace={trace !== null}
          chat={chat}
          chatBusy={chatBusy}
          chatDisabledReason={sessionMissing ? "This reading's conversation session has expired, so follow-ups are closed." : undefined}
          shareable={readingMode === "live"}
          onSend={(m) => void send(m)}
          onInspect={() => trace && setInspect({ trace })}
          onInspectEntry={(entry) => entry.trace && setInspect({ trace: entry.trace, entry })}
          onNew={reset}
        />
      )}

      {inspect && (
        <TraceDrawer
          trace={inspect.trace}
          engine={inspect.entry ? inspect.entry.engine : reading?.engine}
          outcome={inspect.entry ? inspect.entry.outcome : reading?.outcome}
          verified={inspect.entry ? undefined : verified}
          onClose={() => setInspect(null)}
        />
      )}
      {historyOpen && <HistoryDrawer onClose={() => setHistoryOpen(false)} onOpen={(id) => void openReading(id)} />}
    </>
  );
}
