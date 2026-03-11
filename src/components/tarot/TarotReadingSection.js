import React, { useMemo, useState } from "react";
import { tarotApi } from "../../lib/api/tarotApi";
import { focusAreas, spreads } from "./constants";

const HISTORY_USER = "demo-user";

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
      const nextReading = await tarotApi.createReading({
        question,
        focusArea,
        spreadType,
        userId: HISTORY_USER,
        sessionId: reading?.sessionId,
      });
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
      const data = await tarotApi.followUp({
        sessionId: reading.sessionId,
        readingId: reading.readingId,
        message: followUpMessage,
      });
      setReading((prev) => ({ ...prev, chatHistory: data.history }));
      setFollowUpMessage("");
    } catch (err) {
      setError(err.message || "Failed to send follow-up.");
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <section className="animate-fadeIn">
      <h2 className="text-3xl font-bold text-center mb-6 text-amber-400">Tarot Reading</h2>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div className="md:col-span-2">
          <label className="block text-gray-400 text-sm mb-2 uppercase tracking-wider">Question</label>
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            className="w-full px-5 py-3 rounded-2xl bg-white/5 border border-purple-500/30 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 transition-all"
            placeholder="What should I focus on in my career this month?"
          />
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-2 uppercase tracking-wider">Focus Area</label>
          <select
            value={focusArea}
            onChange={(event) => setFocusArea(event.target.value)}
            className="w-full px-5 py-3 rounded-2xl bg-white/5 border border-purple-500/30 text-white focus:outline-none focus:border-purple-400 transition-all"
          >
            {focusAreas.map((item) => (
              <option key={item.value} value={item.value} className="bg-slate-900">
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-2 uppercase tracking-wider">Spread</label>
          <select
            value={spreadType}
            onChange={(event) => setSpreadType(event.target.value)}
            className="w-full px-5 py-3 rounded-2xl bg-white/5 border border-purple-500/30 text-white focus:outline-none focus:border-purple-400 transition-all"
          >
            {spreads.map((item) => (
              <option key={item.value} value={item.value} className="bg-slate-900">
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="text-center mb-4">
        <button
          onClick={handleDraw}
          disabled={loading || !question.trim()}
          className="px-10 py-3 rounded-full bg-gradient-to-r from-amber-500 via-pink-500 to-purple-500 text-white font-semibold hover:shadow-lg hover:shadow-amber-500/25 transition-all disabled:opacity-50"
        >
          {loading ? "Drawing..." : "Draw Cards"}
        </button>
      </div>

      <p className="text-center text-sm text-gray-400 mb-4">{selectedSpread?.description}</p>
      {error && <p className="rounded-xl bg-red-500/20 border border-red-500/30 p-3 text-red-200 text-sm mb-4">{error}</p>}

      {reading && (
        <div className="space-y-4">
          <div className="grid md:grid-cols-3 gap-3">
            {reading.cards.map((card, index) => (
              <article key={`${card.name}-${index}`} className="rounded-2xl bg-white/5 border border-purple-500/20 p-4">
                <p className="text-xs uppercase tracking-wider text-pink-300">{card.position}</p>
                <h3 className="mt-1 text-lg font-semibold text-amber-300">{card.name}</h3>
                <p className="text-sm text-gray-300">{card.reversed ? "Reversed" : "Upright"}</p>
                <p className="text-xs text-gray-400 mt-2">{card.keywords?.join(", ")}</p>
              </article>
            ))}
          </div>

          <div className="rounded-2xl bg-white/5 border border-purple-500/20 p-4">
            <h3 className="text-lg font-semibold text-amber-300 mb-2">Interpretation</h3>
            <div className="space-y-1 text-sm text-gray-300">
              <p><strong>Summary:</strong> {reading.interpretation?.summary}</p>
              {reading.interpretation?.career && <p><strong>Career:</strong> {reading.interpretation.career}</p>}
              {reading.interpretation?.love && <p><strong>Love:</strong> {reading.interpretation.love}</p>}
              <p><strong>Advice:</strong> {reading.interpretation?.advice}</p>
              <p><strong>Cautions:</strong> {reading.interpretation?.warnings}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-white/5 border border-purple-500/20 p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-amber-300">Reading History</h3>
                <button onClick={loadHistory} className="text-xs px-3 py-1 rounded-full bg-white/10 hover:bg-white/20">Refresh</button>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-2">
                {history.map((item) => (
                  <div key={item.id} className="rounded-xl bg-black/20 p-2 text-xs">
                    <p className="font-semibold text-pink-200">{item.spread_type}</p>
                    <p className="text-gray-300">{item.question}</p>
                  </div>
                ))}
                {history.length === 0 && <p className="text-xs text-gray-400">No saved readings yet.</p>}
              </div>
            </div>

            <div className="rounded-2xl bg-white/5 border border-purple-500/20 p-4">
              <h3 className="text-lg font-semibold text-amber-300 mb-2">Follow-up Chat</h3>
              <div className="max-h-36 overflow-y-auto space-y-2 mb-2">
                {(reading.chatHistory || []).map((entry, idx) => (
                  <p key={idx} className="rounded-xl bg-black/20 p-2 text-xs text-gray-300">
                    <strong className="capitalize">{entry.role}:</strong> {entry.content}
                  </p>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={followUpMessage}
                  onChange={(event) => setFollowUpMessage(event.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-black/20 border border-purple-500/20 text-sm"
                  placeholder="Ask a follow-up question..."
                />
                <button
                  onClick={handleFollowUp}
                  disabled={chatLoading || !followUpMessage.trim()}
                  className="px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-xs font-semibold disabled:opacity-50"
                >
                  {chatLoading ? "Sending..." : "Send"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
