import { CalendarClock, Info, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import {
  BaziInputError,
  computeChart,
  describeBalance,
  describeDayMaster,
  ELEMENT_INFO,
  ELEMENT_SCORE_WEIGHTS,
  ELEMENTS,
  HEAVENLY_STEMS,
  type BaziChart,
  type Element,
  type Pillar,
} from "../../core/bazi";
import { codeLink } from "../../lib/config";

const ELEMENT_COLOR: Record<Element, string> = {
  wood: "var(--color-wood)",
  fire: "var(--color-fire)",
  earth: "var(--color-earth)",
  metal: "var(--color-metal)",
  water: "var(--color-water)",
};

const PILLAR_LABEL: Record<string, [string, string]> = {
  year: ["年柱", "Year"],
  month: ["月柱", "Month"],
  day: ["日柱", "Day"],
  hour: ["时柱", "Hour"],
};

/** Offset (minutes east of UTC) of an IANA zone at a UTC instant, from the browser's tz database. */
function zoneOffsetAt(zone: string, utcMs: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return Math.round((Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second")) - utcMs) / 60000);
}

/** Offset in effect for a local wall-clock time in `zone` (handles historical DST rules). */
function offsetForLocalTime(zone: string, date: string, time: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const wall = Date.UTC(y, m - 1, d, hh, mm);
  const first = zoneOffsetAt(zone, wall);
  return zoneOffsetAt(zone, wall - first * 60000);
}

const fmtOffset = (minutes: number) => {
  const sign = minutes >= 0 ? "+" : "−";
  const abs = Math.abs(minutes);
  return `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
};

/** Element tallies without the hour pillar, for when the birth time is unknown. */
function withoutHour(chart: BaziChart) {
  const counts = Object.fromEntries(ELEMENTS.map((e) => [e, 0])) as Record<Element, number>;
  const scores = { ...counts };
  for (const pillar of [chart.pillars.year, chart.pillars.month, chart.pillars.day]) {
    counts[pillar.stem.element] += 1;
    counts[pillar.branch.element] += 1;
    scores[pillar.stem.element] += ELEMENT_SCORE_WEIGHTS.stem;
    for (const hidden of pillar.hiddenStems) scores[hidden.stem.element] += ELEMENT_SCORE_WEIGHTS[hidden.role];
  }
  for (const e of ELEMENTS) scores[e] = Math.round(scores[e] * 10) / 10;
  return { counts, scores };
}

function PillarColumn({ pillar, dayMaster }: { pillar: Pillar; dayMaster: boolean }) {
  const [zh, en] = PILLAR_LABEL[pillar.position];
  return (
    <div className={`panel flex flex-col items-center px-2 py-5 text-center sm:px-4 ${dayMaster ? "!border-gold-400/50 shadow-[var(--shadow-glow)]" : ""}`}>
      <p className="text-xs text-mist-400">
        {zh} <span className="text-mist-500">· {en}</span>
      </p>
      <p className="mt-3 h-8 text-[11px] leading-tight text-mist-400">
        {pillar.tenGod ? (
          <>
            {pillar.tenGod.chinese}
            <br />
            <span className="text-mist-500">{pillar.tenGod.english}</span>
          </>
        ) : (
          <span className="font-medium text-gold-300">
            日主
            <br />
            Day Master
          </span>
        )}
      </p>
      <p className="mt-3 font-display text-5xl leading-none sm:text-6xl" style={{ color: ELEMENT_COLOR[pillar.stem.element] }}>
        {pillar.stem.char}
      </p>
      <p className="mt-1 text-[11px] text-mist-400">
        {pillar.stem.pinyin} · {pillar.stem.english}
      </p>
      <p className="mt-4 font-display text-5xl leading-none sm:text-6xl" style={{ color: ELEMENT_COLOR[pillar.branch.element] }}>
        {pillar.branch.char}
      </p>
      <p className="mt-1 text-[11px] text-mist-400">
        {pillar.branch.pinyin} · {pillar.branch.animal}
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-1.5 border-t border-white/5 pt-3">
        {pillar.hiddenStems.map((hidden) => (
          <span key={hidden.stem.char} className="text-center text-[10px] leading-tight text-mist-500" title={`${hidden.role} qi · ${hidden.tenGod.english}`}>
            <span className="block text-base" style={{ color: ELEMENT_COLOR[hidden.stem.element] }}>
              {hidden.stem.char}
            </span>
            {hidden.tenGod.chinese}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function PillarsPage() {
  const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const zones = useMemo(() => {
    const list = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
    return list.includes(browserZone) ? list : [browserZone, ...list];
  }, [browserZone]);

  const [date, setDate] = useState("1998-06-15");
  const [time, setTime] = useState("09:30");
  const [timeKnown, setTimeKnown] = useState(true);
  const [zone, setZone] = useState(browserZone);

  const result = useMemo(() => {
    if (!date) return null;
    const effectiveTime = timeKnown && time ? time : "12:00";
    try {
      const offset = offsetForLocalTime(zone, date, effectiveTime);
      return { chart: computeChart({ date, time: effectiveTime, utcOffsetMinutes: offset }), offset, error: null };
    } catch (error) {
      return { chart: null, offset: 0, error: error instanceof BaziInputError || error instanceof RangeError ? error.message : "Could not compute this chart." };
    }
  }, [date, time, timeKnown, zone]);

  const chart = result?.chart ?? null;
  const tallies = chart ? (timeKnown ? { counts: chart.elementCounts, scores: chart.elementScores } : withoutHour(chart)) : null;
  const insight = chart ? describeDayMaster(chart.dayMaster) : null;
  const balance = chart && tallies ? describeBalance({ elementScores: tallies.scores, dayMaster: chart.dayMaster }) : [];
  const maxScore = tallies ? Math.max(...ELEMENTS.map((e) => tallies.scores[e]), 1) : 1;
  const pillars = chart ? (timeKnown ? [chart.pillars.year, chart.pillars.month, chart.pillars.day, chart.pillars.hour] : [chart.pillars.year, chart.pillars.month, chart.pillars.day]) : [];

  return (
    <section className="mx-auto max-w-5xl px-4 pb-20 pt-10 sm:px-6 sm:pt-16">
      <p className="eyebrow flex items-center gap-2">
        <CalendarClock className="h-3.5 w-3.5" /> 八字 · Four Pillars of Destiny
      </p>
      <h1 className="display mt-3 text-4xl sm:text-5xl">Your birth chart, computed from the sky</h1>
      <p className="mt-4 max-w-2xl text-mist-400">
        The four pillars come from the solar calendar: the year turns at 立春 when the Sun reaches 315°, months turn at the twelve 节 solar terms, days count through the
        sixty-day cycle. Everything here is deterministic astronomy and calendar arithmetic — no randomness, no language model.
      </p>

      <form className="panel mt-8 grid gap-4 p-5 sm:grid-cols-[1fr_1fr_1.4fr] sm:p-6" onSubmit={(e) => e.preventDefault()}>
        <label className="text-sm">
          <span className="eyebrow">Birth date</span>
          <input type="date" required min="1901-01-01" max="2099-12-31" value={date} onChange={(e) => setDate(e.target.value)} className="field mt-2" />
        </label>
        <label className="text-sm">
          <span className="eyebrow">Birth time</span>
          <input type="time" value={time} disabled={!timeKnown} onChange={(e) => setTime(e.target.value)} className="field mt-2 disabled:opacity-40" />
          <span className="mt-2 flex items-center gap-2 text-xs text-mist-400">
            <input type="checkbox" checked={!timeKnown} onChange={(e) => setTimeKnown(!e.target.checked)} className="accent-[var(--color-gold-400)]" />
            I don't know my birth time
          </span>
        </label>
        <label className="text-sm">
          <span className="eyebrow">Birthplace time zone</span>
          <select value={zone} onChange={(e) => setZone(e.target.value)} className="field mt-2">
            {zones.map((z) => (
              <option key={z} value={z} className="bg-ink-900">
                {z.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          {result && !result.error && <span className="mt-2 block text-xs text-mist-500">{fmtOffset(result.offset)} on that date, including historical daylight saving.</span>}
        </label>
      </form>

      {result?.error && <p className="mt-6 text-sm text-bad-400">{result.error}</p>}

      {chart && tallies && insight && (
        <>
          <div className={`mt-10 grid gap-3 sm:gap-4 ${timeKnown ? "grid-cols-2 md:grid-cols-4" : "grid-cols-3"}`}>
            {pillars.map((p) => (
              <PillarColumn key={p.position} pillar={p} dayMaster={p.position === "day"} />
            ))}
          </div>
          {!timeKnown && <p className="mt-3 text-center text-xs text-mist-500">Hour pillar omitted. Births between 23:00 and midnight would also belong to the next day's pillar.</p>}

          <div className="mt-8 grid gap-4 md:grid-cols-[1.1fr_1fr]">
            <div className="panel p-6">
              <p className="eyebrow flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5" /> Day Master {chart.dayMaster.char}
              </p>
              <h2 className="display mt-2 text-3xl">{insight.title}</h2>
              <p className="mt-3 leading-relaxed text-mist-300">{insight.text}</p>
              <p className="mt-4 text-xs text-mist-500">
                Month governed by {chart.solarTerm.name} {chart.solarTerm.english} · {HEAVENLY_STEMS[chart.dayMaster.index].english} Day Master · solar year {chart.solarYear}
              </p>
            </div>
            <div className="panel p-6">
              <p className="eyebrow">Five-element balance</p>
              <ul className="mt-4 space-y-3">
                {ELEMENTS.map((element) => (
                  <li key={element} className="grid grid-cols-[4.5rem_1fr_2.5rem] items-center gap-3 text-sm">
                    <span className="text-mist-300">
                      <span style={{ color: ELEMENT_COLOR[element] }} className="mr-1.5 font-display text-lg">
                        {ELEMENT_INFO[element].chinese}
                      </span>
                      {ELEMENT_INFO[element].english}
                    </span>
                    <span className="h-2.5 rounded-full bg-white/5">
                      <span className="block h-full rounded-full" style={{ width: `${(tallies.scores[element] / maxScore) * 100}%`, background: ELEMENT_COLOR[element] }} />
                    </span>
                    <span className="text-right tabular-nums text-mist-400" title={`${tallies.counts[element]} visible characters`}>
                      {tallies.scores[element]}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[11px] text-mist-500">Weighted: visible stems 1.0, hidden stems 1.0 / 0.5 / 0.3 (main / middle / residual qi).</p>
            </div>
          </div>

          <div className="panel mt-4 p-6">
            <p className="eyebrow">Reading the balance</p>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-mist-300">
              {balance.slice(1).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-mist-500">{balance[0]}</p>
          </div>

          <details className="panel mt-4 p-6">
            <summary className="flex cursor-pointer items-center gap-2 text-sm text-mist-300">
              <Info className="h-4 w-4 text-gold-300" /> How this chart was computed
            </summary>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-mist-400">
              {chart.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
              <li>
                The Sun's apparent longitude uses Meeus' higher-accuracy solar theory. Against the ephem library, solar-term instants for 1950–2050 are within 0.53 minutes; the
                pillars agree with the lunar-python reference on 4,000 random birth times from 1901–2099.{" "}
                <a className="text-gold-300 underline-offset-4 hover:underline" href={codeLink("src/core/bazi/chart.ts")} target="_blank" rel="noreferrer">
                  Read the code
                </a>
                .
              </li>
            </ul>
          </details>
        </>
      )}
    </section>
  );
}
