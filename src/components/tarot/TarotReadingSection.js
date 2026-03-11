import React, { useMemo, useState } from "react";
import { tarotApi } from "../../lib/api/tarotApi";
import { focusAreas, spreads } from "./constants";

const HISTORY_USER = "demo-user";

const fallbackDeck = [
  { name: "The Fool", keywords: ["new beginnings", "leap of faith", "curiosity"] },
  { name: "The Magician", keywords: ["focus", "manifestation", "resourcefulness"] },
  { name: "The High Priestess", keywords: ["intuition", "inner voice", "mystery"] },
  { name: "The Empress", keywords: ["nurture", "abundance", "creation"] },
  { name: "The Chariot", keywords: ["willpower", "direction", "discipline"] },
  { name: "Strength", keywords: ["courage", "patience", "compassion"] },
  { name: "The Hermit", keywords: ["reflection", "solitude", "wisdom"] },
  { name: "Wheel of Fortune", keywords: ["cycles", "timing", "change"] },
  { name: "Justice", keywords: ["truth", "balance", "responsibility"] },
  { name: "The Star", keywords: ["hope", "healing", "guidance"] },
];

const spreadPositions = {
  "single-card": ["guidance"],
  "three-card": ["past", "present", "future"],
  "five-card": ["present", "challenge", "guidance", "near future", "outcome"],
};

function createFallbackReading({ question, focusArea, spreadType }) {
  const positions = spreadPositions[spreadType] || spreadPositions["three-card"];
  const shuffled = [...fallbackDeck].sort(() => Math.random() - 0.5);
  const cards = positions.map((position, index) => {
    const source = shuffled[index % shuffled.length];

    return {
      position,
      name: source.name,
      reversed: Math.random() > 0.65,
      keywords: source.keywords,
    };
  });

  return {
    readingId: `local-${Date.now()}`,
    sessionId: `local-session-${Date.now()}`,
    spreadType,
    question,
    focusArea,
    cards,
    interpretation: {
      summary: "This ceremonial fallback reading suggests clarity arrives as you move one honest step at a time.",
      career: "In work, prioritize consistency over speed; small disciplined actions build real momentum.",
      love: "In relationships, lead with openness and patience; listen for what is felt, not just what is said.",
      advice: "Write one grounded action you can take in the next 24 hours and commit to it.",
      warnings: "Avoid rushing decisions when emotions are peaking; pause before committing.",
    },
    chatHistory: [
      {
        role: "assistant",
        content: `I could not reach the live tarot service, so I prepared a traditional-style local reading for: "${question}".`,
      },
    ],
  };
}

function GlassInput({ children }) {
  return <div className="rounded-3xl border border-purple-400/40 bg-slate-900/30 p-4">{children}</div>;
}

export default function TarotReadingSection() {
  const [question, setQuestion] = useState("");
  const [focusArea, setFocusArea] = useState("general");
  const [spreadType, setSpreadType] = useState("three-card");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reading, setReading] = useState(null);
  const [history, setHistory] = useState([]);
  const [followUpMessage, setFollowUpMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [revealedCards, setRevealedCards] = useState([]);

  const selectedSpread = useMemo(() => spreads.find((item) => item.value === spreadType), [spreadType]);

  const loadHistory = async () => {
    try {
      const data = await tarotApi.fetchHistory(HISTORY_USER);
      setHistory(data.readings || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDraw = async () => {
    setLoading(true);
    setError("");
    setNotice("");
    setRevealedCards([]);
    try {
      const nextReading = await tarotApi.createReading({ question, focusArea, spreadType, userId: HISTORY_USER, sessionId: reading?.sessionId });
      setReading({ ...nextReading, chatHistory: nextReading.chatHistory || [] });
      await loadHistory();
    } catch (err) {
      const fallbackReading = createFallbackReading({ question, focusArea, spreadType });
      setReading(fallbackReading);
      setNotice("Live tarot service is unavailable right now, so this draw uses a local traditional fallback spread.");
    } finally {
      setLoading(false);
    }
  };

  const revealCard = (index) => {
    setRevealedCards((previous) => (previous.includes(index) ? previous : [...previous, index]));
  };

  const handleFollowUp = async () => {
    if (!reading?.sessionId || !followUpMessage.trim()) return;
    setChatLoading(true);
    setError("");
    setNotice("");
    try {
      const data = await tarotApi.followUp({ sessionId: reading.sessionId, readingId: reading.readingId, message: followUpMessage });
      setReading((prev) => ({ ...prev, chatHistory: data.history }));
      setFollowUpMessage("");
    } catch (err) {
      setError(err.message || "Failed to send follow-up.");
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-6xl space-y-6 animate-fadeIn">
      <h2 className="text-center text-5xl font-extrabold text-yellow-300">Tarot Reading</h2>

      <div className="grid gap-5 md:grid-cols-3">
        <label className="space-y-2 md:col-span-3">
          <span className="text-lg uppercase tracking-wider text-purple-200/80">Question</span>
          <GlassInput>
            <input value={question} onChange={(event) => setQuestion(event.target.value)} className="w-full bg-transparent text-xl text-white outline-none placeholder:text-slate-400" placeholder="What should I focus on in my career this month?" />
          </GlassInput>
        </label>

        <label className="space-y-2">
          <span className="text-lg uppercase tracking-wider text-purple-200/80">Focus Area</span>
          <GlassInput>
            <select value={focusArea} onChange={(event) => setFocusArea(event.target.value)} className="w-full bg-transparent text-xl text-white outline-none">
              {focusAreas.map((item) => (
                <option key={item.value} value={item.value} className="bg-slate-900">{item.label}</option>
              ))}
            </select>
          </GlassInput>
        </label>

        <label className="space-y-2">
          <span className="text-lg uppercase tracking-wider text-purple-200/80">Spread</span>
          <GlassInput>
            <select value={spreadType} onChange={(event) => setSpreadType(event.target.value)} className="w-full bg-transparent text-xl text-white outline-none">
              {spreads.map((item) => (
                <option key={item.value} value={item.value} className="bg-slate-900">{item.label}</option>
              ))}
            </select>
          </GlassInput>
        </label>

        <div className="flex items-end">
          <button onClick={handleDraw} disabled={loading || !question.trim()} className="w-full rounded-full bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 px-8 py-4 text-xl font-semibold disabled:opacity-50">
            {loading ? "Drawing..." : "Draw Cards"}
          </button>
        </div>
      </div>

      <p className="text-center text-lg text-purple-100/80">{selectedSpread?.description}</p>
      <p className="text-center text-base text-purple-200/80">Traditional protocol: center your question, let the deck shuffle, then choose each card to reveal your message.</p>
      {error && <p className="rounded-2xl bg-red-900/40 p-4 text-lg text-red-100">{error}</p>}
      {notice && <p className="rounded-2xl bg-amber-500/20 p-4 text-lg text-amber-100">{notice}</p>}

      {loading && (
        <div className="rounded-3xl border border-purple-400/40 bg-slate-900/30 p-6 text-center">
          <h3 className="text-2xl font-bold text-yellow-200">Shuffling the deck...</h3>
          <div className="relative mx-auto mt-5 h-24 w-36">
            <div className="absolute left-8 top-4 h-20 w-14 animate-bounce rounded-xl border border-yellow-200/50 bg-gradient-to-b from-indigo-500/80 to-purple-800/80" />
            <div className="absolute left-11 top-2 h-20 w-14 animate-pulse rounded-xl border border-pink-200/50 bg-gradient-to-b from-fuchsia-500/80 to-indigo-800/80" />
            <div className="absolute left-14 top-6 h-20 w-14 animate-bounce rounded-xl border border-purple-200/50 bg-gradient-to-b from-purple-400/80 to-slate-900/80" />
          </div>
          <p className="mt-4 text-purple-100/90">Breathe in, breathe out. Your spread is being prepared.</p>
        </div>
      )}

      {reading && (
        <>
          <div className="rounded-3xl border border-purple-400/40 bg-slate-900/30 p-5">
            <h3 className="text-2xl font-bold text-yellow-200">Choose your cards</h3>
            <p className="mt-1 text-purple-100/80">Tap each card button to reveal its position and meaning.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {reading.cards.map((card, index) => {
                const revealed = revealedCards.includes(index);

                return (
                  <button
                    key={`${card.name}-${index}`}
                    type="button"
                    onClick={() => revealCard(index)}
                    className="min-h-20 rounded-2xl border border-purple-300/40 bg-gradient-to-b from-purple-700/50 to-slate-900/50 p-4 text-left transition hover:border-yellow-200/70"
                  >
                    <p className="text-sm uppercase tracking-wider text-pink-300">Card {index + 1}</p>
                    <p className="mt-1 text-lg font-semibold text-white">{revealed ? card.name : "Reveal this card"}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {reading.cards.map((card, index) => (
              <article key={`${card.name}-${index}`} className="rounded-3xl border border-purple-400/40 bg-slate-900/30 p-5">
                {revealedCards.includes(index) ? (
                  <>
                    <p className="text-sm uppercase tracking-wider text-pink-300">{card.position}</p>
                    <h3 className="mt-2 text-3xl font-bold text-yellow-200">{card.name}</h3>
                    <p className="mt-1 text-purple-100">{card.reversed ? "Reversed" : "Upright"}</p>
                    <p className="mt-3 text-purple-200/90">{card.keywords?.join(", ")}</p>
                  </>
                ) : (
                  <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-purple-300/50 bg-black/20 text-center">
                    <p className="text-lg text-purple-200">Face-down card</p>
                    <p className="mt-2 text-sm text-purple-200/70">Choose Card {index + 1} above to reveal.</p>
                  </div>
                )}
              </article>
            ))}
          </div>

          <div className="rounded-3xl border border-purple-400/40 bg-slate-900/30 p-6">
            <h3 className="text-3xl font-bold text-yellow-200">Interpretation</h3>
            <div className="mt-4 space-y-2 text-lg text-purple-100">
              <p><strong>Summary:</strong> {reading.interpretation?.summary}</p>
              {reading.interpretation?.career && <p><strong>Career:</strong> {reading.interpretation.career}</p>}
              {reading.interpretation?.love && <p><strong>Love:</strong> {reading.interpretation.love}</p>}
              <p><strong>Advice:</strong> {reading.interpretation?.advice}</p>
              <p><strong>Cautions:</strong> {reading.interpretation?.warnings}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-purple-400/40 bg-slate-900/30 p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-yellow-200">Reading History</h3>
                <button onClick={loadHistory} className="rounded-full bg-purple-700/80 px-4 py-2">Refresh</button>
              </div>
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {history.map((item) => (
                  <div key={item.id} className="rounded-2xl bg-black/30 p-3 text-sm">
                    <p className="font-semibold text-pink-200">{item.spread_type}</p>
                    <p>{item.question}</p>
                  </div>
                ))}
                {history.length === 0 && <p className="text-purple-200/80">No saved readings yet.</p>}
              </div>
            </div>

            <div className="rounded-3xl border border-purple-400/40 bg-slate-900/30 p-5">
              <h3 className="text-2xl font-bold text-yellow-200">Follow-up Chat</h3>
              <div className="my-3 max-h-56 space-y-2 overflow-y-auto">
                {(reading.chatHistory || []).map((entry, idx) => (
                  <p key={idx} className="rounded-2xl bg-black/30 p-3 text-sm">
                    <strong className="capitalize">{entry.role}:</strong> {entry.content}
                  </p>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={followUpMessage} onChange={(event) => setFollowUpMessage(event.target.value)} className="flex-1 rounded-2xl border border-purple-400/40 bg-black/30 p-3" placeholder="Ask a follow-up question..." />
                <button onClick={handleFollowUp} disabled={chatLoading || !followUpMessage.trim()} className="rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2 font-semibold disabled:opacity-50">{chatLoading ? "Sending..." : "Send"}</button>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
