import React, { useMemo, useState } from "react";
import { tarotApi } from "../../lib/api/tarotApi";
import { focusAreas, spreads } from "./constants";

const HISTORY_USER = "demo-user";

function GlassInput({ children }) {
  return <div className="rounded-3xl border border-purple-400/40 bg-slate-900/30 p-4">{children}</div>;
}

export default function TarotReadingSection() {
  const [question, setQuestion] = useState("");
  const [focusArea, setFocusArea] = useState("general");
  const [spreadType, setSpreadType] = useState("three-card");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(null);
  const [history, setHistory] = useState([]);
  const [followUpMessage, setFollowUpMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

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
    try {
      const nextReading = await tarotApi.createReading({ question, focusArea, spreadType, userId: HISTORY_USER, sessionId: reading?.sessionId });
      setReading({ ...nextReading, chatHistory: nextReading.chatHistory || [] });
      await loadHistory();
    } catch (err) {
      setError(err.message || "Failed to generate reading.");
    } finally {
      setLoading(false);
    }
  };

  const handleFollowUp = async () => {
    if (!reading?.sessionId || !followUpMessage.trim()) return;
    setChatLoading(true);
    setError("");
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
      {error && <p className="rounded-2xl bg-red-900/40 p-4 text-lg text-red-100">{error}</p>}

      {reading && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {reading.cards.map((card, index) => (
              <article key={`${card.name}-${index}`} className="rounded-3xl border border-purple-400/40 bg-slate-900/30 p-5">
                <p className="text-sm uppercase tracking-wider text-pink-300">{card.position}</p>
                <h3 className="mt-2 text-3xl font-bold text-yellow-200">{card.name}</h3>
                <p className="mt-1 text-purple-100">{card.reversed ? "Reversed" : "Upright"}</p>
                <p className="mt-3 text-purple-200/90">{card.keywords?.join(", ")}</p>
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
