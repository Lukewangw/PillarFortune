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

/** Ink for characters (text contrast on paper) and the matching chart marks (see styles.css). */
const ELEMENT_COLOR: Record<Element, string> = {
  wood: "var(--color-wood)",
  fire: "var(--color-fire)",
  earth: "var(--color-earth)",
  metal: "var(--color-metal)",
  water: "var(--color-water)",
};
const ELEMENT_MARK: Record<Element, string> = {
  wood: "var(--viz-wood)",
  fire: "var(--viz-fire)",
  earth: "var(--viz-earth)",
  metal: "var(--viz-metal)",
  water: "var(--viz-water)",
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

function PillarColumn({ pillar, dayMaster, edge }: { pillar: Pillar; dayMaster: boolean; edge: string }) {
  const [zh, en] = PILLAR_LABEL[pillar.position];
  return (
    <div
      className={`relative flex flex-col items-center border-line px-2 pb-5 pt-4 text-center sm:px-4 ${edge} ${dayMaster ? "bg-[radial-gradient(ellipse_at_50%_42%,rgb(214_179_112_/_0.16),transparent_70%)]" : ""}`}
      data-pillar={pillar.position}
    >
      <p className="text-[0.95rem] text-star">
        {zh} <span className="label ml-1">{en}</span>
      </p>
      <p className="mt-3 flex h-9 flex-col items-center justify-center text-[0.8rem] leading-tight text-star-3">
        {pillar.tenGod ? (
          <>
            <span className="text-star-2">{pillar.tenGod.chinese}</span>
            <span className="text-[0.72rem] italic">{pillar.tenGod.english}</span>
          </>
        ) : (
          <>
            <span className="seal !h-5 !w-auto !rotate-0 px-1 !text-[0.7rem]">日主</span>
            <span className="mt-0.5 text-[0.72rem] italic text-gold">Day Master</span>
          </>
        )}
      </p>
      <p data-pillar-char className="mt-4 text-[3.4rem] leading-none sm:text-[4.4rem]" style={{ color: ELEMENT_COLOR[pillar.stem.element] }}>
        {pillar.stem.char}
      </p>
      <p className="mt-2 text-[0.8rem] italic text-star-3">
        {pillar.stem.pinyin} · {pillar.stem.english}
      </p>
      <p data-pillar-char className="mt-5 text-[3.4rem] leading-none sm:text-[4.4rem]" style={{ color: ELEMENT_COLOR[pillar.branch.element] }}>
        {pillar.branch.char}
      </p>
      <p className="mt-2 text-[0.8rem] italic text-star-3">
        {pillar.branch.pinyin} · {pillar.branch.animal}
      </p>
      <div className="mt-5 flex w-full flex-wrap justify-center gap-x-3 gap-y-1 border-t border-line pt-3">
        {pillar.hiddenStems.map((hidden) => (
          <span key={hidden.stem.char} className="text-center text-[0.68rem] leading-tight text-star-3" title={`${hidden.role} qi · ${hidden.tenGod.english}`}>
            <span className="block text-[1.15rem]" style={{ color: ELEMENT_COLOR[hidden.stem.element] }}>
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
    <section className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
      <div className="mx-auto max-w-3xl animate-rise text-center">
        <p className="label">✦ &nbsp;八字 · Four Pillars of Destiny&nbsp; ✦</p>
        <h1 className="display mt-6 text-[2.6rem] sm:text-[3.8rem]">
          Your birth chart, <em className="foil animate-shimmer pr-1 italic">computed</em> from the sky
        </h1>
        <p className="lede mx-auto mt-5 max-w-[40rem]">
          The four pillars come from the solar calendar: the year turns at 立春, when the Sun reaches 315°; months turn at the twelve 节 terms; days count through the
          sixty-day cycle. It is astronomy and arithmetic — no randomness and no language model.
        </p>
      </div>

      <form className="mx-auto mt-10 grid max-w-4xl gap-7 sm:grid-cols-[1fr_1fr_1.4fr]" onSubmit={(e) => e.preventDefault()}>
        <label className="block">
          <span className="label">Birth date</span>
          <input type="date" required min="1901-01-01" max="2099-12-31" value={date} onChange={(e) => setDate(e.target.value)} className="field mt-2" />
        </label>
        <label className="block">
          <span className="label">Birth time</span>
          <input type="time" value={time} disabled={!timeKnown} onChange={(e) => setTime(e.target.value)} className="field mt-2" />
          <span className="mt-2 flex items-center gap-2 text-[0.9rem] text-star-3">
            <input type="checkbox" checked={!timeKnown} onChange={(e) => setTimeKnown(!e.target.checked)} className="accent-[var(--color-gold)]" />
            I don't know my birth time
          </span>
        </label>
        <label className="block">
          <span className="label">Birthplace time zone</span>
          <select value={zone} onChange={(e) => setZone(e.target.value)} className="field mt-2">
            {zones.map((z) => (
              <option key={z} value={z}>
                {z.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          {result && !result.error && <span className="mt-2 block text-[0.9rem] text-star-3">{fmtOffset(result.offset)} on that date, including historical daylight saving.</span>}
        </label>
      </form>

      {result?.error && (
        <p className="mt-6 text-[0.95rem] text-bad" role="alert">
          {result.error}
        </p>
      )}

      {chart && tallies && insight && (
        <>
          <div className={`mt-14 grid ${timeKnown ? "grid-cols-2 md:grid-cols-4" : "grid-cols-3"}`}>
            {pillars.map((p, i) => (
              <PillarColumn
                key={p.position}
                pillar={p}
                dayMaster={p.position === "day"}
                edge={
                  i === 0
                    ? ""
                    : timeKnown && i === 2
                      ? "max-md:border-t md:border-l" // starts the second row on narrow screens
                      : timeKnown && i === 3
                        ? "border-l max-md:border-t"
                        : "border-l"
                }
              />
            ))}
          </div>
          {!timeKnown && <p className="mt-3 text-[0.9rem] italic text-star-3">Hour pillar omitted. Births between 23:00 and midnight would also belong to the next day's pillar.</p>}

          <div className="mt-12 grid gap-12 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:gap-16">
            <div>
              <p className="label">Day Master {chart.dayMaster.char}</p>
              <h2 className="display mt-3 text-[2rem] sm:text-[2.4rem]">{insight.title}</h2>
              <p className="mt-4 text-[1.05rem] leading-relaxed text-star-2">{insight.text}</p>
              <p className="mt-4 text-[0.9rem] italic text-star-3">
                Month governed by {chart.solarTerm.name} {chart.solarTerm.english} · {HEAVENLY_STEMS[chart.dayMaster.index].english} Day Master · solar year {chart.solarYear}
              </p>
            </div>
            <div className="viz">
              <p className="label">Five-element balance</p>
              <ul className="mt-4 border-t border-gold/50">
                {ELEMENTS.map((element) => (
                  <li key={element} className="grid grid-cols-[5.5rem_1fr_2.5rem] items-center gap-3 border-b border-line py-2.5">
                    <span className="text-[0.95rem] text-star-2">
                      <span style={{ color: ELEMENT_COLOR[element] }} className="mr-2 text-[1.2rem]">
                        {ELEMENT_INFO[element].chinese}
                      </span>
                      {ELEMENT_INFO[element].english}
                    </span>
                    <span className="h-2 bg-night-3">
                      <span className="block h-full" style={{ width: `${(tallies.scores[element] / maxScore) * 100}%`, background: ELEMENT_MARK[element] }} />
                    </span>
                    <span className="text-right font-mono text-[0.8rem] tabular-nums text-star" title={`${tallies.counts[element]} visible characters`}>
                      {tallies.scores[element]}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[0.82rem] italic text-star-3">Weighted: visible stems 1.0; hidden stems 1.0 / 0.5 / 0.3 (main, middle and residual qi).</p>
            </div>
          </div>

          <div className="mt-12 grid gap-12 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:gap-16">
            <div>
              <p className="label">Reading the balance</p>
              <ul className="mt-3 space-y-2.5 text-[1.02rem] leading-relaxed text-star-2">
                {balance.slice(1).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <p className="mt-3 text-[0.9rem] italic text-star-3">{balance[0]}</p>
            </div>
            <details className="self-start border-t border-line pt-3">
              <summary className="label cursor-pointer transition-colors hover:!text-star">How this chart was computed</summary>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-[0.92rem] leading-relaxed text-star-2">
                {chart.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
                <li>
                  The Sun's apparent longitude uses Meeus' higher-accuracy solar theory. Against the ephem library, solar-term instants for 1950–2050 are within 0.53 minutes;
                  the pillars agree with the lunar-python reference on 4,000 random birth times from 1901–2099.{" "}
                  <a className="link" href={codeLink("src/core/bazi/chart.ts")} target="_blank" rel="noreferrer">
                    Read the code
                  </a>
                  .
                </li>
              </ul>
            </details>
          </div>
        </>
      )}
    </section>
  );
}
