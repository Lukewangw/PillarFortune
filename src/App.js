import React, { useEffect, useState } from "react";
import { Calendar, Clock3, MapPin, User, LogOut } from "lucide-react";
import TarotReadingSection from "./components/tarot/TarotReadingSection";

const tabs = [
  { id: "fourPillars", label: "Four Pillars of Destiny" },
  { id: "tarot", label: "Tarot Reading" },
];

function FourPillarsSection() {
  return (
    <section className="mx-auto max-w-4xl animate-fadeIn">
      <h2 className="mb-10 text-center text-5xl font-extrabold text-yellow-300">Calculate Your BaZi Chart</h2>
      <div className="grid gap-6 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-lg uppercase tracking-wider text-purple-200/80">Birth Date</span>
          <div className="flex items-center gap-3 rounded-3xl border border-purple-400/40 bg-slate-900/30 p-5">
            <Calendar className="text-purple-300" size={20} />
            <input placeholder="mm/dd/yyyy" className="w-full bg-transparent text-xl text-white outline-none placeholder:text-slate-400" />
          </div>
        </label>

        <label className="space-y-2">
          <span className="text-lg uppercase tracking-wider text-purple-200/80">Birth Time</span>
          <div className="flex items-center gap-3 rounded-3xl border border-purple-400/40 bg-slate-900/30 p-5">
            <Clock3 className="text-purple-300" size={20} />
            <input placeholder="--:-- --" className="w-full bg-transparent text-xl text-white outline-none placeholder:text-slate-400" />
          </div>
        </label>

        <label className="space-y-2">
          <span className="text-lg uppercase tracking-wider text-purple-200/80">Gender</span>
          <div className="flex items-center gap-3 rounded-3xl border border-purple-400/40 bg-slate-900/30 p-5">
            <User className="text-purple-300" size={20} />
            <input placeholder="Select..." className="w-full bg-transparent text-xl text-white outline-none placeholder:text-slate-400" />
          </div>
        </label>

        <label className="space-y-2">
          <span className="text-lg uppercase tracking-wider text-purple-200/80">Birth City</span>
          <div className="flex items-center gap-3 rounded-3xl border border-purple-400/40 bg-slate-900/30 p-5">
            <MapPin className="text-purple-300" size={20} />
            <input placeholder="e.g., New York" className="w-full bg-transparent text-xl text-white outline-none placeholder:text-slate-400" />
          </div>
        </label>
      </div>

      <label className="mt-6 block space-y-2">
        <span className="text-lg uppercase tracking-wider text-purple-200/80">Current City</span>
        <div className="flex items-center gap-3 rounded-3xl border border-purple-400/40 bg-slate-900/30 p-5">
          <MapPin className="text-purple-300" size={20} />
          <input placeholder="e.g., San Francisco" className="w-full bg-transparent text-xl text-white outline-none placeholder:text-slate-400" />
        </div>
      </label>

      <div className="mt-10 text-center">
        <button className="rounded-full bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 px-14 py-4 text-3xl font-bold shadow-2xl shadow-pink-700/40">Divine My Destiny</button>
      </div>
    </section>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState("fourPillars");
  const [stars, setStars] = useState([]);

  useEffect(() => {
    const generated = Array.from({ length: 140 }).map((_, i) => ({
      id: i,
      top: Math.random() * 100,
      left: Math.random() * 100,
      size: Math.random() * 2 + 1,
      opacity: 0.3 + Math.random() * 0.7,
    }));
    setStars(generated);
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-purple-950 via-indigo-950 to-black px-6 pb-20 pt-8 text-white">
      {stars.map((star) => (
        <span
          key={star.id}
          className="pointer-events-none absolute rounded-full bg-white"
          style={{ top: `${star.top}%`, left: `${star.left}%`, width: star.size, height: star.size, opacity: star.opacity }}
        />
      ))}

      <div className="relative z-10 mx-auto max-w-6xl">
        <header className="mb-12 flex items-center justify-between text-xl">
          <p className="text-purple-100">Welcome, Guest</p>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-orange-400 to-pink-500 font-bold">G</div>
            <button className="rounded-full bg-purple-900/70 p-3"><LogOut size={18} /></button>
          </div>
        </header>

        <section className="mb-10 text-center">
          <h1 className="text-7xl font-black tracking-wide text-pink-400">MYSTIC FORTUNE</h1>
          <p className="mt-3 text-3xl text-purple-100/80">Ancient Wisdom · Modern Insights</p>
        </section>

        <nav className="mb-12 flex justify-center gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-10 py-4 text-2xl ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 font-semibold shadow-xl shadow-pink-600/30"
                  : "bg-purple-900/70 text-purple-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {activeTab === "tarot" ? <TarotReadingSection /> : <FourPillarsSection />}
      </div>
    </main>
  );
}
